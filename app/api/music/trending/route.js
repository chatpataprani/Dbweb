import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  const params = new URL(request.url).searchParams;
  const region = (params.get("region") || "IN").slice(0, 8);
  const limit = Math.min(30, Math.max(1, Number(params.get("limit") || 20)));
  try {
    const upstream = await fetch("https://api.nubcoders.com/trending?" + new URLSearchParams({ region, limit: String(limit) }), {
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(18000),
    });
    const raw = await upstream.text();
    let data;
    try { data = JSON.parse(raw); }
    catch { return NextResponse.json({ error: "NuB trending returned an invalid response." }, { status: 502 }); }
    if (!upstream.ok) {
      return NextResponse.json({ error: data?.detail || data?.error || data?.message || "NuB trending failed." }, { status: upstream.status });
    }
    const items = Array.isArray(data) ? data : (data?.results || data?.items || data?.trending || data?.videos || data?.data || []);
    const results = items.map((x) => {
      const id = x.video_id || x.videoId || x.id || "";
      return {
        title: x.title || x.name || "Untitled",
        channel: x.channel || x.artist || x.uploader || x.author || "YouTube",
        url: x.url || x.youtube_link || x.link || x.webpage_url || (id ? "https://www.youtube.com/watch?v=" + id : ""),
        thumbnail: x.thumbnail || x.thumbnail_url || x.thumbnails?.high?.url || x.thumbnails?.[0]?.url || "",
        duration: x.duration || x.duration_seconds || x.duration_string || 0,
      };
    }).filter((x) => x.url);
    return NextResponse.json({ results, region, source: "NuB trending" });
  } catch (e) {
    return NextResponse.json({ error: e?.name === "TimeoutError" ? "NuB trending timed out." : "Could not connect to NuB trending." }, { status: 502 });
  }
}
