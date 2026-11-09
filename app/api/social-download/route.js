import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 25;

// Configure this to a Cobalt instance you own or are authorized to use.
// Modern Cobalt API uses POST / (the old /api/json endpoint is retired).
const COBALT_API = (process.env.COBALT_API_URL || "").replace(/\/$/, "");
const COBALT_API_KEY = process.env.COBALT_API_KEY || "";

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

    if (!COBALT_API) {
      return NextResponse.json({
        error: "Downloader service is not configured yet. A Cobalt API instance must be connected before downloads can work."
      }, { status: 503 });
    }

    const headers = {
      "Content-Type": "application/json",
      "Accept": "application/json",
      ...(COBALT_API_KEY ? { Authorization: `Api-Key ${COBALT_API_KEY}` } : {})
    };
    const upstream = await fetch(COBALT_API, {
      method: "POST",
      headers,
      body: JSON.stringify({ url, videoQuality: "720", audioFormat: "mp3", filenameStyle: "basic", downloadMode: "auto" }),
      signal: AbortSignal.timeout(20000),
      cache: "no-store"
    });
    const payload = await upstream.json().catch(() => ({}));

    if (!upstream.ok) {
      const code = payload?.error?.code || payload?.error || "";
      const message = upstream.status === 401 || upstream.status === 403
        ? "Downloader API access is blocked or needs authentication. Configure an authorized Cobalt instance."
        : upstream.status === 429
          ? "Downloader is rate-limited. Please wait and try again."
          : `Downloader API returned HTTP ${upstream.status}.`;
      return NextResponse.json({ error: message, providerCode: code }, { status: 502 });
    }

    if (payload?.status === "error") {
      const code = payload?.error?.code || "unknown";
      return NextResponse.json({
        error: code.includes("unsupported")
          ? "This platform or link is not supported by the connected downloader."
          : "The media could not be processed. It may be private, removed, or temporarily blocked.",
        providerCode: code
      }, { status: 422 });
    }

    const rawLinks = [];
    if (payload?.url) rawLinks.push({ url: payload.url, label: payload.filename || "Download media", type: "video" });
    if (Array.isArray(payload?.picker)) payload.picker.forEach((item, i) => rawLinks.push({
      url: item.url, label: item.type || `Option ${i + 1}`, type: item.type || "video", thumbnail: item.thumb || ""
    }));
    if (Array.isArray(payload?.tunnel)) payload.tunnel.forEach((u, i) => rawLinks.push({
      url: u, label: payload?.output?.filename || `Download ${i + 1}`, type: payload?.output?.type || "video"
    }));

    const links = rawLinks.filter(x => {
      try { return ["http:", "https:"].includes(new URL(x.url).protocol); } catch { return false; }
    });
    if (!links.length) return NextResponse.json({ error: "No downloadable media was returned for this link." }, { status: 422 });
    return NextResponse.json({ title: payload?.filename || payload?.output?.filename || "", thumbnail: "", links });
  } catch (error) {
    const timedOut = error?.name === "TimeoutError" || error?.name === "AbortError";
    return NextResponse.json({ error: timedOut ? "Downloader API timed out. Try again." : "Could not reach the downloader API. Try again later." }, { status: 503 });
  }
}
