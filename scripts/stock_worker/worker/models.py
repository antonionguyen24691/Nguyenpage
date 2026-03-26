from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime


@dataclass(frozen=True)
class MarketQuote:
    symbol: str
    price: float
    change: float
    change_percent: float
    volume: float
    updated_at: str


@dataclass(frozen=True)
class AlertRecord:
    id: str
    user_id: str
    webhook_id: str | None
    symbol: str
    target: float
    condition: str
    status: str
    cooldown_minutes: int
    last_triggered_at: datetime | None
    webhook_url: str | None
    webhook_secret: str | None
    webhook_active: bool | None
