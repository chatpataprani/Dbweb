import {NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function db(){return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{autoRefreshToken:false,persistSession:false}});}
async function identity(request){
 const deviceId=request.headers.get("x-device-id")||"";
 const token=(request.headers.get("authorization")||"").match(/^Bearer\s+(.+)$/i)?.[1];
 if(!UUID.test(deviceId)||!token)return {error:"Sign in required.",status:401};
 const client=db(),{data,error}=await client.auth.getUser(token);
 if(error||!data?.user)return {error:"Please sign in again.",status:401};
 const {data:account,error:accountError}=await client.from("device_accounts").select("auth_user_id").eq("device_id",deviceId).maybeSingle();
 if(accountError||!account||account.auth_user_id!==data.user.id)return {error:"This device is not linked to this account.",status:403};
 return {client,deviceId};
}
export async function GET(request){
 const who=await identity(request);if(who.error)return NextResponse.json({error:who.error},{status:who.status});
 const {data,error}=await who.client.from("device_payments").select("id,status,plan_days,amount,reviewed_at").eq("device_id",who.deviceId).in("status",["approved","rejected"]).is("user_notified_at",null).order("reviewed_at",{ascending:true}).limit(1);
 if(error)return NextResponse.json({error:error.message},{status:500});
 return NextResponse.json({notice:data?.[0]||null});
}
export async function POST(request){
 const who=await identity(request);if(who.error)return NextResponse.json({error:who.error},{status:who.status});
 const body=await request.json().catch(()=>({})),id=Number(body.payment_id);
 if(!Number.isInteger(id))return NextResponse.json({error:"Invalid payment."},{status:400});
 const {error}=await who.client.from("device_payments").update({user_notified_at:new Date().toISOString()}).eq("id",id).eq("device_id",who.deviceId).in("status",["approved","rejected"]).is("user_notified_at",null);
 if(error)return NextResponse.json({error:error.message},{status:500});
 return NextResponse.json({ok:true});
}
