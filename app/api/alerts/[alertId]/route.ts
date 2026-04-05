import { NextRequest, NextResponse } from "next/server";
import {
  deleteAlert,
  listAlerts,
  updateAlert,
  type AlertCondition,
  type AlertStatus,
} from "@/server/services/stock-store";
import { getCurrentUser } from "@/server/services/user-context";

function parseCondition(value: unknown): AlertCondition | undefined {
  if (value === "ABOVE" || value === "BELOW") return value;
  return undefined;
}

function parseStatus(value: unknown): AlertStatus | undefined {
  if (value === "ACTIVE" || value === "PAUSED" || value === "TRIGGERED") {
    return value;
  }
  return undefined;
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ alertId: string }> },
) {
  const user = await getCurrentUser(request.headers.get("x-user-email") ?? undefined);
  if (!user) {
    return NextResponse.json({ error: "No user found" }, { status: 404 });
  }

  const payload = await request.json().catch(() => null);
  const { alertId } = await context.params;

  const symbol = payload?.symbol == null ? undefined : String(payload.symbol).trim().toUpperCase();
  const target = payload?.target == null ? undefined : Number(payload.target);
  const condition = parseCondition(payload?.condition);
  const status = parseStatus(payload?.status);
  const cooldownMinutes =
    payload?.cooldownMinutes == null ? undefined : Number(payload.cooldownMinutes);
  const webhookId =
    payload?.webhookId === undefined ? undefined : payload.webhookId === null ? null : String(payload.webhookId);

  if (symbol !== undefined && (!symbol || symbol.length > 10)) {
    return NextResponse.json({ error: "Invalid symbol" }, { status: 400 });
  }
  if (target !== undefined && (!Number.isFinite(target) || target <= 0)) {
    return NextResponse.json({ error: "Invalid target" }, { status: 400 });
  }
  if (
    cooldownMinutes !== undefined &&
    (!Number.isInteger(cooldownMinutes) || cooldownMinutes < 1 || cooldownMinutes > 1440)
  ) {
    return NextResponse.json({ error: "Invalid cooldown minutes" }, { status: 400 });
  }

  const existing = (await listAlerts()).find((item) => item.id === alertId);
  if (!existing) {
    return NextResponse.json({ error: "Alert not found" }, { status: 404 });
  }

  const alert = await updateAlert(existing.id, {
    symbol,
    target,
    condition,
    status,
    cooldownMinutes,
    webhookId,
  });

  return NextResponse.json({ data: alert ?? existing });
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ alertId: string }> },
) {
  const user = await getCurrentUser(request.headers.get("x-user-email") ?? undefined);
  if (!user) {
    return NextResponse.json({ error: "No user found" }, { status: 404 });
  }

  const { alertId } = await context.params;
  const existing = (await listAlerts()).find((item) => item.id === alertId);
  if (!existing) {
    return NextResponse.json({ error: "Alert not found" }, { status: 404 });
  }

  await deleteAlert(existing.id);
  return new NextResponse(null, { status: 204 });
}
