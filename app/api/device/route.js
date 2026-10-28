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
  let authUser=null;
  const authorization=request.headers.get("authorization")||"";
  const token=authorization.match(/^Bearer\s+(.+)$/i)?.[1];
  if(token){
   const {data,error}=await db.auth.getUser(token);
   if(error||!data?.user)return NextResponse.json({error:"Your sign-in session expired. Please sign in again."},{status:401});
   authUser=data.user;
  }
  const {data:terms,error:termsError}=await db.from("terms_acceptances").select("terms_version").eq("device_id",id).maybeSingle();
  if(termsError)throw termsError;
  if(!terms||terms.terms_version!=="2026-10-09")return NextResponse.json({error:"Please accept the Terms and Conditions before using Dbweb.",terms_required:true},{status:428});
  const {error:upsertError}=await db.from("device_accounts").upsert({device_id:id},{onConflict:"device_id",ignoreDuplicates:true});
  if(upsertError)throw upsertError;
  const {error:termsStampError}=await db.from("device_accounts").update({terms_accepted_at:new Date().toISOString(),terms_version:"2026-10-09"}).eq("device_id",id);
  if(termsStampError)throw termsStampError;
  if(authUser){
   // A device can be linked to one account only. Never silently transfer premium
   // or credits from a device already associated with a different user.
   const linked=await db.from("device_accounts").select("auth_user_id").eq("device_id",id).maybeSingle();
   if(!linked.error){
    if(linked.data?.auth_user_id && linked.data.auth_user_id!==authUser.id){
     return NextResponse.json({error:"This device is already linked to another Dbweb account."},{status:409});
    }
    if(!linked.data?.auth_user_id){
     const {error:linkError}=await db.from("device_accounts").update({auth_user_id:authUser.id}).eq("device_id",id).is("auth_user_id",null);
     if(linkError)throw linkError;
    }
   } else if(!/auth_user_id/i.test(linked.error.message||"")) throw linked.error;
  }
  let {data,error}=await db.from("device_accounts").select("device_id,display_name,credits,plan,plan_expires_at,created_at,updated_at,terms_accepted_at,terms_version").eq("device_id",id).single();
  if(error&&String(error.message||"").toLowerCase().includes("display_name"))({data,error}=await db.from("device_accounts").select("device_id,credits,plan,plan_expires_at,created_at,updated_at,terms_accepted_at,terms_version").eq("device_id",id).single());
  if(error)throw error;
  return NextResponse.json({account:data});
 }catch(e){console.error("device initialization failed",e?.message);return NextResponse.json({error:"Could not initialize device account. Check the database schema and server environment variables."},{status:500});}
}
