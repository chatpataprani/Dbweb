import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function count(value) {
  if (value === null || value === undefined || value === "") return "Unavailable";
  return typeof value === "number" ? value.toLocaleString("en-US") : String(value);
}

function normalize(item, username) {
  if (!item || typeof item !== "object") return null;
  const handle = String(item.username || item.userName || username).replace(/^@/, "");
  const followers = item.followersCount ?? item.followers_count ?? item.followers;
  const following = item.followsCount ?? item.followingCount ?? item.following_count ?? item.following;
  const posts = item.postsCount ?? item.mediaCount ?? item.media_count ?? item.posts;
  const photoUrl = item.profilePicUrlHD || item.profilePicUrl || item.profile_pic_url || null;
  const bio = item.biography || item.bio || "";
  const fullName = item.fullName || item.full_name || item.name || "";
  if (followers === undefined && following === undefined && posts === undefined && !photoUrl && !bio && !fullName) return null;
  return {
    username: handle,
    fullName: fullName || "—",
    followers: count(followers),
    following: count(following),
    posts: count(posts),
    photoUrl,
    bio,
    website: item.externalUrl || item.external_url || item.website || "",
    category: item.businessCategoryName || item.category || "",
    verified: Boolean(item.verified ?? item.isVerified ?? item.is_verified ?? false),
    profileUrl: `https://www.instagram.com/${encodeURIComponent(handle)}/`,
    limited: false,
    source: "Apify public scraper",
    note: "Public profile data only. Instagram may limit or change what is available."
  };
}

async function tryApify(username) {
  const token = process.env.APIFY_API_TOKEN;
  if (!token) return null;
  const response = await fetch("https://api.apify.com/v2/acts/apify~instagram-scraper/run-sync-get-dataset-items?token=" + encodeURIComponent(token), {
    method: "POST",
    headers: { "Content-Type": "application/json", "Accept": "application/json" },
    body: JSON.stringify({
      directUrls: [`https://www.instagram.com/${username}/`],
      resultsType: "details",
      resultsLimit: 1
    }),
    signal: AbortSignal.timeout(25000),
    cache: "no-store"
  });
  if (!response.ok) return null;
  const items = await response.json().catch(() => null);
  return normalize(Array.isArray(items) ? items[0] : items?.items?.[0], username);
}

function decodeMeta(html, key, attr = "property") {
  const re = new RegExp(`<meta\\b(?=[^>]*\\b${attr}=["']${key}["'])[^>]*\\bcontent=["']([^"']*)["'][^>]*>`, "i");
  const match = html.match(re);
  return (match?.[1] || "").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'");
}

async function tryPublicPage(username) {
  const response = await fetch(`https://www.instagram.com/${encodeURIComponent(username)}/`, {
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36", "Accept-Language": "en-US,en;q=0.9" },
    signal: AbortSignal.timeout(8000),
    cache: "no-store"
  });
  if (!response.ok) return null;
  const html = await response.text();
  const title = decodeMeta(html, "og:title");
  const photoUrl = decodeMeta(html, "og:image");
  const description = decodeMeta(html, "description", "name");
  if (!title && !photoUrl && !description) return null;
  const get = (regex) => description.match(regex)?.[1] || "Unavailable";
  return {
    username,
    fullName: title ? title.split("(@")[0].trim() : "—",
    followers: get(/([\d,.]+[KMB]?)\s+Followers?/i),
    following: get(/([\d,.]+[KMB]?)\s+Following/i),
    posts: get(/([\d,.]+[KMB]?)\s+Posts?/i),
    photoUrl: photoUrl || null,
    bio: "",
    website: "",
    category: "",
    verified: false,
    profileUrl: `https://www.instagram.com/${encodeURIComponent(username)}/`,
    limited: true,
    source: "Instagram public page",
    note: "Instagram returned limited public metadata. Some fields may be unavailable."
  };
}

export async function GET(request) {
  const username = (new URL(request.url).searchParams.get("username") || "").trim().replace(/^@+/, "");
  if (!/^[A-Za-z0-9._]{1,30}$/.test(username)) {
    return NextResponse.json({ error: "Enter a valid Instagram username." }, { status: 400 });
  }
  const profileUrl = `https://www.instagram.com/${encodeURIComponent(username)}/`;
  try {
    const profile = await tryApify(username).catch(() => null) || await tryPublicPage(username).catch(() => null);
    if (profile) return NextResponse.json(profile, { headers: { "Cache-Control": "no-store" } });
    return NextResponse.json({
      username, fullName: "Public details unavailable", followers: "Unavailable", following: "Unavailable", posts: "Unavailable",
      photoUrl: null, bio: "", website: "", category: "", verified: false, profileUrl, limited: true,
      note: "Instagram or the data provider did not return public metadata. No statistics were guessed. Try again later or open the profile directly."
    }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Could not reach Instagram or the profile data provider. Try again later." }, { status: 502 });
  }
}
