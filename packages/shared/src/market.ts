export type MarketQuote = {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  updatedAt: string;
};

export type AlertEvaluation = {
  alertId: string;
  symbol: string;
  shouldTrigger: boolean;
  reason: "above-target" | "below-target" | "cooldown-active";
};
