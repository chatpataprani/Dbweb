import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const fail = (message, status = 502) => NextResponse.json({ error: message }, { status });

export async function GET(request) {
  const params = new URL(request.url).searchParams;
  const q = params.get("q")?.trim();
  const mode = params.get("mode") === "video" ? "video" : "audio";
  const playback = params.get("play") === "1";
  if (!q) return fail("Missing YouTube URL.", 400);

  const token = process.env.NUB_YT_API_KEY;
  if (!token) return fail("Music API is not configured. Add NUB_YT_API_KEY in Vercel.", 503);

  const base = "https://api.nubcoders.com";
  try {
    // Playback: NuB's redirect endpoint returns a temporary, range-capable proxy URL.
    // Redirect the browser to it instead of buffering media through a serverless function.
    if (playback) {
      const target = new URL(base + "/stream/redirect");
      target.search = new URLSearchParams({ q, mode, token }).toString();
      const resolved = await fetch(target, {
        headers: { Authorization: "Bearer " + token },
        redirect: "manual", cache: "no-store", signal: AbortSignal.timeout(45000)
      });
      const location = resolved.headers.get("location");
      if (resolved.status >= 300 && resolved.status < 400 && location) {
        return NextResponse.redirect(location, 307);
      }
      const body = await resolved.text();
      let detail = body;
      try { const json = JSON.parse(body); detail = json.error || json.detail || json.message || body; } catch {}
      return fail("NuB stream resolver failed (HTTP " + resolved.status + "): " + detail.slice(0, 350), 502);
    }

    // Download: get NuB's proxy URL and stream bytes, preserving Range support.
    const target = new URL(base + "/stream");
    target.search = new URLSearchParams({ q, mode, redirect: "false" }).toString();
    const resolved = await fetch(target, {
      headers: { Authorization: "Bearer " + token, Accept: "application/json" },
      cache: "no-store", signal: AbortSignal.timeout(45000)
    });
    const raw = await resolved.text();
    let data;
    try { data = JSON.parse(raw); } catch { return fail("NuB returned an invalid stream response.", 502); }
    if (!resolved.ok || data.error) return fail(data.error || "NuB could not resolve this media.", 502);
    const mediaUrl = data.stream_url || data.redirect_url;
    if (!mediaUrl) return fail("NuB did not return a media URL.", 502);

    const incomingRange = request.headers.get("range");
    const media = await fetch(mediaUrl, {
      headers: incomingRange ? { Range: incomingRange } : {},
      cache: "no-store", signal: AbortSignal.timeout(60000)
    });
    const type = media.headers.get("content-type") || "";
    if (!media.ok) return fail("Media download failed (HTTP " + media.status + ").", media.status);
    if (/json|text\/html/i.test(type)) return fail("NuB returned a response page instead of media.", 502);
    const headers = new Headers({
      "Content-Type": type || (mode === "audio" ? "audio/mpeg" : "video/mp4"),
      "Content-Disposition": 'attachment; filename="dbweb-' + (mode === "audio" ? "audio.mp3" : "video.mp4") + '"',
      "Cache-Control": "no-store"
    });
    for (const key of ["content-length", "content-range", "accept-ranges"]) {
      const value = media.headers.get(key); if (value) headers.set(key, value);
    }
    return new NextResponse(media.body, { status: media.status, headers });
  } catch (error) {
    const timeout = error?.name === "TimeoutError" || error?.name === "AbortError";
    return fail(timeout ? "NuB stream request timed out. Try again." : "Stream request failed: " + (error?.message || "unknown error"));
  }
}
