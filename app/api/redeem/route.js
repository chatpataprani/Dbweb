import {NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";
import {createHash} from "node:crypto";
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export async function POST(request){
 try{
  const id=request.headers.get("x-device-id")||"";if(!UUID.test(id))return NextResponse.json({error:"Invalid device ID."},{status:400});
  const {code}=await request.json();if(typeof code!=="string"||code.trim().length<6||code.trim().length>100)return NextResponse.json({error:"Enter a valid redeem code."},{status:400});
  const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{autoRefreshToken:false,persistSession:false}});
  const {error:initError}=await db.from("device_accounts").upsert({device_id:id},{onConflict:"device_id",ignoreDuplicates:true});if(initError)throw initError;
  const codeHash=createHash("sha256").update(code.trim().toLowerCase()).digest("hex");
  const {data,error}=await db.rpc("redeem_device_code",{p_device_id:id,p_code:codeHash});
  if(error){
   console.error("Redeem RPC failed:",error.message);
   const message=error.message.toLowerCase();
   return NextResponse.json({error:message.includes("already redeemed")?"This device has already redeemed this code.":message.includes("expired")?"This code is expired.":message.includes("usage limit")?"This code has reached its usage limit.":message.includes("invalid")?"That redeem code is invalid or inactive.":"Could not redeem this code."},{status:400});
  }
  return NextResponse.json({ok:true,message:data?.message||"Code redeemed successfully."});
 }catch(e){console.error("Redeem API failed:",e);return NextResponse.json({error:"Redeem service is temporarily unavailable. Please try again."},{status:500});}
}