import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 20;

const SAVE_API_KEY = process.env.SAVEAPI_KEY || "";
const SAVE_API_URL = "https://api.saveapi.org/v1/download";

function normalizeUrl(value) {
  try {
    const u = new URL(value);
    if (!["http:", "https:"].includes(u.protocol) || u.username || u.password) return null;
    return u.toString();
  } catch { return null; }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const url = normalizeUrl(String(body?.url || "").trim());
    if (!url) return NextResponse.json({ error: "Enter a valid http(s) media URL." }, { status: 400 });
    if (!SAVE_API_KEY) return NextResponse.json({
      error: "Downloader API key is not configured. Add SAVEAPI_KEY in Vercel Environment Variables."
    }, { status: 503 });

    const endpoint = new URL(SAVE_API_URL);
    endpoint.searchParams.set("url", url);
    const upstream = await fetch(endpoint, {
      headers: { Authorization: `Bearer ${SAVE_API_KEY}`, Accept: "application/json" },
      signal: AbortSignal.timeout(15000),
      cache: "no-store"
    });
    const payload = await upstream.json().catch(() => ({}));
    if (!upstream.ok || payload?.success === false) {
      const detail = payload?.error?.message || payload?.message || "";
      return NextResponse.json({ error: upstream.status === 429
        ? "Downloader API rate limit reached. Try again later."
        : detail || "This post could not be downloaded. It may be private, deleted, or unsupported." }, { status: 422 });
    }
    const media = Array.isArray(payload?.medias) ? payload.medias : [];
    const links = media.map((item, i) => ({
      url: item.url,
      label: item.quality || item.type || `Download ${i + 1}`,
      type: item.type || "video"
    })).filter(item => {
      try { return ["http:", "https:"].includes(new URL(item.url).protocol); } catch { return false; }
    });
    if (!links.length) return NextResponse.json({ error: "Provider returned no downloadable media." }, { status: 422 });
    return NextResponse.json({ title: payload?.title || "", thumbnail: payload?.thumbnail || "", links });
  } catch (error) {
    const timedOut = error?.name === "TimeoutError" || error?.name === "AbortError";
    return NextResponse.json({ error: timedOut ? "Downloader API timed out. Try again." : "Could not reach downloader API." }, { status: 503 });
  }
}
