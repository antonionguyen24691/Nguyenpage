import type { CSSProperties } from "react";
import Link from "next/link";

import { getDebugSnapshot } from "@/server/services/debug-service";

export default async function DashboardDebugPage() {
  const snapshot = await getDebugSnapshot();

  return (
    <main style={{ maxWidth: 1180, margin: "0 auto", padding: "48px 24px 72px" }}>
      <header style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start" }}>
        <div>
          <p style={{ color: "var(--accent)", margin: 0, letterSpacing: 1.1 }}>DEBUG VIEW</p>
          <h1 style={{ marginBottom: 8 }}>Worker and cache monitor</h1>
          <p style={{ color: "var(--text-muted)", margin: 0 }}>
            Inspect tracked symbols, cached quotes, alert state, and outbound webhook attempts.
          </p>
        </div>
        <Link
          href="/dashboard"
          style={{
            padding: "12px 16px",
            borderRadius: 999,
            border: "1px solid var(--line)",
            alignSelf: "center",
          }}
        >
          Back to dashboard
        </Link>
      </header>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 16,
          marginTop: 24,
          marginBottom: 32,
        }}
      >
        {[
          { label: "Tracked symbols", value: snapshot.trackedSymbols.length },
          { label: "Cached quotes", value: snapshot.quotes.length },
          { label: "Alerts", value: snapshot.alerts.length },
          { label: "Webhook attempts", value: snapshot.webhookAttempts.length },
        ].map((stat) => (
          <article
            key={stat.label}
            style={{
              padding: 20,
              borderRadius: 18,
              border: "1px solid var(--line)",
              background: "var(--surface)",
            }}
          >
            <p style={{ margin: 0, color: "var(--text-muted)" }}>{stat.label}</p>
            <strong style={{ fontSize: 30 }}>{stat.value}</strong>
          </article>
        ))}
      </section>

      <section style={{ display: "grid", gap: 16 }}>
        <article style={panelStyle}>
          <h2 style={headingStyle}>Tracked Symbols</h2>
          <p style={mutedStyle}>{snapshot.trackedSymbols.join(", ") || "No tracked symbols yet."}</p>
        </article>

        <article style={panelStyle}>
          <h2 style={headingStyle}>Cached Quotes</h2>
          <div style={tableWrapStyle}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Symbol</th>
                  <th style={thStyle}>Price</th>
                  <th style={thStyle}>Change %</th>
                  <th style={thStyle}>Volume</th>
                  <th style={thStyle}>Updated</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.quotes.map((quote) => (
                  <tr key={quote.symbol}>
                    <td style={tdStyle}>{quote.symbol}</td>
                    <td style={tdStyle}>{quote.price.toLocaleString()}</td>
                    <td style={tdStyle}>{quote.changePercent.toFixed(2)}%</td>
                    <td style={tdStyle}>{quote.volume.toLocaleString()}</td>
                    <td style={tdStyle}>{new Date(quote.updatedAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article style={panelStyle}>
          <h2 style={headingStyle}>Alert Monitor</h2>
          <div style={tableWrapStyle}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Symbol</th>
                  <th style={thStyle}>Condition</th>
                  <th style={thStyle}>Target</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Cooldown</th>
                  <th style={thStyle}>Last Triggered</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.alerts.map((alert) => (
                  <tr key={alert.id}>
                    <td style={tdStyle}>{alert.symbol}</td>
                    <td style={tdStyle}>{alert.condition}</td>
                    <td style={tdStyle}>{alert.target}</td>
                    <td style={tdStyle}>{alert.status}</td>
                    <td style={tdStyle}>{alert.cooldownMinutes}m</td>
                    <td style={tdStyle}>
                      {alert.lastTriggeredAt ? new Date(alert.lastTriggeredAt).toLocaleString() : "Never"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article style={panelStyle}>
          <h2 style={headingStyle}>Webhook Attempts</h2>
          <div style={tableWrapStyle}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Time</th>
                  <th style={thStyle}>Webhook</th>
                  <th style={thStyle}>Attempt</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>HTTP</th>
                  <th style={thStyle}>Response</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.webhookAttempts.map((attempt) => (
                  <tr key={attempt.id}>
                    <td style={tdStyle}>{new Date(attempt.createdAt).toLocaleString()}</td>
                    <td style={tdStyle}>{attempt.webhook?.url ?? "Deleted webhook"}</td>
                    <td style={tdStyle}>{attempt.attemptNo}</td>
                    <td style={tdStyle}>{attempt.success ? "Success" : "Failed"}</td>
                    <td style={tdStyle}>{attempt.statusCode ?? "-"}</td>
                    <td style={tdStyle}>{attempt.response ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      </section>
    </main>
  );
}

const panelStyle: CSSProperties = {
  padding: 20,
  borderRadius: 20,
  border: "1px solid var(--line)",
  background: "var(--surface)",
};

const headingStyle: CSSProperties = {
  marginTop: 0,
  marginBottom: 12,
};

const mutedStyle: CSSProperties = {
  margin: 0,
  color: "var(--text-muted)",
};

const tableWrapStyle: CSSProperties = {
  overflowX: "auto",
};

const tableStyle: CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
};

const thStyle: CSSProperties = {
  textAlign: "left",
  padding: "10px 12px",
  borderBottom: "1px solid var(--line)",
  color: "var(--text-muted)",
  fontWeight: 600,
};

const tdStyle: CSSProperties = {
  padding: "12px",
  borderBottom: "1px solid var(--line)",
  verticalAlign: "top",
};
