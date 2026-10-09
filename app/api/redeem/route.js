import {NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export async function POST(request){
 try{
  const id=request.headers.get("x-device-id")||"";if(!UUID.test(id))return NextResponse.json({error:"Invalid device ID."},{status:400});
  const {code}=await request.json();if(typeof code!=="string"||code.trim().length<6||code.trim().length>100)return NextResponse.json({error:"Enter a valid redeem code."},{status:400});
  const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{autoRefreshToken:false,persistSession:false}});
  const {error:initError}=await db.from("device_accounts").upsert({device_id:id},{onConflict:"device_id",ignoreDuplicates:true});if(initError)throw initError;
  const {data,error}=await db.rpc("redeem_device_code",{p_device_id:id,p_code:code.trim()});
  if(error)return NextResponse.json({error:error.message.includes("already redeemed")?"This device has already redeemed this code.":error.message.includes("expired")?"This code is expired.":error.message.includes("usage limit")?"This code has reached its usage limit.":error.message.includes("invalid")?"That redeem code is invalid or inactive.":"Could not redeem this code."},{status:400});
  return NextResponse.json({ok:true,message:data?.message||"Code redeemed successfully."});
 }catch(e){return NextResponse.json({error:e?.message||"Could not redeem code."},{status:500});}
}