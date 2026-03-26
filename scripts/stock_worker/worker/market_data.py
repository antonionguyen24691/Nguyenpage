from __future__ import annotations

from datetime import datetime, timezone

from vnstock import Trading

from .models import MarketQuote
from .settings import get_settings


def _to_float(value: object) -> float:
    try:
        if value is None:
            return 0.0
        return float(value)
    except (TypeError, ValueError):
        return 0.0


def fetch_quotes(symbols: list[str]) -> list[MarketQuote]:
    if not symbols:
        return []

    settings = get_settings()
    trading = Trading(source=settings.vnstock_source, symbol=settings.vnstock_symbol)
    board = trading.price_board(symbols_list=symbols)

    if hasattr(board.columns, "nlevels") and board.columns.nlevels > 1:
        board = board.copy()
        board.columns = ["_".join([str(part) for part in column if part]).strip("_") for column in board.columns]

    quotes: list[MarketQuote] = []
    now = datetime.now(timezone.utc).isoformat()

    for _, row in board.iterrows():
        symbol = str(row.get("symbol") or row.get("listing_symbol") or "").upper()
        if not symbol:
            continue

        price = _to_float(
            row.get("close_price")
            or row.get("match_match_price")
            or row.get("match_price")
        )
        reference_price = _to_float(
            row.get("reference_price")
            or row.get("listing_ref_price")
            or row.get("ref_price")
        )
        change = _to_float(row.get("price_change")) or (price - reference_price)
        percent_change = _to_float(row.get("percent_change"))
        if percent_change == 0 and reference_price > 0:
            percent_change = (change / reference_price) * 100

        volume = _to_float(
            row.get("total_trades")
            or row.get("match_accumulated_volume")
            or row.get("accumulated_volume")
            or row.get("match_match_vol")
            or row.get("match_vol")
        )

        quotes.append(
            MarketQuote(
                symbol=symbol,
                price=price,
                change=change,
                change_percent=percent_change,
                volume=volume,
                updated_at=now,
            )
        )

    return quotes
