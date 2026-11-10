import { NextResponse } from "next/server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const fail=(message,status=502)=>NextResponse.json({error:message},{status});
export async function GET(request){
 const p=new URL(request.url).searchParams,q=p.get("q")?.trim(),mode=p.get("mode")==="video"?"video":"audio";
 if(!q)return fail("Missing YouTube URL.",400);
 const token=process.env.NUB_YT_API_KEY;if(!token)return fail("Music API is not configured (NUB_YT_API_KEY).",503);
 try{
  // NuB's redirect endpoint is the media delivery route. Its resolver/proxy
  // serves actual bytes and supports range requests; /stream itself returns JSON.
  const target=new URL("https://api.nubcoders.com/stream/redirect");
  target.search=new URLSearchParams({q,mode,token}).toString();
  const r=await fetch(target,{headers:{Authorization:"Bearer "+token},redirect:"manual",cache:"no-store",signal:AbortSignal.timeout(45000)});
  const location=r.headers.get("location");
  if(r.status>=300&&r.status<400&&location){
    // Redirect directly to NuB's media proxy. Never expose a JSON response as a file.
    return NextResponse.redirect(location,307);
  }
  const raw=await r.text();let msg=raw;try{const j=JSON.parse(raw);msg=j.error||j.detail||j.message||raw}catch{}
  return fail("NuB media redirect failed (HTTP "+r.status+"): "+String(msg).slice(0,400),502);
 }catch(e){return fail((e?.name==="TimeoutError"?"NuB stream timed out. ":"Stream request failed: ")+(e?.message||"unknown error"))}
}
