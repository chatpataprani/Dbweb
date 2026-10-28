import {NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";

function db(){
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!key)throw new Error("Database is not configured on the server.");
  return createClient(url,key,{auth:{autoRefreshToken:false,persistSession:false}});
}

export async function GET(request){
  try{
    const token=(request.headers.get("authorization")||"").match(/^Bearer\s+(.+)$/i)?.[1];
    if(!token)return NextResponse.json({error:"Sign in to view your account."},{status:401});
    const client=db();
    const {data:authData,error:authError}=await client.auth.getUser(token);
    if(authError||!authData?.user)return NextResponse.json({error:"Your sign-in session expired. Please sign in again."},{status:401});
    const {data:devices,error:devicesError}=await client.from("device_accounts")
      .select("device_id,display_name,credits,plan,plan_expires_at,created_at,updated_at")
      .eq("auth_user_id",authData.user.id)
      .order("created_at",{ascending:false})
      .limit(100);
    if(devicesError){
      if(/auth_user_id/i.test(devicesError.message||""))return NextResponse.json({error:"Run the latest Dbweb Supabase migration to enable account linking."},{status:503});
      throw devicesError;
    }
    const ids=(devices||[]).map(d=>d.device_id);
    let payments=[];
    if(ids.length){
      const {data,error}=await client.from("device_payments")
        .select("id,device_id,plan_days,amount,status,created_at,reviewed_at")
        .in("device_id",ids)
        .order("created_at",{ascending:false})
        .limit(100);
      if(error)throw error;
      payments=data||[];
    }
    const now=Date.now();
    const activeDevices=(devices||[]).filter(d=>d.plan_expires_at&&new Date(d.plan_expires_at).getTime()>now&&d.plan&&d.plan!=="free");
    return NextResponse.json({
      user:{id:authData.user.id,email:authData.user.email,email_verified:Boolean(authData.user.email_confirmed_at),created_at:authData.user.created_at},
      devices:devices||[],
      payments,
      summary:{
        linked_devices:(devices||[]).length,
        total_credits:(devices||[]).reduce((sum,d)=>sum+Number(d.credits||0),0),
        active_premium_devices:activeDevices.length,
        premium_expires_at:activeDevices.map(d=>d.plan_expires_at).sort((a,b)=>new Date(b)-new Date(a))[0]||null
      }
    });
  }catch(error){
    console.error("account overview failed",error?.message);
    return NextResponse.json({error:"Could not load account information. Please try again."},{status:500});
  }
}
