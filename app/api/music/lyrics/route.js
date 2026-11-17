import { NextResponse } from "next/server";
export const runtime="nodejs";export const dynamic="force-dynamic";
export async function GET(request){
 const p=new URL(request.url).searchParams,track=p.get("track")?.trim(),artist=p.get("artist")?.trim();if(!track||!artist)return NextResponse.json({available:false});
 try{const url=new URL("https://lrclib.net/api/get");url.searchParams.set("track_name",track);url.searchParams.set("artist_name",artist);const r=await fetch(url,{headers:{"User-Agent":"DbwebMusic/1.0 (music player)"},cache:"force-cache",next:{revalidate:21600},signal:AbortSignal.timeout(10000)});if(!r.ok)return NextResponse.json({available:false});const d=await r.json();const text=d.syncedLyrics||d.plainLyrics||"";return NextResponse.json({available:!!text,lyrics:text,synced:!!d.syncedLyrics})}catch{return NextResponse.json({available:false})}
}