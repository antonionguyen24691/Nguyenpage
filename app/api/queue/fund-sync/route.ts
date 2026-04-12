import { NextResponse } from "next/server";
import { assertCronAuthorized } from "@/lib/cronAuth";
import { syncFunds } from "@/packages/fund-engine";
import { syncAllHoldings } from "@/packages/fund-engine/pdf-extractor";
import { getFundSyncJobState, saveFundSyncJobState, type SyncMode } from "@/lib/fundSyncState";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(request: Request) {
  let mode: SyncMode = "all";

  try {
    const unauthorized = assertCronAuthorized(request);
    if (unauthorized) {
      return unauthorized;
    }

    const payload = (await request.json().catch(() => ({}))) as { mode?: SyncMode };
    mode = payload.mode ?? "all";
    const currentJob = await getFundSyncJobState();
    const startedAt = currentJob.mode === mode && currentJob.startedAt
      ? currentJob.startedAt
      : new Date().toISOString();

    const result: {
      nav?: Awaited<ReturnType<typeof syncFunds>>;
      holdings?: Awaited<ReturnType<typeof syncAllHoldings>>;
    } = {};

    await saveFundSyncJobState({
      status: "running",
      mode,
      startedAt,
      finishedAt: null,
    });

    if (mode === "nav" || mode === "all") {
      result.nav = await syncFunds();
    }

    if (mode === "holdings" || mode === "all") {
      result.holdings = await syncAllHoldings();
    }

    await saveFundSyncJobState({
      status: "success",
      mode,
      startedAt,
      finishedAt: new Date().toISOString(),
      data: result,
    });

    return NextResponse.json({
      success: true,
      mode,
      data: result,
    });
  } catch (error: unknown) {
    const currentJob = await getFundSyncJobState();
    await saveFundSyncJobState({
      status: "error",
      mode: mode ?? currentJob.mode ?? null,
      startedAt: currentJob.startedAt,
      finishedAt: new Date().toISOString(),
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
