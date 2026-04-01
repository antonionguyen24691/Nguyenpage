import { NextResponse } from "next/server";
import { getFundDataset } from "@/lib/fundDataStore";
import { buildAdvisorReport } from "@/lib/fundAdvisorReport";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const fundCode = searchParams.get("fund")?.trim().toUpperCase();

    if (!fundCode) {
      return NextResponse.json(
        { success: false, error: "Thieu ma quy (fund)." },
        { status: 400 },
      );
    }

    const dataset = await getFundDataset();
    const report = await buildAdvisorReport(dataset, fundCode);

    if (!report) {
      return NextResponse.json(
        { success: false, error: "Khong tao duoc advisor report cho quy nay." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      fund: fundCode,
      data: report,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
