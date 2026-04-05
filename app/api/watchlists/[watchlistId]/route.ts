import { NextRequest, NextResponse } from "next/server";
import { deleteWatchlist, listWatchlists, updateWatchlist } from "@/server/services/stock-store";
import { getCurrentUser } from "@/server/services/user-context";

function normalizeSymbols(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((symbol) => String(symbol).trim().toUpperCase())
    .filter((symbol) => symbol.length > 0 && symbol.length <= 10);
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ watchlistId: string }> },
) {
  const user = await getCurrentUser(request.headers.get("x-user-email") ?? undefined);
  if (!user) {
    return NextResponse.json({ error: "No user found" }, { status: 404 });
  }

  const payload = await request.json().catch(() => null);
  const { watchlistId } = await context.params;
  const name = payload?.name == null ? undefined : String(payload.name).trim();
  const symbols = payload?.symbols == null ? undefined : normalizeSymbols(payload.symbols);

  if (name !== undefined && (!name || name.length > 50)) {
    return NextResponse.json({ error: "Invalid watchlist name" }, { status: 400 });
  }
  if (symbols !== undefined && symbols.length === 0) {
    return NextResponse.json({ error: "At least one symbol is required" }, { status: 400 });
  }

  const existing = (await listWatchlists()).find((item) => item.id === watchlistId);
  if (!existing) {
    return NextResponse.json({ error: "Watchlist not found" }, { status: 404 });
  }

  const watchlist = await updateWatchlist(existing.id, {
    name,
    symbols,
  });

  return NextResponse.json({ data: watchlist ?? existing });
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ watchlistId: string }> },
) {
  const user = await getCurrentUser(request.headers.get("x-user-email") ?? undefined);
  if (!user) {
    return NextResponse.json({ error: "No user found" }, { status: 404 });
  }

  const { watchlistId } = await context.params;
  const existing = (await listWatchlists()).find((item) => item.id === watchlistId);
  if (!existing) {
    return NextResponse.json({ error: "Watchlist not found" }, { status: 404 });
  }

  await deleteWatchlist(existing.id);
  return new NextResponse(null, { status: 204 });
}
