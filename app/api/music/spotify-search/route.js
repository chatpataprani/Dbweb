import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

let cachedToken = "";
let tokenExpiresAt = 0;

async function spotifyToken() {
  if (cachedToken && Date.now() < tokenExpiresAt) return cachedToken;
  const id = process.env.SPOTIFY_CLIENT_ID;
  const secret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!id || !secret) throw new Error("Spotify is not configured. Add SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET in Vercel.");
  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: "Basic " + Buffer.from(id + ":" + secret).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
    signal: AbortSignal.timeout(12000),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.access_token) throw new Error("Spotify token request failed (HTTP " + response.status + ").");
  cachedToken = data.access_token;
  tokenExpiresAt = Date.now() + Math.max(60, Number(data.expires_in || 3600) - 90) * 1000;
  return cachedToken;
}

export async function GET(request) {
  const params = new URL(request.url).searchParams;
  const q = params.get("q")?.trim();
  if (!q) return NextResponse.json({ error: "Enter a song or artist." }, { status: 400 });
  if (q.length > 180) return NextResponse.json({ error: "Search is too long (180 characters maximum)." }, { status: 400 });
  try {
    const token = await spotifyToken();
    const url = new URL("https://api.spotify.com/v1/search");
    url.searchParams.set("q", q);
    url.searchParams.set("type", "track");
    url.searchParams.set("market", "IN");
    url.searchParams.set("limit", "10");
    const response = await fetch(url, {
      headers: { Authorization: "Bearer " + token },
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return NextResponse.json({ error: data?.error?.message || "Spotify search failed." }, { status: response.status });
    const results = (data.tracks?.items || []).map(track => ({
      id: track.id,
      title: track.name,
      artist: (track.artists || []).map(a => a.name).join(", "),
      album: track.album?.name || "",
      duration: Math.floor((track.duration_ms || 0) / 1000),
      thumbnail: track.album?.images?.[0]?.url || "",
      spotifyUrl: track.external_urls?.spotify || "",
      source: "Spotify",
    }));
    return NextResponse.json({ results, query: q, source: "Spotify" });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Spotify search is unavailable." }, { status: 502 });
  }
}
