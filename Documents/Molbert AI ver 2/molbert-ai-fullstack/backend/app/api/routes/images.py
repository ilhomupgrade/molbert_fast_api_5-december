import datetime

from fastapi import APIRouter, Depends, File, Form, UploadFile, HTTPException
from sqlalchemy import update
from sqlmodel import func, select

from app.api import deps
from app.models import GenerationLog, GenerationPublic, ImageResult, User
from app.services.storage import save_bytes, to_public_url
from app.services.task_queue import process_generation_task
from app.core.config import settings

router = APIRouter(prefix="/images", tags=["images"])

ALLOWED_MIME_TYPES = {"image/png", "image/jpeg", "image/webp"}
MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB


RETOUCH_TEMPLATE = """You are an expert photo editor AI. Apply a localized, realistic edit to the provided image.
User Request: "{user_prompt}"
Edit Location: Focus around pixel coordinates (x: {x}, y: {y}).

Guidelines:
- Keep the edit natural and seamless.
- Do not change the rest of the image outside the localized area.
- Accept standard skin tone changes (tan, lighter, darker).
- Refuse requests that change fundamental race/ethnicity.

Return only the final edited image."""


FILTER_TEMPLATE = """You are an expert photo editor AI. Apply a stylistic filter to the entire image.
Filter Request: "{user_prompt}"

Guidelines:
- Adjust colors/style without changing composition.
- Do not change a person's race/ethnicity.

Return only the final filtered image."""


ADJUST_TEMPLATE = """You are an expert photo editor AI. Apply a global adjustment to the image.
Adjustment Request: "{user_prompt}"

Guidelines:
- The whole image should be adjusted and remain photorealistic.
- Accept standard skin tone changes (tan, lighter, darker).
- Refuse requests that change fundamental race/ethnicity.

Return only the final adjusted image."""


COMPOSE_TEMPLATE = """You are an expert photo compositor AI. Transform or compose the provided image based on the user's creative request.
User Request: "{user_prompt}"

Guidelines:
- Creatively transform, remix, or compose the image as requested.
- You may combine elements, change style, add artistic effects, or create variations.
- Maintain high quality and coherent composition.
- Be creative while respecting the user's intent.

Return only the final composed image."""


async def _validate_upload(file: UploadFile) -> bytes:
    """
    Ensure uploaded file is a small image of an allowed type.
    """
    content = await file.read()
    if len(content) > MAX_UPLOAD_SIZE_BYTES:
        raise HTTPException(
            status_code=413,
            detail="Файл слишком большой. Максимум 10 МБ.",
        )

    content_type = file.content_type or ""
    if content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Неверный формат изображения. Разрешено: PNG, JPEG, WebP.",
        )

    # Примитивная проверка сигнатуры файла
    if content_type == "image/png" and not content.startswith(b"\x89PNG\r\n\x1a\n"):
        raise HTTPException(status_code=400, detail="Файл не похож на PNG")
    if content_type == "image/jpeg" and not content.startswith(b"\xff\xd8"):
        raise HTTPException(status_code=400, detail="Файл не похож на JPEG")
    if content_type == "image/webp" and not (
        content.startswith(b"RIFF") and content[8:12] == b"WEBP"
    ):
        raise HTTPException(status_code=400, detail="Файл не похож на WebP")

    return content


@router.post("/edit", response_model=ImageResult)
async def edit_image(
    session: deps.SessionDep,
    prompt: str = Form(...),
    x: int = Form(...),
    y: int = Form(...),
    file: UploadFile = File(...),
    aspect_ratio: str = Form("auto"),
    output_format: str = Form("png"),
    resolution: str = Form("1K"),
    current_user: User = Depends(deps.get_current_user),
) -> ImageResult:
    _ensure_credits_available(session, current_user)
    image_prompt = RETOUCH_TEMPLATE.format(user_prompt=prompt, x=x, y=y)
    content = await _validate_upload(file)
    stored_path = save_bytes(
        content, file.content_type or "image/png", str(current_user.id), prefix="source"
    )
    source_url = to_public_url(stored_path)
    fal_url = await process_generation_task(
        {
            "mode": "edit",
            "prompt": image_prompt,
            "image_url": source_url,
            "image_path": stored_path,
            "aspect_ratio": aspect_ratio,
            "output_format": output_format,
            "resolution": resolution,
        }
    )
    _log_generation(session, current_user, "edit", prompt, fal_url)
    return ImageResult(image_data_url="", file_url=to_public_url(fal_url))


