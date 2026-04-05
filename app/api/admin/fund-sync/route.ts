import { NextResponse } from "next/server";
import { assertAdminAuthorized } from "@/lib/adminAuth";
import { syncFunds } from "@/packages/fund-engine";
import { syncAllHoldings } from "@/packages/fund-engine/pdf-extractor";

export const dynamic = "force-dynamic";

type SyncMode = "nav" | "holdings" | "all";

type JobStatus = "idle" | "running" | "success" | "error";

type JobState = {
  status: JobStatus;
  mode: SyncMode | null;
  startedAt: string | null;
  finishedAt: string | null;
  error?: string;
  data?: {
    nav?: Awaited<ReturnType<typeof syncFunds>>;
    holdings?: Awaited<ReturnType<typeof syncAllHoldings>>;
  };
};

let jobState: JobState = {
  status: "idle",
  mode: null,
  startedAt: null,
  finishedAt: null,
};

export function getJobState() {
  return jobState;
}

export async function POST(request: Request) {
  const unauthorized = assertAdminAuthorized(request);
  if (unauthorized) {
    return unauthorized;
  }

  try {
    const payload = (await request.json().catch(() => ({}))) as { mode?: SyncMode };
    const mode = payload.mode ?? "all";

    if (jobState.status === "running") {
      return NextResponse.json(
        {
          success: false,
          error: "A sync job is already running.",
          job: jobState,
        },
        { status: 409 },
      );
    }

    jobState = {
      status: "running",
      mode,
      startedAt: new Date().toISOString(),
      finishedAt: null,
    };

    void (async () => {
      try {
        const result: {
          nav?: Awaited<ReturnType<typeof syncFunds>>;
          holdings?: Awaited<ReturnType<typeof syncAllHoldings>>;
        } = {};

        if (mode === "nav" || mode === "all") {
          result.nav = await syncFunds();
        }

        if (mode === "holdings" || mode === "all") {
          result.holdings = await syncAllHoldings();
        }

        jobState = {
          status: "success",
          mode,
          startedAt: jobState.startedAt,
          finishedAt: new Date().toISOString(),
          data: result,
        };
      } catch (error: unknown) {
        jobState = {
          status: "error",
          mode,
          startedAt: jobState.startedAt,
          finishedAt: new Date().toISOString(),
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    })();

    return NextResponse.json(
      {
        success: true,
        mode,
        job: jobState,
      },
      { status: 202 },
    );
  } catch (error: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
