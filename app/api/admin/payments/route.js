import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendUserPaymentResult } from "../../../lib/mailer";
const BUCKET="payment-receipts";
const ADMIN=(process.env.ADMIN_EMAIL||"lumenomore@hotmail.com").toLowerCase();
function db(){return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{autoRefreshToken:false,persistSession:false}});}
async function adminUser(request){
  const token=(request.headers.get("authorization")||"").replace(/^Bearer\s+/i,""); if(!token)return null;
  const auth=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const {data}=await auth.auth.getUser(token); const u=data.user;
  return u&&(u.email||"").toLowerCase()===ADMIN?u:null;
}
export async function GET(request){
  if(!await adminUser(request))return NextResponse.json({error:"Admin access required."},{status:403});
  const client=db(); const {data,error}=await client.from("payments").select("id,user_id,plan_days,amount,receipt_name,receipt_path,status,created_at,reviewed_at,reviewed_by,profiles(email)").order("created_at",{ascending:false});
  if(error)return NextResponse.json({error:error.message},{status:500});
  const payments=[];
  for(const p of data||[]){let url=null;if(p.receipt_path){const s=await client.storage.from(BUCKET).createSignedUrl(p.receipt_path,600,{download:true});url=s.data?.signedUrl||null;}payments.push({...p,receipt_url:url});}
  return NextResponse.json({payments});
}
export async function POST(request){
  const u=await adminUser(request);if(!u)return NextResponse.json({error:"Admin access required."},{status:403});
  const body=await request.json();const id=Number(body.payment_id);const action=body.action;
  if(!Number.isInteger(id)||!["approve","reject"].includes(action))return NextResponse.json({error:"Invalid admin action."},{status:400});
  const client=db();
  const payment=await client.from("payments").select("id,user_id,plan_days,amount,status,profiles(email)").eq("id",id).single();
  if(payment.error)return NextResponse.json({error:payment.error.message},{status:404});
  if(payment.data.status!=="pending")return NextResponse.json({error:"Payment is already reviewed."},{status:409});
  const userEmail=payment.data.profiles?.email;
  if(action==="approve"){
    const r=await client.rpc("approve_payment",{p_payment_id:id,p_admin_email:u.email});
    if(r.error)return NextResponse.json({error:r.error.message},{status:400});
  } else {
    const r=await client.from("payments").update({status:"rejected",reviewed_at:new Date().toISOString(),reviewed_by:u.email}).eq("id",id).eq("status","pending");
    if(r.error)return NextResponse.json({error:r.error.message},{status:500});
  }
  if(userEmail){
    try {
      await sendUserPaymentResult({
        email:userEmail,
        paymentId:id,
        status:action==="approve" ? "approved" : "rejected",
        planDays:payment.data.plan_days,
        amount:payment.data.amount
      });
    } catch(mailError) {
      console.error("Dbweb user payment email failed:", mailError);
    }
  }
  return NextResponse.json({ok:true});
}
