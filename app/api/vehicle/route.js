import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{3}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DEVELOPER_INFO = {
  name: "Dbweb by chatpataprani",
  github: "https://github.com/chatpataprani/Dbweb",
  website: "https://dbweb.vercel.app"
};

// Deliberately exclude owner/father names, owner serial numbers, personal phone
// numbers, registration/insurance identifiers, and residential addresses.
const FIELDS = [
  "Model Name", "Maker Model", "Vehicle Class", "Fuel Type", "Fuel Norms",
  "Registration Date", "Insurance Company", "Insurance Expiry", "Insurance Upto",
  "Fitness Upto", "Tax Upto", "PUC Upto", "Financier Name", "Registered RTO"
];

function decodeHtml(value) {
  return value.replace(/<[^>]*>/g, " ").replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&").replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<").replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([\da-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/\s+/g, " ").trim();
}

function extractSafeVehicleFields(html) {
  const data = {};
  for (const label of FIELDS) {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp("<span\\b[^>]*>\\s*" + escaped + "\\s*</span>[\\s\\S]{0,1200}?<p\\b[^>]*>([\\s\\S]*?)</p>", "i");
    const match = html.match(pattern);
    if (match) {
      const value = decodeHtml(match[1]);
      if (value && !/^(not available|n\/?a|null|undefined)$/i.test(value)) data[label] = value;
    }
  }
  return data;
}

function db() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}

export async function POST(request) {
  try {
    const deviceId = request.headers.get("x-device-id") || "";
    if (!UUID.test(deviceId)) return NextResponse.json({ error: "Device ID is missing. Refresh the page and try again." }, { status: 400 });

    const { rc } = await request.json();
    if (typeof rc !== "string") return NextResponse.json({ error: "Enter a vehicle registration number." }, { status: 400 });
    const registration = rc.replace(/[^a-z0-9]/gi, "").toUpperCase();
    if (registration.length < 4 || registration.length > 15) return NextResponse.json({ error: "Enter a valid vehicle registration number." }, { status: 400 });

    const client = db();
    const { data: terms, error: termsError } = await client.from("terms_acceptances").select("terms_version").eq("device_id", deviceId).maybeSingle();
    if (termsError) throw termsError;
    if (!terms || terms.terms_version !== "2026-10-09") return NextResponse.json({ error: "Accept the Terms and Conditions before using lookup.", terms_required: true }, { status: 428 });

    const { data: device, error: deviceError } = await client.from("device_accounts").select("credits,plan,plan_expires_at").eq("device_id", deviceId).single();
    if (deviceError || !device) return NextResponse.json({ error: "Device profile not found. Refresh the page and try again." }, { status: 409 });
    const premiumActive = Boolean(device.plan && device.plan_expires_at && new Date(device.plan_expires_at).getTime() > Date.now());
    if (!premiumActive && device.credits < 1) return NextResponse.json({ error: "No credits left. Redeem a code or purchase a plan." }, { status: 402 });

    let response;
    try {
      response = await fetch("https://vahanx.in/rc-search/" + encodeURIComponent(registration), {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; DbwebVehicleLookup/1.0)",
          "Accept": "text/html,application/xhtml+xml"
        },
        cache: "no-store",
        signal: AbortSignal.timeout(12000)
      });
    } catch (error) {
      if (error?.name === "TimeoutError" || error?.name === "AbortError") return NextResponse.json({ error: "Vehicle lookup timed out. Please try again." }, { status: 504 });
      return NextResponse.json({ error: "Vehicle lookup service is temporarily unreachable." }, { status: 502 });
    }
    if (response.status === 404) return NextResponse.json({ error: "No public vehicle details found for this registration." }, { status: 404 });
    if (!response.ok) return NextResponse.json({ error: "Vehicle lookup service returned an error." }, { status: 502 });

    const html = await response.text();
    const data = extractSafeVehicleFields(html);
    if (!Object.keys(data).length) return NextResponse.json({ error: "No vehicle specifications were available. The source may have changed or blocked the request." }, { status: 404 });

    if (!premiumActive) {
      const { data: updated, error: creditError } = await client.from("device_accounts").update({ credits: device.credits - 1, updated_at: new Date().toISOString() }).eq("device_id", deviceId).eq("credits", device.credits).select("credits").maybeSingle();
      if (creditError || !updated) return NextResponse.json({ error: "Credit balance changed; please retry." }, { status: 409 });
    }
    const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(registration)).then(buf => Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join(""));
    await client.from("device_lookups").insert({ device_id: deviceId, lookup_type: "vehicle", query_hash: hash });
    return NextResponse.json({ status: "success", service: "Dbweb Vehicle RC Lookup", developer: DEVELOPER_INFO, type: "vehicle", rc: registration, data, note: "Only non-personal vehicle specifications are shown. Owner names, father’s names, owner serial numbers, personal phone numbers, and residential addresses are intentionally excluded." }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("vehicle lookup error", error?.message);
    return NextResponse.json({ error: "Unable to complete vehicle lookup." }, { status: 500 });
  }
}
