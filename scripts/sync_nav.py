"""
sync_nav.py — Crawl NAV lịch sử từ Fmarket API và đẩy vào Supabase.
Chạy bởi GitHub Actions hàng ngày hoặc bằng tay.

Usage:
  python scripts/sync_nav.py

Env vars needed:
  SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
"""

import os
import sys
import json
import requests
from datetime import datetime

# ─── Config ────────────────────────────────────────────────────
SUPABASE_URL = os.environ.get("SUPABASE_URL", "").strip('"')
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "").strip('"')

FMARKET_NAV_URL = "https://api.fmarket.vn/res/product/get-nav-history"

# Mapping: fund_code -> fmarket productId
FUNDS = {
    "VESAF": 23,
    "VEOF": 20,
    "VLGF": 49,
    "VFF": 21,
    "VIBF": 22,
    "DCIP": 67,
    "DCBF": 27,
    "DCDS": 28,
    "SSIBF": 8,
    "SSISCA": 11,
}

CHUNK_SIZE = 500

# ─── Fmarket Crawl ─────────────────────────────────────────────
def fetch_nav_history(fund_code: str, product_id: int) -> list[dict]:
    """Gọi Fmarket API lấy toàn bộ lịch sử NAV của 1 quỹ."""
    try:
        resp = requests.post(
            FMARKET_NAV_URL,
            json={
                "isAllData": 1,
                "productId": product_id,
                "searchField": "",
                "sortBy": "",
                "sortOrder": "",
            },
            headers={
                "Content-Type": "application/json",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
            },
            timeout=30,
        )
        resp.raise_for_status()
        data = resp.json()

        if not isinstance(data.get("data"), list):
            print(f"  ⚠️  {fund_code}: unexpected response shape")
            return []

        rows = []
        for item in data["data"]:
            nav_date = item.get("navDate", "")
            nav_val = item.get("nav")
            if not nav_date or nav_val is None:
                continue

            # navDate có thể là string "YYYY-MM-DD" hoặc timestamp
            if isinstance(nav_date, (int, float)):
                nav_date = datetime.utcfromtimestamp(nav_date / 1000).strftime("%Y-%m-%d")

            rows.append({
                "fund_code": fund_code,
                "nav": float(nav_val),
                "date": nav_date,
                "source": "Fmarket",
            })

        return rows

    except Exception as exc:
        print(f"  ❌ {fund_code}: fetch failed — {exc}")
        return []


# ─── Supabase Upsert ──────────────────────────────────────────
def upsert_to_supabase(records: list[dict]) -> int:
    """Bulk upsert vào bảng fund_nav qua Supabase REST API."""
    if not records:
        return 0

    url = f"{SUPABASE_URL}/rest/v1/fund_nav"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates",
    }

    success = 0
    for i in range(0, len(records), CHUNK_SIZE):
        chunk = records[i : i + CHUNK_SIZE]
        try:
            resp = requests.post(url, headers=headers, json=chunk, timeout=30)
            if resp.status_code in (200, 201):
                success += len(chunk)
                print(f"  ✅ Upserted chunk {i // CHUNK_SIZE + 1} ({len(chunk)} records)")
            else:
                print(f"  ❌ Chunk {i // CHUNK_SIZE + 1} failed: {resp.status_code} — {resp.text[:200]}")
        except Exception as exc:
            print(f"  ❌ Chunk {i // CHUNK_SIZE + 1} request error: {exc}")

    return success


# ─── Main ──────────────────────────────────────────────────────
def main():
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars")
        sys.exit(1)

    print(f"🚀 NAV Sync started at {datetime.utcnow().isoformat()}Z")
    print(f"   Supabase: {SUPABASE_URL}")
    print(f"   Funds: {len(FUNDS)}\n")

    all_records: list[dict] = []

    for fund_code, product_id in FUNDS.items():
        print(f"📊 Crawling {fund_code} (productId={product_id})...")
        rows = fetch_nav_history(fund_code, product_id)
        print(f"   → {len(rows)} records")
        all_records.extend(rows)

    print(f"\n📦 Total crawled: {len(all_records)} records")
    print("📤 Upserting to Supabase...")

    success = upsert_to_supabase(all_records)

    print(f"\n✅ Done! {success}/{len(all_records)} records synced successfully.")


if __name__ == "__main__":
    main()
