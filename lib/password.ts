import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";

/**
 * Shared team password check.
 * Replace this module with an SSO callback when Lead Centre joins Loyalist Homes OS.
 * Callers should keep using `issueSessionToken` afterwards.
 */
export function teamPasswordMatches(input: string): boolean {
  const configured = process.env.TEAM_PASSWORD;
  const expected = configured || (process.env.DEMO_MODE === "true" ? "loyalist" : "");
  if (!expected || typeof input !== "string" || input.length === 0) return false;
  const left = createHash("sha256").update(input).digest();
  const right = createHash("sha256").update(expected).digest();
  return timingSafeEqual(left, right);
}
