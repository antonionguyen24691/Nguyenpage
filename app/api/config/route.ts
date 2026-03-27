import { NextResponse } from "next/server";
import { db } from "@/packages/db";

// Buộc Vercel luôn chạy serverless function, không cache ở CDN edge
export const dynamic = "force-dynamic";

const noCacheHeaders = { "Cache-Control": "no-store, max-age=0" };

// GET /api/config?key=pages  (hoặc key=links,settings,home)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key");

  if (!key) {
    // Lấy tất cả config cùng lúc
    const { data, error } = await db
      .from("site_config")
      .select("config_key, config_value");

    if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: noCacheHeaders });

    const result: Record<string, any> = {};
    for (const row of data || []) {
      result[row.config_key] = row.config_value;
    }
    return NextResponse.json(result, { headers: noCacheHeaders });
  }

  const { data, error } = await db
    .from("site_config")
    .select("config_value")
    .eq("config_key", key)
    .single();

  if (error && error.code !== "PGRST116") {
    return NextResponse.json({ error: error.message }, { status: 500, headers: noCacheHeaders });
  }

  return NextResponse.json({ value: data?.config_value || null }, { headers: noCacheHeaders });
}

// POST /api/config  body: { key: "pages", value: [...] }
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { key, value } = body;

    if (!key || value === undefined) {
      return NextResponse.json({ error: "key and value required" }, { status: 400 });
    }

    const { error } = await db
      .from("site_config")
      .upsert(
        { config_key: key, config_value: value, updated_at: new Date().toISOString() },
        { onConflict: "config_key" }
      );

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