@router.post("/filter", response_model=ImageResult)
async def filter_image(
    session: deps.SessionDep,
    prompt: str = Form(...),
    file: UploadFile = File(...),
    aspect_ratio: str = Form("auto"),
    output_format: str = Form("png"),
    resolution: str = Form("1K"),
    current_user: User = Depends(deps.get_current_user),
) -> ImageResult:
    _ensure_credits_available(session, current_user)
    image_prompt = FILTER_TEMPLATE.format(user_prompt=prompt)
    content = await _validate_upload(file)
    stored_path = save_bytes(
        content, file.content_type or "image/png", str(current_user.id), prefix="source"
    )
    source_url = to_public_url(stored_path)
    fal_url = await process_generation_task(
        {
            "mode": "filter",
            "prompt": image_prompt,
            "image_url": source_url,
            "image_path": stored_path,
            "aspect_ratio": aspect_ratio,
            "output_format": output_format,
            "resolution": resolution,
        }
    )
    _log_generation(session, current_user, "filter", prompt, fal_url)
    return ImageResult(image_data_url="", file_url=to_public_url(fal_url))


@router.post("/adjust", response_model=ImageResult)
async def adjust_image(
    session: deps.SessionDep,
    prompt: str = Form(...),
    file: UploadFile = File(...),
    aspect_ratio: str = Form("auto"),
    output_format: str = Form("png"),
    resolution: str = Form("1K"),
    current_user: User = Depends(deps.get_current_user),
) -> ImageResult:
    _ensure_credits_available(session, current_user)
    image_prompt = ADJUST_TEMPLATE.format(user_prompt=prompt)
    content = await _validate_upload(file)
    stored_path = save_bytes(
        content, file.content_type or "image/png", str(current_user.id), prefix="source"
    )
    source_url = to_public_url(stored_path)
    fal_url = await process_generation_task(
        {
            "mode": "adjust",
            "prompt": image_prompt,
            "image_url": source_url,
            "image_path": stored_path,
            "aspect_ratio": aspect_ratio,
            "output_format": output_format,
            "resolution": resolution,
        }
    )
    _log_generation(session, current_user, "adjust", prompt, fal_url)
    return ImageResult(image_data_url="", file_url=to_public_url(fal_url))


@router.post("/compose", response_model=ImageResult)
async def compose_image(
    session: deps.SessionDep,
    prompt: str = Form(...),
    files: list[UploadFile] = File(...),
    aspect_ratio: str = Form("auto"),
    output_format: str = Form("png"),
    resolution: str = Form("1K"),
    current_user: User = Depends(deps.get_current_user),
) -> ImageResult:
    _ensure_credits_available(session, current_user)

    if not files:
        raise HTTPException(status_code=400, detail="Необходимо загрузить хотя бы одно изображение")

    # Validate and store all files
    stored_paths: list[str] = []
    source_urls: list[str] = []

    for file in files[:10]:  # Limit to 10 images
        content = await _validate_upload(file)
        stored_path = save_bytes(
            content, file.content_type or "image/png", str(current_user.id), prefix="source"
        )
        stored_paths.append(stored_path)
        source_urls.append(to_public_url(stored_path))
        # Reset file position for potential re-read
        await file.seek(0)

    image_prompt = COMPOSE_TEMPLATE.format(user_prompt=prompt)

    fal_url = await process_generation_task(
        {
            "mode": "compose",
            "prompt": image_prompt,
            "image_urls": source_urls,  # List of URLs for multiple images
            "image_url": source_urls[0],  # Primary image for fallback
            "image_path": stored_paths[0],
            "aspect_ratio": aspect_ratio,
            "output_format": output_format,
            "resolution": resolution,
        }
    )
    _log_generation(session, current_user, "compose", prompt, fal_url)
    return ImageResult(image_data_url="", file_url=to_public_url(fal_url))


