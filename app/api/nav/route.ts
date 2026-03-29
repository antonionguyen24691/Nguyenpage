import { NextResponse } from "next/server";
import { getPeerFundCodes } from "@/lib/fundCatalog";
import {
  buildComparisonSeries,
  calculateNavMetrics,
  sanitizeNavHistory,
} from "@/lib/fundAnalytics";
import { getFundDataset } from "@/lib/fundDataStore";
import { fetchVnIndexSeries } from "@/lib/marketIndex";
import { analyzeFund } from "../../../packages/ai/fund-analysis";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const fundCode = searchParams.get("fund");
    const days = parseInt(searchParams.get("days") || "180", 10);
    const compareList = searchParams
      .get("compare")
      ?.split(",")
      .map((item) => item.trim().toUpperCase())
      .filter(Boolean);

    if (!fundCode) {
      return NextResponse.json(
        { success: false, error: "Thiếu mã quỹ (fund parameter)" },
        { status: 400 },
      );
    }

    const normalizedFundCode = fundCode.toUpperCase();
    const dataset = await getFundDataset();
    const fullHistory = sanitizeNavHistory(
      dataset.nav.filter((row) => row.fund_code === normalizedFundCode),
    );
    const navData = days > 0 ? fullHistory.slice(-days) : fullHistory;

    const holdingsDates = Array.from(
      new Set(
        dataset.holdings
          .filter((row) => row.fund_code === normalizedFundCode)
          .map((row) => row.date),
      ),
    ).sort((left, right) => new Date(right).getTime() - new Date(left).getTime());

    const latestHoldingsDate = holdingsDates[0] ?? null;
    const topHoldings = latestHoldingsDate
      ? dataset.holdings
          .filter(
            (row) => row.fund_code === normalizedFundCode && row.date === latestHoldingsDate,
          )
          .sort((left, right) => right.weight - left.weight)
          .slice(0, 10)
      : [];

    const peerCodes = compareList?.length ? compareList : getPeerFundCodes(normalizedFundCode, 3);
    const peers = Object.fromEntries(
      peerCodes.map((code) => [
        code,
        sanitizeNavHistory(dataset.nav.filter((row) => row.fund_code === code)),
      ]),
    );
    const vnIndexSeries = await fetchVnIndexSeries(days > 0 ? days : 365);
    const benchmarkNavData = vnIndexSeries.map((item) => ({
      fund_code: "VNINDEX",
      nav: item.value,
      date: item.time,
      source: "VNDIRECT",
    }));

    const comparison = buildComparisonSeries(navData, {
      VNINDEX: benchmarkNavData,
      ...peers,
    });
    const metrics = calculateNavMetrics(navData);
    const benchmarkMetrics = calculateNavMetrics(benchmarkNavData);

    const analysis = await analyzeFund({
      fundCode: normalizedFundCode,
      navHistory: navData,
      topHoldings,
      peerComparison: comparison,
      metrics,
    });

    return NextResponse.json({
      success: true,
      fund: normalizedFundCode,
      data: navData,
      metrics,
      comparison,
      peerCodes: ["VNINDEX", ...peerCodes.filter((code) => code !== "VNINDEX")],
      benchmark: {
        code: "VNINDEX",
        label: "VN-Index",
        metrics: benchmarkMetrics,
      },
      ai_insight: analysis,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
