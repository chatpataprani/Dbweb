import { NextResponse } from "next/server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const error = (message, status = 502) => NextResponse.json({ error: message }, { status });
function normalizeItems(data) {
 const raw = Array.isArray(data) ? data : (data?.results || data?.main_results || data?.items || data?.videos || data?.data || []);
 return raw.map(x => { const id=x.video_id||x.videoId||x.id||x.youtube_id||""; return {title:x.title||x.name||x.video_title||"Untitled",channel:x.channel||x.artist||x.channel_name||x.uploader||x.author||"YouTube",url:x.url||x.youtube_link||x.link||x.webpage_url||(id?"https://www.youtube.com/watch?v="+id:""),thumbnail:x.thumbnail||x.thumbnail_url||x.thumbnailUrl||x.thumbnails?.high?.url||x.thumbnails?.[0]?.url||"",duration:x.duration||x.duration_seconds||x.duration_string||0,views:x.views||x.view_count||""}; }).filter(x=>x.url);
}
export async function GET(request) {
 const q=new URL(request.url).searchParams.get("q")?.trim(); if(!q)return error("Enter a song, artist, or YouTube URL.",400); if(q.length>180)return error("Search is too long (180 characters maximum).",400);
 try { const r=await fetch("https://api.nubcoders.com/search?"+new URLSearchParams({q,limit:"50"}),{headers:{Accept:"application/json"},cache:"no-store",signal:AbortSignal.timeout(18000)}); const raw=await r.text(); let data; try{data=JSON.parse(raw)}catch{return error("Music search returned an invalid response.")}; if(!r.ok)return error(data?.detail||data?.error||data?.message||"Music search is temporarily unavailable.",r.status); return NextResponse.json({results:normalizeItems(data),query:q}); }
 catch(e){return error(e?.name==="TimeoutError"?"Music search timed out. Try again.":"Music search is temporarily unavailable.");}
}
