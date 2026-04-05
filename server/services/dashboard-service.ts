import { getDashboardQuotes } from "./market-service";
import { listAlerts } from "./alert-service";
import { getCurrentUser } from "./user-context";
import { listWatchlists } from "./watchlist-service";
import { listWebhooks } from "./webhook-service";

export async function getDashboardSnapshot() {
  const user = await getCurrentUser();

  if (!user) {
    return {
      quotes: await getDashboardQuotes(),
      watchlists: [],
      alerts: [],
      webhooks: [],
      generatedAt: new Date().toISOString(),
    };
  }

  const [watchlists, alerts, webhooks] = await Promise.all([
    listWatchlists(user.id),
    listAlerts(user.id),
    listWebhooks(user.id),
  ]);
  const trackedSymbols = [
    ...new Set([
      ...watchlists.flatMap((watchlist) => watchlist.items.map((item) => item.symbol)),
      ...alerts.map((alert) => alert.symbol),
    ]),
  ];
  const quotes = await getDashboardQuotes(trackedSymbols);

  return {
    quotes,
    watchlists,
    alerts,
    webhooks,
    generatedAt: new Date().toISOString(),
  };
}
