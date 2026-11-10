import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const jsonError = (message, status = 502) => NextResponse.json({ error: message }, { status });

export async function GET(request) {
  const params = new URL(request.url).searchParams;
  const q = params.get("q")?.trim();
  const mode = params.get("mode") === "video" ? "video" : "audio";
  const playback = params.get("play") === "1";
  if (!q) return jsonError("Missing media URL.", 400);

  const token = process.env.NUB_YT_API_KEY;
  if (!token) return jsonError("Music API is not configured. Add NUB_YT_API_KEY in Vercel.", 503);

  try {
    // Ask NuB for a resolved media URL first. redirect=false may return JSON,
    // not audio bytes, which browsers cannot play as an audio source.
    const resolver = await fetch("https://api.nubcoders.com/stream?" + new URLSearchParams({ q, mode, redirect: "false" }), {
      headers: { Authorization: "Bearer " + token, Accept: "application/json, audio/*, video/*" },
      cache: "no-store",
      signal: AbortSignal.timeout(45000)
    });

    if (!resolver.ok) {
      const message = (await resolver.text()).slice(0, 1200);
      return jsonError(message || "The provider could not resolve this track.", resolver.status);
    }

    const type = resolver.headers.get("content-type") || "";
    let mediaUrl = resolver.url;
    if (type.includes("json") || type.includes("text")) {
      const raw = await resolver.text();
      let data;
      try { data = JSON.parse(raw); } catch { return jsonError("The music provider returned an invalid stream response."); }
      mediaUrl = data.stream_url || data.url || data.download_url || data.audio_url || data.video_url || data.link || data.data?.stream_url || data.data?.url || "";
      if (!mediaUrl && data.redirect_url) mediaUrl = data.redirect_url;
      if (!mediaUrl) return jsonError(data.error || data.detail || data.message || "No playable media URL was returned by the provider.");
    } else {
      // Provider returned actual media bytes directly.
      const headers = new Headers({
        "Content-Type": type || (mode === "audio" ? "audio/mpeg" : "video/mp4"),
        "Cache-Control": "no-store",
        "Content-Disposition": `${playback ? "inline" : "attachment"}; filename="dbweb-music.${mode === "audio" ? "mp3" : "mp4"}"`
      });
      for (const key of ["content-length", "content-range", "accept-ranges"]) {
        const value = resolver.headers.get(key); if (value) headers.set(key, value);
      }
      return new NextResponse(resolver.body, { status: resolver.status, headers });
    }

    let parsed;
    try { parsed = new URL(mediaUrl); } catch { return jsonError("Provider returned an invalid media URL."); }
    if (!["https:", "http:"].includes(parsed.protocol)) return jsonError("Provider returned an unsupported media URL.");

    // Fetch the actual audio/video file; never send the resolver's JSON to <audio>.
    const media = await fetch(parsed.toString(), {
      headers: { Accept: mode === "audio" ? "audio/*,application/octet-stream,*/*" : "video/*,application/octet-stream,*/*" },
      cache: "no-store",
      signal: AbortSignal.timeout(60000)
    });
    if (!media.ok) return jsonError("The resolved media file could not be downloaded (HTTP " + media.status + ").", media.status);

    const mediaType = media.headers.get("content-type") || "";
    if (mediaType.includes("json") || mediaType.includes("text/html")) {
      const body = await media.text();
      return jsonError(body.slice(0, 500) || "The provider returned a webpage instead of media.");
    }
    const headers = new Headers({
      "Content-Type": mediaType || (mode === "audio" ? "audio/mpeg" : "video/mp4"),
      "Cache-Control": "no-store",
      "Content-Disposition": `${playback ? "inline" : "attachment"}; filename="dbweb-music.${mode === "audio" ? "mp3" : "mp4"}"`
    });
    for (const key of ["content-length", "content-range", "accept-ranges"]) {
      const value = media.headers.get(key); if (value) headers.set(key, value);
    }
    return new NextResponse(media.body, { status: media.status, headers });
  } catch (error) {
    const timeout = error?.name === "TimeoutError" || error?.name === "AbortError";
    return jsonError(timeout ? "Stream resolution timed out. Try another track." : "Could not connect to the stream provider: " + (error?.message || "unknown error"));
  }
}
