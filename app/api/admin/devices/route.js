import {NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";
import {validAdminRequest} from "../../../../lib/admin-auth";
const db=()=>createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{autoRefreshToken:false,persistSession:false}});
export async function GET(request){
 if(!validAdminRequest(request))return NextResponse.json({error:"Admin access required."},{status:403});
 try{
  const client=db();
  let {data:accounts,error}=await client.from("device_accounts").select("device_id,display_name,credits,plan,plan_expires_at,created_at,updated_at,terms_accepted_at,terms_version").order("created_at",{ascending:false}).limit(2000);
  if(error&&String(error.message||"").toLowerCase().includes("display_name"))({data:accounts,error}=await client.from("device_accounts").select("device_id,credits,plan,plan_expires_at,created_at,updated_at,terms_accepted_at,terms_version").order("created_at",{ascending:false}).limit(2000));
  if(error)throw error;
  const ids=(accounts||[]).map(a=>a.device_id);
  let payments=[],lookups=[],acceptances=[];
  if(ids.length){
   const [p,l,t]=await Promise.all([
    client.from("device_payments").select("device_id,status,amount,plan_days,created_at").in("device_id",ids).order("created_at",{ascending:false}).limit(5000),
    client.from("device_lookups").select("device_id,lookup_type,created_at").in("device_id",ids).order("created_at",{ascending:false}).limit(10000),
    client.from("terms_acceptances").select("device_id,terms_version,accepted_at").in("device_id",ids)
   ]);
   if(p.error)throw p.error;if(l.error)throw l.error;if(t.error)throw t.error;
   payments=p.data||[];lookups=l.data||[];acceptances=t.data||[];
  }
  const result=(accounts||[]).map(a=>({...a,terms_accepted:acceptances.some(t=>t.device_id===a.device_id&&t.terms_version==="2026-10-09"),payment_count:payments.filter(p=>p.device_id===a.device_id).length,approved_payments:payments.filter(p=>p.device_id===a.device_id&&p.status==="approved").length,pending_payments:payments.filter(p=>p.device_id===a.device_id&&p.status==="pending").length,last_payment_at:payments.find(p=>p.device_id===a.device_id)?.created_at||null,lookup_count:lookups.filter(l=>l.device_id===a.device_id).length,last_lookup_at:lookups.find(l=>l.device_id===a.device_id)?.created_at||null}));
  return NextResponse.json({devices:result,total:result.length});
 }catch(e){console.error("admin devices failed",e?.message);return NextResponse.json({error:"Could not load device accounts. Run the latest database migrations."},{status:500});}
}
