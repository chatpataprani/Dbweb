import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const jsonError = (message, status = 502) => NextResponse.json({ error: message }, { status });

export async function GET(request) {
  const q = new URL(request.url).searchParams.get("q")?.trim();
  if (!q) return jsonError("Enter a song, artist, or YouTube URL.", 400);
  if (q.length > 180) return jsonError("Search is too long (180 characters maximum).", 400);

  const token = process.env.NUB_YT_API_KEY;
  if (!token) return jsonError("Music API is not configured. Add NUB_YT_API_KEY in Vercel Environment Variables.", 503);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort("NuB search timed out"), 20000);
  try {
    const upstream = await fetch("https://api.nubcoders.com/search?" + new URLSearchParams({ q, limit: "10" }), {
      headers: { Authorization: "Bearer " + token, Accept: "application/json" },
      cache: "no-store",
      signal: controller.signal,
    });

    const rawText = await upstream.text();
    let data;
    try { data = JSON.parse(rawText); }
    catch {
      console.error("[music/search] NuB returned non-JSON", upstream.status);
      return jsonError("NuB Music API returned an invalid response. Please try again.", 502);
    }

    if (!upstream.ok) {
      const detail = data?.detail || data?.error || data?.message;
      console.error("[music/search] NuB HTTP error", upstream.status, detail || "no detail");
      if (upstream.status === 401 || upstream.status === 403) {
        return jsonError("NuB rejected the API key. Check NUB_YT_API_KEY in Vercel.", 502);
      }
      if (upstream.status === 429) return jsonError("NuB rate limit reached. Wait a moment and retry.", 429);
      return jsonError("NuB search failed (HTTP " + upstream.status + ")" + (detail ? ": " + String(detail).slice(0, 180) : "."), 502);
    }

    const raw = Array.isArray(data) ? data : (data.results || data.main_results || data.items || []);
    const results = raw.map((x) => ({
      title: x.title || x.name || x.video_title || "Untitled track",
      channel: x.channel || x.artist || x.channel_name || x.uploader || "YouTube",
      url: x.url || x.youtube_link || x.link || (x.video_id ? "https://www.youtube.com/watch?v=" + x.video_id : ""),
      thumbnail: x.thumbnail || x.thumbnails?.[0]?.url || x.thumbnails?.high?.url || x.thumbnail_url || "",
      duration: x.duration || x.duration_seconds || 0,
      views: x.views || ""
    })).filter(x => x.url);

    return NextResponse.json({ results, suggested: data?.suggested || [], query: q });
  } catch (error) {
    const timedOut = error?.name === "AbortError";
    console.error("[music/search] request failed", timedOut ? "timeout" : error?.message || "unknown");
    return jsonError(timedOut
      ? "NuB search timed out after 20 seconds. Its API may be slow or temporarily unavailable—try again."
      : "Could not connect to NuB Music API. Check the API service and try again.", 502);
  } finally {
    clearTimeout(timeout);
  }
}
