import asyncio
import base64
from typing import Any

from fastapi import HTTPException, UploadFile
from google import genai
from google.genai import types as genai_types

from app.core.config import settings


def _get_client() -> genai.Client:
    if not settings.GEMINI_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="GEMINI_API_KEY is not configured on the server",
        )
    return genai.Client(api_key=settings.GEMINI_API_KEY)


async def _upload_to_part(upload: UploadFile) -> genai_types.Part:
    content = await upload.read()
    max_size = 10 * 1024 * 1024  # 10 MB
    if len(content) > max_size:
        raise HTTPException(
            status_code=413, detail="Файл слишком большой. Максимум 10 МБ."
        )

    allowed_types = {
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/gif",
    }
    mime_type = upload.content_type or "image/png"
    if mime_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail="Неверный формат изображения. Разрешено: JPEG, PNG, WebP, GIF.",
        )

    mime_type = upload.content_type or "image/png"
    return genai_types.Part.from_bytes(data=content, mime_type=mime_type)


def _format_image_part(image_part: Any) -> str:
    inline_data = getattr(image_part, "inline_data", None)
    if not inline_data:
        raise HTTPException(
            status_code=500, detail="Model response did not include image data"
        )

    raw_data = inline_data.data  # can be base64 str or bytes depending on SDK version
    if isinstance(raw_data, bytes):
        b64_data = base64.b64encode(raw_data).decode("utf-8")
    else:
        b64_data = raw_data

    mime_type = inline_data.mime_type or "image/png"
    return f"data:{mime_type};base64,{b64_data}"


def _extract_image_response(
    response: genai_types.GenerateContentResponse, context: str
) -> str:
    candidates = getattr(response, "candidates", None) or []
    for candidate in candidates:
        content = getattr(candidate, "content", None)
        parts = getattr(content, "parts", None) or []
        for part in parts:
            if getattr(part, "inline_data", None):
                return _format_image_part(part)

    finish_reason = getattr(candidates[0], "finish_reason", None) if candidates else None
    raise HTTPException(
        status_code=500,
        detail=(
            f"Gemini did not return an image for {context}."
            + (f" Finish reason: {finish_reason}." if finish_reason else "")
        ),
    )


async def generate_image_with_prompt(
    upload: UploadFile, prompt: str, *, model: str = "gemini-2.0-flash", context: str
) -> str:
    """
    Send an image + text prompt to Gemini and return a data URL.
    """
    client = _get_client()
    image_part = await _upload_to_part(upload)
    text_part = genai_types.Part.from_text(prompt)

    response = await asyncio.to_thread(
        client.models.generate_content,
        model=model,
        contents=[image_part, text_part],
    )

    return _extract_image_response(response, context=context)
