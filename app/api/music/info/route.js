import { NextResponse } from "next/server";
export const runtime="nodejs"; export const dynamic="force-dynamic";
export async function GET(request){
 const q=new URL(request.url).searchParams.get("q")?.trim(); if(!q)return NextResponse.json({error:"Missing media URL or search query."},{status:400});
 const token=process.env.NUB_YT_API_KEY; if(!token)return NextResponse.json({error:"Music service is temporarily unavailable."},{status:503});
 try{const r=await fetch("https://api.nubcoders.com/info?"+new URLSearchParams({q}),{headers:{Authorization:"Bearer "+token,Accept:"application/json"},cache:"no-store",signal:AbortSignal.timeout(45000)});const raw=await r.text();let data;try{data=JSON.parse(raw)}catch{return NextResponse.json({error:"Could not resolve this track."},{status:502})};if(!r.ok||data?.error||data?.detail)return NextResponse.json({error:data?.detail||data?.error||data?.message||"Could not resolve this track."},{status:r.ok?502:r.status});return NextResponse.json({ ok: true })}
 catch(e){return NextResponse.json({error:e?.name==="TimeoutError"?"Track details timed out. Try another track.":"Could not connect to the music service."},{status:502})}
}
