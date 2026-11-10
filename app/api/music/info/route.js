import { NextResponse } from "next/server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request) {
  const q = new URL(request.url).searchParams.get("q")?.trim();
  if (!q) return NextResponse.json({ error: "Missing video URL." }, { status: 400 });
  const token = process.env.NUB_YT_API_KEY;
  if (!token) return NextResponse.json({ error: "Music API is not configured." }, { status: 503 });
  try {
    const r = await fetch("https://api.nubcoders.com/info?" + new URLSearchParams({ q, mode: "audio", redirect: "false" }), { headers: { Authorization: "Bearer " + token }, cache: "no-store", signal: AbortSignal.timeout(25000) });
    const data = await r.json();
    return NextResponse.json(data, { status: r.status });
  } catch { return NextResponse.json({ error: "Could not load track details." }, { status: 502 }); }
}
