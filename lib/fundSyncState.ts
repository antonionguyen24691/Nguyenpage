import { db } from "@/packages/db";
import { getConfigValue, saveConfigValue } from "@/lib/siteConfigStore";

export type SyncMode = "nav" | "holdings" | "all";
export type SyncJobStatus = "idle" | "queued" | "running" | "success" | "error";

export type FundSyncJobState = {
  status: SyncJobStatus;
  mode: SyncMode | null;
  startedAt: string | null;
  finishedAt: string | null;
  error?: string;
  data?: unknown;
};

type HoldingDocumentHistoryRecord = {
  sourceUrl: string;
  processedAt: string;
  holdingsExtracted: number;
};

type FundHoldingsCrawlHistory = Record<string, Record<string, HoldingDocumentHistoryRecord>>;

const FUND_SYNC_JOB_STATE_KEY = "fund_sync_job_state";
const FUND_HOLDINGS_CRAWL_HISTORY_KEY = "fund_holdings_crawl_history";
const MAX_HISTORY_PERIODS_PER_FUND = 24;

const defaultFundSyncJobState: FundSyncJobState = {
  status: "idle",
  mode: null,
  startedAt: null,
  finishedAt: null,
};

function normalizeFundCode(fundCode: string) {
  return fundCode.trim().toUpperCase();
}

function pruneFundHistory(history: FundHoldingsCrawlHistory) {
  const nextHistory: FundHoldingsCrawlHistory = {};

  for (const [fundCode, records] of Object.entries(history)) {
    nextHistory[fundCode] = Object.fromEntries(
      Object.entries(records)
        .sort(
          (left, right) =>
            new Date(right[1].processedAt).getTime() - new Date(left[1].processedAt).getTime(),
        )
        .slice(0, MAX_HISTORY_PERIODS_PER_FUND),
    );
  }

  return nextHistory;
}

export async function getFundSyncJobState() {
  return getConfigValue<FundSyncJobState>(FUND_SYNC_JOB_STATE_KEY, defaultFundSyncJobState);
}

export async function saveFundSyncJobState(jobState: FundSyncJobState) {
  return saveConfigValue(FUND_SYNC_JOB_STATE_KEY, jobState);
}

export async function getFundHoldingsCrawlHistory() {
  return getConfigValue<FundHoldingsCrawlHistory>(FUND_HOLDINGS_CRAWL_HISTORY_KEY, {});
}

export async function getProcessedHoldingPeriods(fundCodes: string[]) {
  const normalizedCodes = [...new Set(fundCodes.map(normalizeFundCode))];
  const periodMap = new Map<string, Set<string>>(
    normalizedCodes.map((fundCode) => [fundCode, new Set<string>()]),
  );

  if (normalizedCodes.length === 0) {
    return periodMap;
  }

  try {
    const { data, error } = await db
      .from("fund_holdings")
      .select("fund_code, date")
      .in("fund_code", normalizedCodes);

    if (!error && Array.isArray(data)) {
      for (const row of data) {
        periodMap.get(normalizeFundCode(row.fund_code))?.add(row.date);
      }
    }
  } catch {
    // Fall back to history-only mode when DB is unavailable.
  }

  const history = await getFundHoldingsCrawlHistory();
  for (const fundCode of normalizedCodes) {
    const fundHistory = history[fundCode];
    if (!fundHistory) {
      continue;
    }

    for (const reportDate of Object.keys(fundHistory)) {
      periodMap.get(fundCode)?.add(reportDate);
    }
  }

  return periodMap;
}

export async function markHoldingPeriodProcessed(input: {
  fundCode: string;
  reportDate: string;
  sourceUrl: string;
  holdingsExtracted: number;
}) {
  const fundCode = normalizeFundCode(input.fundCode);
  const history = await getFundHoldingsCrawlHistory();
  const nextHistory = pruneFundHistory({
    ...history,
    [fundCode]: {
      ...(history[fundCode] ?? {}),
      [input.reportDate]: {
        sourceUrl: input.sourceUrl,
        processedAt: new Date().toISOString(),
        holdingsExtracted: input.holdingsExtracted,
      },
    },
  });

  return saveConfigValue(FUND_HOLDINGS_CRAWL_HISTORY_KEY, nextHistory);
}
