import { NextRequest, NextResponse } from "next/server";
import { createWatchlist, listWatchlists } from "@/server/services/stock-store";
import { getCurrentUser } from "@/server/services/user-context";

function normalizeSymbols(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((symbol) => String(symbol).trim().toUpperCase())
    .filter((symbol) => symbol.length > 0 && symbol.length <= 10);
}

export async function GET(request: NextRequest) {
  const user = await getCurrentUser(request.headers.get("x-user-email") ?? undefined);
  if (!user) {
    return NextResponse.json({ error: "No user found" }, { status: 404 });
  }

  const watchlists = await listWatchlists();

  return NextResponse.json({ data: watchlists });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser(request.headers.get("x-user-email") ?? undefined);
  if (!user) {
    return NextResponse.json({ error: "No user found" }, { status: 404 });
  }

  const payload = await request.json().catch(() => null);
  const name = String(payload?.name ?? "").trim();
  const symbols = normalizeSymbols(payload?.symbols);

  if (!name || name.length > 50) {
    return NextResponse.json({ error: "Invalid watchlist name" }, { status: 400 });
  }
  if (symbols.length === 0) {
    return NextResponse.json({ error: "At least one symbol is required" }, { status: 400 });
  }

  const watchlist = await createWatchlist({ name, symbols });

  return NextResponse.json({ data: watchlist }, { status: 201 });
}
