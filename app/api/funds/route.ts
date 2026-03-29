import { NextResponse } from "next/server";
import { getFundCatalogEntry } from "@/lib/fundCatalog";
import {
  calculateChange,
  calculateNavMetrics,
  sanitizeNavHistory,
} from "@/lib/fundAnalytics";
import { getFundDataset } from "@/lib/fundDataStore";

export const dynamic = "force-dynamic";

const STALE_NAV_DAYS = 21;

function getAgeInDays(date: string | null) {
  if (!date) {
    return null;
  }

  const timestamp = new Date(date).getTime();
  if (Number.isNaN(timestamp)) {
    return null;
  }

  return Math.floor((Date.now() - timestamp) / (24 * 60 * 60 * 1000));
}

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
      const navAgeDays = getAgeInDays(latest?.date ?? null);
      const isStale = navAgeDays !== null && navAgeDays > STALE_NAV_DAYS;

      return {
        ...fund,
        company: catalog?.company ?? fund.company,
        name: catalog?.name ?? fund.name,
        category: catalog?.category ?? "equity",
        nav: latest ? Number(latest.nav) : null,
        nav_date: latest?.date ?? null,
        nav_source: latest?.source ?? null,
        nav_age_days: navAgeDays,
        daily_change_percent: daily.percent,
        monthly_change_percent: metrics.monthly.percent,
        quarterly_change_percent: metrics.quarterly.percent,
        point_count: history.length,
        data_status: history.length === 0 ? "missing" : isStale ? "stale" : "ready",
        data_issue:
          history.length === 0
            ? "Quỹ này chưa có nguồn NAV ổn định trong dataset hiện tại hoặc nguồn crawl chưa lấy được dữ liệu."
            : isStale
              ? `Dữ liệu NAV hiện mới tới ${latest?.date ?? "không rõ ngày"}${
                  latest?.source ? ` từ ${latest.source}` : ""
                }. Chuỗi lịch sử cũ vẫn hợp lệ, nhưng mốc cập nhật gần nhất đang chậm so với hiện tại.`
              : null,
        priority: catalog?.priority ?? 999,
      };
    });

    results.sort((left, right) => {
      const statusRank = { ready: 0, stale: 1, missing: 2 } as const;
      const rankDiff =
        statusRank[left.data_status as keyof typeof statusRank] -
        statusRank[right.data_status as keyof typeof statusRank];
      if (rankDiff !== 0) {
        return rankDiff;
      }

      if (
        (right.quarterly_change_percent ?? -Infinity) !==
        (left.quarterly_change_percent ?? -Infinity)
      ) {
        return (
          (right.quarterly_change_percent ?? -Infinity) -
          (left.quarterly_change_percent ?? -Infinity)
        );
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
