import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { validAdminRequest } from "../../../../lib/admin-auth";

const db = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase service role is not configured.");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
};
const emailFor = (local) => `${local}@dbweb.amir`;

export async function GET(request) {
  if (!validAdminRequest(request)) return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  try {
    const client = db();
    const { data: aliases, error } = await client.from("dbweb_email_aliases")
      .select("user_id,email,active,created_at,disabled_at").order("created_at", { ascending: false }).limit(500);
    if (error) throw error;
    const ids = (aliases || []).map(a => a.user_id);
    let profiles = [];
    if (ids.length) {
      const result = await client.from("profiles").select("id,username,credits,plan,plan_expires_at").in("id", ids);
      if (result.error) throw result.error;
      profiles = result.data || [];
    }
    const byId = new Map(profiles.map(p => [p.id, p]));
    return NextResponse.json({ aliases: (aliases || []).map(a => ({ ...a, profile: byId.get(a.user_id) || {} })) });
  } catch (error) {
    console.error("email alias list failed", error?.message);
    return NextResponse.json({ error: "Could not load aliases. Apply the Dbweb email-alias SQL migration first." }, { status: 500 });
  }
}

export async function POST(request) {
  if (!validAdminRequest(request)) return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  let userId = "";
  try {
    const body = await request.json().catch(() => ({}));
    const credits = Number(body.credits || 0);
    const premiumDays = Number(body.premium_days || 0);
    if (!Number.isInteger(credits) || credits < 0 || credits > 100000 ||
        !Number.isInteger(premiumDays) || premiumDays < 0 || premiumDays > 3650) {
      return NextResponse.json({ error: "Credits must be 0–100000 and premium days 0–3650." }, { status: 400 });
    }
    const client = db();
    let email = "";
    for (let i = 0; i < 5; i++) {
      email = emailFor(randomBytes(5).toString("hex"));
      const { data, error } = await client.from("dbweb_email_aliases").select("user_id").eq("email", email).maybeSingle();
      if (error) throw error;
      if (!data) break;
      email = "";
    }
    if (!email) return NextResponse.json({ error: "Could not generate a unique alias. Try again." }, { status: 500 });

    const password = randomBytes(12).toString("base64url");
    const username = "alias_" + randomBytes(6).toString("hex");
    const { data: created, error: createError } = await client.auth.admin.createUser({
      email, password, email_confirm: true,
      user_metadata: { username, full_name: "Dbweb user", dbweb_email_alias: true }
    });
    if (createError) throw createError;
    userId = created.user.id;

    const { error: aliasError } = await client.from("dbweb_email_aliases").insert({
      user_id: userId, email, active: true
    });
    if (aliasError) throw aliasError;

    const { data: profile, error: profileError } = await client.from("profiles")
      .select("id,credits,plan_expires_at").eq("id", userId).maybeSingle();
    if (profileError) throw profileError;
    if (profile && (credits > 0 || premiumDays > 0)) {
      const patch = { credits: Number(profile.credits || 0) + credits };
      if (premiumDays > 0) {
        patch.plan = premiumDays + "d";
        patch.plan_expires_at = new Date(Math.max(Date.now(), profile.plan_expires_at ? new Date(profile.plan_expires_at).getTime() : 0) + premiumDays * 86400000).toISOString();
      }
      const { error } = await client.from("profiles").update(patch).eq("id", userId);
      if (error) throw error;
    }
    return NextResponse.json({ ok: true, alias: { user_id: userId, email, active: true, created_at: created.user.created_at, profile: { credits: Number(profile?.credits || 0) + credits, plan: premiumDays > 0 ? premiumDays + "d" : profile?.plan || "free" } }, password }, { status: 201 });
  } catch (error) {
    if (userId) {
      try { await db().auth.admin.deleteUser(userId); } catch {}
    }
    console.error("email alias create failed", error?.message);
    return NextResponse.json({ error: error?.message || "Could not create email alias." }, { status: 500 });
  }
}

export async function PATCH(request) {
  if (!validAdminRequest(request)) return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  try {
    const body = await request.json().catch(() => ({}));
    const userId = String(body.user_id || "");
    const active = body.active === true;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId)) {
      return NextResponse.json({ error: "Invalid alias account." }, { status: 400 });
    }
    const client = db();
    const { data: alias, error: findError } = await client.from("dbweb_email_aliases").select("user_id,email").eq("user_id", userId).maybeSingle();
    if (findError) throw findError;
    if (!alias) return NextResponse.json({ error: "Alias not found." }, { status: 404 });
    const { error: authError } = await client.auth.admin.updateUserById(userId, { ban_duration: active ? "none" : "876000h" });
    if (authError) throw authError;
    const { error } = await client.from("dbweb_email_aliases").update({ active, disabled_at: active ? null : new Date().toISOString() }).eq("user_id", userId);
    if (error) throw error;
    return NextResponse.json({ ok: true, active, email: alias.email });
  } catch (error) {
    console.error("email alias update failed", error?.message);
    return NextResponse.json({ error: error?.message || "Could not update alias." }, { status: 500 });
  }
}
