import {NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";
import nodemailer from "nodemailer";
const BUCKET="payment-receipts";const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function db(){return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{autoRefreshToken:false,persistSession:false}});}
async function notifyAdmin({client,payment,deviceId,days,amount,receipt}){
 const host=process.env.SMTP_HOST,user=process.env.SMTP_USER,pass=process.env.SMTP_PASS;
 if(!host||!user||!pass)return {sent:false,reason:"smtp_not_configured"};
 const {data:account}=await client.from("device_accounts").select("auth_user_id,display_name,credits,plan,plan_expires_at").eq("device_id",deviceId).maybeSingle();
 let authUser=null,profile=null;
 if(account?.auth_user_id){
  const [{data:userData},{data:profileData}]=await Promise.all([
   client.auth.admin.getUserById(account.auth_user_id),
   client.from("profiles").select("username,avatar_url").eq("id",account.auth_user_id).maybeSingle()
  ]);
  authUser=userData?.user||null;profile=profileData||null;
 }
 const email=authUser?.email||"Not linked";
 const name=authUser?.user_metadata?.full_name||authUser?.user_metadata?.name||account?.display_name||"Not provided";
 const username=profile?.username||authUser?.user_metadata?.username||"Not set";
 const phone=authUser?.phone||"Not provided";
 const to=process.env.ADMIN_EMAIL||"lumenomore@hotmail.com";
 const from=process.env.SMTP_FROM||user;
 const transporter=nodemailer.createTransport({host,port:Number(process.env.SMTP_PORT||587),secure:Number(process.env.SMTP_PORT||587)===465,auth:{user,pass}});
 const when=new Date().toLocaleString("en-IN",{timeZone:"Asia/Kolkata"});
 const subject="Dbweb: New plan payment submitted (#"+payment.id+")";
 const rows=[
  ["Payment ID",payment.id],["Amount","₹"+amount],["Plan",days+" day(s)"],["Status","Pending review"],["Submitted",when],
  ["Account email",email],["Name",name],["Username",username],["Phone",phone],["User ID",account?.auth_user_id||"Guest/device-only"],
  ["Device ID",deviceId],["Current credits",account?.credits??"Unknown"],["Current plan",account?.plan||"free"],["Current premium expiry",account?.plan_expires_at||"None"]
 ];
 const html="<div style=\"font-family:Arial,sans-serif;max-width:640px;margin:auto;color:#171717\"><h2>New Dbweb plan payment</h2><p>A user submitted a plan payment. The customer receipt is attached to this email. You can also review it in the Dbweb admin panel.</p><table cellpadding=\"9\" cellspacing=\"0\" style=\"border-collapse:collapse;width:100%\">"+rows.map(([k,v])=>"<tr><td style=\"border:1px solid #ddd;font-weight:bold;width:38%\">"+String(k)+"</td><td style=\"border:1px solid #ddd;word-break:break-word\">"+String(v??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]))+"</td></tr>").join("")+"</table><p>The receipt is attached to this email and available in Admin → Payments.</p></div>";
 await transporter.sendMail({from:process.env.SMTP_FROM_NAME?{name:process.env.SMTP_FROM_NAME,address:from}:from,to,subject,text:rows.map(([k,v])=>k+": "+v).join("\n")+"\n\nThe customer receipt is attached to this email.",html,attachments:receipt?[{filename:receipt.filename,content:receipt.content,contentType:receipt.contentType}]:[]});
 return {sent:true};
}
export async function POST(request){
 try{
  const id=request.headers.get("x-device-id")||"";if(!UUID.test(id))return NextResponse.json({error:"Device ID is missing. Refresh and try again."},{status:400});
  const bearer=(request.headers.get("authorization")||"").match(/^Bearer\\s+(.+)$/i)?.[1];
  if(!bearer)return NextResponse.json({error:"Please sign in or create an account before buying a plan.",login_required:true},{status:401});
  const client=db();const {data:authData,error:authError}=await client.auth.getUser(bearer);
  if(authError||!authData?.user)return NextResponse.json({error:"Please sign in again before buying a plan.",login_required:true},{status:401});
  const form=await request.formData();const days=Number(form.get("plan_days")),amount=Number(form.get("amount")),file=form.get("receipt");const allowed={1:30,7:100,30:300,365:1500};
  if(!allowed[days]||allowed[days]!==amount)return NextResponse.json({error:"Invalid plan or amount."},{status:400});
  if(!(file instanceof File)||!file.size)return NextResponse.json({error:"Please select a receipt."},{status:400});
  if(file.size>8*1024*1024)return NextResponse.json({error:"Receipt must be 8 MB or smaller."},{status:400});
  if(!["image/jpeg","image/png","image/webp","application/pdf"].includes(file.type))return NextResponse.json({error:"Only JPG, PNG, WEBP or PDF receipts are allowed."},{status:400});
  const {error:initError}=await client.from("device_accounts").upsert({device_id:id,auth_user_id:authData.user.id},{onConflict:"device_id",ignoreDuplicates:true});if(initError)throw initError;
  const {data:payment,error}=await client.from("device_payments").insert({device_id:id,plan_days:days,amount,receipt_name:file.name,status:"pending"}).select("id").single();if(error)throw error;
  const safe=file.name.replace(/[^a-zA-Z0-9._-]/g,"_").slice(-100),path=id+"/"+payment.id+"-"+safe,buffer=Buffer.from(await file.arrayBuffer());
  const {error:bucketError}=await client.storage.createBucket(BUCKET,{public:false});if(bucketError&&!/already exists|duplicate/i.test(bucketError.message||""))throw bucketError;
  const upload=await client.storage.from(BUCKET).upload(path,buffer,{contentType:file.type,upsert:false});
  if(upload.error){await client.from("device_payments").delete().eq("id",payment.id);throw upload.error;}
  const saved=await client.from("device_payments").update({receipt_path:path}).eq("id",payment.id);
  if(saved.error)throw saved.error;
  let emailNotification={sent:false,reason:"not_attempted"};
  try{emailNotification=await notifyAdmin({client,payment,deviceId:id,days,amount,receipt:{filename:safe,content:buffer,contentType:file.type}});}
  catch(mailError){console.error("Dbweb payment notification email failed:",mailError?.message);emailNotification={sent:false,reason:"send_failed"};}
  return NextResponse.json({ok:true,payment_id:payment.id,status:"pending",email_notification:emailNotification.sent?"sent":emailNotification.reason});
 }catch(e){return NextResponse.json({error:e?.message||"Could not submit payment."},{status:500});}
}