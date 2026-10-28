import {NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";
import {validAdminRequest} from "../../../../lib/admin-auth";

function db(){
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!key)throw new Error("Database is not configured.");
  return createClient(url,key,{auth:{autoRefreshToken:false,persistSession:false}});
}

export async function GET(request){
  if(!validAdminRequest(request))return NextResponse.json({error:"Admin access required."},{status:403});
  try{
    const client=db();
    const {data:authResult,error:authError}=await client.auth.admin.listUsers({page:1,perPage:1000});
    if(authError)throw authError;
    const authUsers=authResult?.users||[];
    const ids=authUsers.map(u=>u.id);
    let profiles=[],devices=[],rewards=[],payments=[],lookups=[];
    if(ids.length){
      const [profileResult,deviceResult,rewardResult]=await Promise.all([
        client.from("profiles").select("*").in("id",ids),
        client.from("device_accounts").select("device_id,auth_user_id,display_name,credits,plan,plan_expires_at,created_at,updated_at").in("auth_user_id",ids).limit(5000),
        client.from("referral_reward_events").select("*").in("referrer_user_id",ids).order("created_at",{ascending:false}).limit(10000)
      ]);
      if(profileResult.error)throw profileResult.error;
      if(deviceResult.error)throw deviceResult.error;
      if(rewardResult.error)throw rewardResult.error;
      profiles=profileResult.data||[];
      devices=deviceResult.data||[];
      rewards=rewardResult.data||[];
    }
    const deviceIds=devices.map(d=>d.device_id);
    if(deviceIds.length){
      const [paymentResult,lookupResult]=await Promise.all([
        client.from("device_payments").select("id,device_id,status,amount,plan_days,created_at,reviewed_at").in("device_id",deviceIds).order("created_at",{ascending:false}).limit(10000),
        client.from("device_lookups").select("device_id,lookup_type,query_hash,created_at").in("device_id",deviceIds).order("created_at",{ascending:false}).limit(20000)
      ]);
      if(paymentResult.error)throw paymentResult.error;
      if(lookupResult.error)throw lookupResult.error;
      payments=paymentResult.data||[];
      lookups=lookupResult.data||[];
    }
    const profileById=new Map(profiles.map(p=>[p.id,p]));
    const verifiedIds=new Set(authUsers.filter(u=>u.email_confirmed_at).map(u=>u.id));
    const devicesByUser=new Map();
    const rewardsByUser=new Map();
    for(const reward of rewards){const list=rewardsByUser.get(reward.referrer_user_id)||[];list.push(reward);rewardsByUser.set(reward.referrer_user_id,list);}
    for(const d of devices){
      const list=devicesByUser.get(d.auth_user_id)||[];
      list.push(d);devicesByUser.set(d.auth_user_id,list);
    }
    const users=authUsers.map(u=>{
      const p=profileById.get(u.id)||{};
      const linked=devicesByUser.get(u.id)||[];
      return {
        id:u.id,email:u.email||null,email_confirmed_at:u.email_confirmed_at||null,
        phone:u.phone||null,created_at:u.created_at||null,updated_at:u.updated_at||null,
        last_sign_in_at:u.last_sign_in_at||null,last_sign_in_ip:u.last_sign_in_ip||null,
        banned_until:u.banned_until||null,providers:u.app_metadata?.providers||[],
        user_metadata:{full_name:u.user_metadata?.full_name||u.user_metadata?.name||"",username:u.user_metadata?.username||p.username||"",avatar_url:u.user_metadata?.avatar_url||p.avatar_url||""},
        profile:{username:p.username||"",avatar_url:p.avatar_url||"",referral_code:p.referral_code||"",referred_by:p.referred_by||null,credits:p.credits??0,plan:p.plan||"free",plan_expires_at:p.plan_expires_at||null},
        referral_count:profiles.filter(x=>x.referred_by===u.id&&verifiedIds.has(x.id)).length,
        linked_devices:linked.map(d=>({device_id:d.device_id,display_name:d.display_name||"",credits:d.credits,plan:d.plan||"free",plan_expires_at:d.plan_expires_at||null,created_at:d.created_at||null,updated_at:d.updated_at||null,payments:payments.filter(p=>p.device_id===d.device_id),lookups:lookups.filter(l=>l.device_id===d.device_id)})),
        linked_device_count:linked.length,
        referral_rewards:rewardsByUser.get(u.id)||[],
        total_device_credits:linked.reduce((sum,d)=>sum+Number(d.credits||0),0)
      };
    });
    users.sort((a,b)=>new Date(b.created_at||0)-new Date(a.created_at||0));
    return NextResponse.json({users,total:users.length,limit:1000});
  }catch(e){
    console.error("admin users failed",e?.message);
    return NextResponse.json({error:"Could not load user details. Ensure migrations 001–003 are applied and auth_user_id exists."},{status:500});
  }
}
