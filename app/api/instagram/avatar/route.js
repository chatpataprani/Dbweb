import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function allowedHost(hostname) {
  const host = hostname.toLowerCase();
  return host === "cdninstagram.com" || host.endsWith(".cdninstagram.com") ||
    host === "fbcdn.net" || host.endsWith(".fbcdn.net");
}

export async function GET(request) {
  const raw = new URL(request.url).searchParams.get("url");
  if (!raw) return NextResponse.json({ error: "Missing image URL." }, { status: 400 });

  let target;
  try {
    target = new URL(raw);
  } catch {
    return NextResponse.json({ error: "Invalid image URL." }, { status: 400 });
  }
  if (target.protocol !== "https:" || !allowedHost(target.hostname)) {
    return NextResponse.json({ error: "Image host is not allowed." }, { status: 400 });
  }

  try {
    let response;
    for (let hop = 0; hop < 4; hop++) {
      response = await fetch(target, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36",
          "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
          "Referer": "https://www.instagram.com/"
        },
        redirect: "manual",
        signal: AbortSignal.timeout(10000),
        cache: "no-store"
      });

      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get("location");
        if (!location || hop === 3) break;
        target = new URL(location, target);
        if (target.protocol !== "https:" || !allowedHost(target.hostname)) {
          return NextResponse.json({ error: "Image redirect host is not allowed." }, { status: 502 });
        }
        continue;
      }
      break;
    }

    if (!response?.ok) {
      return NextResponse.json({ error: "Profile picture provider is unavailable." }, { status: 502 });
    }
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.toLowerCase().startsWith("image/")) {
      return NextResponse.json({ error: "Provider did not return an image." }, { status: 502 });
    }

    return new Response(response.body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=1800, s-maxage=1800, stale-while-revalidate=86400",
        "X-Content-Type-Options": "nosniff"
      }
    });
  } catch {
    return NextResponse.json({ error: "Could not load the profile picture." }, { status: 502 });
  }
}
