import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendAdminNewPayment } from "../../../lib/mailer";

const BUCKET = "payment-receipts";

function adminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
}
async function getUser(request) {
  const token = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const auth = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const { data } = await auth.auth.getUser(token);
  return data.user || null;
}
export async function POST(request) {
  try {
    const user = await getUser(request);
    if (!user) return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
    const form = await request.formData();
    const days = Number(form.get("plan_days"));
    const amount = Number(form.get("amount"));
    const file = form.get("receipt");
    const allowed = {1:30,7:100,30:300};
    if (!allowed[days] || allowed[days] !== amount) return NextResponse.json({error:"Invalid plan or amount."},{status:400});
    if (!(file instanceof File) || !file.size) return NextResponse.json({error:"Please select a receipt."},{status:400});
    if (file.size > 8*1024*1024) return NextResponse.json({error:"Receipt must be 8 MB or smaller."},{status:400});
    if (!["image/jpeg","image/png","image/webp","application/pdf"].includes(file.type)) return NextResponse.json({error:"Only JPG, PNG, WEBP or PDF receipts are allowed."},{status:400});
    const db=adminClient();
    const { error: bucketError } = await db.storage.createBucket(BUCKET, { public: false });
    if (bucketError && !/already exists|duplicate/i.test(bucketError.message || "")) throw bucketError;
    const {data:payment,error}=await db.from("payments").insert({user_id:user.id,plan_days:days,amount,receipt_name:file.name,status:"pending"}).select("id").single();
    if(error) throw error;
    const safe=file.name.replace(/[^a-zA-Z0-9._-]/g,"_").slice(-120);
    const path=user.id+"/"+payment.id+"-"+safe;
    const receiptBuffer = Buffer.from(await file.arrayBuffer());
    const up=await db.storage.from(BUCKET).upload(path,receiptBuffer,{contentType:file.type,upsert:false});
    if(up.error){await db.from("payments").delete().eq("id",payment.id);throw up.error;}
    const saved=await db.from("payments").update({receipt_path:path}).eq("id",payment.id).eq("user_id",user.id);
    if(saved.error){await db.storage.from(BUCKET).remove([path]);await db.from("payments").delete().eq("id",payment.id);throw saved.error;}
    try {
      await sendAdminNewPayment({
        paymentId: payment.id,
        email: user.email || "Unknown",
        planDays: days,
        amount,
        receiptName: file.name,
        receiptBuffer,
        receiptType: file.type
      });
    } catch (mailError) {
      console.error("Dbweb admin payment email failed:", mailError);
    }
    return NextResponse.json({ok:true,payment_id:payment.id,status:"pending"});
  } catch(e) { return NextResponse.json({error:e?.message||"Could not submit payment."},{status:500}); }
}
