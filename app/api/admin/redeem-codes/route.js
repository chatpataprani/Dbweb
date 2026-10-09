import {NextResponse} from "next/server";
import {randomBytes,createHash} from "node:crypto";
import {createClient} from "@supabase/supabase-js";
import {validAdminRequest} from "../../../../lib/admin-auth";
function db(){return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{autoRefreshToken:false,persistSession:false}});}
export async function GET(request){
 if(!validAdminRequest(request))return NextResponse.json({error:"Admin access required."},{status:403});
 const {data,error}=await db().from("redeem_codes").select("code_preview,credits_grant,premium_days,max_uses,uses_count,expires_at,active,created_at").order("created_at",{ascending:false}).limit(100);
 if(error)return NextResponse.json({error:error.message},{status:500});return NextResponse.json({codes:data||[]});
}
export async function POST(request){
 if(!validAdminRequest(request))return NextResponse.json({error:"Admin access required."},{status:403});
 try{
  const b=await request.json(),credits=Number(b.credits_grant||0),days=Number(b.premium_days||0),maxUses=Number(b.max_uses||1),expiry=b.expires_at?new Date(b.expires_at):null;
  if(!Number.isInteger(credits)||credits<0||credits>100000||!Number.isInteger(days)||days<0||days>3650||(!credits&&!days))return NextResponse.json({error:"Add credits, premium days, or both. Values must be within allowed limits."},{status:400});
  if(!Number.isInteger(maxUses)||maxUses<1||maxUses>10000)return NextResponse.json({error:"Maximum uses must be from 1 to 10000."},{status:400});
  if(expiry&&(!Number.isFinite(expiry.getTime())||expiry<=new Date()))return NextResponse.json({error:"Code expiry must be in the future."},{status:400});
  const code="DBW-"+randomBytes(5).toString("hex").toUpperCase()+"-"+randomBytes(3).toString("hex").toUpperCase(),hash=createHash("sha256").update(code.toLowerCase()).digest("hex");
  const {error}=await db().from("redeem_codes").insert({code_hash:hash,code_preview:code.slice(0,8)+"…",credits_grant:credits,premium_days:days,max_uses:maxUses,expires_at:expiry?.toISOString()||null,created_by:"admin"});
  if(error)throw error;return NextResponse.json({ok:true,code,credits_grant:credits,premium_days:days,max_uses:maxUses});
 }catch(e){return NextResponse.json({error:e?.message||"Could not create redeem code."},{status:500});}
}