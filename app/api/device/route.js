import {NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export async function POST(request){
 try{
  const id=request.headers.get("x-device-id")||"";
  if(!UUID.test(id))return NextResponse.json({error:"Invalid device ID. Refresh and try again."},{status:400});
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!key)return NextResponse.json({error:"Database is not configured on the server."},{status:503});
  const db=createClient(url,key,{auth:{autoRefreshToken:false,persistSession:false}});
  const {error:upsertError}=await db.from("device_accounts").upsert({device_id:id},{onConflict:"device_id",ignoreDuplicates:true});
  if(upsertError)throw upsertError;
  const {data,error}=await db.from("device_accounts").select("device_id,credits,plan,plan_expires_at,created_at").eq("device_id",id).single();
  if(error)throw error;
  return NextResponse.json({account:data});
 }catch(e){console.error("device initialization failed",e?.message);return NextResponse.json({error:"Could not initialize device account. Check the database schema and server environment variables."},{status:500});}
}
