from __future__ import annotations

import json
import time

from .alerts import process_alerts
from .cache import cache_quotes
from .market_data import fetch_quotes
from .repositories import list_tracked_symbols
from .settings import get_settings


def run_cycle() -> None:
    symbols = list_tracked_symbols()
    quotes = fetch_quotes(symbols)
    cache_quotes(quotes)
    alert_result = process_alerts(quotes)

    print(
        json.dumps(
            {
                "trackedSymbols": len(symbols),
                "syncedSymbols": len(quotes),
                "triggeredAlerts": alert_result["triggered"],
            },
            ensure_ascii=True,
        )
    )


def run_cycle_with_retry() -> None:
    settings = get_settings()

    for attempt in range(1, settings.worker_cycle_retry_limit + 1):
        try:
            run_cycle()
            return
        except Exception as error:
            print(f"Worker cycle failed on attempt {attempt}: {error}")
            if attempt >= settings.worker_cycle_retry_limit:
                raise
            time.sleep((settings.worker_cycle_retry_base_delay_ms * (2 ** (attempt - 1))) / 1000)


def main() -> None:
    settings = get_settings()

    if settings.worker_run_on_start:
        run_cycle_with_retry()

    if not settings.worker_continuous:
        return

    while True:
        time.sleep(settings.worker_poll_interval_ms / 1000)
        run_cycle_with_retry()


if __name__ == "__main__":
    main()
