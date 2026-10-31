import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const USERNAME=/^@?[A-Za-z][A-Za-z0-9_]{3,31}$/;
const ACCOUNT_ID=/^\d{5,15}$/;

function db(){
 return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{autoRefreshToken:false,persistSession:false}});
}
async function readJson(response){
 const text=await response.text();
 try{return JSON.parse(text);}catch{return {raw:text};}
}
function hasLookupData(value){
 if(!value||typeof value!=="object"||Array.isArray(value))return false;
 const status=String(value.status||"").toLowerCase();
 if(["not_found","not found","error","failed"].includes(status))return false;
 return Object.entries(value).some(([key,item])=>key!=="status"&&key!=="developer"&&key!=="lookup_ms"&&item!==null&&item!==undefined&&String(item).trim()!=="");
}
export async function POST(request){
 try{
  const deviceId=request.headers.get("x-device-id")||"";
  if(!UUID.test(deviceId))return NextResponse.json({error:"Device ID is missing. Refresh the page and try again."},{status:400});
  const client=db();
  const bearer=(request.headers.get("authorization")||"").match(/^Bearer\s+(.+)$/i)?.[1]||"";
  let signedInUser=null;
  if(bearer){const {data,error}=await client.auth.getUser(bearer);if(!error&&data?.user)signedInUser=data.user;}
  const {data:terms,error:termsError}=await client.from("terms_acceptances").select("terms_version").eq("device_id",deviceId).maybeSingle();
  if(termsError)throw termsError;
  if(!terms||terms.terms_version!=="2026-10-09")return NextResponse.json({error:"Accept the Terms and Conditions before using the lookup API.",terms_required:true},{status:428});
  const body=await request.json();
  const query=typeof body.query==="string"?body.query.trim():"";
  if(!query||query.length>100)return NextResponse.json({error:"Enter a Telegram username or account ID."},{status:400});
  const clean=query.replace(/^@/,"");
  if(!ACCOUNT_ID.test(clean)&&!USERNAME.test(query))return NextResponse.json({error:"Enter a valid Telegram username or numeric account ID."},{status:400});
  const {data:device,error:deviceError}=await client.from("device_accounts").select("credits,plan,plan_expires_at").eq("device_id",deviceId).single();
  if(deviceError||!device)return NextResponse.json({error:"Device profile not found. Refresh the page and try again."},{status:409});
  const premiumActive=Boolean(device.plan&&device.plan_expires_at&&new Date(device.plan_expires_at).getTime()>Date.now());
  if(!premiumActive&&device.credits<1)return NextResponse.json({error:"No credits left. Redeem a code or purchase a plan."},{status:402});

  let firstData=null,firstError=null,accountId=ACCOUNT_ID.test(clean)?clean:null;
  try{
   const firstUrl="https://telegramdb-wine.vercel.app/telegram?id="+encodeURIComponent(clean);
   const response=await fetch(firstUrl,{headers:{accept:"application/json"},cache:"no-store",signal:AbortSignal.timeout(10000)});
   firstData=await readJson(response);
   if(!response.ok)firstError="Telegram database is temporarily unavailable.";
   if(firstData?.account_id&&ACCOUNT_ID.test(String(firstData.account_id)))accountId=String(firstData.account_id);
   if(response.ok&&hasLookupData(firstData)){
    if(!signedInUser)return NextResponse.json({error:"Search completed. Sign in or create an account to view the results. No search credit was charged.",login_required:true},{status:401});
    return await finish(firstData,accountId,client,device,deviceId,premiumActive,query);
   }
  }catch(error){firstError=error?.name==="TimeoutError"?"Primary Telegram source timed out.": "Primary Telegram source is unavailable.";}

  if(accountId){
   try{
    const secondUrl="https://india-db-indexer.vercel.app/search?account_id="+encodeURIComponent(accountId);
    const response=await fetch(secondUrl,{headers:{accept:"application/json"},cache:"no-store",signal:AbortSignal.timeout(10000)});
    const secondData=await readJson(response);
    if(response.ok&&hasLookupData(secondData)){
     if(!signedInUser)return NextResponse.json({error:"Search completed. Sign in or create an account to view the results. No search credit was charged.",login_required:true},{status:401});
     return await finish(secondData,accountId,client,device,deviceId,premiumActive,query);
    }
   }catch{}
  }
  return NextResponse.json({error:"Telegram lookup is currently in beta. We don't have enough data for this username or account ID yet. We're continuously improving our dataset."},{status:404});
 }catch(error){
  console.error("telegram lookup error",error?.message);
  return NextResponse.json({error:"Unable to complete Telegram lookup. Please try again."},{status:500});
 }
}
async function finish(data,accountId,client,device,deviceId,premiumActive,query){
 if(!premiumActive){
  const {data:updated,error}=await client.from("device_accounts").update({credits:device.credits-1,updated_at:new Date().toISOString()}).eq("device_id",deviceId).eq("credits",device.credits).select("credits").maybeSingle();
  if(error||!updated)return NextResponse.json({error:"Credit balance changed; please retry."},{status:409});
 }
 const queryHash=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(query)).then(buf=>Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,"0")).join(""));
 await client.from("device_lookups").insert({device_id:deviceId,lookup_type:"telegram",query_hash:queryHash});
 return NextResponse.json({type:"telegram",data:{...data,...(accountId?{account_id:accountId}:{})},note:"Telegram lookup is in beta. Results may be incomplete."});
}
