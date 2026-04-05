import { NextRequest, NextResponse } from "next/server";
import { deleteWebhook, listWebhooks, updateWebhook } from "@/server/services/stock-store";
import { getCurrentUser } from "@/server/services/user-context";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ webhookId: string }> },
) {
  const user = await getCurrentUser(request.headers.get("x-user-email") ?? undefined);
  if (!user) {
    return NextResponse.json({ error: "No user found" }, { status: 404 });
  }

  const payload = await request.json().catch(() => null);
  const { webhookId } = await context.params;
  const url = payload?.url == null ? undefined : String(payload.url).trim();
  const secret = payload?.secret == null ? undefined : String(payload.secret).trim();
  const isActive = payload?.isActive == null ? undefined : Boolean(payload.isActive);

  if (url !== undefined && !/^https?:\/\/.+/.test(url)) {
    return NextResponse.json({ error: "Invalid webhook url" }, { status: 400 });
  }
  if (secret !== undefined && (secret.length < 8 || secret.length > 255)) {
    return NextResponse.json({ error: "Invalid webhook secret" }, { status: 400 });
  }

  const existing = (await listWebhooks()).find((item) => item.id === webhookId);
  if (!existing) {
    return NextResponse.json({ error: "Webhook not found" }, { status: 404 });
  }

  const webhook = await updateWebhook(existing.id, { url, secret, isActive });

  return NextResponse.json({ data: webhook ?? existing });
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ webhookId: string }> },
) {
  const user = await getCurrentUser(request.headers.get("x-user-email") ?? undefined);
  if (!user) {
    return NextResponse.json({ error: "No user found" }, { status: 404 });
  }

  const { webhookId } = await context.params;
  const existing = (await listWebhooks()).find((item) => item.id === webhookId);
  if (!existing) {
    return NextResponse.json({ error: "Webhook not found" }, { status: 404 });
  }

  await deleteWebhook(existing.id);
  return new NextResponse(null, { status: 204 });
}
