import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function dedupeData(value){if(Array.isArray(value)){const seen=new Set();return value.map(dedupeData).filter(item=>{const key=JSON.stringify(item);if(seen.has(key))return false;seen.add(key);return true;});}if(value&&typeof value==="object"){return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,dedupeData(v)]));}return value;}
function db(){return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{autoRefreshToken:false,persistSession:false}});}
export async function POST(request){
 try{
  const deviceId=request.headers.get("x-device-id")||"";
  if(!UUID.test(deviceId))return NextResponse.json({error:"Device ID is missing. Refresh the page and try again."},{status:400});
  const client=db();
  const bearer=(request.headers.get("authorization")||"").match(/^Bearer\s+(.+)$/i)?.[1]||"";
  let signedInUser=null;
  if(bearer){const {data:authData,error:authError}=await client.auth.getUser(bearer);if(!authError&&authData?.user)signedInUser=authData.user;}
  const {data:terms,error:termsError}=await client.from("terms_acceptances").select("terms_version").eq("device_id",deviceId).maybeSingle();
  if(termsError)throw termsError;
  if(!terms||terms.terms_version!=="2026-10-09")return NextResponse.json({error:"Accept the Terms and Conditions before using the lookup API.",terms_required:true},{status:428});
  const {type,query}=await request.json();
  if(!["number","aadhar"].includes(type)||typeof query!=="string"||!query.trim())return NextResponse.json({error:"Invalid lookup request."},{status:400});
  let lookupQuery=query.trim();
  if(type==="number"){
   const digits=lookupQuery.replace(/\D/g,"");
   // Normalize Indian mobile numbers: +91 75496 98703 -> 7549698703.
   if(digits.length===12&&digits.startsWith("91"))lookupQuery=digits.slice(2);
   else if(digits.length===10)lookupQuery=digits;
   else if(digits.length>10&&digits.startsWith("91"))lookupQuery=digits.slice(2);
   else lookupQuery=digits;
   if(lookupQuery.length!==10)return NextResponse.json({error:"Enter a valid 10-digit phone number, with or without the +91 country code."},{status:400});
   if(lookupQuery.includes("7546085732"))return NextResponse.json({error:"You are not allowed to search this number."},{status:403});
  }
  const {data:device,error}=await client.from("device_accounts").select("credits,plan,plan_expires_at").eq("device_id",deviceId).single();
  if(error||!device)return NextResponse.json({error:"Device profile not found. Refresh the page and try again."},{status:409});
  if(type==="number"){
   const phoneDigits=lookupQuery.replace(/\D/g,"");
   if(/^[0-9]{10,15}$/.test(phoneDigits)){
    const {data:protectedNumber,error:protectionError}=await client.from("protected_numbers").select("id").eq("phone_digits",phoneDigits).maybeSingle();
    if(protectionError){console.error("protection check failed",protectionError.message);return NextResponse.json({error:"Privacy protection check is temporarily unavailable. Please retry."},{status:503});}
    if(protectedNumber)return NextResponse.json({type,message:"This number is protected.",data:{message:"This number is protected."},protected:true});
   }
  }
  const premiumActive=Boolean(device.plan&&device.plan_expires_at&&new Date(device.plan_expires_at).getTime()>Date.now());
  if(!premiumActive&&device.credits<1)return NextResponse.json({error:"No credits left. Redeem a code or purchase a plan."},{status:402});
  const base=type==="number"?process.env.NUMBER_API_BASE:process.env.AADHAAR_API_BASE;
  if(!base)return NextResponse.json({error:"Lookup API is not configured."},{status:503});
  let response;
  try{response=await fetch(base+encodeURIComponent(lookupQuery),{headers:{accept:"application/json,text/plain,*/*"},cache:"no-store",signal:AbortSignal.timeout(12000)});}
  catch(fetchError){if(fetchError?.name==="TimeoutError"||fetchError?.name==="AbortError")return NextResponse.json({error:"Lookup service timed out. Please try again."},{status:504});throw fetchError;}
  const body=await response.text();let data;try{data=JSON.parse(body)}catch{data=body}data=dedupeData(data);
  if(!response.ok)return NextResponse.json({error:"Upstream lookup failed.",status:response.status},{status:502});
  if(!signedInUser)return NextResponse.json({error:"Search completed. Sign in or create an account to view the results. No search credit was charged.",login_required:true},{status:401});
  if(!premiumActive){
   const {data:updated,error:creditError}=await client.from("device_accounts").update({credits:device.credits-1,updated_at:new Date().toISOString()}).eq("device_id",deviceId).eq("credits",device.credits).select("credits").maybeSingle();
   if(creditError||!updated)return NextResponse.json({error:"Credit balance changed; please retry."},{status:409});
  }
  const queryHash=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(lookupQuery)).then(buf=>Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,"0")).join(""));
  await client.from("device_lookups").insert({device_id:deviceId,lookup_type:type,query_hash:queryHash});
  return NextResponse.json({type,data});
 }catch(e){console.error("lookup error",e?.message);return NextResponse.json({error:"Unable to complete lookup."},{status:500});}
}