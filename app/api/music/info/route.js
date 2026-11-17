import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  const q = new URL(request.url).searchParams.get("q")?.trim();
  if (!q) return NextResponse.json({ error: "Missing media URL or search query." }, { status: 400 });

  const token = process.env.NUB_YT_API_KEY;
  if (!token) return NextResponse.json({ error: "Music API is not configured. Add NUB_YT_API_KEY in Vercel." }, { status: 503 });

  try {
    const upstream = await fetch("https://api.nubcoders.com/info?" + new URLSearchParams({ q }), {
      headers: { Authorization: "Bearer " + token, Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(45000),
    });
    const raw = await upstream.text();
    let data;
    try { data = JSON.parse(raw); }
    catch { return NextResponse.json({ error: "NuB info returned an invalid response.", providerStatus: upstream.status }, { status: 502 }); }

    if (!upstream.ok || data?.error || data?.detail) {
      return NextResponse.json({
        error: data?.detail || data?.error || data?.message || "NuB could not resolve this track.",
        providerStatus: upstream.status,
      }, { status: upstream.ok ? 502 : upstream.status });
    }
    return NextResponse.json(data);
  } catch (e) {
    const timeout = e?.name === "TimeoutError" || e?.name === "AbortError";
    return NextResponse.json({
      error: timeout ? "NuB track information timed out. Try another track." : "Could not connect to NuB.",
    }, { status: 502 });
  }
}
