from __future__ import annotations

import hashlib
import hmac
import json
import time
import uuid

import requests

from .repositories import create_webhook_attempt
from .settings import get_settings


def _is_retryable(status_code: int) -> bool:
    return status_code >= 500 or status_code == 429


def deliver_webhook(
    webhook_id: str,
    alert_id: str | None,
    symbol: str,
    payload: dict,
    url: str,
    secret: str,
) -> None:
    settings = get_settings()
    body = json.dumps(
        {
            "event": "alert.triggered",
            "symbol": symbol,
            "data": payload,
        }
    )
    delivery_key = str(uuid.uuid4())
    signature = hmac.new(secret.encode("utf-8"), body.encode("utf-8"), hashlib.sha256).hexdigest()

    for attempt_no in range(1, settings.webhook_max_retries + 1):
        try:
            response = requests.post(
                url,
                headers={
                    "content-type": "application/json",
                    "x-stock-signature": signature,
                    "x-stock-delivery-id": delivery_key,
                    "x-stock-attempt": str(attempt_no),
                },
                data=body,
                timeout=20,
            )
            response_text = "ok" if response.ok else response.text
            create_webhook_attempt(
                webhook_id=webhook_id,
                alert_id=alert_id,
                delivery_key=delivery_key,
                attempt_no=attempt_no,
                success=response.ok,
                status_code=response.status_code,
                payload=json.loads(body),
                response=response_text,
            )
            if response.ok or not _is_retryable(response.status_code) or attempt_no >= settings.webhook_max_retries:
                return
        except requests.RequestException as error:
            create_webhook_attempt(
                webhook_id=webhook_id,
                alert_id=alert_id,
                delivery_key=delivery_key,
                attempt_no=attempt_no,
                success=False,
                payload=json.loads(body),
                response=str(error),
            )
            if attempt_no >= settings.webhook_max_retries:
                return

        time.sleep((settings.webhook_retry_base_delay_ms * (2 ** (attempt_no - 1))) / 1000)
