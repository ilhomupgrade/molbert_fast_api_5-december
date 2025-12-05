import base64
import uuid
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlmodel import select

from app.api import deps
from app.core.config import settings
from app.models import Payment, User
from app.services.yookassa import YooKassaClient

router = APIRouter(prefix="/billing", tags=["billing"])


class CreatePaymentRequest(BaseModel):
    plan: str


class CreatePaymentResponse(BaseModel):
    confirmation_url: str
    payment_id: uuid.UUID


@router.post("/create-payment", response_model=CreatePaymentResponse)
async def create_payment(
    body: CreatePaymentRequest,
    session: deps.SessionDep,
    current_user: User = Depends(deps.get_current_user),
) -> CreatePaymentResponse:
    # In local environment we avoid hitting YooKassa and return a mock link
    if settings.ENVIRONMENT == "local":
        payment = Payment(
            user_id=current_user.id,
            yookassa_id=f"mock-{uuid.uuid4()}",
            status="pending",
            plan=body.plan,
            credits=settings.PRO_MONTHLY_CREDITS,
            amount=990_00,
        )
        session.add(payment)
        session.commit()
        session.refresh(payment)
        return CreatePaymentResponse(
            confirmation_url=str(settings.PAYMENT_RETURN_URL),
            payment_id=payment.id,
        )

    plan = body.plan.lower()
    if plan not in {"pro"}:
        raise HTTPException(status_code=400, detail="Неизвестный план")

    credits = settings.PRO_MONTHLY_CREDITS
    amount_rub = 990  # базовая цена за месяц в рублях
    amount_in_kopek = amount_rub * 100

    client = YooKassaClient()
    payment_resp = await client.create_payment(
        amount=amount_in_kopek,
        description=f"Molbert Pro для {current_user.email}",
        return_url=settings.PAYMENT_RETURN_URL,
        metadata={
            "user_id": str(current_user.id),
            "plan": plan,
            "credits": str(credits),
        },
    )

    yk_id = payment_resp.get("id")
    confirmation = payment_resp.get("confirmation", {})
    confirmation_url = confirmation.get("confirmation_url")
    if not yk_id or not confirmation_url:
        raise HTTPException(status_code=500, detail="Некорректный ответ ЮKassa")

    payment = Payment(
        user_id=current_user.id,
        yookassa_id=yk_id,
        status=payment_resp.get("status", "pending"),
        plan=plan,
        credits=credits,
        amount=amount_in_kopek,
    )
    session.add(payment)
    session.commit()
    session.refresh(payment)

    return CreatePaymentResponse(
        confirmation_url=confirmation_url,
        payment_id=payment.id,
    )


class WebhookPayload(BaseModel):
    event: str
    object: dict


def _verify_basic_auth(request: Request) -> None:
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Basic "):
        raise HTTPException(status_code=401, detail="Нет авторизации")
    try:
        token = auth_header.split(" ", 1)[1]
        decoded = base64.b64decode(token).decode()
        shop_id, secret = decoded.split(":", 1)
    except Exception:
        raise HTTPException(status_code=401, detail="Некорректная авторизация")

    if shop_id != settings.YOOKASSA_SHOP_ID or secret != settings.YOOKASSA_SECRET_KEY:
        raise HTTPException(status_code=401, detail="Неверные учетные данные")


def _verify_source_ip(request: Request) -> None:
    """
    Примитивная проверка источника по IP, если список задан.
    """
    if not settings.YOOKASSA_WEBHOOK_ALLOWED_IPS:
        return
    client = request.client
    client_ip = client.host if client else None
    if client_ip not in settings.YOOKASSA_WEBHOOK_ALLOWED_IPS:
        raise HTTPException(status_code=403, detail="Источник webhook не разрешён")


@router.post("/webhook", status_code=200)
def yookassa_webhook(
    request: Request,
    payload: WebhookPayload,
    session: deps.SessionDep,
) -> dict:
    _verify_basic_auth(request)
    _verify_source_ip(request)

    if payload.event != "payment.succeeded":
        return {"status": "ignored"}

    payment_obj = payload.object or {}
    yk_id = payment_obj.get("id")
    metadata = payment_obj.get("metadata") or {}

    if not yk_id:
        raise HTTPException(status_code=400, detail="Нет идентификатора платежа")

    stmt = select(Payment).where(Payment.yookassa_id == yk_id)
    payment = session.exec(stmt).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Платеж не найден")

    if payment.status == "succeeded":
        return {"status": "already_applied"}

    user_id = metadata.get("user_id") or str(payment.user_id)
    plan = metadata.get("plan") or payment.plan
    credits = int(metadata.get("credits") or payment.credits or 0)
    amount = payment_obj.get("amount") or {}
    amount_value = amount.get("value", "0")
    currency = amount.get("currency", "")

    try:
        amount_kopeks = int(Decimal(amount_value) * 100)
    except Exception:
        raise HTTPException(status_code=400, detail="Некорректная сумма платежа")

    if amount_kopeks != payment.amount or currency != "RUB":
        raise HTTPException(status_code=400, detail="Несовпадение суммы или валюты платежа")

    if plan != payment.plan or credits != payment.credits:
        raise HTTPException(
            status_code=400,
            detail="Несовпадение параметров платежа (plan/credits)",
        )

    user = session.get(User, uuid.UUID(user_id))
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")

    user.plan = plan
    user.credits_balance = user.credits_balance + credits
    payment.status = "succeeded"
    session.add(user)
    session.add(payment)
    session.commit()

    return {"status": "applied", "user_id": str(user.id)}
