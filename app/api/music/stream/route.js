import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const fail = (message, status = 502) => NextResponse.json({ error: message }, { status });

export async function GET(request) {
  const params = new URL(request.url).searchParams;
  const q = params.get("q")?.trim();
  const mode = params.get("mode") === "video" ? "video" : "audio";
  const quality = params.get("quality")?.trim();
  const download = params.get("download") === "1";
  if (!q) return fail("Missing YouTube URL.", 400);

  const token = process.env.NUB_YT_API_KEY;
  if (!token) return fail("Music API is not configured (NUB_YT_API_KEY).", 503);

  try {
    // NuB /stream returns JSON containing its range-capable media proxy URL.
    const apiUrl = new URL("https://api.nubcoders.com/stream");
    const upstreamParams = new URLSearchParams({ q, mode });
    if (quality) upstreamParams.set("quality", quality);
    apiUrl.search = upstreamParams.toString();
    const resolved = await fetch(apiUrl, {
      headers: { Authorization: "Bearer " + token },
      cache: "no-store",
      signal: AbortSignal.timeout(45000),
    });

    const data = await resolved.json().catch(() => ({}));
    if (!resolved.ok || !data.stream_url) {
      return fail(data.error || data.detail || "NuB could not resolve a playable stream.", 502);
    }

    // Fetch and relay the actual media bytes (not the resolver JSON). Preserve
    // Range requests so seeking works in the HTML audio/video element.
    const headers = new Headers();
    const range = request.headers.get("range");
    if (range) headers.set("Range", range);
    const media = await fetch(data.stream_url, {
      headers,
      cache: "no-store",
      signal: AbortSignal.timeout(60000),
    });

    if (!media.ok && media.status !== 206) {
      const detail = await media.text().catch(() => "");
      return fail("NuB media proxy returned HTTP " + media.status + (detail ? ": " + detail.slice(0, 180) : ""), 502);
    }

    // Some upstream proxies label audio as application/octet-stream or video/mp4.
    // Normalize the audio response so browsers do not reject it as an unsupported source.
    const upstreamType = (media.headers.get("content-type") || "").split(";")[0].toLowerCase();
    const outHeaders = new Headers();
    for (const name of ["content-length", "content-range", "accept-ranges", "cache-control"]) {
      const value = media.headers.get(name);
      if (value) outHeaders.set(name, value);
    }
    outHeaders.set("Cache-Control", "no-store");
    if (download) outHeaders.set("Content-Disposition", `attachment; filename="dbweb-${mode}.${mode === "audio" ? "mp3" : "mp4"}"`);
    // Do not label unknown audio bytes as MP3: YouTube/NuB commonly returns
    // Opus/WebM, and a false audio/mpeg MIME makes Chromium reject the source.
    const fallbackAudioType = /\\.(mp3|m4a|aac)(?:$|\\?)/i.test(data.stream_url) ? "audio/mpeg" : "audio/webm";
    outHeaders.set("Content-Type", mode === "audio"
      ? (upstreamType.startsWith("audio/") ? upstreamType : fallbackAudioType)
      : (upstreamType.startsWith("video/") ? upstreamType : "video/mp4"));

    return new Response(media.body, { status: media.status, headers: outHeaders });
  } catch (error) {
    return fail((error?.name === "TimeoutError" ? "NuB stream timed out. " : "Stream request failed: ") + (error?.message || "unknown error"));
  }
}
