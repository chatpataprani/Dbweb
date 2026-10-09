import {NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";
import {validAdminRequest} from "../../../../lib/admin-auth";
const db=()=>createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{autoRefreshToken:false,persistSession:false}});
export async function GET(request){
 if(!validAdminRequest(request))return NextResponse.json({error:"Admin access required."},{status:403});
 const {data,error}=await db().from("protected_numbers").select("id,phone_digits,protected_by,created_at").order("created_at",{ascending:false}).limit(500);
 if(error)return NextResponse.json({error:"Could not load protected numbers. Run the protection migration first."},{status:500});
 return NextResponse.json({numbers:data||[]});
}
export async function POST(request){
 if(!validAdminRequest(request))return NextResponse.json({error:"Admin access required."},{status:403});
 try{
  const b=await request.json(),phone=String(b.phone||"").replace(/\D/g,"");
  if(!/^[0-9]{10,15}$/.test(phone))return NextResponse.json({error:"Enter a valid phone number with 10–15 digits."},{status:400});
  const {error}=await db().from("protected_numbers").upsert({phone_digits:phone,protected_by:"admin",device_id:null},{onConflict:"phone_digits"});
  if(error)throw error;
  return NextResponse.json({ok:true,message:"Number protected."});
 }catch(e){return NextResponse.json({error:e?.message||"Could not protect number."},{status:500});}
}
export async function DELETE(request){
 if(!validAdminRequest(request))return NextResponse.json({error:"Admin access required."},{status:403});
 try{
  const b=await request.json(),phone=String(b.phone||"").replace(/\D/g,"");
  const {error}=await db().from("protected_numbers").delete().eq("phone_digits",phone);
  if(error)throw error;
  return NextResponse.json({ok:true,message:"Protection removed."});
 }catch(e){return NextResponse.json({error:"Could not remove protection."},{status:500});}
}
