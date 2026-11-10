import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  const q = new URL(request.url).searchParams.get("q")?.trim();
  if (!q) return NextResponse.json({ error: "Missing YouTube URL." }, { status: 400 });

  const token = process.env.NUB_YT_API_KEY;
  if (!token) return NextResponse.json({ error: "Music API is not configured. Add NUB_YT_API_KEY in Vercel." }, { status: 503 });

  try {
    const upstream = await fetch("https://api.nubcoders.com/info?" + new URLSearchParams({
      q, mode: "audio", redirect: "false"
    }), {
      headers: { Authorization: "Bearer " + token, Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(45000)
    });

    const raw = await upstream.text();
    let data;
    try { data = JSON.parse(raw); }
    catch { return NextResponse.json({ error: "Music provider returned an invalid response.", providerStatus: upstream.status }, { status: 502 }); }

    if (!upstream.ok) {
      return NextResponse.json({ error: data?.detail || data?.error || data?.message || "Could not resolve this track.", providerStatus: upstream.status }, { status: upstream.status });
    }
    if (data?.error || data?.detail) {
      return NextResponse.json({ error: data.error || data.detail, providerStatus: upstream.status }, { status: 502 });
    }
    return NextResponse.json(data);
  } catch (error) {
    const timeout = error?.name === "TimeoutError" || error?.name === "AbortError";
    return NextResponse.json({ error: timeout ? "Track details timed out. Try another track." : "Could not connect to the music provider.", detail: error?.message || "Unknown error" }, { status: 502 });
  }
}
