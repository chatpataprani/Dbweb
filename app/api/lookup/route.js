import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const { type, query } = await request.json();
    if (!["number", "aadhar"].includes(type) || !query?.trim()) {
      return NextResponse.json({ error: "Invalid lookup request." }, { status: 400 });
    }

    // This proxy keeps the upstream endpoint out of the browser and gives
    // the app one place to add authentication, rate limits and audit logging.
    // Only use the configured upstream with data you are authorized to access.
    const base = type === "number"
      ? process.env.NUMBER_API_BASE
      : process.env.AADHAAR_API_BASE;

    if (!base) return NextResponse.json({ error: "Lookup API is not configured." }, { status: 503 });

    const response = await fetch(base + encodeURIComponent(query.trim()), {
      headers: { "accept": "application/json,text/plain,*/*" },
      cache: "no-store"
    });

    const text = await response.text();
    let data;
    try { data = JSON.parse(text); } catch { data = text; }

    if (!response.ok) {
      return NextResponse.json({ error: "Upstream lookup failed.", status: response.status }, { status: 502 });
    }

    return NextResponse.json({ type, data });
  } catch {
    return NextResponse.json({ error: "Unable to complete lookup." }, { status: 500 });
  }
}
