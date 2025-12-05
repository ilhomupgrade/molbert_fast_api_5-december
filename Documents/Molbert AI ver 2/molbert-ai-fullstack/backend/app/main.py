import sentry_sdk
from pathlib import Path
from fastapi import FastAPI
from fastapi.routing import APIRoute
from fastapi.staticfiles import StaticFiles
from starlette.middleware.cors import CORSMiddleware
import logging

from app.api.main import api_router
from app.core.config import settings
from app.broker import broker


def custom_generate_unique_id(route: APIRoute) -> str:
    return f"{route.tags[0]}-{route.name}"


if settings.SENTRY_DSN and settings.ENVIRONMENT != "local":
    sentry_sdk.init(dsn=str(settings.SENTRY_DSN), enable_tracing=True)

logger = logging.getLogger(__name__)

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    generate_unique_id_function=custom_generate_unique_id,
)

if settings.STORAGE_BACKEND == "local":
    storage_dir = Path(settings.STORAGE_PATH).resolve()
    storage_dir.mkdir(parents=True, exist_ok=True)
    app.mount("/media", StaticFiles(directory=storage_dir), name="media")

# Set all CORS enabled origins
if settings.all_cors_origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.all_cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )


@app.on_event("startup")
async def connect_broker() -> None:
    try:
        await broker.connect()
        logger.info("RabbitMQ broker connected")
    except Exception as exc:  # pragma: no cover - defensive
        logger.warning("Не удалось подключиться к RabbitMQ на старте: %s", exc)


@app.on_event("shutdown")
async def disconnect_broker() -> None:
    try:
        await broker.close()
        logger.info("RabbitMQ broker closed")
    except Exception:
        pass


app.include_router(api_router, prefix=settings.API_V1_STR)
