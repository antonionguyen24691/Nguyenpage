import { NextResponse } from "next/server";
import { assertCronAuthorized } from "@/lib/cronAuth";
import { db } from "@/packages/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const unauthorized = assertCronAuthorized(request);
    if (unauthorized) {
      return unauthorized;
    }

    const { data, error } = await db.from("site_config").select("config_key").limit(1);

    if (error) {
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
