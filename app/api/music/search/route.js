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
    const upstream = await fetch("https://api.nubcoders.com/search?" + new URLSearchParams({ q, limit: "10" }), {
      headers: { Authorization: "Bearer " + token }, cache: "no-store", signal: AbortSignal.timeout(20000)
    });
    const data = await upstream.json();
    if (!upstream.ok) return NextResponse.json({ error: data?.detail || data?.error || "Music search failed." }, { status: upstream.status });
    const raw = Array.isArray(data) ? data : (data.results || data.main_results || data.items || []);\n    const results = raw.map((x) => ({\n      title: x.title || x.name || x.video_title || "Untitled track",\n      channel: x.channel || x.artist || x.channel_name || x.uploader || "YouTube",\n      url: x.url || x.youtube_link || x.link || (x.video_id ? "https://www.youtube.com/watch?v=" + x.video_id : ""),\n      thumbnail: x.thumbnail || x.thumbnails?.[0]?.url || x.thumbnails?.high?.url || x.thumbnail_url || "",\n      duration: x.duration || x.duration_seconds || 0, views: x.views || ""\n    })).filter(x => x.url);
    return NextResponse.json({ results, suggested: data.suggested || [], query: q });
  } catch {
    return NextResponse.json({ error: "Music API timed out or is unavailable. Try again." }, { status: 502 });
  }
}
