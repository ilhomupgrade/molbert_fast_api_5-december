import uuid

import httpx
from fastapi import HTTPException

from app.core.config import settings


class YooKassaClient:
    def __init__(self) -> None:
        if not settings.YOOKASSA_SHOP_ID or not settings.YOOKASSA_SECRET_KEY:
            raise HTTPException(
                status_code=503,
                detail="Платежная система не настроена",
            )
        self.base_url = "https://api.yookassa.ru/v3"
        self.auth = (settings.YOOKASSA_SHOP_ID, settings.YOOKASSA_SECRET_KEY)

    async def create_payment(
        self,
        *,
        amount: int,
        description: str,
        return_url: str,
        metadata: dict[str, str],
    ) -> dict:
        """
        Создает платеж в ЮKassa и возвращает JSON ответа.
        Amount передается в копейках.
        """
        payload = {
            "amount": {"value": f"{amount/100:.2f}", "currency": "RUB"},
            "confirmation": {
                "type": "redirect",
                "return_url": return_url,
            },
            "capture": True,
            "description": description[:128],
            "metadata": metadata,
        }

        headers = {"Idempotence-Key": str(uuid.uuid4())}
        async with httpx.AsyncClient(timeout=30.0, auth=self.auth) as client:
            resp = await client.post(
                f"{self.base_url}/payments",
                json=payload,
                headers=headers,
            )
            if resp.status_code >= 400:
                raise HTTPException(
                    status_code=resp.status_code,
                    detail=f"Ошибка ЮKassa: {resp.text}",
                )
            return resp.json()
