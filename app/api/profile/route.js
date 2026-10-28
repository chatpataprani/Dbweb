import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function clients() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Database is not configured on the server.");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

async function getUser(request, db) {
  const token = (request.headers.get("authorization") || "").match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return { error: NextResponse.json({ error: "Please sign in again." }, { status: 401 }) };
  const { data, error } = await db.auth.getUser(token);
  if (error || !data?.user) return { error: NextResponse.json({ error: "Your session expired. Please sign in again." }, { status: 401 }) };
  return { user: data.user };
}

export async function GET(request) {
  try {
    const db = clients();
    const auth = await getUser(request, db);
    if (auth.error) return auth.error;
    const user = auth.user;
    const { data: profile, error } = await db.from("profiles")
      .select("id,email,username,avatar_url,referral_code,referred_by,credits,plan,plan_expires_at")
      .eq("id", user.id).maybeSingle();
    if (error) throw error;
    const countResult = await db.rpc("count_verified_referrals", { p_user_id: user.id });
    if (countResult.error) throw countResult.error;
    const referralCount = Number(countResult.data) || 0;
    return NextResponse.json({ profile: profile || { id: user.id, email: user.email, username: user.user_metadata?.username || "", avatar_url: user.user_metadata?.avatar_url || "", referral_code: "" }, referral_count: referralCount });
  } catch (error) {
    console.error("profile fetch failed", error?.message);
    return NextResponse.json({ error: "Could not load your profile. Check the profile migration in Supabase." }, { status: 503 });
  }
}

export async function POST(request) {
  try {
    const db = clients();
    const auth = await getUser(request, db);
    if (auth.error) return auth.error;
    const user = auth.user;
    const body = await request.json().catch(() => ({}));
    const username = typeof body.username === "string" ? body.username.trim().toLowerCase() : "";
    const fullName = typeof body.full_name === "string" ? body.full_name.trim() : "";
    const avatarUrl = typeof body.avatar_url === "string" ? body.avatar_url.trim() : "";
    if (!/^[a-z0-9_]{3,24}$/.test(username)) {
      return NextResponse.json({ error: "Username must be 3–24 characters using letters, numbers, or underscores." }, { status: 400 });
    }
    if (fullName.length > 80) return NextResponse.json({ error: "Display name must be 80 characters or fewer." }, { status: 400 });
    if (avatarUrl && (!avatarUrl.startsWith("https://") || avatarUrl.length > 2048)) {
      return NextResponse.json({ error: "Invalid profile picture URL." }, { status: 400 });
    }
    const { data, error } = await db.from("profiles").upsert({
      id: user.id, email: user.email, username, avatar_url: avatarUrl || null
    }, { onConflict: "id" }).select("id,email,username,avatar_url,referral_code,referred_by,credits,plan,plan_expires_at").single();
    if (error?.code === "23505") return NextResponse.json({ error: "That username is already taken. Try another one." }, { status: 409 });
    if (error) throw error;
    return NextResponse.json({ profile: data });
  } catch (error) {
    console.error("profile update failed", error?.message);
    return NextResponse.json({ error: "Could not save your profile. Check the profile migration in Supabase." }, { status: 503 });
  }
}
