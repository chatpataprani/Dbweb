import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const jsonError = (message, status = 502) => NextResponse.json({ error: message }, { status });

function ytMusicItems(data) {
  const out = [];
  const walk = (v) => {
    if (!v || typeof v !== "object") return;
    if (v.musicResponsiveListItemRenderer) {
      const r = v.musicResponsiveListItemRenderer;
      const cols = r.flexColumns || [];
      const title = cols[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.map(x=>x.text).join("") || "";
      const subtitles = cols.slice(1).map(c=>c.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.map(x=>x.text).join("")).filter(Boolean);
      const id = r.playlistItemData?.videoId || r.navigationEndpoint?.watchEndpoint?.videoId;
      if (id && title) out.push({ title, channel: subtitles.join(" • ") || "YouTube Music", url:"https://www.youtube.com/watch?v="+id, thumbnail:r.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails?.slice(-1)[0]?.url || "https://img.youtube.com/vi/"+id+"/hqdefault.jpg", duration: subtitles.find(s=>/^\d+:\d+/.test(s)) || 0 });
    }
    for (const x of Object.values(v)) if (Array.isArray(x)) x.forEach(walk); else if (x && typeof x==="object") walk(x);
  };
  walk(data);
  return out;
}

async function fallbackYouTubeMusic(q, signal) {
  const response = await fetch("https://music.youtube.com/youtubei/v1/search?prettyPrint=false", {
    method:"POST", signal, cache:"no-store",
    headers:{"Content-Type":"application/json","Origin":"https://music.youtube.com","Referer":"https://music.youtube.com/","User-Agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131 Safari/537.36"},
    body:JSON.stringify({query:q,context:{client:{clientName:"WEB_REMIX",clientVersion:"1.202411оя.01.00",hl:"en",gl:"IN"}}})
  });
  if(!response.ok) throw new Error("YouTube Music fallback HTTP "+response.status);
  return ytMusicItems(await response.json());
}

export async function GET(request) {
  const q = new URL(request.url).searchParams.get("q")?.trim();
  if (!q) return jsonError("Enter a song, artist, or YouTube URL.",400);
  if (q.length>180) return jsonError("Search is too long (180 characters maximum).",400);
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),18000);
  let nubFailure="NuB unavailable";
  try {
    const token=process.env.NUB_YT_API_KEY;
    try {
      const res=await fetch("https://api.nubcoders.com/search?"+new URLSearchParams({q,limit:"10"}),{headers:{...(token?{Authorization:"Bearer "+token}:{}),Accept:"application/json"},cache:"no-store",signal:controller.signal});
      const data=await res.json();
      if(res.ok) {
        const raw=Array.isArray(data)?data:(data.results||data.main_results||data.items||data.videos||[]);
        const results=raw.map(x=>({title:x.title||x.name||x.video_title||"Untitled",channel:x.channel||x.artist||x.channel_name||x.uploader||"YouTube",url:x.url||x.youtube_link||x.link||(x.video_id?"https://www.youtube.com/watch?v="+x.video_id:""),thumbnail:x.thumbnail||x.thumbnails?.[0]?.url||x.thumbnails?.high?.url||x.thumbnail_url||x.thumbnailUrl||"",duration:x.duration||x.duration_seconds||0,views:x.views||""})).filter(x=>x.url);
        if(results.length) return NextResponse.json({results,query:q,source:"NuB"});
      } else nubFailure="NuB HTTP "+res.status;
    } catch(e){ nubFailure=e?.message||"NuB network failure"; }
    const results=await fallbackYouTubeMusic(q,controller.signal);
    if(results.length) return NextResponse.json({results:results.slice(0,15),query:q,source:"YouTube Music fallback",warning:nubFailure});
    return NextResponse.json({results:[],query:q,source:"YouTube Music fallback",warning:nubFailure});
  } catch(e) {
    console.error("[music/search] both providers failed",nubFailure,e?.message);
    return jsonError("Music search providers are unreachable right now. NuB: "+String(nubFailure).slice(0,100)+"; YouTube Music: "+String(e?.message||"failed").slice(0,100),502);
  } finally {clearTimeout(timeout);}
}
