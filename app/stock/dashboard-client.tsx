"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";

type Quote = {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  updatedAt: string;
};

type AlertCondition = "ABOVE" | "BELOW";
type AlertStatus = "ACTIVE" | "PAUSED" | "TRIGGERED";

type Watchlist = {
  id: string;
  name: string;
  items: { id: string; symbol: string }[];
};

type Webhook = {
  id: string;
  url: string;
  isActive: boolean;
};

type Alert = {
  id: string;
  symbol: string;
  target: number;
  condition: AlertCondition;
  status: AlertStatus;
  cooldownMinutes: number;
  webhookId: string | null;
};

type DashboardClientProps = {
  quotes: Quote[];
  watchlists: Watchlist[];
  alerts: Alert[];
  webhooks: Webhook[];
};

export function DashboardClient(props: DashboardClientProps) {
  const router = useRouter();
  const [watchlistForm, setWatchlistForm] = useState({ name: "", symbols: "" });
  const [alertForm, setAlertForm] = useState({
    symbol: "",
    target: "",
    condition: "ABOVE" as AlertCondition,
    cooldownMinutes: "5",
    webhookId: "",
  });
  const [webhookForm, setWebhookForm] = useState({ url: "", secret: "", isActive: true });
  const [busyKey, setBusyKey] = useState<string | null>(null);

  async function runAction(key: string, action: () => Promise<void>) {
    setBusyKey(key);

    try {
      await action();
      startTransition(() => router.refresh());
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <main style={{ maxWidth: 1120, margin: "0 auto", padding: "48px 24px 72px" }}>
      <header style={{ display: "flex", justifyContent: "space-between", gap: 16, marginBottom: 24 }}>
        <div>
          <h1 style={{ marginBottom: 8 }}>Dashboard</h1>
          <p style={{ color: "var(--text-muted)", margin: 0 }}>
            Manage watchlists, alerts, webhooks, and inspect cached market quotes from one place.
          </p>
        </div>
        <Link
          href="/stock/debug"
          style={{
            padding: "12px 16px",
            borderRadius: 999,
            border: "1px solid var(--line)",
            alignSelf: "flex-start",
          }}
        >
          Open debug view
        </Link>
      </header>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 16,
          marginBottom: 32,
        }}
      >
        {props.quotes.map((quote) => (
          <article key={quote.symbol} style={panelStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <strong>{quote.symbol}</strong>
              <span style={{ color: quote.change >= 0 ? "var(--accent)" : "var(--danger)" }}>
                {quote.changePercent.toFixed(2)}%
              </span>
            </div>
            <p style={{ fontSize: 28, margin: "12px 0 8px" }}>{quote.price.toLocaleString()}</p>
            <p style={{ color: "var(--text-muted)", margin: 0 }}>
              Volume {quote.volume.toLocaleString()}
            </p>
          </article>
        ))}
      </section>

      <section style={{ display: "grid", gap: 16 }}>
        <article style={panelStyle}>
          <h2 style={headingStyle}>Watchlists</h2>
          <div style={formGridStyle}>
            <input
              placeholder="Name"
              value={watchlistForm.name}
              onChange={(event) => setWatchlistForm((current) => ({ ...current, name: event.target.value }))}
              style={inputStyle}
            />
            <input
              placeholder="Symbols: HPG,FPT,VCB"
              value={watchlistForm.symbols}
              onChange={(event) => setWatchlistForm((current) => ({ ...current, symbols: event.target.value }))}
              style={inputStyle}
            />
            <button
              type="button"
              disabled={busyKey === "create-watchlist"}
              onClick={() =>
                runAction("create-watchlist", async () => {
                  await fetch("/api/watchlists", {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({
                      name: watchlistForm.name,
                      symbols: watchlistForm.symbols
                        .split(",")
                        .map((symbol) => symbol.trim())
                        .filter(Boolean),
                    }),
                  });
                  setWatchlistForm({ name: "", symbols: "" });
                })
              }
              style={buttonStyle}
            >
              Add watchlist
            </button>
          </div>
          <div style={{ display: "grid", gap: 12, marginTop: 20 }}>
            {props.watchlists.map((watchlist) => (
              <EditableWatchlistCard
                key={watchlist.id}
                watchlist={watchlist}
                busy={busyKey === watchlist.id}
                onSave={(payload) =>
                  runAction(watchlist.id, async () => {
                    await fetch(`/api/watchlists/${watchlist.id}`, {
                      method: "PATCH",
                      headers: { "content-type": "application/json" },
                      body: JSON.stringify(payload),
                    });
                  })
                }
                onDelete={() =>
                  runAction(watchlist.id, async () => {
                    await fetch(`/api/watchlists/${watchlist.id}`, { method: "DELETE" });
                  })
                }
              />
            ))}
          </div>
        </article>

        <article style={panelStyle}>
          <h2 style={headingStyle}>Alerts</h2>
          <div style={formGridStyle}>
            <input
              placeholder="Symbol"
              value={alertForm.symbol}
              onChange={(event) => setAlertForm((current) => ({ ...current, symbol: event.target.value }))}
              style={inputStyle}
            />
            <input
              placeholder="Target"
              value={alertForm.target}
              onChange={(event) => setAlertForm((current) => ({ ...current, target: event.target.value }))}
              style={inputStyle}
            />
            <select
              value={alertForm.condition}
              onChange={(event) =>
                setAlertForm((current) => ({
                  ...current,
                  condition: event.target.value as AlertCondition,
                }))
              }
              style={inputStyle}
            >
              <option value="ABOVE">ABOVE</option>
              <option value="BELOW">BELOW</option>
            </select>
            <input
              placeholder="Cooldown minutes"
              value={alertForm.cooldownMinutes}
              onChange={(event) =>
                setAlertForm((current) => ({ ...current, cooldownMinutes: event.target.value }))
              }
              style={inputStyle}
            />
            <select
              value={alertForm.webhookId}
              onChange={(event) => setAlertForm((current) => ({ ...current, webhookId: event.target.value }))}
              style={inputStyle}
            >
              <option value="">No webhook</option>
              {props.webhooks.map((webhook) => (
                <option key={webhook.id} value={webhook.id}>
                  {webhook.url}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={busyKey === "create-alert"}
              onClick={() =>
                runAction("create-alert", async () => {
                  await fetch("/api/alerts", {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({
                      symbol: alertForm.symbol,
                      target: Number(alertForm.target),
                      condition: alertForm.condition,
                      cooldownMinutes: Number(alertForm.cooldownMinutes),
                      webhookId: alertForm.webhookId || undefined,
                    }),
                  });
                  setAlertForm({
                    symbol: "",
                    target: "",
                    condition: "ABOVE",
                    cooldownMinutes: "5",
                    webhookId: "",
                  });
                })
              }
              style={buttonStyle}
            >
              Add alert
            </button>
          </div>
          <div style={{ display: "grid", gap: 12, marginTop: 20 }}>
            {props.alerts.map((alert) => (
              <EditableAlertCard
                key={alert.id}
                alert={alert}
                webhooks={props.webhooks}
                busy={busyKey === alert.id}
                onSave={(payload) =>
                  runAction(alert.id, async () => {
                    await fetch(`/api/alerts/${alert.id}`, {
                      method: "PATCH",
                      headers: { "content-type": "application/json" },
                      body: JSON.stringify(payload),
                    });
                  })
                }
                onDelete={() =>
                  runAction(alert.id, async () => {
                    await fetch(`/api/alerts/${alert.id}`, { method: "DELETE" });
                  })
                }
              />
            ))}
          </div>
        </article>

        <article style={panelStyle}>
          <h2 style={headingStyle}>Webhooks</h2>
          <div style={formGridStyle}>
            <input
              placeholder="https://your-bot.com/hook"
              value={webhookForm.url}
              onChange={(event) => setWebhookForm((current) => ({ ...current, url: event.target.value }))}
              style={inputStyle}
            />
            <input
              placeholder="Secret"
              value={webhookForm.secret}
              onChange={(event) => setWebhookForm((current) => ({ ...current, secret: event.target.value }))}
              style={inputStyle}
            />
            <label style={{ ...mutedStyle, display: "flex", alignItems: "center", gap: 8 }}>
              <input
                type="checkbox"
                checked={webhookForm.isActive}
                onChange={(event) =>
                  setWebhookForm((current) => ({ ...current, isActive: event.target.checked }))
                }
              />
              Active
            </label>
            <button
              type="button"
              disabled={busyKey === "create-webhook"}
              onClick={() =>
                runAction("create-webhook", async () => {
                  await fetch("/api/webhooks", {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify(webhookForm),
                  });
                  setWebhookForm({ url: "", secret: "", isActive: true });
                })
              }
              style={buttonStyle}
            >
              Add webhook
            </button>
          </div>
          <div style={{ display: "grid", gap: 12, marginTop: 20 }}>
            {props.webhooks.map((webhook) => (
              <EditableWebhookCard
                key={webhook.id}
                webhook={webhook}
                busy={busyKey === webhook.id}
                onSave={(payload) =>
                  runAction(webhook.id, async () => {
                    await fetch(`/api/webhooks/${webhook.id}`, {
                      method: "PATCH",
                      headers: { "content-type": "application/json" },
                      body: JSON.stringify(payload),
                    });
                  })
                }
                onDelete={() =>
                  runAction(webhook.id, async () => {
                    await fetch(`/api/webhooks/${webhook.id}`, { method: "DELETE" });
                  })
                }
              />
            ))}
          </div>
        </article>
      </section>
    </main>
  );
}

function EditableWatchlistCard({
  watchlist,
  busy,
  onSave,
  onDelete,
}: {
  watchlist: Watchlist;
  busy: boolean;
  onSave: (payload: { name: string; symbols: string[] }) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const [name, setName] = useState(watchlist.name);
  const [symbols, setSymbols] = useState(watchlist.items.map((item) => item.symbol).join(", "));

  return (
    <div style={cardStyle}>
      <input value={name} onChange={(event) => setName(event.target.value)} style={inputStyle} />
      <input value={symbols} onChange={(event) => setSymbols(event.target.value)} style={inputStyle} />
      <div style={actionRowStyle}>
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            onSave({
              name,
              symbols: symbols.split(",").map((symbol) => symbol.trim()).filter(Boolean),
            })
          }
          style={buttonStyle}
        >
          Save
        </button>
        <button type="button" disabled={busy} onClick={onDelete} style={dangerButtonStyle}>
          Delete
        </button>
      </div>
    </div>
  );
}

function EditableAlertCard({
  alert,
  webhooks,
  busy,
  onSave,
  onDelete,
}: {
  alert: Alert;
  webhooks: Webhook[];
  busy: boolean;
  onSave: (payload: {
    symbol: string;
    target: number;
    condition: AlertCondition;
    status: AlertStatus;
    cooldownMinutes: number;
    webhookId: string | null;
  }) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const [state, setState] = useState({
    symbol: alert.symbol,
    target: String(alert.target),
    condition: alert.condition,
    status: alert.status,
    cooldownMinutes: String(alert.cooldownMinutes),
    webhookId: alert.webhookId ?? "",
  });

  return (
    <div style={cardStyle}>
      <div style={formGridStyle}>
        <input
          value={state.symbol}
          onChange={(event) => setState((current) => ({ ...current, symbol: event.target.value }))}
          style={inputStyle}
        />
        <input
          value={state.target}
          onChange={(event) => setState((current) => ({ ...current, target: event.target.value }))}
          style={inputStyle}
        />
        <select
          value={state.condition}
          onChange={(event) =>
            setState((current) => ({ ...current, condition: event.target.value as AlertCondition }))
          }
          style={inputStyle}
        >
          <option value="ABOVE">ABOVE</option>
          <option value="BELOW">BELOW</option>
        </select>
        <select
          value={state.status}
          onChange={(event) =>
            setState((current) => ({ ...current, status: event.target.value as AlertStatus }))
          }
          style={inputStyle}
        >
          <option value="ACTIVE">ACTIVE</option>
          <option value="PAUSED">PAUSED</option>
          <option value="TRIGGERED">TRIGGERED</option>
        </select>
        <input
          value={state.cooldownMinutes}
          onChange={(event) =>
            setState((current) => ({ ...current, cooldownMinutes: event.target.value }))
          }
          style={inputStyle}
        />
        <select
          value={state.webhookId}
          onChange={(event) => setState((current) => ({ ...current, webhookId: event.target.value }))}
          style={inputStyle}
        >
          <option value="">No webhook</option>
          {webhooks.map((webhook) => (
            <option key={webhook.id} value={webhook.id}>
              {webhook.url}
            </option>
          ))}
        </select>
      </div>
      <div style={actionRowStyle}>
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            onSave({
              symbol: state.symbol,
              target: Number(state.target),
              condition: state.condition,
              status: state.status,
              cooldownMinutes: Number(state.cooldownMinutes),
              webhookId: state.webhookId || null,
            })
          }
          style={buttonStyle}
        >
          Save
        </button>
        <button type="button" disabled={busy} onClick={onDelete} style={dangerButtonStyle}>
          Delete
        </button>
      </div>
    </div>
  );
}

function EditableWebhookCard({
  webhook,
  busy,
  onSave,
  onDelete,
}: {
  webhook: Webhook;
  busy: boolean;
  onSave: (payload: { url: string; secret?: string; isActive: boolean }) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const [state, setState] = useState({
    url: webhook.url,
    secret: "",
    isActive: webhook.isActive,
  });

  return (
    <div style={cardStyle}>
      <div style={formGridStyle}>
        <input
          value={state.url}
          onChange={(event) => setState((current) => ({ ...current, url: event.target.value }))}
          style={inputStyle}
        />
        <input
          placeholder="Leave blank to keep existing secret"
          value={state.secret}
          onChange={(event) => setState((current) => ({ ...current, secret: event.target.value }))}
          style={inputStyle}
        />
        <label style={{ ...mutedStyle, display: "flex", alignItems: "center", gap: 8 }}>
          <input
            type="checkbox"
            checked={state.isActive}
            onChange={(event) => setState((current) => ({ ...current, isActive: event.target.checked }))}
          />
          Active
        </label>
      </div>
      <div style={actionRowStyle}>
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            onSave({
              url: state.url,
              isActive: state.isActive,
              ...(state.secret ? { secret: state.secret } : {}),
            })
          }
          style={buttonStyle}
        >
          Save
        </button>
        <button type="button" disabled={busy} onClick={onDelete} style={dangerButtonStyle}>
          Delete
        </button>
      </div>
    </div>
  );
}

const panelStyle: CSSProperties = {
  padding: 20,
  borderRadius: 20,
  border: "1px solid var(--line)",
  background: "var(--surface)",
};

const cardStyle: CSSProperties = {
  padding: 16,
  borderRadius: 16,
  border: "1px solid var(--line)",
  background: "var(--surface-strong)",
};

const headingStyle: CSSProperties = {
  marginTop: 0,
  marginBottom: 12,
};

const formGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 12,
};

const actionRowStyle: CSSProperties = {
  display: "flex",
  gap: 12,
  marginTop: 12,
  flexWrap: "wrap",
};

const inputStyle: CSSProperties = {
  width: "100%",
  minHeight: 44,
  borderRadius: 12,
  border: "1px solid var(--line)",
  background: "rgba(6, 15, 26, 0.7)",
  color: "var(--text)",
  padding: "10px 12px",
};

const buttonStyle: CSSProperties = {
  minHeight: 42,
  padding: "10px 14px",
  borderRadius: 12,
  border: "none",
  background: "var(--accent)",
  color: "#04130b",
  fontWeight: 700,
  cursor: "pointer",
};

const dangerButtonStyle: CSSProperties = {
  ...buttonStyle,
  background: "var(--danger)",
  color: "white",
};

const mutedStyle: CSSProperties = {
  color: "var(--text-muted)",
};
