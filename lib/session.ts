import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Signed httpOnly session for the sales desk.
 *
 * Today every signed-in teammate shares one subject, "team".
 * Loyalist Homes OS or an SSO callback can call `issueSessionToken(userId)`
 * and the rest of the app only checks that the cookie is valid.
 */
export const SESSION_COOKIE = "lh_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export type SessionPayload = {
  sub: string;
  exp: number;
};

export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: MAX_AGE_SECONDS,
};

function secret(): string {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  if (process.env.DEMO_MODE === "true") return "demo-only-session-secret";
  throw new Error("SESSION_SECRET is not set");
}

function sign(body: string): string {
  return createHmac("sha256", secret()).update(body).digest("base64url");
}

export function issueSessionToken(sub = "team"): string {
  const payload: SessionPayload = {
    sub,
    exp: Date.now() + MAX_AGE_SECONDS * 1000,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${sign(body)}`;
}

export function readSession(token: string | undefined | null): SessionPayload | null {
  if (!token) return null;
  if (!process.env.SESSION_SECRET && process.env.DEMO_MODE !== "true") return null;

  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, signature] = parts;
  if (!body || !signature) return null;

  const expected = sign(body);
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as SessionPayload;
    if (!payload || typeof payload.sub !== "string" || payload.sub.length === 0) return null;
    if (typeof payload.exp !== "number" || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}
