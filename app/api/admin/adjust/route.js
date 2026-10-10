import {NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";
import {validAdminRequest} from "../../../../lib/admin-auth";
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const db=()=>createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{autoRefreshToken:false,persistSession:false}});
export async function POST(request){
 if(!validAdminRequest(request))return NextResponse.json({error:"Admin access required."},{status:403});
 try{
  const b=await request.json(),id=String(b.device_id||"").trim(),action=b.action,amount=Number(b.amount||0);
  if(!UUID.test(id))return NextResponse.json({error:"Enter a valid device UUID."},{status:400});
  if(!["remove_credits","revoke_premium"].includes(action))return NextResponse.json({error:"Invalid adjustment."},{status:400});
  const client=db();
  const {data:acct,error}=await client.from("device_accounts").select("credits,plan,plan_expires_at").eq("device_id",id).maybeSingle();
  if(error)throw error;if(!acct)return NextResponse.json({error:"Device account not found."},{status:404});
  const now=new Date().toISOString(),patch={updated_at:now};
  if(action==="remove_credits"){
   if(!Number.isInteger(amount)||amount<1||amount>100000)return NextResponse.json({error:"Enter credits to remove (1–100000)."},{status:400});
   patch.credits=Math.max(0,Number(acct.credits||0)-amount);
  }else{patch.plan="free";patch.plan_expires_at=null;}
  const {error:updateError}=await client.from("device_accounts").update(patch).eq("device_id",id);if(updateError)throw updateError;
  return NextResponse.json({ok:true,message:action==="remove_credits"?`Removed ${amount} credits (balance cannot go below zero).`:"Premium access revoked; account is now on the free plan."});
 }catch(e){console.error("admin access adjustment failed",e?.message);return NextResponse.json({error:"Could not update account access."},{status:500});}
}
