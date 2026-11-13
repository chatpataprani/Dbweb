import {NextResponse} from "next/server";
export const dynamic="force-dynamic";
export async function GET(){
 return NextResponse.json({
  updated_at:new Date().toISOString(),
  services:[
   {id:"number",name:"Phone number lookup",status:"unavailable",reason:"Upstream database is disabled or offline."},
   {id:"aadhar",name:"Aadhaar lookup",status:"unavailable",reason:"Lookup service temporarily paused."},
   {id:"telegram",name:"Telegram lookup",status:"operational",reason:null}
  ]
 });
}