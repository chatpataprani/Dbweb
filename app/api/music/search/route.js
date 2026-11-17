import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const error = (message, status = 502) => NextResponse.json({ error: message }, { status });

function extractItems(data) {
  if (Array.isArray(data)) return data;
  const candidates = [
    data?.results, data?.main_results, data?.items, data?.videos,
    data?.tracks, data?.songs, data?.data?.results, data?.data?.items,
    data?.data?.tracks, data?.data?.videos, data?.data?.songs,
    data?.data, data?.result?.results, data?.result?.items,
    data?.result?.tracks, data?.result
  ];
  return candidates.find(Array.isArray) || [];
}

function normalizeItems(data) {
  return extractItems(data).map((x) => {
    const id = x?.video_id || x?.videoId || x?.id || x?.youtube_id || x?.youtubeId || "";
    const url = x?.url || x?.youtube_link || x?.youtube_url || x?.link ||
      x?.webpage_url || x?.watch_url || (id ? "https://www.youtube.com/watch?v=" + id : "");
    return {
      title: x?.title || x?.name || x?.video_title || x?.track_name || "Untitled",
      channel: x?.channel || x?.artist || x?.channel_name || x?.uploader || x?.author || "YouTube",
      url,
      thumbnail: x?.thumbnail || x?.thumbnail_url || x?.thumbnailUrl ||
        x?.thumbnails?.high?.url || x?.thumbnails?.[0]?.url || "",
      duration: x?.duration || x?.duration_seconds || x?.duration_string || 0,
      views: x?.views || x?.view_count || ""
    };
  }).filter((x) => x.url);
}

export async function GET(request) {
  const q = new URL(request.url).searchParams.get("q")?.trim();
  if (!q) return error("Enter a song, artist, or YouTube URL.", 400);
  if (q.length > 180) return error("Search is too long (180 characters maximum).", 400);

  const token = process.env.NUB_YT_API_KEY;
  if (!token) {
    console.error("[Dbweb Music] Search configuration is missing its server credential.");
    return error("Music search is temporarily unavailable. Please try again later.", 503);
  }

  try {
    const endpoint = new URL("https://api.nubcoders.com/search");
    endpoint.searchParams.set("q", q);
    endpoint.searchParams.set("limit", "20");

    const response = await fetch(endpoint, {
      headers: {
        Authorization: "Bearer " + token,
        Accept: "application/json"
      },
      cache: "no-store",
      redirect: "follow",
      signal: AbortSignal.timeout(25000)
    });

    const raw = await response.text();
    let data;
    try {
      // Strip a possible UTF-8 BOM before parsing JSON.
      data = JSON.parse(raw.replace(/^\uFEFF/, "").trim());
    } catch {
      console.error("[Dbweb Music] Search upstream returned non-JSON data", {
        status: response.status,
        contentType: response.headers.get("content-type"),
        preview: raw.slice(0, 240).replace(/\s+/g, " ")
      });
      return error(response.status === 401 || response.status === 403
        ? "Music search authorization failed. Please try again later."
        : "Music search service returned an unreadable response. Please try again.", 502);
    }

    if (!response.ok) {
      console.error("[Dbweb Music] Search upstream error", response.status,
        (data?.detail || data?.error || data?.message || "Unknown upstream error").toString().slice(0, 240));
      return error(data?.detail || data?.error || data?.message || "Music search is temporarily unavailable.", 502);
    }

    const results = normalizeItems(data);
    if (!results.length) {
      console.error("[Dbweb Music] Search returned no usable track records", {
        keys: data && typeof data === "object" ? Object.keys(data).slice(0, 20) : [],
        status: response.status
      });
    }
    return NextResponse.json({ results, query: q });
  } catch (e) {
    console.error("[Dbweb Music] Search request failed", e?.name, e?.message);
    return error(e?.name === "TimeoutError"
      ? "Music search timed out. Try again."
      : "Music search is temporarily unavailable.");
  }
}
