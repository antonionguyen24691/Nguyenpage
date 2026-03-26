"""
sync_nav.py — Crawl NAV lịch sử từ Fmarket thông qua thư viện vnstock
và đẩy vào Supabase. Chạy bởi GitHub Actions hàng ngày hoặc bằng tay.

Usage:
  python scripts/sync_nav.py

Env vars needed:
  SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
"""

import os
import sys
import requests as http_requests
from datetime import datetime, timezone

# ─── Config ────────────────────────────────────────────────────
SUPABASE_URL = os.environ.get("SUPABASE_URL", "").strip('"')
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "").strip('"')

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


# ─── Crawl via vnstock ─────────────────────────────────────────
def fetch_all_nav() -> list[dict]:
    """Dùng vnstock gọi Fmarket API cho từng quỹ."""
    from vnstock.explorer.fmarket.fund import Fund

    all_rows: list[dict] = []
    fund_client = Fund()

    for fund_code, product_id in FUNDS.items():
        print(f"📊 Crawling {fund_code} (productId={product_id})...")
        try:
            df = fund_client.nav_report(fundId=product_id)

            if df is None or df.empty:
                print(f"  ⚠️  {fund_code}: no data returned")
                continue

            records_count = 0
            for _, row in df.iterrows():
                nav_date = None
                nav_val = None

                # Tìm cột ngày (có thể là navDate hoặc tên khác)
                for col in ["navDate", "date", "nav_date"]:
                    if col in df.columns:
                        nav_date = str(row[col])
                        break

                # Tìm cột giá (có thể là nav hoặc tên khác)
                for col in ["nav", "NAV", "navPerUnit"]:
                    if col in df.columns:
                        nav_val = row[col]
                        break

                if not nav_date or nav_val is None:
                    continue

                all_rows.append({
                    "fund_code": fund_code,
                    "nav": float(nav_val),
                    "date": nav_date,
                    "source": "Fmarket",
                })
                records_count += 1

            print(f"  → {records_count} records")

        except Exception as exc:
            print(f"  ❌ {fund_code}: failed — {exc}")
            import traceback
            traceback.print_exc()

    return all_rows


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
            resp = http_requests.post(url, headers=headers, json=chunk, timeout=30)
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

    print(f"🚀 NAV Sync started at {datetime.now(timezone.utc).isoformat()}")
    print(f"   Supabase: {SUPABASE_URL}")
    print(f"   Funds: {len(FUNDS)}\n")

    all_records = fetch_all_nav()

    print(f"\n📦 Total crawled: {len(all_records)} records")
    print("📤 Upserting to Supabase...")

    success = upsert_to_supabase(all_records)

    print(f"\n✅ Done! {success}/{len(all_records)} records synced successfully.")


if __name__ == "__main__":
    main()
