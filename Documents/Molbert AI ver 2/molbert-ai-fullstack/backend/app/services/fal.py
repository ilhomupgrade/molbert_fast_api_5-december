import httpx
from fastapi import HTTPException

from app.core.config import settings


class FalClient:
    BASE_TTI = "https://fal.run/fal-ai/nano-banana-pro"
    BASE_EDIT = "https://fal.run/fal-ai/nano-banana-pro/edit"

    @staticmethod
    def _headers() -> dict[str, str]:
        if not settings.FAL_API_KEY:
            raise HTTPException(status_code=503, detail="FAL_API_KEY не настроен на сервере")
        return {
            "Authorization": f"Key {settings.FAL_API_KEY}",
            "Content-Type": "application/json",
        }

    @staticmethod
    async def text_to_image(
        prompt: str,
        *,
        aspect_ratio: str = "1:1",
        output_format: str = "png",
        resolution: str | None = None,
        num_images: int = 1,
    ) -> str:
        payload = {
            "prompt": prompt,
            "num_images": num_images,
            "aspect_ratio": aspect_ratio,
            "output_format": output_format,
        }
        if resolution:
            payload["resolution"] = resolution
        async with httpx.AsyncClient(timeout=120) as client:
            resp = await client.post(FalClient.BASE_TTI, headers=FalClient._headers(), json=payload)
        if resp.status_code >= 400:
            raise HTTPException(status_code=resp.status_code, detail=f"FAL error: {resp.text}")
        data = resp.json()
        images = data.get("images") or []
        if not images:
            raise HTTPException(status_code=500, detail="FAL не вернул изображение")
        return images[0].get("url")

    @staticmethod
    async def edit_image(
        prompt: str,
        image_url: str,
        *,
        aspect_ratio: str = "auto",
        output_format: str = "png",
        resolution: str | None = None,
        num_images: int = 1,
    ) -> str:
        payload = {
            "prompt": prompt,
            "num_images": num_images,
            "aspect_ratio": aspect_ratio,
            "output_format": output_format,
            "image_urls": [image_url],
        }
        if resolution:
            payload["resolution"] = resolution
        async with httpx.AsyncClient(timeout=120) as client:
            resp = await client.post(FalClient.BASE_EDIT, headers=FalClient._headers(), json=payload)
        if resp.status_code >= 400:
            raise HTTPException(status_code=resp.status_code, detail=f"FAL error: {resp.text}")
        data = resp.json()
        images = data.get("images") or []
        if not images:
            raise HTTPException(status_code=500, detail="FAL не вернул изображение")
        return images[0].get("url")

    @staticmethod
    async def compose_images(
        prompt: str,
        image_urls: list[str],
        *,
        aspect_ratio: str = "auto",
        output_format: str = "png",
        resolution: str | None = None,
        num_images: int = 1,
    ) -> str:
        """Compose multiple images into one using FAL edit endpoint with multiple image_urls."""
        payload = {
            "prompt": prompt,
            "num_images": num_images,
            "aspect_ratio": aspect_ratio,
            "output_format": output_format,
            "image_urls": image_urls,  # Pass all image URLs
        }
        if resolution:
            payload["resolution"] = resolution
        async with httpx.AsyncClient(timeout=120) as client:
            resp = await client.post(FalClient.BASE_EDIT, headers=FalClient._headers(), json=payload)
        if resp.status_code >= 400:
            raise HTTPException(status_code=resp.status_code, detail=f"FAL error: {resp.text}")
        data = resp.json()
        images = data.get("images") or []
        if not images:
            raise HTTPException(status_code=500, detail="FAL не вернул изображение")
        return images[0].get("url")
