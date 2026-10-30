import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const username = typeof body.username === "string" ? body.username.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (!/^[a-z0-9_]{3,24}$/.test(username) || !password || password.length > 256) {
      return NextResponse.json({ error: "Username or password is incorrect." }, { status: 400 });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) throw new Error("Server authentication is not configured.");

    const admin = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });
    const { data: profile, error: profileError } = await admin
      .from("profiles").select("email").eq("username", username).maybeSingle();
    if (profileError) throw profileError;
    if (!profile?.email) {
      return NextResponse.json({ error: "Username or password is incorrect." }, { status: 401 });
    }

    const { data, error } = await admin.auth.signInWithPassword({ email: profile.email, password });
    if (error || !data?.session) {
      return NextResponse.json({ error: "Username or password is incorrect." }, { status: 401 });
    }

    return NextResponse.json({
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token
      }
    });
  } catch (error) {
    console.error("username login failed", error?.message);
    return NextResponse.json({ error: "Username sign-in is temporarily unavailable. Please try using your email." }, { status: 503 });
  }
}
