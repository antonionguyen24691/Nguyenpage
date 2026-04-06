import { NextResponse } from "next/server";
import { assertCronAuthorized } from "@/lib/cronAuth";
import { db } from "@/packages/db";

export const dynamic = "force-dynamic";

async function notifyAlert(message: string, details?: Record<string, unknown>) {
  const webhookUrl = process.env.ALERT_WEBHOOK_URL;
  if (!webhookUrl) return;

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source: "supabase-keepalive",
        message,
        details,
        timestamp: new Date().toISOString(),
      }),
    });
  } catch {
    // Do not throw inside cron
  }
}

export async function GET(request: Request) {
  try {
    const unauthorized = assertCronAuthorized(request);
    if (unauthorized) {
      return unauthorized;
    }

    const { data, error } = await db.from("site_config").select("config_key").limit(1);

    if (error) {
      await notifyAlert("Supabase keepalive failed", { error: error.message });
      return NextResponse.json(
        {
          success: false,
          message: "Supabase keepalive failed",
          error: error.message,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Supabase keepalive OK",
      count: Array.isArray(data) ? data.length : 0,
    });
  } catch (error: unknown) {
    await notifyAlert("Supabase keepalive exception", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json(
      {
        success: false,
        message: "Supabase keepalive error",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
