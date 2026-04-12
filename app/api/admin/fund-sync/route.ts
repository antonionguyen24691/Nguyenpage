import { NextResponse } from "next/server";
import { assertAdminAuthorized } from "@/lib/adminAuth";
import {
  getFundSyncJobState,
  saveFundSyncJobState,
  type SyncMode,
} from "@/lib/fundSyncState";
import { enqueueJob } from "@/lib/qstash";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const unauthorized = assertAdminAuthorized(request);
  if (unauthorized) {
    return unauthorized;
  }

  try {
    const payload = (await request.json().catch(() => ({}))) as { mode?: SyncMode };
    const mode = payload.mode ?? "all";
    const currentJob = await getFundSyncJobState();

    if (currentJob.status === "queued" || currentJob.status === "running") {
      return NextResponse.json(
        {
          success: false,
          error: "A sync job is already running.",
          job: currentJob,
        },
        { status: 409 },
      );
    }

    const startedAt = new Date().toISOString();
    const nextJobState = {
      status: "running" as const,
      mode,
      startedAt,
      finishedAt: null,
    };

    await saveFundSyncJobState(nextJobState);

    const baseUrl = new URL(request.url).origin;
    const queueResult = await enqueueJob(
      "/api/queue/fund-sync",
      { mode, requestedAt: startedAt, initiatedBy: "admin" },
      { baseUrl },
    );

    return NextResponse.json(
      {
        success: true,
        mode,
        job: nextJobState,
        data: queueResult,
      },
      { status: 202 },
    );
  } catch (error: unknown) {
    const failedJobState = {
      status: "error" as const,
      mode: null,
      startedAt: null,
      finishedAt: new Date().toISOString(),
      error: error instanceof Error ? error.message : "Unknown error",
    };

    await saveFundSyncJobState(failedJobState);

    return NextResponse.json(
      {
        success: false,
        error: failedJobState.error,
        job: failedJobState,
      },
      { status: 500 },
    );
  }
}
