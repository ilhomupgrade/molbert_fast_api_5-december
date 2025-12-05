import asyncio
import logging
from typing import Any

from fastapi import HTTPException

from app.broker import broker

logger = logging.getLogger(__name__)


async def _ensure_broker_connected() -> None:
    """
    Make sure the broker connection is alive.
    Calling connect() repeatedly is safe; it will noop if already connected.
    """
    try:
        await broker.connect()
    except Exception as exc:  # pragma: no cover - defensive
        logger.exception("Не удалось подключиться к брокеру RabbitMQ: %s", exc)
        raise HTTPException(status_code=503, detail="Очередь недоступна") from exc


async def process_generation_task(
    payload: dict[str, Any],
    *,
    timeout: float = 120.0,
    retries: int = 2,
) -> str:
    """
    Publish generation payload to RabbitMQ and wait for the worker reply (RPC style).
    Retries on transport/timeout errors.
    """
    await _ensure_broker_connected()

    last_error: Exception | None = None
    for attempt in range(1, retries + 2):
        try:
            logger.info("Отправка задания в очередь (попытка %s): %s", attempt, payload.get("mode"))
            response_msg = await asyncio.wait_for(
                broker.request(payload, queue="generation", timeout=timeout),
                timeout=timeout,
            )
            response = await response_msg.decode() if response_msg else None
            if isinstance(response, dict) and response.get("status") == "ok":
                file_url = response.get("file_url")
                if not file_url:
                    raise HTTPException(status_code=500, detail="Пустой ответ от воркера")
                return file_url

            detail = ""
            code = 500
            if isinstance(response, dict):
                detail = response.get("detail") or "Ошибка воркера"
                code = int(response.get("code") or 500)
            raise HTTPException(status_code=code, detail=detail)
        except asyncio.TimeoutError as exc:
            last_error = exc
            logger.warning("Таймаут ожидания ответа от воркера")
        except Exception as exc:  # pragma: no cover - defensive
            last_error = exc
            logger.exception("Ошибка при отправке задания в очередь: %s", exc)

        await asyncio.sleep(1)

    raise HTTPException(
        status_code=504,
        detail=f"Воркер недоступен ({last_error})",
    )
