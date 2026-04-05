import { listAlerts } from "./alert-service";
import { getQuotesBySymbols } from "./market-service";
import { listWebhookAttempts } from "./stock-store";
import { getCurrentUser } from "./user-context";
import { listWatchlists } from "./watchlist-service";
import { listWebhooks } from "./webhook-service";

export async function getDebugSnapshot() {
  const user = await getCurrentUser();

  if (!user) {
    return {
      user: null,
      trackedSymbols: [],
      quotes: [],
      alerts: [],
      webhooks: [],
      webhookAttempts: [],
      generatedAt: new Date().toISOString(),
    };
  }

  const [watchlists, alerts, webhooks] = await Promise.all([
    listWatchlists(user.id),
    listAlerts(user.id),
    listWebhooks(user.id),
  ]);
  const webhookAttempts = await listWebhookAttempts(25);

  const trackedSymbols = [
    ...new Set([
      ...watchlists.flatMap((watchlist) => watchlist.items.map((item) => item.symbol)),
      ...alerts.map((alert) => alert.symbol),
    ]),
  ].sort();

  const quotes = await getQuotesBySymbols(trackedSymbols);

  return {
    user,
    trackedSymbols,
    quotes,
    alerts,
    webhooks,
    webhookAttempts,
    generatedAt: new Date().toISOString(),
  };
}
