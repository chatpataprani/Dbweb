import {NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";
import {validAdminRequest} from "../../../../lib/admin-auth";
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function db(){return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{autoRefreshToken:false,persistSession:false}});}
function validGrant(credits,days){return Number.isInteger(credits)&&credits>=0&&credits<=100000&&Number.isInteger(days)&&days>=0&&days<=3650&&(credits>0||days>0);}
function expiryAfter(current,days){return new Date(Math.max(Date.now(),current?new Date(current).getTime():0)+days*86400000).toISOString();}
export async function POST(request){
 if(!validAdminRequest(request))return NextResponse.json({error:"Admin access required."},{status:403});
 try{
  const b=await request.json(),identifier=String(b.user_id||b.device_id||b.identifier||"").trim(),email=String(b.email||"").trim().toLowerCase(),username=String(b.username||"").trim().replace(/^@/,"").toLowerCase(),credits=Number(b.credits||0),days=Number(b.premium_days||0);
  if(!validGrant(credits,days))return NextResponse.json({error:"Add credits, premium days, or both within the allowed limits."},{status:400});
  const client=db();
  if(UUID.test(identifier)&&!b.user_id&&!email&&!username){
   const {data:acct,error}=await client.from("device_accounts").select("credits,plan_expires_at").eq("device_id",identifier).maybeSingle();
   if(error)throw error;
   if(!acct)return NextResponse.json({error:"No account found for this device ID. Ask the user to open Dbweb once and copy the ID from Settings."},{status:404});
   const patch={credits:Number(acct.credits||0)+credits,updated_at:new Date().toISOString()};
   if(days>0){patch.plan=days+"d";patch.plan_expires_at=expiryAfter(acct.plan_expires_at,days);}
   const {error:updateError}=await client.from("device_accounts").update(patch).eq("device_id",identifier);if(updateError)throw updateError;
   return NextResponse.json({ok:true,message:[credits?credits+" credits added":"",days?days+" premium day(s) added":""].filter(Boolean).join(" and ")+ "."});
  }
  let userId=String(b.user_id||"").trim();
  if(!UUID.test(userId)){
   if(username){
    const {data:profile,error}=await client.from("profiles").select("id").ilike("username",username).maybeSingle();
    if(error)throw error;if(profile?.id)userId=profile.id;
   }
   if(!userId&&(email||identifier.includes("@"))){
    const target=email||identifier.toLowerCase();
    const {data:result,error}=await client.auth.admin.listUsers({page:1,perPage:1000});
    if(error)throw error;
    userId=(result?.users||[]).find(u=>(u.email||"").toLowerCase()===target)?.id||"";
   }
   if(!userId&&!email&&!username&&identifier&&!UUID.test(identifier)){
    const {data:profile,error}=await client.from("profiles").select("id").ilike("username",identifier.replace(/^@/,"")).maybeSingle();
    if(error)throw error;if(profile?.id)userId=profile.id;
   }
  }
  if(!UUID.test(userId))return NextResponse.json({error:"No registered user found. Check the email or username and try again."},{status:404});
  const {data:authResult,error:authError}=await client.auth.admin.getUserById(userId);
  if(authError||!authResult?.user)return NextResponse.json({error:"Registered user not found."},{status:404});
  const {data:profile,error:profileError}=await client.from("profiles").select("id,credits,plan_expires_at").eq("id",userId).maybeSingle();
  if(profileError)throw profileError;
  const now=new Date().toISOString();
  if(profile){
   const patch={credits:Number(profile.credits||0)+credits};
   if(days>0){patch.plan=days+"d";patch.plan_expires_at=expiryAfter(profile.plan_expires_at,days);}
   const {error}=await client.from("profiles").update(patch).eq("id",userId);if(error)throw error;
  }
  const {data:devices,error:deviceError}=await client.from("device_accounts").select("device_id,credits,plan_expires_at").eq("auth_user_id",userId);
  if(deviceError)throw deviceError;
  for(const device of devices||[]){
   const patch={credits:Number(device.credits||0)+credits,updated_at:now};
   if(days>0){patch.plan=days+"d";patch.plan_expires_at=expiryAfter(device.plan_expires_at,days);}
   const {error}=await client.from("device_accounts").update(patch).eq("device_id",device.device_id);if(error)throw error;
  }
  return NextResponse.json({ok:true,message:[credits?credits+" credits added":"",days?days+" premium day(s) added":""].filter(Boolean).join(" and ")+` for ${authResult.user.email||userId}; updated ${devices?.length||0} linked device(s).`});
 }catch(e){console.error("admin grant failed",e?.message);return NextResponse.json({error:e?.message||"Could not grant access."},{status:500});}
}