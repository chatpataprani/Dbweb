import {NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const db=()=>createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{autoRefreshToken:false,persistSession:false}});
export async function POST(request){
 try{
  const deviceId=request.headers.get("x-device-id")||"";
  if(!UUID.test(deviceId))return NextResponse.json({error:"Invalid device ID."},{status:400});
  const body=await request.json(),phone=String(body.phone||"").replace(/\D/g,"");
  if(!/^[0-9]{10,15}$/.test(phone))return NextResponse.json({error:"Enter a valid phone number with 10–15 digits."},{status:400});
  const client=db();
  const {data:account,error}=await client.from("device_accounts").select("plan,plan_expires_at").eq("device_id",deviceId).maybeSingle();
  if(error)throw error;
  if(!account||account.plan!=="30d"||!account.plan_expires_at||new Date(account.plan_expires_at)<=new Date())return NextResponse.json({error:"Number protection requires an active 30-day premium plan."},{status:403});
  const {error:insertError}=await client.from("protected_numbers").upsert({phone_digits:phone,protected_by:"premium_user",device_id:deviceId},{onConflict:"phone_digits",ignoreDuplicates:true});
  if(insertError)throw insertError;
  return NextResponse.json({ok:true,message:"Protection is active. Searches for this number will return “This number is protected.”"});
 }catch(e){console.error("protect-number failed",e?.message);return NextResponse.json({error:"Could not protect this number. Check that the protection migration has been run."},{status:500});}
}
