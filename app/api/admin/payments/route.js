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
  const nextStatus=action==="approve"?"approved":"rejected";
  const {error:pe}=await client.from("device_payments").update({status:nextStatus,reviewed_at:new Date().toISOString(),reviewed_by:"admin"}).eq("id",id).eq("status","pending");if(pe)throw pe;
  try{
   const {data:account}=await client.from("device_accounts").select("auth_user_id").eq("device_id",p.device_id).maybeSingle();
   if(account?.auth_user_id){
    const {data:userData}=await client.auth.admin.getUserById(account.auth_user_id);
    const email=userData?.user?.email,host=process.env.SMTP_HOST,smtpUser=process.env.SMTP_USER,smtpPass=process.env.SMTP_PASS;
    if(email&&host&&smtpUser&&smtpPass){
     const nodemailer=(await import("nodemailer")).default;
     const from=process.env.SMTP_FROM||smtpUser;
     const transporter=nodemailer.createTransport({host,port:Number(process.env.SMTP_PORT||587),secure:Number(process.env.SMTP_PORT||587)===465,auth:{user:smtpUser,pass:smtpPass}});
     const approved=nextStatus==="approved";
     const amount="₹"+Number(p.amount||0).toLocaleString("en-IN");
     const orderId=String(p.order_id||p.id);
     const date=new Date(p.reviewed_at||p.created_at||Date.now()).toLocaleString("en-IN",{timeZone:"Asia/Kolkata"});
     const method=p.method||p.payment_method||"Manual payment";
     const subject=approved?"Payment approved: "+amount+" for order "+orderId:"Dbweb payment update — payment not approved";
     const body=approved?"Good news, your payment was approved. Your Dbweb premium access is now active.":"Your Dbweb payment was not approved. If you believe this was a mistake, please contact the developer.";
     const escapeHtml=value=>String(value??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
     const html=approved?"<table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" bgcolor=\"#121212\" style=\"background:#121212;\"><tr><td align=\"center\" style=\"padding:40px 20px;\"><div style=\"font-family:Roboto,-apple-system,Segoe UI,Arial,sans-serif;max-width:480px;margin:0 auto;color:#ffffff;text-align:left;\"><h1 style=\"text-align:center;font-size:28px;font-weight:700;margin:0 0 28px;color:#ffffff;\">Payment approved</h1><p style=\"margin:0 0 16px;font-size:16px;line-height:1.5;color:#ffffff;\">Hi "+escapeHtml(email)+",</p><p style=\"margin:0 0 24px;font-size:16px;line-height:1.5;color:#ffffff;\">Good news, your payment was approved. Your Dbweb premium access is now active. Here are the details:</p><div style=\"background:#1f2123;border-radius:12px;padding:20px 18px;margin:0 0 28px;\"><p style=\"margin:0 0 4px;text-align:center;font-size:14px;color:#8a9ba8;\">Amount paid</p><p style=\"margin:0 0 18px;text-align:center;font-size:32px;font-weight:700;color:#ffffff;\">"+escapeHtml(amount)+"</p><table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" style=\"font-size:15px;\"><tr><td style=\"padding:8px 0;color:#8a9ba8;border-top:1px solid #2a2c2e;\">Order ID</td><td align=\"right\" style=\"padding:8px 0;color:#ffffff;border-top:1px solid #2a2c2e;\">"+escapeHtml(orderId)+"</td></tr><tr><td style=\"padding:8px 0;color:#8a9ba8;border-top:1px solid #2a2c2e;\">Date</td><td align=\"right\" style=\"padding:8px 0;color:#ffffff;border-top:1px solid #2a2c2e;\">"+escapeHtml(date)+"</td></tr><tr><td style=\"padding:8px 0;color:#8a9ba8;border-top:1px solid #2a2c2e;\">Method</td><td align=\"right\" style=\"padding:8px 0;color:#ffffff;border-top:1px solid #2a2c2e;\">"+escapeHtml(method)+"</td></tr><tr><td style=\"padding:8px 0;color:#8a9ba8;border-top:1px solid #2a2c2e;\">Status</td><td align=\"right\" style=\"padding:8px 0;color:#34d399;font-weight:700;border-top:1px solid #2a2c2e;\">Approved</td></tr></table></div><p style=\"margin:0 0 32px;text-align:center;\"><a href=\"https://webdd.freeddns.org\" style=\"display:block;background:#0064e0;color:#ffffff;text-decoration:none;padding:16px 20px;border-radius:999px;font-weight:700;font-size:17px;text-align:center;\">Go to Dbweb</a></p><hr style=\"border:none;border-top:1px solid #2a2c2e;margin:0 0 20px;\"><p style=\"margin:0;text-align:center;font-size:14px;line-height:1.5;color:#8a9ba8;\">Questions about this payment? Contact the developer at <a href=\"mailto:lumenomore@hotmail.com\" style=\"color:#4da3ff;text-decoration:none;\">lumenomore@hotmail.com</a></p></div></td></tr></table>":"<div style=\"font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#ffffff;background:#121212;padding:28px;line-height:1.6\"><h2>Payment not approved</h2><p>"+escapeHtml(body)+"</p><p>Order ID: "+escapeHtml(orderId)+"</p><p><a href=\"mailto:lumenomore@hotmail.com\" style=\"color:#4da3ff\">contact the developer</a></p></div>";
     await transporter.sendMail({from:process.env.SMTP_FROM_NAME?{name:process.env.SMTP_FROM_NAME,address:from}:from,to:email,subject,text:body+"\\n\\nOrder ID: "+orderId+"\\nAmount: "+amount+"\\nContact the developer: mailto:lumenomore@hotmail.com",html});
    }
   }
  }catch(mailError){console.error("Dbweb payment decision email failed:",mailError?.message);}
  return NextResponse.json({ok:true,email_notification:"attempted"});
 }catch(e){return NextResponse.json({error:e?.message||"Payment review failed."},{status:500});}
}