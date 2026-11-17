import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SHARE_TTL_SECONDS = 24 * 60 * 60;

function getSecret() {
  return process.env.DBWEB_MUSIC_SHARE_SECRET || process.env.NUB_YT_API_KEY || "";
}

function sign(value, secret) {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

function validToken(token, secret) {
  if (typeof token !== "string" || token.length > 2048) return null;
  const splitAt = token.lastIndexOf(".");
  if (splitAt < 1) return null;
  const payload = token.slice(0, splitAt);
  const signature = token.slice(splitAt + 1);
  const expected = sign(payload, secret);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!data?.title || !Number.isInteger(data.exp) || data.exp <= Math.floor(Date.now() / 1000)) return null;
    return data;
  } catch {
    return null;
  }
}

export async function POST(request) {
  const secret = getSecret();
  if (!secret) return NextResponse.json({ error: "Private sharing is temporarily unavailable." }, { status: 503 });
  try {
    const body = await request.json();
    const title = String(body?.title || "").trim().slice(0, 180);
    const artist = String(body?.artist || "").trim().slice(0, 180);
    if (!title) return NextResponse.json({ error: "Choose a track first." }, { status: 400 });
    const payload = Buffer.from(JSON.stringify({
      title,
      artist,
      exp: Math.floor(Date.now() / 1000) + SHARE_TTL_SECONDS,
      nonce: crypto.randomUUID()
    })).toString("base64url");
    const token = payload + "." + sign(payload, secret);
    return NextResponse.json({ token, expiresIn: SHARE_TTL_SECONDS }, {
      headers: { "Cache-Control": "no-store, max-age=0" }
    });
  } catch {
    return NextResponse.json({ error: "Could not create a private link." }, { status: 400 });
  }
}

export async function GET(request) {
  const secret = getSecret();
  if (!secret) return NextResponse.json({ error: "Private sharing is temporarily unavailable." }, { status: 503 });
  const token = new URL(request.url).searchParams.get("token");
  const data = validToken(token, secret);
  if (!data) return NextResponse.json({ error: "This private link is invalid or has expired." }, {
    status: 410,
    headers: { "Cache-Control": "no-store, max-age=0" }
  });
  return NextResponse.json({ title: data.title, artist: data.artist || "" }, {
    headers: { "Cache-Control": "no-store, max-age=0" }
  });
}
