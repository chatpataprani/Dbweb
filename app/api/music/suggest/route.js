import { NextResponse } from "next/server";
export const runtime="nodejs";export const dynamic="force-dynamic";
export async function GET(request){
 const q=new URL(request.url).searchParams.get("q")?.trim();if(!q||q.length<2)return NextResponse.json({suggestions:[]});if(q.length>120)return NextResponse.json({error:"Search is too long."},{status:400});
 try{const r=await fetch("https://api.nubcoders.com/suggest?"+new URLSearchParams({q}),{headers:{Accept:"application/json"},cache:"no-store",signal:AbortSignal.timeout(10000)});const raw=await r.text();let data;try{data=JSON.parse(raw)}catch{return NextResponse.json({suggestions:[]})};if(!r.ok)return NextResponse.json({suggestions:[]});const values=Array.isArray(data)?data:(data?.suggestions||data?.results||data?.items||data?.data||[]);return NextResponse.json({suggestions:values.map(x=>typeof x==="string"?x:(x?.title||x?.name||x?.query||x?.text||"")).filter(Boolean).slice(0,8)})}catch{return NextResponse.json({suggestions:[]})}
}
