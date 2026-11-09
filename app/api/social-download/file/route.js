import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const ALLOWED_HOSTS = [
  "cdninstagram.com", "fbcdn.net", "instagram.com", "tiktokcdn.com", "tiktok.com",
  "youtube.com", "googlevideo.com", "ytimg.com", "twimg.com", "x.com",
  "pinimg.com", "redd.it", "reddit.com", "fb.watch", "facebook.com",
  "snapchat.com", "sc-cdn.net", "threads.net", "vk.com", "userapi.com"
];

function safeMediaUrl(value) {
  try {
    const u = new URL(value);
    if (u.protocol !== "https:" || u.username || u.password) return null;
    const host = u.hostname.toLowerCase();
    if (!ALLOWED_HOSTS.some(domain => host === domain || host.endsWith("." + domain))) return null;
    return u;
  } catch { return null; }
}

export async function GET(request) {
  const source = safeMediaUrl(new URL(request.url).searchParams.get("url") || "");
  if (!source) return NextResponse.json({ error: "Unsupported media host." }, { status: 400 });
  try {
    const upstream = await fetch(source, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; DbwebDownloader/1.0)", Accept: "*/*" },
      redirect: "follow",
      signal: AbortSignal.timeout(50000),
      cache: "no-store"
    });
    if (!upstream.ok || !upstream.body) return NextResponse.json({ error: "Source media could not be fetched. Try resolving the post again." }, { status: 502 });
    const type = upstream.headers.get("content-type") || "application/octet-stream";
    const ext = type.includes("image/") ? (type.split("/")[1].split(";")[0] || "jpg") : type.includes("video/") ? "mp4" : "bin";
    const filename = `dbweb-media-${Date.now()}.${ext.replace(/[^a-z0-9]/gi,"")}`;
    return new Response(upstream.body, {
      headers: {
        "Content-Type": type,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
        ...(upstream.headers.get("content-length") ? { "Content-Length": upstream.headers.get("content-length") } : {})
      }
    });
  } catch {
    return NextResponse.json({ error: "Download connection failed. Please try again." }, { status: 502 });
  }
}
