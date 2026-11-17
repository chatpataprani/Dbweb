import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function extractItems(payload) {
  if (Array.isArray(payload)) return payload;
  const candidates = [
    payload?.results,
    payload?.items,
    payload?.trending,
    payload?.tracks,
    payload?.songs,
    payload?.videos,
    payload?.data?.results,
    payload?.data?.items,
    payload?.data?.tracks,
    payload?.data?.songs,
    payload?.data,
  ];
  return candidates.find(Array.isArray) || [];
}

function normalizeTrack(track, index) {
  const id = track?.video_id || track?.videoId || track?.id || track?.youtube_id || "";
  const url =
    track?.url ||
    track?.youtube_link ||
    track?.link ||
    track?.webpage_url ||
    track?.video_url ||
    (id ? "https://www.youtube.com/watch?v=" + id : "");

  return {
    id: String(id || track?.id || index),
    title: track?.title || track?.name || track?.track || "Untitled",
    channel:
      track?.channel ||
      track?.artist ||
      track?.uploader ||
      track?.author ||
      track?.creator ||
      "YouTube",
    url,
    thumbnail:
      track?.thumbnail ||
      track?.thumbnail_url ||
      track?.thumbnailUrl ||
      track?.image ||
      track?.artwork ||
      track?.thumbnails?.high?.url ||
      track?.thumbnails?.[0]?.url ||
      "",
    duration:
      track?.duration_seconds ||
      track?.duration ||
      track?.duration_string ||
      0,
  };
}

export async function GET() {
  try {
    // The trending endpoint supplies its own region and result count.
    // Do not send unsupported query parameters: they cause upstream validation errors.
    const response = await fetch("https://api.nubcoders.com/trending", {
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(20000),
    });

    const raw = await response.text();
    let payload;
    try {
      payload = JSON.parse(raw);
    } catch {
      return NextResponse.json(
        { error: "Trending music is temporarily unavailable.", results: [] },
        { status: 502 }
      );
    }

    if (!response.ok) {
      console.error("[Dbweb Music] Trending upstream error", response.status, raw.slice(0, 500));
      return NextResponse.json(
        { error: "Trending music is temporarily unavailable.", results: [] },
        { status: 502 }
      );
    }

    const results = extractItems(payload)
      .map(normalizeTrack)
      .filter((track) => track.url && track.title !== "Untitled");

    return NextResponse.json(
      { results },
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } }
    );
  } catch (e) {
    console.error("[Dbweb Music] Trending request failed", e?.name, e?.message);
    return NextResponse.json(
      { error: "Trending music is temporarily unavailable.", results: [] },
      { status: 502 }
    );
  }
}
