import { NextRequest, NextResponse } from "next/server";
import { createWebhook, listWebhooks } from "@/server/services/stock-store";
import { getCurrentUser } from "@/server/services/user-context";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser(request.headers.get("x-user-email") ?? undefined);
  if (!user) {
    return NextResponse.json({ error: "No user found" }, { status: 404 });
  }

  const webhooks = await listWebhooks();

  return NextResponse.json({ data: webhooks });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser(request.headers.get("x-user-email") ?? undefined);
  if (!user) {
    return NextResponse.json({ error: "No user found" }, { status: 404 });
  }

  const payload = await request.json().catch(() => null);
  const url = String(payload?.url ?? "").trim();
  const secret = String(payload?.secret ?? "").trim();
  const isActive = payload?.isActive === undefined ? true : Boolean(payload.isActive);

  if (!/^https?:\/\/.+/.test(url)) {
    return NextResponse.json({ error: "Invalid webhook url" }, { status: 400 });
  }
  if (secret.length < 8 || secret.length > 255) {
    return NextResponse.json({ error: "Invalid webhook secret" }, { status: 400 });
  }

  const webhook = await createWebhook({ url, secret, isActive });

  return NextResponse.json({ data: webhook }, { status: 201 });
}
