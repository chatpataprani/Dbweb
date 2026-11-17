import { NextResponse } from "next/server";
export const runtime="nodejs"; export const dynamic="force-dynamic";
const fail=(message,status=502)=>NextResponse.json({error:message},{status});
export async function GET(request){
 const p=new URL(request.url).searchParams,q=p.get("q")?.trim(),mode=p.get("mode")==="video"?"video":"audio",quality=p.get("quality")?.trim(),download=p.get("download")==="1";
 if(!q)return fail("Missing media URL.",400);const token=process.env.NUB_YT_API_KEY;if(!token)return fail("Music service is temporarily unavailable.",503);
 try{
  const url=new URL("https://api.nubcoders.com/stream");url.searchParams.set("q",q);url.searchParams.set("mode",mode);if(quality)url.searchParams.set("quality",quality);
  const range=request.headers.get("range"),headers={Authorization:"Bearer "+token,Accept:"*/*"};if(range)headers.Range=range;
  let upstream=await fetch(url,{headers,cache:"no-store",redirect:"follow",signal:AbortSignal.timeout(90000)});
  if((upstream.headers.get("content-type")||"").toLowerCase().includes("json")){
   const payload=await upstream.json().catch(()=>null),resolved=payload?.stream_url||payload?.redirect_url||payload?.streamUrl||payload?.stream;
   if(!upstream.ok||!resolved)return fail("This track could not be streamed.",upstream.ok?502:upstream.status);
   upstream=await fetch(resolved,{headers:{Accept:"*/*",...(range?{Range:range}:{})},cache:"no-store",redirect:"follow",signal:AbortSignal.timeout(90000)});
  }
  if(!upstream.ok&&upstream.status!==206)return fail("This track is temporarily unavailable.",upstream.status>=400&&upstream.status<600?upstream.status:502);
  const mime=(upstream.headers.get("content-type")||"").split(";")[0].toLowerCase(),out=new Headers();for(const key of ["content-length","content-range","accept-ranges","etag","last-modified"]){const value=upstream.headers.get(key);if(value)out.set(key,value)}
  out.set("Content-Type",mime||(mode==="audio"?"audio/mpeg":"video/mp4"));out.set("Cache-Control","no-store");
  if(download){const ext=mime.includes("mpeg")?"mp3":mime.includes("mp4")?"m4a":mime.includes("webm")?"webm":mode==="video"?"mp4":"audio";out.set("Content-Disposition",'attachment; filename="dbweb-'+mode+'.'+ext+'"')}
  return new Response(upstream.body,{status:upstream.status,headers:out});
 }catch(e){return fail(e?.name==="TimeoutError"||e?.name==="AbortError"?"Playback took too long. Try again.":"Playback is temporarily unavailable.")}
}
