import { createHmac, timingSafeEqual } from "node:crypto";

type AdminTokenPayload = {
  sub: string;
  exp: number;
};

const TOKEN_TTL_SECONDS = 60 * 60 * 12;

function getAdminSecret() {
  const username = process.env.ADMIN_USERNAME ?? "";
  const password = process.env.ADMIN_PASSWORD ?? "";
  const extra = process.env.ADMIN_TOKEN_SECRET ?? "";
  return `${username}:${password}:${extra}`;
}

function toBase64Url(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function sign(value: string) {
  return createHmac("sha256", getAdminSecret()).update(value).digest("base64url");
}

export function issueAdminToken(username: string) {
  const payload: AdminTokenPayload = {
    sub: username,
    exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS,
  };
  const encodedPayload = toBase64Url(JSON.stringify(payload));
  const signature = sign(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export function verifyAdminToken(token: string | null | undefined) {
  if (!token) {
    return false;
  }

  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) {
    return false;
  }

  const expected = sign(encodedPayload);
  const providedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  if (providedBuffer.length !== expectedBuffer.length) {
    return false;
  }

  if (!timingSafeEqual(providedBuffer, expectedBuffer)) {
    return false;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    ) as AdminTokenPayload;
    return payload.exp > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

export function assertAdminAuthorized(request: Request) {
  const token = request.headers.get("x-admin-token");
  if (!verifyAdminToken(token)) {
    return new Response("Unauthorized", { status: 401 });
  }

  return null;
}
