import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE, readSession } from "@/lib/session";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  let session = null;
  try {
    session = readSession(request.cookies.get(SESSION_COOKIE)?.value);
  } catch {
    session = null;
  }

  const isPublic = pathname === "/login" || pathname === "/api/auth/login";

  if (!session && !isPublic) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    }
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    const dest = `${pathname}${request.nextUrl.search}`;
    if (dest.startsWith("/") && !dest.startsWith("//") && dest !== "/") {
      url.searchParams.set("next", dest);
    } else {
      url.search = "";
    }
    return NextResponse.redirect(url);
  }

  if (session && pathname === "/login") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|logo.png|sample-transcript.txt).*)"],
};
