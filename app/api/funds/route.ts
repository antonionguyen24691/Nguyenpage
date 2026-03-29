import { NextResponse } from "next/server";
import { getFundCatalogEntry } from "@/lib/fundCatalog";
import {
  calculateChange,
  calculateNavMetrics,
  sanitizeNavHistory,
} from "@/lib/fundAnalytics";
import { getFundDataset } from "@/lib/fundDataStore";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const dataset = await getFundDataset();

    const results = dataset.funds.map((fund) => {
      const history = sanitizeNavHistory(
        dataset.nav.filter((row) => row.fund_code === fund.code.toUpperCase()),
      );
      const latest = history.at(-1) ?? null;
      const previous = history.length > 1 ? history.at(-2) ?? null : null;
      const daily = calculateChange(
        latest ? Number(latest.nav) : null,
        previous ? Number(previous.nav) : null,
      );
      const metrics = calculateNavMetrics(history);
      const catalog = getFundCatalogEntry(fund.code);

      return {
        ...fund,
        company: catalog?.company ?? fund.company,
        name: catalog?.name ?? fund.name,
        category: catalog?.category ?? "equity",
        nav: latest ? Number(latest.nav) : null,
        nav_date: latest?.date ?? null,
        daily_change_percent: daily.percent,
        monthly_change_percent: metrics.monthly.percent,
        quarterly_change_percent: metrics.quarterly.percent,
        point_count: history.length,
        data_status: history.length > 0 ? "ready" : "missing",
        data_issue:
          history.length > 0
            ? null
            : "Quỹ này chưa có nguồn NAV ổn định trong dataset hiện tại hoặc nguồn crawl chưa lấy được dữ liệu.",
        priority: catalog?.priority ?? 999,
      };
    });

    results.sort((left, right) => {
      const availabilityScore = Number(right.point_count > 0) - Number(left.point_count > 0);
      if (availabilityScore !== 0) {
        return availabilityScore;
      }

      if ((right.quarterly_change_percent ?? -Infinity) !== (left.quarterly_change_percent ?? -Infinity)) {
        return (right.quarterly_change_percent ?? -Infinity) - (left.quarterly_change_percent ?? -Infinity);
      }

      if (left.priority !== right.priority) {
        return left.priority - right.priority;
      }

      return left.code.localeCompare(right.code);
    });

    return NextResponse.json({
      success: true,
      data: results,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
