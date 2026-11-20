import { cookies } from "next/headers";

import { teamPasswordMatches } from "@/lib/password";
import { SESSION_COOKIE, issueSessionToken, sessionCookieOptions } from "@/lib/session";

export async function POST(request: Request) {
  let password = "";
  try {
    const body = (await request.json()) as { password?: unknown };
    password = typeof body.password === "string" ? body.password : "";
  } catch {
    return Response.json({ error: "Enter the team password." }, { status: 400 });
  }

  if (!teamPasswordMatches(password)) {
    return Response.json({ error: "That password does not match." }, { status: 401 });
  }

  let token = "";
  try {
    token = issueSessionToken("team");
  } catch {
    return Response.json({ error: "SESSION_SECRET is not set on the server." }, { status: 500 });
  }

  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, sessionCookieOptions);
  return Response.json({ ok: true });
}
