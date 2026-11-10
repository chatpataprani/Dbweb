import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  const q = new URL(request.url).searchParams.get("q")?.trim();
  if (!q) return NextResponse.json({ error: "Enter a song, artist, or YouTube URL." }, { status: 400 });
  if (q.length > 180) return NextResponse.json({ error: "Search is too long." }, { status: 400 });
  const token = process.env.NUB_YT_API_KEY;
  if (!token) return NextResponse.json({ error: "Music API is not configured. Add NUB_YT_API_KEY in Vercel." }, { status: 503 });
  try {
    const upstream = await fetch("https://api.nubcoders.com/info?" + new URLSearchParams({ q, max_results: "10", redirect: "false" }), {
      headers: { Authorization: "Bearer " + token }, cache: "no-store", signal: AbortSignal.timeout(20000)
    });
    const data = await upstream.json();
    if (!upstream.ok) return NextResponse.json({ error: data?.detail || data?.error || "Music search failed." }, { status: upstream.status });
    const results = data.results || data.main_results || (data.title ? [data] : []);
    return NextResponse.json({ results, suggested: data.suggested || [], query: q });
  } catch {
    return NextResponse.json({ error: "Music API timed out or is unavailable. Try again." }, { status: 502 });
  }
}
