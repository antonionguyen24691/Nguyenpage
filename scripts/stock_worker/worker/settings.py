from __future__ import annotations

import os
from dataclasses import dataclass

from dotenv import load_dotenv

load_dotenv()


def _as_bool(value: str | None, default: bool) -> bool:
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


@dataclass(frozen=True)
class Settings:
    database_url: str
    upstash_redis_rest_url: str
    upstash_redis_rest_token: str
    vnstock_source: str
    vnstock_symbol: str
    vnstock_symbols: str
    webhook_max_retries: int
    webhook_retry_base_delay_ms: int
    worker_continuous: bool
    worker_run_on_start: bool
    worker_poll_interval_ms: int
    worker_cycle_retry_limit: int
    worker_cycle_retry_base_delay_ms: int
    tcbs_allow_demo_fallback: bool


def get_settings() -> Settings:
    return Settings(
        database_url=os.environ.get("DATABASE_URL", ""),
        upstash_redis_rest_url=os.environ.get("UPSTASH_REDIS_REST_URL", ""),
        upstash_redis_rest_token=os.environ.get("UPSTASH_REDIS_REST_TOKEN", ""),
        vnstock_source=os.environ.get("VNSTOCK_SOURCE", "KBS"),
        vnstock_symbol=os.environ.get("VNSTOCK_SYMBOL", "VCI"),
        vnstock_symbols=os.environ.get("VNSTOCK_SYMBOLS", ""),
        webhook_max_retries=int(os.environ.get("WEBHOOK_MAX_RETRIES", "3")),
        webhook_retry_base_delay_ms=int(os.environ.get("WEBHOOK_RETRY_BASE_DELAY_MS", "1000")),
        worker_continuous=_as_bool(os.environ.get("WORKER_CONTINUOUS"), True),
        worker_run_on_start=_as_bool(os.environ.get("WORKER_RUN_ON_START"), True),
        worker_poll_interval_ms=int(os.environ.get("WORKER_POLL_INTERVAL_MS", "15000")),
        worker_cycle_retry_limit=int(os.environ.get("WORKER_CYCLE_RETRY_LIMIT", "3")),
        worker_cycle_retry_base_delay_ms=int(
            os.environ.get("WORKER_CYCLE_RETRY_BASE_DELAY_MS", "1000")
        ),
        tcbs_allow_demo_fallback=_as_bool(os.environ.get("TCBS_ALLOW_DEMO_FALLBACK"), True),
    )
