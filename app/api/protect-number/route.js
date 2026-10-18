import {NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const db=()=>createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{autoRefreshToken:false,persistSession:false}});
async function getProtectedCount(client,deviceId){
 const {count,error}=await client.from("protected_numbers").select("id",{count:"exact",head:true}).eq("device_id",deviceId);
 if(error)throw error;
 return count||0;
}
export async function POST(request){
 try{
  const deviceId=request.headers.get("x-device-id")||"";
  if(!UUID.test(deviceId))return NextResponse.json({error:"Invalid device ID."},{status:400});
  const body=await request.json(),phone=String(body.phone||"").replace(/\D/g,"");
  if(!/^[0-9]{10,15}$/.test(phone))return NextResponse.json({error:"Enter a valid phone number with 10–15 digits."},{status:400});
  const client=db();
  const {data:account,error}=await client.from("device_accounts").select("plan,plan_expires_at").eq("device_id",deviceId).maybeSingle();
  if(error)throw error;
  if(!account||!["30d","365d"].includes(account.plan)||!account.plan_expires_at||new Date(account.plan_expires_at)<=new Date())return NextResponse.json({error:"Number protection requires an active 30-day or 1-year premium plan."},{status:403});
  const isYearly=account.plan==="365d";
  const limit=isYearly?null:3;
  const {data:existing,error:existingError}=await client.from("protected_numbers").select("id,device_id").eq("phone_digits",phone).maybeSingle();
  if(existingError)throw existingError;
  if(existing){
   if(existing.device_id===deviceId)return NextResponse.json({ok:true,message:"This number is already protected by your account.",used:await getProtectedCount(client,deviceId),limit});
   return NextResponse.json({error:"This number is already protected."},{status:409});
  }
  const used=await getProtectedCount(client,deviceId);
  if(limit!==null&&used>=limit)return NextResponse.json({error:"Your 30-day plan allows up to 3 protected phone numbers. Remove one from protection or upgrade to the 1-year plan for unlimited protection."},{status:403});
  const {error:insertError}=await client.from("protected_numbers").insert({phone_digits:phone,protected_by:"premium_user",device_id:deviceId});
  if(insertError)throw insertError;
  const updatedUsed=used+1;
  return NextResponse.json({ok:true,used:updatedUsed,limit,message:isYearly?`Protection is active. You have protected ${updatedUsed} number${updatedUsed===1?"":"s"}; your yearly plan includes unlimited protection.`:`Protection is active (${updatedUsed} of 3 numbers). Searches for this number will return “This number is protected.”`});
 }catch(e){console.error("protect-number failed",e?.message);return NextResponse.json({error:"Could not protect this number. Check that the protection migration has been run."},{status:500});}
}
