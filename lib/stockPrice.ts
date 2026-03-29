export type StockPriceSnapshot = {
  stock_code: string;
  currentPrice: number | null;
  currentDate: string | null;
  monthAgoPrice: number | null;
  monthAgoDate: string | null;
  monthChangePercent: number | null;
};

type HistoryPayload = {
  t?: number[];
  c?: number[];
};

function toUnix(date: Date) {
  return Math.floor(date.getTime() / 1000);
}

function normalizeDate(timestamp: number) {
  return new Date(timestamp * 1000).toISOString().slice(0, 10);
}

function findLatestPointBefore(points: Array<{ date: string; close: number }>, target: Date) {
  const targetTime = target.getTime();

  for (let index = points.length - 1; index >= 0; index -= 1) {
    const pointTime = new Date(points[index].date).getTime();
    if (pointTime <= targetTime) {
      return points[index];
    }
  }

  return null;
}

async function fetchPriceHistory(symbol: string) {
  const from = new Date();
  from.setUTCMonth(from.getUTCMonth() - 3);
  const to = new Date();
  const url =
    `https://dchart-api.vndirect.com.vn/dchart/history?resolution=D&symbol=${encodeURIComponent(symbol)}` +
    `&from=${toUnix(from)}&to=${toUnix(to)}`;

  const response = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0" },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${symbol}`);
  }

  const payload = (await response.json()) as HistoryPayload;
  const timestamps = Array.isArray(payload.t) ? payload.t : [];
  const closes = Array.isArray(payload.c) ? payload.c : [];

  return timestamps
    .map((timestamp, index) => ({
      date: normalizeDate(timestamp),
      close: Number(closes[index]),
    }))
    .filter((item) => Number.isFinite(item.close) && item.close > 0);
}

export async function getStockPriceSnapshots(symbols: string[]) {
  const uniqueSymbols = [...new Set(symbols.map((symbol) => symbol.trim().toUpperCase()).filter(Boolean))];
  const snapshotMap = new Map<string, StockPriceSnapshot>();

  await Promise.all(
    uniqueSymbols.map(async (symbol) => {
      try {
        const history = await fetchPriceHistory(symbol);
        const current = history.at(-1) ?? null;
        const monthAgo = current
          ? findLatestPointBefore(history, new Date(new Date(current.date).getTime() - 31 * 24 * 60 * 60 * 1000))
          : null;
        const monthChangePercent =
          current && monthAgo ? ((current.close - monthAgo.close) / monthAgo.close) * 100 : null;

        snapshotMap.set(symbol, {
          stock_code: symbol,
          currentPrice: current?.close ?? null,
          currentDate: current?.date ?? null,
          monthAgoPrice: monthAgo?.close ?? null,
          monthAgoDate: monthAgo?.date ?? null,
          monthChangePercent,
        });
      } catch {
        snapshotMap.set(symbol, {
          stock_code: symbol,
          currentPrice: null,
          currentDate: null,
          monthAgoPrice: null,
          monthAgoDate: null,
          monthChangePercent: null,
        });
      }
    }),
  );

  return snapshotMap;
}
