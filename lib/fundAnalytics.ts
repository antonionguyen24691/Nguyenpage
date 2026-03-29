export type FundNavRecord = {
  fund_code: string;
  nav: number;
  date: string;
  source?: string | null;
};

export type FundHoldingRecord = {
  fund_code: string;
  stock_code: string;
  weight: number;
  date: string;
};

export type ChartPoint = {
  time: string;
  value: number;
};

export type CandlePoint = {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
};

export type HoldingsComparisonRow = {
  stock_code: string;
  weights: Array<number | null>;
  changeVsPrevious: number | null;
};

const RANGE_IN_DAYS: Record<string, number> = {
  "1M": 31,
  "3M": 93,
  "6M": 186,
  "1Y": 366,
};
const MAX_NAV_SOURCE_JUMP_PERCENT = 25;

export function normalizeDate(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  return date.toISOString().slice(0, 10);
}

export function sortNavAscending(data: FundNavRecord[]) {
  return [...data].sort(
    (left, right) => new Date(left.date).getTime() - new Date(right.date).getTime(),
  );
}

export function sortNavDescending(data: FundNavRecord[]) {
  return [...data].sort(
    (left, right) => new Date(right.date).getTime() - new Date(left.date).getTime(),
  );
}

export function sanitizeNavHistory(navHistory: FundNavRecord[]) {
  const ordered = sortNavAscending(navHistory);
  const sanitized: FundNavRecord[] = [];

  for (const row of ordered) {
    const currentNav = Number(row.nav);
    const previous = sanitized.at(-1);

    if (!Number.isFinite(currentNav) || currentNav <= 0) {
      continue;
    }

    if (!previous) {
      sanitized.push({ ...row, nav: currentNav });
      continue;
    }

    const previousNav = Number(previous.nav);
    const sourceChanged =
      Boolean(previous.source) &&
      Boolean(row.source) &&
      previous.source !== row.source;
    const jumpPercent = Math.abs(((currentNav - previousNav) / previousNav) * 100);
    const prefersPreviousSource = String(previous.source ?? "").toLowerCase().includes("fmarket");
    const rowIsFallbackSource = !String(row.source ?? "").toLowerCase().includes("fmarket");

    if (
      sourceChanged &&
      prefersPreviousSource &&
      rowIsFallbackSource &&
      jumpPercent > MAX_NAV_SOURCE_JUMP_PERCENT
    ) {
      continue;
    }

    sanitized.push({ ...row, nav: currentNav });
  }

  return sanitized;
}

export function toChartSeries(data: FundNavRecord[]) {
  return sanitizeNavHistory(data).map((item) => ({
    time: normalizeDate(item.date),
    value: Number(item.nav),
  }));
}

export function filterSeriesByRange(data: ChartPoint[], range: string) {
  const days = RANGE_IN_DAYS[range];
  if (!days || data.length === 0) {
    return data;
  }

  const latestTime = new Date(data[data.length - 1].time).getTime();
  const minTime = latestTime - days * 24 * 60 * 60 * 1000;
  return data.filter((item) => new Date(item.time).getTime() >= minTime);
}

export function calculateChange(current: number | null, previous: number | null) {
  if (current === null || previous === null || previous === 0) {
    return { absolute: null, percent: null };
  }

  const absolute = current - previous;
  return {
    absolute,
    percent: (absolute / previous) * 100,
  };
}

function pickNearestPointFromEnd(data: FundNavRecord[], fallbackOffset: number) {
  if (data.length <= fallbackOffset) {
    return null;
  }
  return data[data.length - 1 - fallbackOffset];
}

export function calculateNavMetrics(navHistory: FundNavRecord[]) {
  const ordered = sanitizeNavHistory(navHistory);
  const latest = ordered.at(-1) ?? null;
  const previous = ordered.length > 1 ? ordered.at(-2) ?? null : null;
  const monthOffset = ordered.length > 1 ? Math.min(21, ordered.length - 1) : 0;
  const quarterOffset = ordered.length > 1 ? Math.min(63, ordered.length - 1) : 0;
  const monthOld = monthOffset > 0 ? pickNearestPointFromEnd(ordered, monthOffset) : null;
  const quarterOld = quarterOffset > 0 ? pickNearestPointFromEnd(ordered, quarterOffset) : null;
  const first = ordered[0] ?? null;
  const values = ordered.map((item) => Number(item.nav));
  const high = values.length ? Math.max(...values) : null;
  const low = values.length ? Math.min(...values) : null;

  return {
    latestNav: latest ? Number(latest.nav) : null,
    latestDate: latest?.date ?? null,
    daily: calculateChange(latest ? Number(latest.nav) : null, previous ? Number(previous.nav) : null),
    monthly: calculateChange(latest ? Number(latest.nav) : null, monthOld ? Number(monthOld.nav) : null),
    quarterly: calculateChange(
      latest ? Number(latest.nav) : null,
      quarterOld ? Number(quarterOld.nav) : null,
    ),
    sinceInception: calculateChange(
      latest ? Number(latest.nav) : null,
      first ? Number(first.nav) : null,
    ),
    high,
    low,
    pointCount: ordered.length,
  };
}

