function getBearerToken(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  return authHeader.slice("Bearer ".length).trim();
}

function isVercelCronRequest(request: Request) {
  return Boolean(request.headers.get("x-vercel-cron"));
}

export function assertCronAuthorized(request: Request) {
  if (isVercelCronRequest(request)) {
    return null;
  }

  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    if (process.env.NODE_ENV !== "production") {
      return null;
    }

    return new Response("CRON_SECRET is not configured", { status: 500 });
  }

  const token = getBearerToken(request);

  if (token !== cronSecret) {
    return new Response("Unauthorized", { status: 401 });
  }

  return null;
}
