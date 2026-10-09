import {NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";
const BUCKET="payment-receipts";const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function db(){return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{autoRefreshToken:false,persistSession:false}});}
export async function POST(request){
 try{
  const id=request.headers.get("x-device-id")||"";if(!UUID.test(id))return NextResponse.json({error:"Device ID is missing. Refresh and try again."},{status:400});
  const form=await request.formData();const days=Number(form.get("plan_days")),amount=Number(form.get("amount")),file=form.get("receipt");const allowed={1:30,7:100,30:300};
  if(!allowed[days]||allowed[days]!==amount)return NextResponse.json({error:"Invalid plan or amount."},{status:400});
  if(!(file instanceof File)||!file.size)return NextResponse.json({error:"Please select a receipt."},{status:400});
  if(file.size>8*1024*1024)return NextResponse.json({error:"Receipt must be 8 MB or smaller."},{status:400});
  if(!["image/jpeg","image/png","image/webp","application/pdf"].includes(file.type))return NextResponse.json({error:"Only JPG, PNG, WEBP or PDF receipts are allowed."},{status:400});
  const client=db();const {error:initError}=await client.from("device_accounts").upsert({device_id:id},{onConflict:"device_id",ignoreDuplicates:true});if(initError)throw initError;
  const {data:payment,error}=await client.from("device_payments").insert({device_id:id,plan_days:days,amount,receipt_name:file.name,status:"pending"}).select("id").single();if(error)throw error;
  const safe=file.name.replace(/[^a-zA-Z0-9._-]/g,"_").slice(-100),path=id+"/"+payment.id+"-"+safe,buffer=Buffer.from(await file.arrayBuffer());
  const {error:bucketError}=await client.storage.createBucket(BUCKET,{public:false});if(bucketError&&!/already exists|duplicate/i.test(bucketError.message||""))throw bucketError;
  const upload=await client.storage.from(BUCKET).upload(path,buffer,{contentType:file.type,upsert:false});
  if(upload.error){await client.from("device_payments").delete().eq("id",payment.id);throw upload.error;}
  const saved=await client.from("device_payments").update({receipt_path:path}).eq("id",payment.id);
  if(saved.error)throw saved.error;
  return NextResponse.json({ok:true,payment_id:payment.id,status:"pending"});
 }catch(e){return NextResponse.json({error:e?.message||"Could not submit payment."},{status:500});}
}