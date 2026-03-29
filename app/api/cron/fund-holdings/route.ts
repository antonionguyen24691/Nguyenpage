import { NextResponse } from "next/server";
import { assertCronAuthorized } from "@/lib/cronAuth";
import { syncAllHoldings } from "../../../../packages/fund-engine/pdf-extractor";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const unauthorized = assertCronAuthorized(request);
    if (unauthorized) {
      return unauthorized;
    }

    const result = await syncAllHoldings();

    return NextResponse.json({
      success: true,
      message: "Dong bo bao cao danh muc quy hoan tat",
      data: result,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        success: false,
        message: "Loi khi dong bo du lieu holdings",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
