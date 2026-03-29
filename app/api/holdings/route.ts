import { NextResponse } from "next/server";
import { buildHoldingsComparison } from "@/lib/fundAnalytics";
import { getFundDataset } from "@/lib/fundDataStore";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const fundCode = searchParams.get("fund");
    const targetDate = searchParams.get("date");

    if (!fundCode) {
      return NextResponse.json(
        { success: false, error: "Thiếu mã quỹ (fund)" },
        { status: 400 },
      );
    }

    const normalizedFundCode = fundCode.toUpperCase();
    const dataset = await getFundDataset();
    const fundRows = dataset.holdings.filter(
      (row) => row.fund_code === normalizedFundCode,
    );
    const availableDates = Array.from(new Set(fundRows.map((row) => row.date))).sort(
      (left, right) => new Date(right).getTime() - new Date(left).getTime(),
    );

    let dateToFetch = targetDate;
    if (!dateToFetch && availableDates.length > 0) {
      dateToFetch = availableDates[0];
    }

    if (!dateToFetch) {
      return NextResponse.json({
        success: true,
        fund: normalizedFundCode,
        data: [],
        date: null,
        availableDates: [],
        comparisonDates: [],
        comparisonRows: [],
      });
    }

    const data = fundRows
      .filter((row) => row.date === dateToFetch)
      .sort((left, right) => right.weight - left.weight);
    const comparison = buildHoldingsComparison(fundRows, dateToFetch, 4);

    return NextResponse.json({
      success: true,
      fund: normalizedFundCode,
      date: dateToFetch,
      data,
      availableDates,
      comparisonDates: comparison.dates,
      comparisonRows: comparison.rows,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
