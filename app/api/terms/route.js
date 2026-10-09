import {NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";
const VERSION="2026-10-09";
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const db=()=>createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{autoRefreshToken:false,persistSession:false}});
export async function GET(request){
 const id=request.headers.get("x-device-id")||"";
 if(!UUID.test(id))return NextResponse.json({accepted:false,version:VERSION});
 try{const {data,error}=await db().from("terms_acceptances").select("terms_version,accepted_at").eq("device_id",id).maybeSingle();if(error)throw error;return NextResponse.json({accepted:data?.terms_version===VERSION,version:VERSION,accepted_at:data?.accepted_at||null});}
 catch(e){console.error("terms check failed",e?.message);return NextResponse.json({error:"Could not verify terms acceptance."},{status:503});}
}
export async function POST(request){
 const id=request.headers.get("x-device-id")||"";
 if(!UUID.test(id))return NextResponse.json({error:"Invalid device ID."},{status:400});
 const body=await request.json().catch(()=>({}));
 if(body.accept!==true||body.version!==VERSION)return NextResponse.json({error:"You must explicitly accept the current Terms and Conditions."},{status:400});
 try{const {error}=await db().from("terms_acceptances").upsert({device_id:id,terms_version:VERSION,accepted_at:new Date().toISOString()},{onConflict:"device_id"});if(error)throw error;return NextResponse.json({ok:true,accepted:true,version:VERSION});}
 catch(e){console.error("terms acceptance failed",e?.message);return NextResponse.json({error:"Could not save your acceptance. Please try again."},{status:503});}
}
