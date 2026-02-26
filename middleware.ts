import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {

  const path = request.nextUrl.pathname;

  // NEVER block Next.js internal files
  if (
    path.startsWith("/_next") ||
    path.startsWith("/api") ||
    path === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  // ✅ allow normal routing
  return NextResponse.next();
}