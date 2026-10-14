import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Vehicle RC lookup is paused while Dbweb switches to its own API.
// This route intentionally does not contact any third-party RC data source.
export async function POST() {
  return NextResponse.json({
    status: "unavailable",
    service: "Dbweb Vehicle RC Lookup",
    message: "Vehicle RC lookup is temporarily discontinued while we prepare a Dbweb-managed API. Please check back soon."
  }, {
    status: 503,
    headers: { "Cache-Control": "no-store", "Retry-After": "86400" }
  });
}
