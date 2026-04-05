import { randomUUID } from "node:crypto";
import path from "node:path";
import { promises as fs } from "node:fs";

export type AlertCondition = "ABOVE" | "BELOW";
export type AlertStatus = "ACTIVE" | "PAUSED" | "TRIGGERED";

export type WatchlistItem = {
  id: string;
  symbol: string;
  createdAt: string;
};

export type Watchlist = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  items: WatchlistItem[];
};

export type Webhook = {
  id: string;
  url: string;
  secret: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type Alert = {
  id: string;
  symbol: string;
  target: number;
  condition: AlertCondition;
  status: AlertStatus;
  cooldownMinutes: number;
  lastTriggeredAt: string | null;
  webhookId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AlertWithWebhook = Alert & { webhook: Webhook | null };

export type WebhookAttempt = {
  id: string;
  webhookId: string;
  alertId: string | null;
  deliveryKey: string | null;
  attemptNo: number;
  statusCode: number | null;
  success: boolean;
  payload: Record<string, unknown>;
  response: string | null;
  createdAt: string;
};

type StockStoreData = {
  watchlists: Watchlist[];
  alerts: Alert[];
  webhooks: Webhook[];
  webhookAttempts: WebhookAttempt[];
};

const localStorePath = path.join(process.cwd(), "data", "stock-dashboard.json");

const emptyStore: StockStoreData = {
  watchlists: [],
  alerts: [],
  webhooks: [],
  webhookAttempts: [],
};

async function readStore(): Promise<StockStoreData> {
  try {
    const raw = await fs.readFile(localStorePath, "utf8");
    const parsed = JSON.parse(raw) as Partial<StockStoreData>;
    return {
      watchlists: Array.isArray(parsed.watchlists) ? parsed.watchlists : [],
      alerts: Array.isArray(parsed.alerts) ? parsed.alerts : [],
      webhooks: Array.isArray(parsed.webhooks) ? parsed.webhooks : [],
      webhookAttempts: Array.isArray(parsed.webhookAttempts) ? parsed.webhookAttempts : [],
    };
  } catch {
    return emptyStore;
  }
}

async function writeStore(data: StockStoreData) {
  await fs.mkdir(path.dirname(localStorePath), { recursive: true });
  await fs.writeFile(localStorePath, JSON.stringify(data, null, 2), "utf8");
}

function nowIso() {
  return new Date().toISOString();
}

function normalizeSymbols(symbols: string[]) {
  return [...new Set(symbols.map((symbol) => symbol.trim().toUpperCase()).filter(Boolean))];
}

export async function listWatchlists() {
  const store = await readStore();
  return store.watchlists.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function createWatchlist(input: { name: string; symbols: string[] }) {
  const store = await readStore();
  const timestamp = nowIso();
  const watchlist: Watchlist = {
    id: randomUUID(),
    name: input.name,
    createdAt: timestamp,
    updatedAt: timestamp,
    items: normalizeSymbols(input.symbols).map((symbol) => ({
      id: randomUUID(),
      symbol,
      createdAt: timestamp,
    })),
  };
  store.watchlists.push(watchlist);
  await writeStore(store);
  return watchlist;
}

export async function updateWatchlist(
  watchlistId: string,
  input: { name?: string; symbols?: string[] },
) {
  const store = await readStore();
  const watchlist = store.watchlists.find((item) => item.id === watchlistId);
  if (!watchlist) return null;

  if (input.name !== undefined) {
    watchlist.name = input.name;
  }
  if (input.symbols !== undefined) {
    const timestamp = nowIso();
    watchlist.items = normalizeSymbols(input.symbols).map((symbol) => ({
      id: randomUUID(),
      symbol,
      createdAt: timestamp,
    }));
  }
  watchlist.updatedAt = nowIso();
  await writeStore(store);
  return watchlist;
}

export async function deleteWatchlist(watchlistId: string) {
  const store = await readStore();
  const before = store.watchlists.length;
  store.watchlists = store.watchlists.filter((item) => item.id !== watchlistId);
  await writeStore(store);
  return store.watchlists.length < before;
}

export async function listWebhooks() {
  const store = await readStore();
  return store.webhooks.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function createWebhook(input: { url: string; secret: string; isActive: boolean }) {
  const store = await readStore();
  const timestamp = nowIso();
  const webhook: Webhook = {
    id: randomUUID(),
    url: input.url,
    secret: input.secret,
    isActive: input.isActive,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  store.webhooks.push(webhook);
  await writeStore(store);
  return webhook;
}

export async function updateWebhook(
  webhookId: string,
  input: { url?: string; secret?: string; isActive?: boolean },
) {
  const store = await readStore();
  const webhook = store.webhooks.find((item) => item.id === webhookId);
  if (!webhook) return null;

  if (input.url !== undefined) webhook.url = input.url;
  if (input.secret !== undefined) webhook.secret = input.secret;
  if (input.isActive !== undefined) webhook.isActive = input.isActive;
  webhook.updatedAt = nowIso();
  await writeStore(store);
  return webhook;
}

export async function deleteWebhook(webhookId: string) {
  const store = await readStore();
  const before = store.webhooks.length;
  store.webhooks = store.webhooks.filter((item) => item.id !== webhookId);
  for (const alert of store.alerts) {
    if (alert.webhookId === webhookId) {
      alert.webhookId = null;
      alert.updatedAt = nowIso();
    }
  }
  await writeStore(store);
  return store.webhooks.length < before;
}

export async function listAlerts(): Promise<AlertWithWebhook[]> {
  const store = await readStore();
  const webhookMap = new Map(store.webhooks.map((item) => [item.id, item]));
  return store.alerts
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map((alert) => ({
      ...alert,
      webhook: alert.webhookId ? webhookMap.get(alert.webhookId) ?? null : null,
    }));
}

export async function createAlert(input: {
  symbol: string;
  target: number;
  condition: AlertCondition;
  cooldownMinutes: number;
  webhookId: string | null;
}) {
  const store = await readStore();
  const timestamp = nowIso();
  const alert: Alert = {
    id: randomUUID(),
    symbol: input.symbol,
    target: input.target,
    condition: input.condition,
    status: "ACTIVE",
    cooldownMinutes: input.cooldownMinutes,
    lastTriggeredAt: null,
    webhookId: input.webhookId,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  store.alerts.push(alert);
  await writeStore(store);
  const webhook = input.webhookId
    ? store.webhooks.find((item) => item.id === input.webhookId) ?? null
    : null;
  return { ...alert, webhook };
}

export async function updateAlert(
  alertId: string,
  input: {
    symbol?: string;
    target?: number;
    condition?: AlertCondition;
    status?: AlertStatus;
    cooldownMinutes?: number;
    webhookId?: string | null;
  },
) {
  const store = await readStore();
  const alert = store.alerts.find((item) => item.id === alertId);
  if (!alert) return null;

  if (input.symbol !== undefined) alert.symbol = input.symbol;
  if (input.target !== undefined) alert.target = input.target;
  if (input.condition !== undefined) alert.condition = input.condition;
  if (input.status !== undefined) alert.status = input.status;
  if (input.cooldownMinutes !== undefined) alert.cooldownMinutes = input.cooldownMinutes;
  if (input.webhookId !== undefined) alert.webhookId = input.webhookId;
  alert.updatedAt = nowIso();

  await writeStore(store);
  const webhook = alert.webhookId ? store.webhooks.find((item) => item.id === alert.webhookId) ?? null : null;
  return { ...alert, webhook };
}

export async function deleteAlert(alertId: string) {
  const store = await readStore();
  const before = store.alerts.length;
  store.alerts = store.alerts.filter((item) => item.id !== alertId);
  await writeStore(store);
  return store.alerts.length < before;
}

export async function listWebhookAttempts(limit = 25) {
  const store = await readStore();
  const webhookMap = new Map(store.webhooks.map((item) => [item.id, item]));
  return store.webhookAttempts
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit)
    .map((attempt) => ({
      ...attempt,
      webhook: webhookMap.get(attempt.webhookId) ?? null,
    }));
}