export function buildComparisonSeries(
  baseData: FundNavRecord[],
  peers: Record<string, FundNavRecord[]>,
) {
  const result: Record<string, ChartPoint[]> = {};
  const series = { self: baseData, ...peers };

  for (const [code, values] of Object.entries(series)) {
    const ordered = sortNavAscending(values);
    if (ordered.length === 0) {
      result[code] = [];
      continue;
    }

    const base = Number(ordered[0].nav) || 1;
    result[code] = ordered.map((item) => ({
      time: normalizeDate(item.date),
      value: (Number(item.nav) / base) * 100,
    }));
  }

  return result;
}

export function buildCandles(data: ChartPoint[], granularity: "week" | "month" = "week") {
  const buckets = new Map<string, ChartPoint[]>();

  for (const point of data) {
    const date = new Date(point.time);
    const key =
      granularity === "month"
        ? `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`
        : `${date.getUTCFullYear()}-W${getIsoWeek(date)}`;
    const bucket = buckets.get(key) ?? [];
    bucket.push(point);
    buckets.set(key, bucket);
  }

  return [...buckets.values()].map((bucket) => {
    const ordered = [...bucket].sort(
      (left, right) => new Date(left.time).getTime() - new Date(right.time).getTime(),
    );
    const values = ordered.map((item) => item.value);
    return {
      time: ordered[ordered.length - 1].time,
      open: ordered[0].value,
      high: Math.max(...values),
      low: Math.min(...values),
      close: ordered[ordered.length - 1].value,
    } satisfies CandlePoint;
  });
}

export function buildHeikinAshi(candles: CandlePoint[]) {
  const result: CandlePoint[] = [];

  for (const candle of candles) {
    const close = (candle.open + candle.high + candle.low + candle.close) / 4;
    const previous = result.at(-1);
    const open = previous ? (previous.open + previous.close) / 2 : (candle.open + candle.close) / 2;
    const high = Math.max(candle.high, open, close);
    const low = Math.min(candle.low, open, close);
    result.push({ time: candle.time, open, high, low, close });
  }

  return result;
}

export function getRecentDates(dates: string[], limit = 4) {
  return [...dates]
    .sort((left, right) => new Date(right).getTime() - new Date(left).getTime())
    .slice(0, limit);
}

export function simplifyHoldingCode(stockCode: string) {
  const normalized = stockCode.trim().toUpperCase();
  const matched = normalized.match(/^[A-Z-]+/);
  return matched?.[0] ?? normalized;
}

export function aggregateHoldingRows(holdings: FundHoldingRecord[]) {
  const merged = new Map<string, FundHoldingRecord>();

  for (const row of holdings) {
    const stockCode = simplifyHoldingCode(row.stock_code);
    const date = normalizeDate(row.date);
    const key = `${row.fund_code.toUpperCase()}::${date}::${stockCode}`;
    const existing = merged.get(key);

    if (existing) {
      existing.weight += Number(row.weight);
      continue;
    }

    merged.set(key, {
      fund_code: row.fund_code.toUpperCase(),
      stock_code: stockCode,
      weight: Number(row.weight),
      date,
    });
  }

  return [...merged.values()].sort(
    (left, right) => new Date(right.date).getTime() - new Date(left.date).getTime(),
  );
}

export function buildHoldingsComparison(
  holdings: FundHoldingRecord[],
  focusDate: string | null,
  maxPeriods = 4,
) {
  const normalizedHoldings = aggregateHoldingRows(holdings);
  const allDates = getRecentDates(
    Array.from(new Set(normalizedHoldings.map((item) => normalizeDate(item.date)))),
    Math.max(maxPeriods, 4),
  );

  const orderedDates = focusDate
    ? [focusDate, ...allDates.filter((date) => date !== focusDate)].slice(0, maxPeriods)
    : allDates.slice(0, maxPeriods);

  const bucketByDate = new Map<string, Map<string, number>>();
  for (const date of orderedDates) {
    bucketByDate.set(date, new Map());
  }

  for (const row of normalizedHoldings) {
    const normalized = normalizeDate(row.date);
    const bucket = bucketByDate.get(normalized);
    if (!bucket) {
      continue;
    }
    bucket.set(row.stock_code, Number(row.weight));
  }

  const allCodes = new Set<string>();
  for (const bucket of bucketByDate.values()) {
    for (const code of bucket.keys()) {
      allCodes.add(code);
    }
  }

  const rows = [...allCodes]
    .map((code) => {
      const weights = orderedDates.map((date) => bucketByDate.get(date)?.get(code) ?? null);
      const current = weights[0];
      const previous = weights[1];
      const changeVsPrevious =
        current !== null && previous !== null ? current - previous : null;
      return {
        stock_code: code,
        weights,
        changeVsPrevious,
      } satisfies HoldingsComparisonRow;
    })
    .sort((left, right) => (right.weights[0] ?? -1) - (left.weights[0] ?? -1));

  return {
    dates: orderedDates,
    rows,
  };
}

function getIsoWeek(date: Date) {
  const utcDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNumber = utcDate.getUTCDay() || 7;
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - dayNumber);
  const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
  return Math.ceil((((utcDate.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
    .toString()
    .padStart(2, "0");
}
