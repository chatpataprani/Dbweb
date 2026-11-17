import { NextResponse } from "next/server";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const fail=(message,status=502)=>NextResponse.json({error:message},{status});
const pickStream=(payload)=>{
 const data=payload?.data||payload?.result||payload?.stream_data||payload;
 return data?.stream_url||data?.streamUrl||data?.audio_url||data?.audioUrl||data?.download_url||data?.downloadUrl||data?.redirect_url||data?.redirectUrl||data?.stream||data?.url||null;
};
export async function GET(request){
 const p=new URL(request.url).searchParams;
 const q=p.get("q")?.trim(),mode=p.get("mode")==="video"?"video":"audio",quality=p.get("quality")?.trim(),download=p.get("download")==="1";
 const filename=(p.get("filename")||"dbweb-"+mode).replace(/[^a-z0-9 _-]/gi,"").trim().slice(0,90)||"dbweb-"+mode;
 if(!q)return fail("Missing media URL.",400);
 const token=process.env.NUB_YT_API_KEY;
 if(!token)return fail("Music service is temporarily unavailable.",503);
 try{
  const url=new URL("https://api.nubcoders.com/stream");
  url.searchParams.set("q",q);url.searchParams.set("mode",mode);if(quality)url.searchParams.set("quality",quality);
  const range=request.headers.get("range");
  const headers={Authorization:"Bearer "+token,Accept:"*/*"};
  if(range)headers.Range=range;
  let upstream=await fetch(url,{headers,cache:"no-store",redirect:"follow",signal:AbortSignal.timeout(90000)});
  let mime=(upstream.headers.get("content-type")||"").toLowerCase();
  // Some stream providers return a JSON envelope instead of redirecting directly.
  for(let attempt=0;attempt<2&&mime.includes("json");attempt++){
   const payload=await upstream.json().catch(()=>null);
   const resolved=pickStream(payload);
   if(!upstream.ok||!resolved){
    const detail=payload?.detail||payload?.error||payload?.message||payload?.msg;
    console.error("[Dbweb Music] Stream resolver returned no media URL",upstream.status,detail||"empty response");
    return fail(detail||"The selected track has no playable audio stream.",upstream.ok?502:upstream.status);
   }
   let target;
   try{target=new URL(resolved,url).toString()}catch{return fail("The music service returned an invalid stream URL.",502)}
   upstream=await fetch(target,{headers:{Accept:"*/*",...(range?{Range:range}:{})},cache:"no-store",redirect:"follow",signal:AbortSignal.timeout(90000)});
   mime=(upstream.headers.get("content-type")||"").toLowerCase();
  }
  if(mime.includes("json"))return fail("The music service did not return playable audio.",502);
  if(!upstream.ok&&upstream.status!==206){
   console.error("[Dbweb Music] Stream upstream HTTP error",upstream.status,mime);
   return fail("This track is temporarily unavailable. Try another result.",upstream.status>=400&&upstream.status<600?upstream.status:502);
  }
  const out=new Headers();
  for(const key of ["content-length","content-range","accept-ranges","etag","last-modified"]){const value=upstream.headers.get(key);if(value)out.set(key,value)}
  mime=(mime.split(";")[0]||"").trim();
  out.set("Content-Type",mime||(mode==="audio"?"audio/mpeg":"video/mp4"));
  out.set("Cache-Control","no-store");
  if(download){
   const ext=mime.includes("mpeg")?"mp3":mime.includes("mp4")?"m4a":mime.includes("webm")?"webm":mode==="video"?"mp4":"audio";
   out.set("Content-Disposition",'attachment; filename="'+filename+"."+ext+'"');
  }
  return new Response(upstream.body,{status:upstream.status,headers:out});
 }catch(e){
  console.error("[Dbweb Music] Stream request failed",e?.name,e?.message);
  return fail(e?.name==="TimeoutError"||e?.name==="AbortError"?"Playback took too long. Try again.":"Playback is temporarily unavailable.");
 }
}
