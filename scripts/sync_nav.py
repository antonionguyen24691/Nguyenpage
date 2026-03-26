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

    # DEBUG: List all available methods
    methods = [m for m in dir(fund_client) if not m.startswith('_')]
    print(f"🔍 DEBUG Fund methods: {methods}")

    # Test with first fund to understand the data structure
    test_code, test_id = list(FUNDS.items())[0]
    print(f"\n🧪 DEBUG: Testing {test_code} (id={test_id})...")

    # Try nav_report with positional arg
    try:
        df = fund_client.nav_report(test_id)
        print(f"   nav_report(positional) type: {type(df)}")
        if df is not None and hasattr(df, 'empty'):
            print(f"   empty: {df.empty}, shape: {df.shape if not df.empty else 'N/A'}")
            if not df.empty:
                print(f"   columns: {list(df.columns)}")
                print(f"   first row: {df.iloc[0].to_dict()}")
        else:
            print(f"   value: {df}")
    except Exception as e:
        print(f"   nav_report error: {e}")

    # Try other possible methods
    for method_name in ['nav_history', 'details', 'filter']:
        if hasattr(fund_client, method_name):
            print(f"\n🧪 DEBUG: Trying fund_client.{method_name}()...")
            try:
                result = getattr(fund_client, method_name)()
                print(f"   type: {type(result)}")
                if hasattr(result, 'shape'):
                    print(f"   shape: {result.shape}")
                    if not result.empty:
                        print(f"   columns: {list(result.columns)}")
            except Exception as e:
                print(f"   error: {e}")

    print("\n" + "="*60)
    print("Starting actual crawl...")
    print("="*60 + "\n")

    for fund_code, product_id in FUNDS.items():
        print(f"📊 Crawling {fund_code} (productId={product_id})...")
        try:
            df = fund_client.nav_report(product_id)

            if df is None:
                print(f"  ⚠️  {fund_code}: None returned")
                continue
            
            if hasattr(df, 'empty') and df.empty:
                print(f"  ⚠️  {fund_code}: empty DataFrame")
                continue

            if not hasattr(df, 'iterrows'):
                print(f"  ⚠️  {fund_code}: not a DataFrame, type={type(df)}")
                continue

            print(f"  DEBUG columns: {list(df.columns)}, rows: {len(df)}")

            records_count = 0
            for _, row in df.iterrows():
                nav_date = None
                nav_val = None

                # Auto-detect date column
                for col in df.columns:
                    col_lower = str(col).lower()
                    if 'date' in col_lower or 'ngay' in col_lower:
                        nav_date = str(row[col])
                        break

                # Auto-detect NAV column
                for col in df.columns:
                    col_lower = str(col).lower()
                    if 'nav' in col_lower and 'date' not in col_lower:
                        nav_val = row[col]
                        break

                if not nav_date or nav_val is None:
                    continue

                # Clean date format
                date_str = str(nav_date).split(' ')[0].split('T')[0]

                all_rows.append({
                    "fund_code": fund_code,
                    "nav": float(nav_val),
                    "date": date_str,
                    "source": "Fmarket",
                })
                records_count += 1

            print(f"  → {records_count} records")

        except Exception as exc:
            print(f"  ❌ {fund_code}: failed — {exc}")
            import traceback
            traceback.print_exc()

    return all_rows


# ─── Ensure funds exist in DB ─────────────────────────────────
FUND_NAMES = {
    "VESAF": ("Quỹ Đầu tư Cổ phiếu Hưng thịnh VinaCapital", "VinaCapital"),
    "VEOF": ("Quỹ Đầu tư Cổ phiếu Tiếp cận Thị trường VinaCapital", "VinaCapital"),
    "VLGF": ("Quỹ Đầu tư Cổ phiếu Tập trung Cổ tức VinaCapital", "VinaCapital"),
    "VFF": ("Quỹ Đầu tư Trái phiếu Bảo Thịnh VinaCapital", "VinaCapital"),
    "VIBF": ("Quỹ Đầu tư Cân bằng Tuệ sáng VinaCapital", "VinaCapital"),
    "DCIP": ("Quỹ Đầu tư Thu nhập Cố định Dragon Capital", "DragonCapital"),
    "DCBF": ("Quỹ Đầu tư Trái phiếu Dragon Capital", "DragonCapital"),
    "DCDS": ("Quỹ Đầu tư Cổ phiếu Tăng trưởng Dragon Capital", "DragonCapital"),
    "SSIBF": ("Quỹ Đầu tư Trái phiếu SSI", "SSIAM"),
    "SSISCA": ("Quỹ Đầu tư Cổ phiếu Trưởng thành SSI", "SSIAM"),
}

def ensure_funds_exist():
    """Auto-insert missing fund codes into funds table."""
    url = f"{SUPABASE_URL}/rest/v1/funds"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates",
    }
    funds_data = [
        {"code": code, "name": name, "company": company}
        for code, (name, company) in FUND_NAMES.items()
    ]
    resp = http_requests.post(
        f"{url}?on_conflict=code", headers=headers, json=funds_data, timeout=15
    )
    if resp.status_code in (200, 201):
        print(f"✅ Ensured {len(funds_data)} fund codes exist in DB")
    else:
        print(f"⚠️  Fund insert: {resp.status_code} — {resp.text[:200]}")


# ─── Supabase Upsert ──────────────────────────────────────────
def upsert_to_supabase(records: list[dict]) -> int:
    """Bulk upsert vào bảng fund_nav qua Supabase REST API."""
    if not records:
        return 0

    url = f"{SUPABASE_URL}/rest/v1/fund_nav?on_conflict=fund_code,date"
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
    
    # Đảm bảo tất cả fund codes tồn tại trong bảng funds trước khi upsert NAV
    print("🔧 Ensuring fund codes exist in DB...")
    ensure_funds_exist()

    print("📤 Upserting to Supabase...")

    success = upsert_to_supabase(all_records)

    print(f"\n✅ Done! {success}/{len(all_records)} records synced successfully.")


if __name__ == "__main__":
    main()
