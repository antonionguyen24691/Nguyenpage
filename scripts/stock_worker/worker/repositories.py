from __future__ import annotations

import json
import uuid
from typing import Any

from .db import get_db
from .models import AlertRecord


def list_tracked_symbols() -> list[str]:
    with get_db() as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                select distinct upper(symbol) as symbol
                from "Alert"
                where status in ('ACTIVE', 'TRIGGERED')
                union
                select distinct upper("symbol") as symbol
                from "WatchlistItem"
                order by symbol
                """
            )
            rows = cursor.fetchall()

    return [row["symbol"] for row in rows if row["symbol"]]


def list_active_alerts() -> list[AlertRecord]:
    with get_db() as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                select
                  a.id,
                  a."userId" as user_id,
                  a."webhookId" as webhook_id,
                  upper(a.symbol) as symbol,
                  a.target,
                  a.condition::text as condition,
                  a.status::text as status,
                  a."cooldownMinutes" as cooldown_minutes,
                  a."lastTriggeredAt" as last_triggered_at,
                  w.url as webhook_url,
                  w.secret as webhook_secret,
                  w."isActive" as webhook_active
                from "Alert" a
                left join "Webhook" w on w.id = a."webhookId"
                where a.status in ('ACTIVE', 'TRIGGERED')
                order by a."createdAt" asc
                """
            )
            rows = cursor.fetchall()

    return [AlertRecord(**row) for row in rows]


def mark_alert_triggered(alert_id: str) -> None:
    with get_db() as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                update "Alert"
                set "lastTriggeredAt" = now(),
                    status = 'TRIGGERED'::"AlertStatus"
                where id = %s
                """,
                (alert_id,),
            )


def mark_alert_active(alert_id: str) -> None:
    with get_db() as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                update "Alert"
                set status = 'ACTIVE'::"AlertStatus"
                where id = %s
                """,
                (alert_id,),
            )


def create_webhook_attempt(
    webhook_id: str,
    alert_id: str | None,
    delivery_key: str,
    attempt_no: int,
    success: bool,
    payload: dict[str, Any],
    status_code: int | None = None,
    response: str | None = None,
) -> None:
    with get_db() as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                insert into "WebhookAttempt"
                  (id, "webhookId", "alertId", "deliveryKey", "attemptNo", "statusCode", success, payload, response, "createdAt")
                values
                  (%s, %s, %s, %s, %s, %s, %s, %s::jsonb, %s, now())
                """,
                (
                    str(uuid.uuid4()),
                    webhook_id,
                    alert_id,
                    delivery_key,
                    attempt_no,
                    status_code,
                    success,
                    json.dumps(payload),
                    response,
                ),
            )
