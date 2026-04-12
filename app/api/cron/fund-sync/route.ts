import { NextResponse } from "next/server";
import { assertCronAuthorized } from "@/lib/cronAuth";
import { enqueueJob } from "@/lib/qstash";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const unauthorized = assertCronAuthorized(request);
    if (unauthorized) {
      return unauthorized;
    }

    return NextResponse.json({
      success: true,
      message: "Queued fund sync job",
      data: await enqueueJob(
        "/api/queue/fund-sync",
        { mode: "nav", initiatedBy: "cron" },
        { baseUrl: new URL(request.url).origin },
      ),
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        success: false,
        message: "Loi khi dong bo du lieu quy",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
