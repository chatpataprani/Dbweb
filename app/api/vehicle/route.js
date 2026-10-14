import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const DEVELOPER = { name: "Chatpataprani", github: "https://github.com/chatpataprani" };
// Deliberate allowlist: owner names, father's names, owner serial numbers, personal phone numbers and addresses are never returned.
const ALLOWED_FIELDS = [
  "Model Name", "Maker Model", "Vehicle Class", "Fuel Type", "Fuel Norms",
  "Registration Date", "Insurance Company", "Insurance Expiry", "Insurance Upto",
  "Fitness Upto", "Tax Upto", "PUC No", "PUC Upto", "Financier Name",
  "Registered RTO", "City Name"
];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function cleanText(html) {
  return html.replace(/<[^>]*>/g, " ").replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&")
    .replace(/&#39;|&apos;/gi, "'").replace(/&quot;/gi, '"')
    .replace(/&lt;/gi, "<").replace(/&gt;/gi, ">").replace(/\s+/g, " ").trim();
}
function extractFields(html) {
  const data = {};
  for (const label of ALLOWED_FIELDS) {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const match = new RegExp("<span[^>]*>\\s*" + escaped + "\\s*</span>", "i").exec(html);
    if (!match) continue;
    const tail = html.slice(match.index + match[0].length, match.index + match[0].length + 1400);
    const end = tail.indexOf("</div>");
    const section = end >= 0 ? tail.slice(0, end) : tail;
    const valueMatch = /<p\b[^>]*>([\s\S]*?)<\/p>/i.exec(section);
    if (!valueMatch) continue;
    const value = cleanText(valueMatch[1]);
    if (value && !/^(not available|n\/a|null|undefined)$/i.test(value)) data[label] = value;
  }
  return data;
}
function db() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}
export async function GET() {
  return NextResponse.json({
    status: "online", service: "Dbweb Vehicle RC Demo", developer: DEVELOPER,
    privacy: "Vehicle details only; owner names, father's names, owner serial numbers, personal phone numbers and residential addresses are excluded.",
    example: "/api/vehicle?rc=BR03H5690"
  }, { headers: { "Cache-Control": "no-store" } });
}
export async function POST(request) {
  try {
    const deviceId = request.headers.get("x-device-id") || "";
    if (!UUID.test(deviceId)) return NextResponse.json({ error: "Device ID is missing. Refresh the page and try again." }, { status: 400 });
    const body = await request.json();
    if (typeof body.rc !== "string") return NextResponse.json({ error: "Enter a vehicle registration number." }, { status: 400 });
    const rc = body.rc.replace(/[^a-z0-9]/gi, "").toUpperCase();
    if (rc.length < 4 || rc.length > 15) return NextResponse.json({ error: "Enter a valid vehicle registration number." }, { status: 400 });

    const client = db();
    const { data: terms, error: termsError } = await client.from("terms_acceptances").select("terms_version").eq("device_id", deviceId).maybeSingle();
    if (termsError) throw termsError;
    if (!terms || terms.terms_version !== "2026-10-09") return NextResponse.json({ error: "Accept the Terms and Conditions before using the lookup API." }, { status: 428 });
    const { data: account, error: accountError } = await client.from("device_accounts").select("credits,plan,plan_expires_at").eq("device_id", deviceId).single();
    if (accountError || !account) return NextResponse.json({ error: "Device profile not found. Refresh the page and try again." }, { status: 409 });
    const premium = Boolean(account.plan && account.plan_expires_at && new Date(account.plan_expires_at).getTime() > Date.now());
    if (!premium && account.credits < 1) return NextResponse.json({ error: "No credits left. Redeem a code or purchase a plan." }, { status: 402 });

    let response;
    try {
      response = await fetch("https://vahanx.in/rc-search/" + encodeURIComponent(rc), {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; DbwebVehicleDemo/1.0)", "Accept": "text/html,application/xhtml+xml" },
        cache: "no-store", signal: AbortSignal.timeout(12000)
      });
    } catch (error) {
      if (error?.name === "TimeoutError" || error?.name === "AbortError") return NextResponse.json({ error: "Vehicle source timed out. Please try again." }, { status: 504 });
      throw error;
    }
    if (response.status === 404) return NextResponse.json({ error: "No vehicle record found for this registration number." }, { status: 404 });
    if (!response.ok) return NextResponse.json({ error: "Vehicle source is temporarily unavailable." }, { status: 502 });
    const data = extractFields(await response.text());
    if (!Object.keys(data).length) return NextResponse.json({ error: "No allowed vehicle details were found. The source may have changed." }, { status: 404 });

    if (!premium) {
      const { data: updated, error } = await client.from("device_accounts").update({ credits: account.credits - 1, updated_at: new Date().toISOString() })
        .eq("device_id", deviceId).eq("credits", account.credits).select("credits").maybeSingle();
      if (error || !updated) return NextResponse.json({ error: "Credit balance changed; please retry." }, { status: 409 });
    }
    const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(rc))
      .then(buf => Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join(""));
    await client.from("device_lookups").insert({ device_id: deviceId, lookup_type: "vehicle", query_hash: hash });
    return NextResponse.json({ type: "vehicle", rc, developer: DEVELOPER, note: "Demo source may be unavailable or change its page layout. Personal identifiers and residential addresses are intentionally not returned.", data });
  } catch (error) {
    console.error("vehicle lookup error", error?.message);
    return NextResponse.json({ error: "Unable to complete vehicle lookup right now." }, { status: 500 });
  }
}
