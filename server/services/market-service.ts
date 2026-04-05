import { getStockPriceSnapshots } from "@/lib/stockPrice";

export type MarketQuote = {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  updatedAt: string;
};

const fallbackQuotes: MarketQuote[] = [
  {
    symbol: "HPG",
    price: 28600,
    change: 300,
    changePercent: 1.06,
    volume: 15400200,
    updatedAt: new Date().toISOString(),
  },
  {
    symbol: "FPT",
    price: 121500,
    change: -400,
    changePercent: -0.33,
    volume: 2034500,
    updatedAt: new Date().toISOString(),
  },
  {
    symbol: "VCB",
    price: 91700,
    change: 700,
    changePercent: 0.77,
    volume: 1244300,
    updatedAt: new Date().toISOString(),
  },
];

export async function getQuoteBySymbol(symbol: string): Promise<MarketQuote | null> {
  const normalized = symbol.trim().toUpperCase();
  if (!normalized) return null;

  try {
    const snapshot = (await getStockPriceSnapshots([normalized])).get(normalized);
    if (snapshot?.currentPrice != null) {
      return {
        symbol: normalized,
        price: snapshot.currentPrice,
        change: 0,
        changePercent: snapshot.monthChangePercent ?? 0,
        volume: 0,
        updatedAt: snapshot.currentDate ?? new Date().toISOString(),
      };
    }
  } catch {
    // Fall back below.
  }

  return fallbackQuotes.find((quote) => quote.symbol === normalized) ?? null;
}

export async function getQuotesBySymbols(symbols: string[]) {
  const uniqueSymbols = [...new Set(symbols.map((symbol) => symbol.toUpperCase()))];

  if (uniqueSymbols.length === 0) {
    return fallbackQuotes;
  }

  const quotes = await Promise.all(uniqueSymbols.map((symbol) => getQuoteBySymbol(symbol)));
  return quotes.filter((quote): quote is MarketQuote => Boolean(quote));
}

export async function getDashboardQuotes(symbols?: string[]) {
  if (symbols && symbols.length > 0) {
    return getQuotesBySymbols(symbols);
  }

  return fallbackQuotes;
}