@router.post("/text-to-image", response_model=ImageResult)
async def text_to_image(
    session: deps.SessionDep,
    prompt: str = Form(...),
    aspect_ratio: str = Form("1:1"),
    resolution: str = Form("1K"),
    output_format: str = Form("png"),
    current_user: User = Depends(deps.get_current_user),
) -> ImageResult:
    _ensure_credits_available(session, current_user)
    fal_url = await process_generation_task(
        {
            "mode": "text-to-image",
            "prompt": prompt,
            "aspect_ratio": aspect_ratio,
            "output_format": output_format,
            "resolution": resolution,
        }
    )
    _log_generation(session, current_user, "text-to-image", prompt, fal_url)
    return ImageResult(image_data_url="", file_url=to_public_url(fal_url))


def _ensure_credits_available(session: deps.SessionDep, current_user: User) -> None:
    # В локальной среде не ограничиваем, чтобы не мешать тестам UI
    if settings.ENVIRONMENT == "local":
        return
    if current_user.is_superuser:
        return

    now = datetime.datetime.now(datetime.timezone.utc)
    minute_ago = now - datetime.timedelta(minutes=1)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today_start + datetime.timedelta(days=1)

    per_minute_stmt = (
        select(func.count())
        .select_from(GenerationLog)
        .where(
            GenerationLog.user_id == current_user.id,
            GenerationLog.created_at >= minute_ago,
        )
    )
    used_last_minute = session.exec(per_minute_stmt).one()
    if used_last_minute >= settings.RATE_LIMIT_PER_MINUTE:
        raise HTTPException(
            status_code=429,
            detail="Слишком много запросов. Попробуйте через минуту.",
        )

    if current_user.plan == "free":
        stmt = (
            select(func.count())
            .select_from(GenerationLog)
            .where(
                GenerationLog.user_id == current_user.id,
                GenerationLog.created_at >= today_start,
                GenerationLog.created_at < today_end,
            )
        )
        used_today = session.exec(stmt).one()
        if used_today >= settings.FREE_DAILY_CREDITS:
            raise HTTPException(
                status_code=429,
                detail="Достигнут дневной лимит генераций для бесплатного тарифа",
            )
    else:
        if current_user.credits_balance <= 0:
            raise HTTPException(
                status_code=402,
                detail="Недостаточно кредитов на платном тарифе",
            )


def _log_generation(
    session: deps.SessionDep,
    current_user: User,
    mode: str,
    prompt: str,
    file_path: str,
) -> None:
    if not current_user.is_superuser and current_user.plan != "free":
        stmt = (
            update(User)
            .where(User.id == current_user.id, User.credits_balance > 0)
            .values(credits_balance=User.credits_balance - 1)
            .returning(User.credits_balance)
        )
        new_balance = session.exec(stmt).scalar_one_or_none()
        if new_balance is None:
            session.rollback()
            raise HTTPException(
                status_code=402, detail="Недостаточно кредитов на платном тарифе"
            )
        current_user.credits_balance = new_balance  # keep in-memory copy in sync

    log_entry = GenerationLog(
        user_id=current_user.id,
        mode=mode,
        prompt=prompt[:255],
        file_path=file_path,
        cost=1,
    )
    session.add(log_entry)
    session.commit()


@router.get("/history", response_model=list[GenerationPublic])
def list_history(
    session: deps.SessionDep,
    current_user: User = Depends(deps.get_current_user),
    skip: int = 0,
    limit: int = 20,
) -> list[GenerationPublic]:
    stmt = (
        select(GenerationLog)
        .where(GenerationLog.user_id == current_user.id)
        .order_by(GenerationLog.created_at.desc())
        .offset(skip)
        .limit(min(limit, 100))
    )
    logs = session.exec(stmt).all()
    return [
        GenerationPublic(
            id=log.id,
            mode=log.mode,
            prompt=log.prompt,
            file_url=to_public_url(log.file_path),
            created_at=log.created_at,
        )
        for log in logs
    ]
