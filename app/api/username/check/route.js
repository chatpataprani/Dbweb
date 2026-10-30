import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error("Database is not configured.");
    const db = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
    const username = (new URL(request.url).searchParams.get("username") || "").trim().toLowerCase();
    if (!/^[a-z0-9_]{3,24}$/.test(username)) return NextResponse.json({ error: "Invalid username." }, { status: 400 });
    const { data, error } = await db.from("profiles").select("id").eq("username", username).maybeSingle();
    if (error) throw error;
    const token = (request.headers.get("authorization") || "").match(/^Bearer\\s+(.+)$/i)?.[1];
    let owned = false;
    if (token && data) {
      const { data: auth } = await db.auth.getUser(token);
      owned = auth?.user?.id === data.id;
    }
    return NextResponse.json({ available: !data || owned, owned });
  } catch (error) {
    console.error("username availability check failed", error?.message);
    return NextResponse.json({ error: "Could not check username availability." }, { status: 503 });
  }
}
