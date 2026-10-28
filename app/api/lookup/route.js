import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TERMS_VERSION = "2026-10-09";

function dedupeData(value) {
  if (Array.isArray(value)) {
    const seen = new Set();
    return value.map(dedupeData).filter((item) => {
      const key = JSON.stringify(item);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, dedupeData(item)]));
  }
  return value;
}

function db() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Database is not configured.");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function POST(request) {
  try {
    const deviceId = request.headers.get("x-device-id") || "";
    if (!UUID.test(deviceId)) {
      return NextResponse.json({ error: "Device ID is missing. Refresh the page and try again." }, { status: 400 });
    }

    // Authenticate before making any upstream lookup request. Device IDs are identifiers,
    // not credentials, and must never grant access to another account's entitlements.
    const bearer = (request.headers.get("authorization") || "").match(/^Bearer\s+(.+)$/i)?.[1] || "";
    if (!bearer) {
      return NextResponse.json({ error: "Sign in or create an account before using lookup." , login_required: true }, { status: 401 });
    }

    const client = db();
    const { data: authData, error: authError } = await client.auth.getUser(bearer);
    if (authError || !authData?.user) {
      return NextResponse.json({ error: "Your sign-in session expired. Please sign in again.", login_required: true }, { status: 401 });
    }
    const user = authData.user;

    const { data: device, error: deviceError } = await client
      .from("device_accounts")
      .select("device_id,auth_user_id,credits,plan,plan_expires_at")
      .eq("device_id", deviceId)
      .maybeSingle();

    if (deviceError) {
      if (/auth_user_id/i.test(deviceError.message || "")) {
        console.error("lookup ownership migration missing");
        return NextResponse.json({ error: "Account security update required. Please contact support." }, { status: 503 });
      }
      throw deviceError;
    }
    if (!device) {
      return NextResponse.json({ error: "Device profile not found. Refresh the page and try again." }, { status: 409 });
    }
    if (!device.auth_user_id || device.auth_user_id !== user.id) {
      return NextResponse.json({ error: "This device is not linked to your signed-in account. Open Dbweb again or switch to the account linked to this device." }, { status: 403 });
    }

    const { data: terms, error: termsError } = await client
      .from("terms_acceptances")
      .select("terms_version")
      .eq("device_id", deviceId)
      .maybeSingle();
    if (termsError) throw termsError;
    if (!terms || terms.terms_version !== TERMS_VERSION) {
      return NextResponse.json({ error: "Accept the Terms and Conditions before using the lookup API.", terms_required: true }, { status: 428 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Send a valid JSON request." }, { status: 400 });
    }
    const { type, query } = body || {};
    if (!["number", "aadhar"].includes(type) || typeof query !== "string" || !query.trim()) {
      return NextResponse.json({ error: "Invalid lookup request." }, { status: 400 });
    }

    let lookupQuery = query.trim();
    if (type === "number") {
      const digits = lookupQuery.replace(/\D/g, "");
      if (digits.length === 12 && digits.startsWith("91")) lookupQuery = digits.slice(2);
      else lookupQuery = digits;
      if (!/^\d{10}$/.test(lookupQuery)) {
        return NextResponse.json({ error: "Enter a valid 10-digit phone number, with or without the +91 country code." }, { status: 400 });
      }
    } else {
      // Aadhaar identifiers are exactly 12 digits; reject other input before calling a provider.
      lookupQuery = lookupQuery.replace(/\s+/g, "");
      if (!/^\d{12}$/.test(lookupQuery)) {
        return NextResponse.json({ error: "Enter a valid 12-digit Aadhaar number." }, { status: 400 });
      }
    }

    if (type === "number") {
      const { data: protectedNumber, error: protectionError } = await client
        .from("protected_numbers")
        .select("id")
        .eq("phone_digits", lookupQuery)
        .maybeSingle();
      if (protectionError) {
        console.error("protection check failed", protectionError.message);
        return NextResponse.json({ error: "Privacy protection check is temporarily unavailable. Please retry." }, { status: 503 });
      }
      if (protectedNumber) {
        return NextResponse.json({ type, message: "This number is protected.", data: { message: "This number is protected." }, protected: true });
      }
    }

    const premiumActive = Boolean(
      device.plan &&
      device.plan !== "free" &&
      device.plan_expires_at &&
      new Date(device.plan_expires_at).getTime() > Date.now()
    );
    if (!premiumActive && Number(device.credits) < 1) {
      return NextResponse.json({ error: "No credits left. Redeem a code or purchase a plan." }, { status: 402 });
    }

    const base = type === "number" ? process.env.NUMBER_API_BASE : process.env.AADHAAR_API_BASE;
    if (!base) return NextResponse.json({ error: "Lookup API is not configured." }, { status: 503 });

    let response;
    try {
      response = await fetch(base + encodeURIComponent(lookupQuery), {
        headers: { accept: "application/json,text/plain,*/*" },
        cache: "no-store",
        signal: AbortSignal.timeout(12000),
      });
    } catch (fetchError) {
      if (fetchError?.name === "TimeoutError" || fetchError?.name === "AbortError") {
        return NextResponse.json({ error: "Lookup service timed out. Please try again." }, { status: 504 });
      }
      throw fetchError;
    }

    const responseBody = await response.text();
    let data;
    try { data = JSON.parse(responseBody); } catch { data = responseBody; }
    data = dedupeData(data);
    if (!response.ok) {
      return NextResponse.json({ error: "Upstream lookup failed.", status: response.status }, { status: 502 });
    }

    // Compare-and-set prevents two concurrent requests from spending the same credit.
    if (!premiumActive) {
      const { data: updated, error: creditError } = await client
        .from("device_accounts")
        .update({ credits: Number(device.credits) - 1, updated_at: new Date().toISOString() })
        .eq("device_id", deviceId)
        .eq("auth_user_id", user.id)
        .eq("credits", device.credits)
        .select("credits")
        .maybeSingle();
      if (creditError || !updated) {
        return NextResponse.json({ error: "Credit balance changed; please retry." }, { status: 409 });
      }
    }

    const queryHash = createHash("sha256").update(lookupQuery).digest("hex");
    const { error: logError } = await client.from("device_lookups").insert({
      device_id: deviceId,
      lookup_type: type,
      query_hash: queryHash,
    });
    if (logError) console.error("lookup audit log insert failed", logError.message);

    return NextResponse.json({ type, data });
  } catch (error) {
    console.error("lookup error", error?.message);
    return NextResponse.json({ error: "Unable to complete lookup." }, { status: 500 });
  }
}
