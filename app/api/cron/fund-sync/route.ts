import { NextResponse } from "next/server";
import { assertCronAuthorized } from "@/lib/cronAuth";
import { syncFunds } from "../../../../packages/fund-engine";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const unauthorized = assertCronAuthorized(request);
    if (unauthorized) {
      return unauthorized;
    }

    const result = await syncFunds();

    return NextResponse.json({
      success: true,
      message: "Dong bo du lieu quy hoan tat",
      data: result,
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
