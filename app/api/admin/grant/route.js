import {NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";
import {validAdminRequest} from "../../../../lib/admin-auth";
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function db(){return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{autoRefreshToken:false,persistSession:false}});}
export async function POST(request){
 if(!validAdminRequest(request))return NextResponse.json({error:"Admin access required."},{status:403});
 try{
  const b=await request.json(),id=String(b.device_id||"").trim(),credits=Number(b.credits||0),days=Number(b.premium_days||0);
  if(!UUID.test(id))return NextResponse.json({error:"Enter a valid device UUID."},{status:400});
  if(!Number.isInteger(credits)||credits<0||credits>100000||!Number.isInteger(days)||days<0||days>3650||(!credits&&!days))return NextResponse.json({error:"Add credits, premium days, or both within the allowed limits."},{status:400});
  const client=db();
  const {data:acct,error}=await client.from("device_accounts").select("credits,plan_expires_at").eq("device_id",id).maybeSingle();
  if(error)throw error;
  if(!acct)return NextResponse.json({error:"No account found for this device ID. Ask the user to open Dbweb once and copy the ID from Settings."},{status:404});
  const patch={credits:acct.credits+credits,updated_at:new Date().toISOString()};
  if(days>0){const expiry=Math.max(Date.now(),acct.plan_expires_at?new Date(acct.plan_expires_at).getTime():0)+days*86400000;patch.plan=days+"d";patch.plan_expires_at=new Date(expiry).toISOString();}
  const {error:updateError}=await client.from("device_accounts").update(patch).eq("device_id",id);if(updateError)throw updateError;
  return NextResponse.json({ok:true,message:[credits?credits+" credits added":"",days?days+" premium day(s) added":""] .filter(Boolean).join(" and ")+ "."});
 }catch(e){return NextResponse.json({error:e?.message||"Could not grant access."},{status:500});}
}