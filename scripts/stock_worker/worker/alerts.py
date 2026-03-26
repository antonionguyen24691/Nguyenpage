from __future__ import annotations

from dataclasses import asdict
from datetime import datetime, timezone

from .models import AlertRecord, MarketQuote
from .repositories import list_active_alerts, mark_alert_active, mark_alert_triggered
from .webhooks import deliver_webhook


def _in_cooldown(alert: AlertRecord) -> bool:
    if alert.last_triggered_at is None:
        return False

    elapsed = datetime.now(timezone.utc) - alert.last_triggered_at.astimezone(timezone.utc)
    return elapsed.total_seconds() < alert.cooldown_minutes * 60


def _should_trigger(alert: AlertRecord, quote: MarketQuote) -> bool:
    if alert.condition == "ABOVE":
        return quote.price >= alert.target
    if alert.condition == "BELOW":
        return quote.price <= alert.target
    return False


def process_alerts(quotes: list[MarketQuote]) -> dict[str, int]:
    quote_by_symbol = {quote.symbol: quote for quote in quotes}
    triggered = 0

    for alert in list_active_alerts():
        quote = quote_by_symbol.get(alert.symbol)
        if quote is None:
            continue

        if not _should_trigger(alert, quote):
            if alert.status == "TRIGGERED":
                mark_alert_active(alert.id)
            continue

        if _in_cooldown(alert):
            continue

        mark_alert_triggered(alert.id)
        triggered += 1

        if alert.webhook_id and alert.webhook_url and alert.webhook_secret and alert.webhook_active:
            deliver_webhook(
                webhook_id=alert.webhook_id,
                alert_id=alert.id,
                symbol=quote.symbol,
                payload=asdict(quote),
                url=alert.webhook_url,
                secret=alert.webhook_secret,
            )

    return {"triggered": triggered}
