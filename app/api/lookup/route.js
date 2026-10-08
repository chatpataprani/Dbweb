import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request) {
  try {
    const authHeader = request.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    if (!token) return NextResponse.json({ error: "Please sign in before searching." }, { status: 401 });

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) return NextResponse.json({ error: "Your session has expired. Please sign in again." }, { status: 401 });

    const { type, query } = await request.json();
    if (!["number", "aadhar"].includes(type) || !query?.trim()) {
      return NextResponse.json({ error: "Invalid lookup request." }, { status: 400 });
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("credits")
      .eq("id", userData.user.id)
      .single();

    if (profileError || !profile) return NextResponse.json({ error: "Your account profile is not ready yet." }, { status: 409 });
    if (profile.credits <= 0) return NextResponse.json({ error: "No credits left. Buy a plan to continue." }, { status: 402 });

    const base = type === "number" ? process.env.NUMBER_API_BASE : process.env.AADHAAR_API_BASE;
    if (!base) return NextResponse.json({ error: "Lookup API is not configured." }, { status: 503 });

    const response = await fetch(base + encodeURIComponent(query.trim()), {
      headers: { accept: "application/json,text/plain,*/*" },
      cache: "no-store"
    });

    const text = await response.text();
    let data;
    try { data = JSON.parse(text); } catch { data = text; }

    if (!response.ok) {
      return NextResponse.json({ error: "Upstream lookup failed.", status: response.status }, { status: 502 });
    }

    const newCredits = profile.credits - 1;
    const { error: creditError } = await supabase
      .from("profiles")
      .update({ credits: newCredits })
      .eq("id", userData.user.id)
      .eq("credits", profile.credits);

    if (creditError) return NextResponse.json({ error: "Could not update your credits. Please try again." }, { status: 500 });

    const queryHash = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(query.trim())
    ).then(buf => Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join(""));

    await supabase.from("lookups").insert({
      user_id: userData.user.id,
      lookup_type: type,
      query_hash: queryHash
    });

    return NextResponse.json({ type, data });
  } catch {
    return NextResponse.json({ error: "Unable to complete lookup." }, { status: 500 });
  }
}
