import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const fail = (message, status = 502) => NextResponse.json({ error: message }, { status });

export async function GET(request) {
  const p = new URL(request.url).searchParams;
  const q = p.get("q")?.trim();
  const mode = p.get("mode") === "video" ? "video" : "audio";
  const quality = p.get("quality")?.trim();
  const download = p.get("download") === "1";
  if (!q) return fail("Missing YouTube URL.", 400);

  const token = process.env.NUB_YT_API_KEY;
  if (!token) return fail("Music API is not configured (NUB_YT_API_KEY).", 503);

  try {
    // NuB /stream is the media endpoint itself. It returns bytes, not JSON.
    const url = new URL("https://api.nubcoders.com/stream");
    url.searchParams.set("q", q);
    url.searchParams.set("mode", mode);
    url.searchParams.set("redirect", "false");
    if (quality) url.searchParams.set("quality", quality);

    const requestHeaders = { Authorization: "Bearer " + token, Accept: "*/*" };
    const range = request.headers.get("range");
    if (range) requestHeaders.Range = range;

    let upstream = await fetch(url, {
      headers: requestHeaders, cache: "no-store", redirect: "follow",
      signal: AbortSignal.timeout(90000),
    });

    // Some NuB deployments return a JSON resolver instead of media bytes.
    // Resolve that JSON payload and fetch its stream_url before passing audio to the browser.
    let contentType = (upstream.headers.get("content-type") || "").toLowerCase();
    if (contentType.includes("json")) {
      const payload = await upstream.json().catch(() => null);
      const resolved = payload?.stream_url || payload?.redirect_url || payload?.stream;
      if (!resolved) return fail(payload?.error || payload?.message || "NuB returned no playable stream URL.");
      upstream = await fetch(resolved, {
        headers: { Authorization: "Bearer " + token, Accept: "*/*", ...(range ? { Range: range } : {}) },
        cache: "no-store", redirect: "follow", signal: AbortSignal.timeout(90000),
      });
      contentType = (upstream.headers.get("content-type") || "").toLowerCase();
    }
    if (!upstream.ok && upstream.status !== 206) {
      const body = await upstream.text().catch(() => "");
      let detail = body.slice(0, 220);
      try { const j = JSON.parse(body); detail = j.detail || j.error || j.message || detail; } catch {}
      return fail("NuB stream HTTP " + upstream.status + (detail ? ": " + detail : ""));
    }

    const mime = (upstream.headers.get("content-type") || "").split(";")[0].toLowerCase();
    // Preserve provider MIME (often audio/webm or audio/mp4); forcing MP3
    // causes Chromium's 'no supported source' error for Opus/WebM streams.
    const out = new Headers();
    for (const key of ["content-length", "content-range", "accept-ranges", "etag", "last-modified"]) {
      const value = upstream.headers.get(key); if (value) out.set(key, value);
    }
    out.set("Content-Type", mime || (mode === "audio" ? "audio/webm" : "video/mp4"));
    out.set("Cache-Control", "no-store");
    if (download) {
      const ext = mime.includes("mpeg") ? "mp3" : mime.includes("mp4") ? "m4a" : mime.includes("webm") ? "webm" : mode === "video" ? "mp4" : "audio";
      out.set("Content-Disposition", 'attachment; filename="dbweb-' + mode + '.' + ext + '"');
    }
    return new Response(upstream.body, { status: upstream.status, headers: out });
  } catch (error) {
    const timeout = error?.name === "TimeoutError" || error?.name === "AbortError";
    return fail((timeout ? "NuB stream timed out. " : "Stream request failed: ") + (error?.message || "Unknown error"));
  }
}
