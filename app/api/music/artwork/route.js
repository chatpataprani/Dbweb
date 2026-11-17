import { NextResponse } from "next/server";
export const runtime="nodejs";export const dynamic="force-dynamic";
export async function GET(request){
 const q=new URL(request.url).searchParams.get("q")?.trim();if(!q)return NextResponse.json({artwork:null});
 try{const r=await fetch("https://itunes.apple.com/search?"+new URLSearchParams({term:q,entity:"song",limit:"1"}),{cache:"force-cache",next:{revalidate:86400},signal:AbortSignal.timeout(9000)});if(!r.ok)return NextResponse.json({artwork:null});const d=await r.json();const item=d.results?.[0];const image=item?.artworkUrl100?.replace(/100x100bb\./,"600x600bb.")||null;return NextResponse.json({artwork:image},{headers:{"Cache-Control":"public, s-maxage=86400, stale-while-revalidate=604800"}})}catch{return NextResponse.json({artwork:null})}
}