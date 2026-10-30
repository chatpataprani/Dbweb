import {NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";
import {validAdminRequest} from "../../../../lib/admin-auth";
const BUCKET="payment-receipts";
function db(){return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{autoRefreshToken:false,persistSession:false}});}
export async function GET(request){
 if(!validAdminRequest(request))return NextResponse.json({error:"Admin access required."},{status:403});
 const client=db();const {data,error}=await client.from("device_payments").select("*").order("created_at",{ascending:false}).limit(100);
 if(error)return NextResponse.json({error:error.message},{status:500});
 const deviceIds=[...new Set((data||[]).map(p=>p.device_id).filter(Boolean))];
 const {data:accounts,error:accountError}=deviceIds.length?await client.from("device_accounts").select("device_id,auth_user_id,display_name,credits,plan,plan_expires_at,created_at,updated_at").in("device_id",deviceIds):{data:[],error:null};
 if(accountError)return NextResponse.json({error:accountError.message},{status:500});
 const accountByDevice=new Map((accounts||[]).map(a=>[a.device_id,a]));
 const userIds=[...new Set((accounts||[]).map(a=>a.auth_user_id).filter(Boolean))];
 const [{data:profiles,error:profileError},authResults]=await Promise.all([
  userIds.length?client.from("profiles").select("id,username,avatar_url,credits,plan,plan_expires_at").in("id",userIds):Promise.resolve({data:[],error:null}),
  Promise.all(userIds.map(async id=>{const {data,error}=await client.auth.admin.getUserById(id);return error?null:data?.user||null;}))
 ]);
 if(profileError)return NextResponse.json({error:profileError.message},{status:500});
 const profileById=new Map((profiles||[]).map(p=>[p.id,p]));
 const userById=new Map(authResults.filter(Boolean).map(u=>[u.id,u]));
 const payments=[];for(const p of data||[]){
  let url=null;if(p.receipt_path){const s=await client.storage.from(BUCKET).createSignedUrl(p.receipt_path,600,{download:true});url=s.data?.signedUrl||null;}
  const account=accountByDevice.get(p.device_id)||{},user=account.auth_user_id?userById.get(account.auth_user_id):null,profile=account.auth_user_id?profileById.get(account.auth_user_id):null;
  payments.push({...p,receipt_url:url,user:{id:account.auth_user_id||null,email:user?.email||null,phone:user?.phone||null,full_name:user?.user_metadata?.full_name||user?.user_metadata?.name||account.display_name||null,username:profile?.username||user?.user_metadata?.username||null,avatar_url:profile?.avatar_url||user?.user_metadata?.avatar_url||user?.user_metadata?.picture||null,email_confirmed_at:user?.email_confirmed_at||null,created_at:user?.created_at||null,last_sign_in_at:user?.last_sign_in_at||null},account:{display_name:account.display_name||null,credits:account.credits??null,plan:account.plan||"free",plan_expires_at:account.plan_expires_at||null,created_at:account.created_at||null,updated_at:account.updated_at||null}});}
 return NextResponse.json({payments});
}
export async function POST(request){
 if(!validAdminRequest(request))return NextResponse.json({error:"Admin access required."},{status:403});
 try{
  const b=await request.json(),id=Number(b.payment_id),action=b.action;if(!Number.isInteger(id)||!["approve","reject"].includes(action))return NextResponse.json({error:"Invalid action."},{status:400});
  const client=db();const {data:p,error}=await client.from("device_payments").select("*").eq("id",id).single();if(error)return NextResponse.json({error:"Payment not found."},{status:404});if(p.status!=="pending")return NextResponse.json({error:"Payment already reviewed."},{status:409});
  if(action==="approve"){
   const {data:acct,error:ae}=await client.from("device_accounts").select("*").eq("device_id",p.device_id).single();if(ae)throw ae;
   const expiry=new Date(Math.max(Date.now(),acct.plan_expires_at?new Date(acct.plan_expires_at).getTime():0)+p.plan_days*86400000).toISOString();
   const {error:ue}=await client.from("device_accounts").update({plan:p.plan_days+"d",plan_expires_at:expiry,credits:acct.credits+10,updated_at:new Date().toISOString()}).eq("device_id",p.device_id);if(ue)throw ue;
  }
  const {error:pe}=await client.from("device_payments").update({status:action==="approve"?"approved":"rejected",reviewed_at:new Date().toISOString(),reviewed_by:"admin"}).eq("id",id).eq("status","pending");if(pe)throw pe;
  return NextResponse.json({ok:true});
 }catch(e){return NextResponse.json({error:e?.message||"Payment review failed."},{status:500});}
}