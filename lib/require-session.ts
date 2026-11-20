import "server-only";
import { cookies } from "next/headers";

import { LeadError } from "@/lib/errors";
import { SESSION_COOKIE, readSession, type SessionPayload } from "@/lib/session";

export async function requireSession(): Promise<SessionPayload> {
  const jar = await cookies();
  const session = readSession(jar.get(SESSION_COOKIE)?.value);
  if (!session) throw new LeadError("Sign in required.", 401);
  return session;
}
