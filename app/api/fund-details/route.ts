import { NextResponse } from "next/server";
import { getFundDataset } from "@/lib/fundDataStore";
import { buildFundDetails, resolveOfficialDocuments } from "@/lib/fundDetails";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const fundCode = searchParams.get("fund")?.trim().toUpperCase();

    if (!fundCode) {
      return NextResponse.json(
        { success: false, error: "Thiếu mã quỹ (fund)" },
        { status: 400 },
      );
    }

    const dataset = await getFundDataset();
    const details = buildFundDetails(dataset, fundCode);

    if (!details) {
      return NextResponse.json(
        { success: false, error: "Không tìm thấy cấu hình quỹ" },
        { status: 404 },
      );
    }

    const documents = await resolveOfficialDocuments(fundCode, details.documents);

    return NextResponse.json({
      success: true,
      fund: fundCode,
      data: {
        ...details,
        documents,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
