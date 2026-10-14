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
    return "—";
  };
  return {
    followers: pick([/([\d.]+[KMB]?)\s+Followers?/i]),
    following: pick([/([\d.]+[KMB]?)\s+Following/i]),
    posts: pick([/([\d.]+[KMB]?)\s+Posts?/i]),
  };
}

export async function GET(request) {
  const raw = new URL(request.url).searchParams.get("username") || "";
  const username = raw.trim().replace(/^@+/, "");
  if (!/^[A-Za-z0-9._]{1,30}$/.test(username)) {
    return NextResponse.json({ error: "Enter a valid Instagram username." }, { status: 400 });
  }

  try {
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

    if (response.status === 404) {
      return NextResponse.json({ error: "That profile was not found or is unavailable." }, { status: 404 });
    }
    if (!response.ok) {
      return NextResponse.json({ error: "Instagram is temporarily limiting profile requests. Try again later." }, { status: 502 });
    }

    const html = await response.text();
    const title = meta(html, "og:title");
    const photoUrl = meta(html, "og:image");
    const description = meta(html, "description", "name");
    if (!title && !photoUrl && !description) {
      return NextResponse.json({ error: "Instagram did not return public profile details for this username." }, { status: 502 });
    }

    const fullName = title ? title.split("(@")[0].trim() : "—";
    const counts = parseCounts(description);
    return NextResponse.json({
      username,
      fullName: fullName || "—",
      ...counts,
      photoUrl: photoUrl || null,
      profileUrl: `https://www.instagram.com/${encodeURIComponent(username)}/`,
    }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json({ error: "Could not reach Instagram. It may be blocking automated requests; try again later." }, { status: 502 });
  }
}
