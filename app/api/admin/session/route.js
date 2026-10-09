import {NextResponse} from "next/server";
import {timingSafeEqual} from "node:crypto";
import {validAdminRequest,adminLoginResponse,adminLogoutResponse} from "../../../../lib/admin-auth";
export async function GET(request){return NextResponse.json({authenticated:validAdminRequest(request)});}
export async function POST(request){
 const {password}=await request.json().catch(()=>({})),expected=process.env.ADMIN_PANEL_PASSWORD||"";
 let ok=false;if(typeof password==="string"&&expected){const a=Buffer.from(password),b=Buffer.from(expected);if(a.length===b.length){try{ok=timingSafeEqual(a,b)}catch{}}}
 return adminLoginResponse(ok);
}
export async function DELETE(){return adminLogoutResponse();}
