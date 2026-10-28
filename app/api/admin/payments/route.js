import {NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";
import {validAdminRequest} from "../../../../lib/admin-auth";
const BUCKET="payment-receipts";
function db(){return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{autoRefreshToken:false,persistSession:false}});}
export async function GET(request){
 if(!validAdminRequest(request))return NextResponse.json({error:"Admin access required."},{status:403});
 const client=db();const {data,error}=await client.from("device_payments").select("*").order("created_at",{ascending:false}).limit(100);
 if(error)return NextResponse.json({error:error.message},{status:500});
 const payments=[];for(const p of data||[]){let url=null;if(p.receipt_path){const s=await client.storage.from(BUCKET).createSignedUrl(p.receipt_path,600,{download:true});url=s.data?.signedUrl||null;}payments.push({...p,receipt_url:url});}
 return NextResponse.json({payments});
}
export async function POST(request){
 if(!validAdminRequest(request))return NextResponse.json({error:"Admin access required."},{status:403});
 try{
  const b=await request.json(),id=Number(b.payment_id),action=b.action;
  if(!Number.isInteger(id)||!["approve","reject"].includes(action))return NextResponse.json({error:"Invalid action."},{status:400});
  const client=db();
  const {data,error}=await client.rpc("review_device_payment",{p_payment_id:id,p_action:action});
  if(error){
   const message=String(error.message||"");
   if(/already reviewed/i.test(message))return NextResponse.json({error:"Payment already reviewed."},{status:409});
   if(/payment not found/i.test(message))return NextResponse.json({error:"Payment not found."},{status:404});
   if(/function .*review_device_payment.* does not exist|could not find the function/i.test(message))return NextResponse.json({error:"Run migration 202610280005_account_wide_entitlements.sql in Supabase first."},{status:503});
   throw error;
  }
  return NextResponse.json({ok:true,status:data?.status||action==="approve"?"approved":"rejected"});
 }catch(e){return NextResponse.json({error:e?.message||"Payment review failed."},{status:500});}
}