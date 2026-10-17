import { NextResponse } from "next/server";

export function middleware(request) {
  const pathname = request.nextUrl.pathname;
  const sectionRoutes = ["/plan", "/plans", "/history", "/settings", "/redeem-code", "/redeem"];
  if (!sectionRoutes.includes(pathname)) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = "/";
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ["/plan", "/plans", "/history", "/settings", "/redeem-code", "/redeem"]
};
