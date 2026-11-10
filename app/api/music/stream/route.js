import { NextResponse } from "next/server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request) {
  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim();
  const mode = url.searchParams.get("mode") === "video" ? "video" : "audio";
  const playback = url.searchParams.get("play") === "1";
  if (!q) return NextResponse.json({ error: "Missing media URL." }, { status: 400 });
  const token = process.env.NUB_YT_API_KEY;
  if (!token) return NextResponse.json({ error: "Music API is not configured." }, { status: 503 });
  try {
    const upstream = await fetch("https://api.nubcoders.com/stream?" + new URLSearchParams({ q, mode, redirect: "false" }), { headers: { Authorization: "Bearer " + token }, cache: "no-store", signal: AbortSignal.timeout(30000) });
    if (!upstream.ok) {
      const body = await upstream.text();
      return new NextResponse(body || "Stream unavailable", { status: upstream.status, headers: { "Content-Type": upstream.headers.get("content-type") || "text/plain" } });
    }
    const headers = new Headers();
    headers.set("Content-Type", upstream.headers.get("content-type") || (mode === "audio" ? "audio/mpeg" : "video/mp4"));
    headers.set("Cache-Control", "no-store");
    headers.set("Content-Disposition", `${playback ? "inline" : "attachment"}; filename="dbweb-music.${mode === "audio" ? "mp3" : "mp4"}`);
    const range = upstream.headers.get("content-range"); if (range) headers.set("Content-Range", range);
    const length = upstream.headers.get("content-length"); if (length) headers.set("Content-Length", length);
    headers.set("Accept-Ranges", upstream.headers.get("accept-ranges") || "bytes");
    return new NextResponse(upstream.body, { status: upstream.status, headers });
  } catch { return NextResponse.json({ error: "Stream connection failed." }, { status: 502 }); }
}
