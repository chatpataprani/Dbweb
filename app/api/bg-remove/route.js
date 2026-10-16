import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const WINDOW_MS = 60 * 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 8;
const requestsByIp = new Map();

export async function POST(request) {
  const apiKey = process.env.REMOVE_BG_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "API not configured" }, { status: 503 });
  }

  const forwardedFor = request.headers.get("x-forwarded-for") || "";
  const ip = forwardedFor.split(",")[0].trim() || "unknown";
  const now = Date.now();
  const record = requestsByIp.get(ip);
  if (record && now - record.startedAt < WINDOW_MS && record.count >= MAX_REQUESTS_PER_WINDOW) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429, headers: { "Retry-After": String(Math.ceil((WINDOW_MS - (now - record.startedAt)) / 1000)) } }
    );
  }
  if (!record || now - record.startedAt >= WINDOW_MS) {
    requestsByIp.set(ip, { startedAt: now, count: 1 });
  } else {
    record.count += 1;
  }

  try {
    const incoming = await request.formData();
    const image = incoming.get("image");
    if (!(image instanceof File)) {
      return NextResponse.json({ error: "Please upload an image." }, { status: 400 });
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(image.type)) {
      return NextResponse.json({ error: "Use a JPG, PNG or WebP image." }, { status: 415 });
    }
    if (image.size > 20 * 1024 * 1024) {
      return NextResponse.json({ error: "Image must be 20 MB or smaller." }, { status: 413 });
    }

    const form = new FormData();
    form.append("image_file", image, image.name || "image");
    form.append("size", "auto");

    const upstream = await fetch("https://api.remove.bg/v1.0/removebg", {
      method: "POST",
      headers: { "X-Api-Key": apiKey },
      body: form,
      signal: AbortSignal.timeout(55000),
      cache: "no-store",
    });

    if (!upstream.ok) {
      const details = await upstream.text().catch(() => "");
      console.error("Background removal API error", upstream.status, details.slice(0, 500));
      const status = upstream.status === 429 ? 429 : upstream.status === 402 ? 402 : upstream.status === 403 ? 502 : 502;
      return NextResponse.json(
        { error: upstream.status === 402 ? "The background removal service has no remaining credits." :
          upstream.status === 429 ? "The background removal service is busy. Try again shortly." :
          "The online background remover is temporarily unavailable." },
        { status }
      );
    }

    const result = await upstream.arrayBuffer();
    return new Response(result, {
      status: 200,
      headers: {
        "Content-Type": upstream.headers.get("content-type") || "image/png",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Background removal request failed", error);
    return NextResponse.json({ error: "Could not process this image right now." }, { status: 502 });
  }
}
