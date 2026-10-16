import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function meta(html, key, attr = "property") {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`<meta\\b(?=[^>]*\\b${attr}=["']${escaped}["'])[^>]*\\bcontent=["']([^"']*)["'][^>]*>`, "i");
  const match = html.match(re) || html.match(new RegExp(`<meta\\b[^>]*\\bcontent=["']([^"']*)["'][^>]*\\b${attr}=["']${escaped}["'][^>]*>`, "i"));
  return match?.[1]?.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">") || "";
}

function parseCounts(description) {
  const normalized = description.replace(/,/g, "");
  const pick = (patterns) => {
    for (const pattern of patterns) {
      const match = normalized.match(pattern);
      if (match) return match[1];
    }
    return "Unavailable";
  };
  return {
    followers: pick([/([\d.]+[KMB]?)\s+Followers?/i]),
    following: pick([/([\d.]+[KMB]?)\s+Following/i]),
    posts: pick([/([\d.]+[KMB]?)\s+Posts?/i]),
  };
}

function normalizeCount(value) {
  if (value === null || value === undefined || value === "") return "Unavailable";
  if (typeof value === "number") return value.toLocaleString("en-US");
  return String(value);
}

function fromScraper(item, username) {
  if (!item || typeof item !== "object") return null;
  const handle = String(item.username || item.userName || item.handle || username).replace(/^@/, "");
  const fullName = item.fullName || item.full_name || item.name || "—";
  const followers = item.followersCount ?? item.followers_count ?? item.followers;
  const following = item.followsCount ?? item.followingCount ?? item.following_count ?? item.following;
  const posts = item.postsCount ?? item.mediaCount ?? item.media_count ?? item.posts;
  const photoUrl = item.profilePicUrlHD || item.profilePicUrl || item.profile_pic_url || item.profilePicture || null;
  const bio = item.biography || item.bio || "";
  const website = item.externalUrl || item.external_url || item.website || "";
  const category = item.businessCategoryName || item.category || "";
  const verified = item.verified ?? item.isVerified ?? item.is_verified ?? false;
  if (followers === undefined && following === undefined && posts === undefined && !photoUrl && !bio && fullName === "—") return null;
  return {
    username: handle,
    fullName,
    followers: normalizeCount(followers),
    following: normalizeCount(following),
    posts: normalizeCount(posts),
    photoUrl,
    bio,
    website,
    category,
    verified: Boolean(verified),
    profileUrl: `https://www.instagram.com/${encodeURIComponent(handle)}/`,
    limited: false,
    source: "public scraper",
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
      resultsLimit: 0,
      includeLatestPosts: false,
      maxItems: 1
    }),
    signal: AbortSignal.timeout(25000),
    cache: "no-store"
  });
  if (!response.ok) return null;
  const items = await response.json().catch(() => null);
  const list = Array.isArray(items) ? items : items?.items || [];
  return fromScraper(list[0], username);
}

async function tryPublicPage(username) {
  const response = await fetch(`https://www.instagram.com/${encodeURIComponent(username)}/`, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml",
      "Accept-Language": "en-US,en;q=0.9",
    },
    signal: AbortSignal.timeout(10000),
    cache: "no-store",
    redirect: "follow",
  });
  if (!response.ok) return null;
  const html = await response.text();
  const title = meta(html, "og:title");
  const photoUrl = meta(html, "og:image");
  const description = meta(html, "description", "name");
  const counts = parseCounts(description);
  if (!title && !photoUrl && !description) return null;
  return {
    username,
    fullName: title ? title.split("(@")[0].trim() : "—",
    ...counts,
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
  const raw = new URL(request.url).searchParams.get("username") || "";
  const username = raw.trim().replace(/^@+/, "");
  if (!/^[A-Za-z0-9._]{1,30}$/.test(username)) {
    return NextResponse.json({ error: "Enter a valid Instagram username." }, { status: 400 });
  }
  const profileUrl = `https://www.instagram.com/${encodeURIComponent(username)}/`;
  try {
    const scraped = await tryApify(username).catch(() => null);
    if (scraped) return NextResponse.json(scraped, { headers: { "Cache-Control": "no-store" } });

    const fallback = await tryPublicPage(username).catch(() => null);
    if (fallback) return NextResponse.json(fallback, { headers: { "Cache-Control": "no-store" } });

    return NextResponse.json({
      username,
      fullName: "Public details unavailable",
      followers: "Unavailable",
      following: "Unavailable",
      posts: "Unavailable",
      photoUrl: null,
      bio: "",
      website: "",
      category: "",
      verified: false,
      profileUrl,
      limited: true,
      note: "Instagram blocked or did not return public metadata. No statistics were guessed. Try again later or open the profile directly."
    }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Could not reach Instagram or the profile data provider. Try again later." }, { status: 502 });
  }
}
