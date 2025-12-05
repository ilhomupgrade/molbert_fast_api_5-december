import logging
from io import BytesIO
from pathlib import Path
from urllib.parse import urlparse

import httpx

from fastapi import HTTPException
from faststream import FastStream

from app.broker import broker
from app.core.config import settings
from app.services.fal import FalClient

logger = logging.getLogger(__name__)


async def _public_image_url(image_url: str | None, image_path: str | None) -> str | None:
    """
    Ensure the image URL is reachable by fal. If it's a local /media path,
    try to re-upload to a temporary hosting (file.io).
    """
    if not image_url:
        return None
    parsed = urlparse(image_url)
    is_http = parsed.scheme in {"http", "https"}
    host = parsed.hostname or ""
    is_local_host = host in {"localhost", "127.0.0.1", "backend"} or host.endswith(
        ".local"
    )
    needs_rehost = (
        not is_http
        or is_local_host
        or settings.STORAGE_BACKEND == "local"
        or image_url.startswith("/media/")
    )

    if not needs_rehost:
        return image_url

    file_bytes: bytes | None = None

    if image_path:
        path = Path(image_path)
        if path.exists():
            try:
                file_bytes = path.read_bytes()
            except Exception as exc:  # pragma: no cover - defensive
                logger.warning("Не удалось прочитать файл %s: %s", path, exc)

    # Fall back to downloading from backend service if we couldn't read from disk
    if file_bytes is None:
        internal_url = image_url
        if is_local_host:
            path_only = parsed.path or ""
            if path_only.startswith("//"):
                path_only = path_only[1:]
            if not path_only.startswith("/"):
                path_only = f"/{path_only}"
            internal_url = f"http://backend:8000{path_only}"
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.get(internal_url)
            if resp.status_code == 200:
                file_bytes = resp.content
            else:
                logger.warning(
                    "Не удалось скачать изображение %s: %s %s",
                    internal_url,
                    resp.status_code,
                    resp.text,
                )
        except Exception as exc:  # pragma: no cover - defensive
            logger.warning("Не удалось скачать изображение %s: %s", internal_url, exc)

    if file_bytes is None:
        return image_url

    # Attempt 1: tmpfiles.org (works without auth, returns direct URL)
    try:
        async with httpx.AsyncClient(timeout=30, follow_redirects=True) as client:
            buffer = BytesIO(file_bytes)
            files = {"file": ("image.png", buffer, "image/png")}
            resp = await client.post("https://tmpfiles.org/api/v1/upload", files=files)
        if resp.status_code == 200:
            data = resp.json()
            link = (data.get("data") or {}).get("url")
            if link:
                parsed_tmp = urlparse(str(link))
                parts = parsed_tmp.path.strip("/").split("/")
                direct = (
                    f"https://tmpfiles.org/dl/{parts[-2]}/{parts[-1]}"
                    if len(parts) >= 2
                    else str(link)
                )
                logger.info("Rehosted image to %s (tmpfiles)", direct)
                return direct
            logger.warning("tmpfiles response without link: %s", data)
        else:
            logger.warning(
                "tmpfiles upload failed: %s %s", resp.status_code, resp.text
            )
    except Exception as exc:  # pragma: no cover - defensive
        logger.warning("Не удалось перезалить файл на tmpfiles: %s", exc)

    # Attempt 2: file.io (redirects to www.file.io)
    try:
        async with httpx.AsyncClient(timeout=30, follow_redirects=True) as client:
            buffer = BytesIO(file_bytes)
            files = {"file": ("image.png", buffer, "image/png")}
            resp = await client.post("https://www.file.io", files=files)
        if resp.status_code == 200:
            data = resp.json()
            link = data.get("link")
            if link:
                logger.info("Rehosted image to %s (file.io)", link)
                return link
            logger.warning("file.io response without link: %s", data)
        else:
            logger.warning("file.io upload failed: %s %s", resp.status_code, resp.text)
    except Exception as exc:  # pragma: no cover - defensive
        logger.warning("Не удалось перезалить файл на file.io: %s", exc)

    return image_url


@broker.subscriber("generation")
async def handle_generation(payload: dict) -> dict:
    mode = payload.get("mode")
    logger.info("Получено задание %s", mode)
    try:
        if mode == "text-to-image":
            fal_url = await FalClient.text_to_image(
                payload["prompt"],
                aspect_ratio=payload.get("aspect_ratio", "1:1"),
                output_format=payload.get("output_format", "png"),
                resolution=payload.get("resolution"),
            )
        elif mode in {"edit", "filter", "adjust"}:
            image_url = await _public_image_url(
                payload.get("image_url"), payload.get("image_path")
            )
            fal_url = await FalClient.edit_image(
                payload["prompt"],
                image_url or payload["image_url"],
                aspect_ratio=payload.get("aspect_ratio", "auto"),
                output_format=payload.get("output_format", "png"),
                resolution=payload.get("resolution"),
            )
        else:
            raise HTTPException(status_code=400, detail=f"Неизвестный режим {mode}")

        logger.info("Задание %s выполнено", mode)
        return {"status": "ok", "file_url": fal_url}
    except HTTPException as exc:
        logger.warning("Ошибка HTTP при обработке %s: %s", mode, exc.detail)
        return {"status": "error", "code": exc.status_code, "detail": exc.detail}
    except Exception as exc:  # pragma: no cover - defensive
        logger.exception("Неожиданная ошибка в воркере: %s", exc)
        return {"status": "error", "code": 500, "detail": str(exc)}


app = FastStream(broker)


if __name__ == "__main__":
    # запуск: python -m app.worker
    import asyncio

    asyncio.run(app.run())
