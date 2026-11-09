import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const SAVE_API_KEY = process.env.SAVEAPI_KEY || "";
const SAVE_API_URL = "https://api.saveapi.org/v1/download";

function normalizeUrl(value) {
  try {
    const u = new URL(value);
    if (!["http:", "https:"].includes(u.protocol) || u.username || u.password) return null;
    return u.toString();
  } catch { return null; }
}

async function saveApi(path, params = {}) {
  const endpoint = new URL("https://api.saveapi.org/v1/" + path);
  for (const [key, value] of Object.entries(params)) endpoint.searchParams.set(key, String(value));
  const response = await fetch(endpoint, {
    headers: { Authorization: `Bearer ${SAVE_API_KEY}`, Accept: "application/json" },
    signal: AbortSignal.timeout(25000),
    cache: "no-store"
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data?.success === false) {
    const code = data?.error?.code || "";
    const message = data?.error?.message || data?.message || `SaveAPI request failed (${response.status})`;
    throw new Error(code ? `${code}: ${message}` : message);
  }
  return data;
}

export async function POST(request) {
  try {
    const body = await request.json();
    const url = normalizeUrl(String(body?.url || "").trim());
    if (!url) return NextResponse.json({ error: "Enter a valid http(s) media URL." }, { status: 400 });
    if (!SAVE_API_KEY) return NextResponse.json({ error: "Downloader API key is not configured. Add SAVEAPI_KEY in Vercel Environment Variables." }, { status: 503 });

    const host = new URL(url).hostname.toLowerCase();
    const isYoutube = host === "youtu.be" || host.endsWith("youtube.com") || host.endsWith("youtube-nocookie.com");
    if (isYoutube) {
      try {
        // Info costs 2 credits; create costs 10. The create endpoint returns a short-lived signed URL.
        const info = await saveApi("youtube/info", { url });
        const formats = Array.isArray(info.formats) ? info.formats : [];
        const available = formats.map(f => String(f.quality || f.format || "")).filter(Boolean);
        const quality = available.includes("720p") ? "720p" : available.find(q => /^\d+p$/.test(q)) || "480p";
        const made = await saveApi("youtube/create", { url, quality });
        const mediaUrl = made.url || made.download_url;
        if (!mediaUrl) throw new Error("YouTube provider did not return a download URL. Check available formats and try again.");
        return NextResponse.json({
          title: info.title || info.meta?.title || "YouTube video",
          thumbnail: info.thumbnail || info.meta?.thumbnail || "",
          links: [{ url: mediaUrl, label: made.filename || `YouTube video (${quality})`, type: "video" }]
        });
      } catch (e) {
        return NextResponse.json({ error: e.message || "YouTube download failed. Try a public video." }, { status: 422 });
      }
    }

    const endpoint = new URL(SAVE_API_URL);
    endpoint.searchParams.set("url", url);
    const upstream = await fetch(endpoint, {
      headers: { Authorization: `Bearer ${SAVE_API_KEY}`, Accept: "application/json" },
      signal: AbortSignal.timeout(25000),
      cache: "no-store"
    });
    const payload = await upstream.json().catch(() => ({}));
    if (!upstream.ok || payload?.success === false) {
      const detail = payload?.error?.message || payload?.message || "";
      return NextResponse.json({ error: upstream.status === 429 ? "Downloader API rate limit reached. Try again later." : detail || "This post could not be downloaded. It may be private, deleted, or unsupported." }, { status: 422 });
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
    return NextResponse.json({ title: payload?.meta?.title || payload?.title || "", thumbnail: payload?.meta?.thumbnail || payload?.thumbnail || "", links });
  } catch (error) {
    const timedOut = error?.name === "TimeoutError" || error?.name === "AbortError";
    return NextResponse.json({ error: timedOut ? "Downloader API timed out. Try again." : error.message || "Could not reach downloader API." }, { status: 503 });
  }
}
