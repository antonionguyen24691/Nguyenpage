import { NextResponse } from "next/server";
import { getAllConfigValues, getConfigValue, saveConfigValue } from "@/lib/siteConfigStore";

export const dynamic = "force-dynamic";

const noCacheHeaders = { "Cache-Control": "no-store, max-age=0" };

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key");

  if (!key) {
    const result = await getAllConfigValues();
    return NextResponse.json(result, { headers: noCacheHeaders });
  }

  const value = await getConfigValue(key, null);
  return NextResponse.json({ value }, { headers: noCacheHeaders });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { key, value } = body;

    if (!key || value === undefined) {
      return NextResponse.json({ error: "key and value required" }, { status: 400 });
    }

    const result = await saveConfigValue(key, value);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
