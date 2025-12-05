import base64
import uuid
from pathlib import Path
from typing import Protocol

import boto3
from fastapi import HTTPException

from app.core.config import settings


class StorageBackend(Protocol):
    def save(self, data: bytes, mime: str, user_id: str, prefix: str) -> str: ...

    def to_public_url(self, stored_path: str) -> str: ...


class LocalStorageBackend:
    def __init__(self, base_path: Path) -> None:
        self.base_path = base_path.resolve()
        self.base_path.mkdir(parents=True, exist_ok=True)

    def save(self, data: bytes, mime: str, user_id: str, prefix: str) -> str:
        ext = {
            "image/png": ".png",
            "image/jpeg": ".jpg",
            "image/jpg": ".jpg",
            "image/webp": ".webp",
        }.get(mime, ".png")
        filename = f"{prefix}-{user_id}-{uuid.uuid4()}{ext}"
        file_path = self.base_path / filename
        with open(file_path, "wb") as f:
            f.write(data)
        return str(file_path)

    def to_public_url(self, stored_path: str) -> str:
        if isinstance(stored_path, str) and stored_path.startswith("http"):
            return stored_path
        try:
            relative = Path(stored_path).resolve().relative_to(self.base_path)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid stored file path")
        # если задан PUBLIC_API_URL, возвращаем абсолютную ссылку (нужно для внешних API)
        if settings.PUBLIC_API_URL:
            base = str(settings.PUBLIC_API_URL).rstrip("/")
            return f"{base}/media/{relative.as_posix()}"
        return f"/media/{relative.as_posix()}"


class S3StorageBackend:
    def __init__(self) -> None:
        if not (
            settings.S3_BUCKET
            and settings.S3_ACCESS_KEY
            and settings.S3_SECRET_KEY
            and settings.S3_ENDPOINT_URL
        ):
            raise HTTPException(
                status_code=503, detail="S3 хранилище не настроено на сервере"
            )
        self.bucket = settings.S3_BUCKET
        self.public_base = settings.S3_PUBLIC_BASE_URL or f"{settings.S3_ENDPOINT_URL}/{self.bucket}"
        self.client = boto3.client(
            "s3",
            endpoint_url=str(settings.S3_ENDPOINT_URL),
            aws_access_key_id=settings.S3_ACCESS_KEY,
            aws_secret_access_key=settings.S3_SECRET_KEY,
            region_name=settings.S3_REGION,
        )

    def save(self, data: bytes, mime: str, user_id: str, prefix: str) -> str:
        ext = {
            "image/png": ".png",
            "image/jpeg": ".jpg",
            "image/jpg": ".jpg",
            "image/webp": ".webp",
        }.get(mime, ".png")
        key = f"{user_id}/{prefix}-{uuid.uuid4()}{ext}"
        self.client.put_object(Bucket=self.bucket, Key=key, Body=data, ContentType=mime)
        return key

    def to_public_url(self, stored_path: str) -> str:
        if stored_path.startswith("http"):
            return stored_path
        return f"{self.public_base}/{stored_path}"


def _get_backend() -> StorageBackend:
    if settings.STORAGE_BACKEND == "s3":
        return S3StorageBackend()
    return LocalStorageBackend(Path(settings.STORAGE_PATH))


_backend = _get_backend()


def save_data_url(data_url: str, user_id: str, *, prefix: str = "image") -> str:
    """
    Persist a data URL (data:<mime>;base64,...) to storage and return stored path/key.
    """
    if not data_url.startswith("data:"):
        raise HTTPException(status_code=400, detail="Invalid image payload")

    try:
        header, b64_data = data_url.split(",", 1)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid image payload")

    mime_part = header.split(";")[0]
    _, mime = mime_part.split(":", 1)

    try:
        binary = base64.b64decode(b64_data)
    except Exception as exc:  # pragma: no cover - defensive
        raise HTTPException(status_code=400, detail="Invalid base64 image") from exc

    return _backend.save(binary, mime, user_id, prefix)


def save_bytes(data: bytes, mime: str, user_id: str, *, prefix: str = "image") -> str:
    """
    Persist raw bytes to storage and return stored path/key.
    """
    return _backend.save(data, mime, user_id, prefix)


def to_public_url(stored_path: str) -> str:
    """
    Convert stored path/key to a public URL (absolute for S3, /media for local).
    """
    return _backend.to_public_url(stored_path)
