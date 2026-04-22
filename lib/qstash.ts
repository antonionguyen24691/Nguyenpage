const DEFAULT_QSTASH_PUBLISH_URL = "https://qstash.upstash.io/v2/publish";

function getBaseUrl(baseUrlOverride?: string) {
  if (baseUrlOverride) {
    return baseUrlOverride.replace(/\/$/, "");
  }

  const explicit =
    process.env.APP_BASE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL;

  if (explicit) {
    return explicit.replace(/\/$/, "");
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  return null;
}

export async function enqueueJob(
  path: string,
  payload: unknown,
  options?: { baseUrl?: string },
) {
  const token = process.env.QSTASH_TOKEN;
  if (!token) {
    throw new Error("QSTASH_TOKEN is not configured");
  }

  const baseUrl = getBaseUrl(options?.baseUrl);
  if (!baseUrl) {
    throw new Error("APP_BASE_URL is not configured");
  }

  const targetUrl = `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
  const publishBaseUrl = (process.env.QSTASH_URL || DEFAULT_QSTASH_PUBLISH_URL)
    .replace(/\/$/, "")
    .replace(/\/v2\/publish$/i, "");

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    headers["Upstash-Forward-Authorization"] = `Bearer ${cronSecret}`;
  }

  const response = await fetch(
    `${publishBaseUrl}/v2/publish/${targetUrl}`,
    {
      method: "POST",
      headers,
      body: JSON.stringify(payload ?? {}),
    },
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`QStash publish failed: ${response.status} ${text}`);
  }

  return response.json().catch(() => ({}));
}
