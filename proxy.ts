import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE, isSessionTokenValid } from "@/lib/auth";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const authenticated = isSessionTokenValid(
    request.cookies.get(SESSION_COOKIE)?.value,
  );

  if (pathname === "/login") {
    if (authenticated)
      return NextResponse.redirect(new URL("/dashboard", request.url));
    return NextResponse.next();
  }

  if (!authenticated)
    return NextResponse.redirect(new URL("/login", request.url));

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icons|manifest.json).*)"],
};
