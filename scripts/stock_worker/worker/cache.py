from __future__ import annotations

import json

import requests

from .models import MarketQuote
from .settings import get_settings


def cache_quotes(quotes: list[MarketQuote]) -> None:
    settings = get_settings()
    if not settings.upstash_redis_rest_url or not settings.upstash_redis_rest_token:
        return

    headers = {
        "authorization": f"Bearer {settings.upstash_redis_rest_token}",
        "content-type": "application/json",
    }

    commands = []
    for quote in quotes:
        commands.append(
            [
                "SET",
                f"quote:{quote.symbol}",
                json.dumps(
                    {
                        "symbol": quote.symbol,
                        "price": quote.price,
                        "change": quote.change,
                        "changePercent": quote.change_percent,
                        "volume": quote.volume,
                        "updatedAt": quote.updated_at,
                    }
                ),
                "EX",
                60,
            ]
        )

    if not commands:
        return

    response = requests.post(
        f"{settings.upstash_redis_rest_url}/pipeline",
        headers=headers,
        json=commands,
        timeout=15,
    )
    response.raise_for_status()
