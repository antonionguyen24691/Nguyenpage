import { NextResponse } from "next/server";
import { assertCronAuthorized } from "@/lib/cronAuth";
import { syncFunds } from "@/packages/fund-engine";
import { syncAllHoldings } from "@/packages/fund-engine/pdf-extractor";

export const dynamic = "force-dynamic";

type SyncMode = "nav" | "holdings" | "all";

export async function POST(request: Request) {
  try {
    const unauthorized = assertCronAuthorized(request);
    if (unauthorized) {
      return unauthorized;
    }

    const payload = (await request.json().catch(() => ({}))) as { mode?: SyncMode };
    const mode = payload.mode ?? "all";

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

    return NextResponse.json({
      success: true,
      mode,
      data: result,
    });
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
