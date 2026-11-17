import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const token = process.env.NUB_YT_API_KEY;
  if (!token) return NextResponse.json({ error: "Music API is not configured." }, { status: 503 });
  try {
    const upstream = await fetch("https://api.nubcoders.com/rate-limit-status", {
      headers: { Authorization: "Bearer " + token, Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(12000),
    });
    const body = await upstream.text();
    let data;
    try { data = JSON.parse(body); }
    catch { return NextResponse.json({ error: "NuB returned an invalid quota response." }, { status: 502 }); }
    return NextResponse.json(data, { status: upstream.status });
  } catch {
    return NextResponse.json({ error: "Could not check NuB quota." }, { status: 502 });
  }
}
