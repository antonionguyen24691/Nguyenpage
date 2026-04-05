import { NextRequest, NextResponse } from "next/server";
import { createAlert, listAlerts, type AlertCondition } from "@/server/services/stock-store";
import { getCurrentUser } from "@/server/services/user-context";

function parseCondition(value: unknown): AlertCondition | null {
  if (value === "ABOVE" || value === "BELOW") return value;
  return null;
}

export async function GET(request: NextRequest) {
  const user = await getCurrentUser(request.headers.get("x-user-email") ?? undefined);
  if (!user) {
    return NextResponse.json({ error: "No user found" }, { status: 404 });
  }

  const alerts = await listAlerts();

  return NextResponse.json({ data: alerts });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser(request.headers.get("x-user-email") ?? undefined);
  if (!user) {
    return NextResponse.json({ error: "No user found" }, { status: 404 });
  }

  const payload = await request.json().catch(() => null);
  const symbol = String(payload?.symbol ?? "").trim().toUpperCase();
  const target = Number(payload?.target);
  const condition = parseCondition(payload?.condition);
  const cooldownMinutes = Number(payload?.cooldownMinutes ?? 5);
  const webhookId = payload?.webhookId ? String(payload.webhookId) : null;

  if (!symbol || symbol.length > 10 || !Number.isFinite(target) || target <= 0 || !condition) {
    return NextResponse.json({ error: "Invalid alert payload" }, { status: 400 });
  }
  if (!Number.isInteger(cooldownMinutes) || cooldownMinutes < 1 || cooldownMinutes > 1440) {
    return NextResponse.json({ error: "Invalid cooldown minutes" }, { status: 400 });
  }

  const alert = await createAlert({
    symbol,
    target,
    condition,
    cooldownMinutes,
    webhookId,
  });

  return NextResponse.json({ data: alert }, { status: 201 });
}
