import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const BUCKET = "payment-receipts";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ALLOWED_PLANS = new Map([[1, 30], [7, 100], [30, 300]]);

function db() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Database is not configured.");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function POST(request) {
  try {
    const id = request.headers.get("x-device-id") || "";
    if (!UUID.test(id)) {
      return NextResponse.json({ error: "Device ID is missing. Refresh and try again." }, { status: 400 });
    }

    const bearer = (request.headers.get("authorization") || "").match(/^Bearer\s+(.+)$/i)?.[1];
    if (!bearer) {
      return NextResponse.json({ error: "Please sign in or create an account before buying a plan.", login_required: true }, { status: 401 });
    }

    const client = db();
    const { data: authData, error: authError } = await client.auth.getUser(bearer);
    if (authError || !authData?.user) {
      return NextResponse.json({ error: "Please sign in again before buying a plan.", login_required: true }, { status: 401 });
    }

    // Do not create or accept a payment against a device ID supplied by the client
    // unless that device is already linked to the authenticated account.
    const { data: device, error: deviceError } = await client
      .from("device_accounts")
      .select("device_id,auth_user_id")
      .eq("device_id", id)
      .maybeSingle();

    if (deviceError) {
      if (/auth_user_id/i.test(deviceError.message || "")) {
        return NextResponse.json({ error: "Account security update required. Please contact support." }, { status: 503 });
      }
      throw deviceError;
    }
    if (!device || device.auth_user_id !== authData.user.id) {
      return NextResponse.json({ error: "This device is not linked to your signed-in account. Open Dbweb again or switch to the account linked to this device." }, { status: 403 });
    }

    const form = await request.formData();
    const days = Number(form.get("plan_days"));
    const amount = Number(form.get("amount"));
    const file = form.get("receipt");
    if (ALLOWED_PLANS.get(days) !== amount) {
      return NextResponse.json({ error: "Invalid plan or amount. Available plans are 1 day (₹30), 7 days (₹100), and 30 days (₹300)." }, { status: 400 });
    }
    if (!(file instanceof File) || !file.size) {
      return NextResponse.json({ error: "Please select a receipt." }, { status: 400 });
    }
    if (file.size > 8 * 1024 * 1024) {
      return NextResponse.json({ error: "Receipt must be 8 MB or smaller." }, { status: 413 });
    }
    if (!["image/jpeg", "image/png", "image/webp", "application/pdf"].includes(file.type)) {
      return NextResponse.json({ error: "Only JPG, PNG, WEBP or PDF receipts are allowed." }, { status: 415 });
    }

    const { data: payment, error: paymentError } = await client
      .from("device_payments")
      .insert({ device_id: id, plan_days: days, amount, receipt_name: file.name, status: "pending" })
      .select("id")
      .single();
    if (paymentError) throw paymentError;

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-100) || "receipt";
    const path = id + "/" + payment.id + "-" + safeName;
    const buffer = Buffer.from(await file.arrayBuffer());

    const upload = await client.storage.from(BUCKET).upload(path, buffer, {
      contentType: file.type,
      upsert: false,
    });
    if (upload.error) {
      await client.from("device_payments").delete().eq("id", payment.id).eq("device_id", id);
      console.error("payment receipt upload failed", upload.error.message);
      return NextResponse.json({ error: "Could not upload the receipt. Please try again." }, { status: 502 });
    }

    const { error: savedError } = await client
      .from("device_payments")
      .update({ receipt_path: path })
      .eq("id", payment.id)
      .eq("device_id", id);
    if (savedError) {
      await client.storage.from(BUCKET).remove([path]);
      await client.from("device_payments").delete().eq("id", payment.id).eq("device_id", id);
      throw savedError;
    }

    return NextResponse.json({ ok: true, payment_id: payment.id, status: "pending" });
  } catch (error) {
    console.error("payment submission failed", error?.message);
    return NextResponse.json({ error: "Could not submit payment. Please try again." }, { status: 500 });
  }
}
