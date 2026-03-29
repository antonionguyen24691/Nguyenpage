import type { ChartPoint } from "@/lib/fundAnalytics";

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

export async function fetchVnIndexSeries(days = 365): Promise<ChartPoint[]> {
  const to = new Date();
  const from = new Date();
  from.setUTCDate(from.getUTCDate() - Math.max(days + 15, 90));

  const url =
    `https://dchart-api.vndirect.com.vn/dchart/history?resolution=D&symbol=VNINDEX` +
    `&from=${toUnix(from)}&to=${toUnix(to)}`;

  const response = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0" },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} while fetching VN-Index`);
  }

  const payload = (await response.json()) as HistoryPayload;
  const timestamps = Array.isArray(payload.t) ? payload.t : [];
  const closes = Array.isArray(payload.c) ? payload.c : [];

  return timestamps
    .map((timestamp, index) => ({
      time: normalizeDate(timestamp),
      value: Number(closes[index]),
    }))
    .filter((item) => Number.isFinite(item.value) && item.value > 0);
}
