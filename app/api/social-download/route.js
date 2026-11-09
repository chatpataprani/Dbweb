import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 20;

const COBALT_API = (process.env.COBALT_API_URL || "https://api.cobalt.tools").replace(/\/$/, "");

function normalizeUrl(value) {
  try {
    const u = new URL(value);
    if (!["http:", "https:"].includes(u.protocol)) return null;
    if (u.username || u.password) return null;
    return u.toString();
  } catch { return null; }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const url = normalizeUrl(String(body?.url || "").trim());
    if (!url) return NextResponse.json({ error: "Enter a valid http(s) media URL." }, { status: 400 });
    const upstream = await fetch(`${COBALT_API}/api/json`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "User-Agent": "Dbweb-SocialDownloader/1.0"
      },
      body: JSON.stringify({ url, videoQuality: "720", audioFormat: "mp3", filenameStyle: "basic", downloadMode: "auto" }),
      signal: AbortSignal.timeout(15000),
      cache: "no-store"
    });
    const payload = await upstream.json().catch(() => ({}));
    if (!upstream.ok) return NextResponse.json({ error: payload?.text || payload?.error || "The media provider is unavailable right now." }, { status: 502 });
    const status = payload?.status;
    if (status === "error" || status === "failed") return NextResponse.json({ error: payload?.text || "This link is unsupported or unavailable." }, { status: 422 });
    const rawLinks = [];
    if (payload?.url) rawLinks.push({ url: payload.url, label: payload.filename || "Download media", type: payload?.type || "video" });
    if (Array.isArray(payload?.picker)) payload.picker.forEach((item,i)=>rawLinks.push({url:item.url,label:item.type || item.label || `Option ${i+1}`,type:item.type || "video"}));
    if (Array.isArray(payload?.urls)) payload.urls.forEach((u,i)=>rawLinks.push({url:typeof u==="string"?u:u.url,label:u.label||`Download ${i+1}`,type:u.type||"video"}));
    const links = rawLinks.filter(x => { try { return ["http:","https:"].includes(new URL(x.url).protocol); } catch { return false; } });
    if (!links.length) return NextResponse.json({ error: "No downloadable media was returned for this link." }, { status: 422 });
    return NextResponse.json({ title: payload?.filename || "", thumbnail: payload?.thumbnail || "", links });
  } catch (error) {
    const timedOut = error?.name === "TimeoutError" || error?.name === "AbortError";
    return NextResponse.json({ error: timedOut ? "The media provider took too long. Try again." : "Could not reach the media provider. Try again later." }, { status: 503 });
  }
}
