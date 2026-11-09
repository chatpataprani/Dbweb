'use client';

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, Download, Link2, LoaderCircle, ShieldCheck, Video, AlertCircle, ExternalLink, Instagram, Youtube, Facebook, Music2, Clipboard, X } from "lucide-react";

const platforms = [{name:"Instagram",Icon:Instagram},{name:"YouTube",Icon:Youtube},{name:"TikTok",Icon:Music2},{name:"Facebook",Icon:Facebook},{name:"X / Twitter",Icon:Link2},{name:"Pinterest",Icon:Link2},{name:"Reddit",Icon:Link2}];

function getPlatform(url){const host=(()=>{try{return new URL(url).hostname.toLowerCase().replace("www.","")}catch{return ""}})();if(host.includes("youtube")||host==="youtu.be")return {name:"YouTube",Icon:Youtube,color:"yt"};if(host.includes("instagram"))return {name:"Instagram",Icon:Instagram,color:"ig"};if(host.includes("pinterest")||host==="pin.it")return {name:"Pinterest",Icon:Link2,color:"pin"};if(host.includes("tiktok"))return {name:"TikTok",Icon:Music2,color:"tt"};if(host.includes("facebook")||host==="fb.watch")return {name:"Facebook",Icon:Facebook,color:"fb"};if(host.includes("twitter")||host.includes("x.com"))return {name:"X / Twitter",Icon:Link2,color:"x"};if(host.includes("reddit"))return {name:"Reddit",Icon:Link2,color:"rd"};return {name:"Media",Icon:Video,color:"generic"};}

function PlatformIcon({url}){const Icon=getPlatform(url).Icon;return <Icon size={20}/>;}\n\nfunction DbwebVideoPlayer({src,poster}) {
  const videoRef=useRef(null);
  useEffect(()=>{
    let player; let cancelled=false;
    const loadPlayer=()=>{
      if(!document.querySelector('link[data-videojs-css]')){
        const css=document.createElement("link");css.rel="stylesheet";css.href="https://vjs.zencdn.net/8.23.4/video-js.css";css.dataset.videojsCss="1";document.head.appendChild(css);
      }
      const init=()=>{
        if(cancelled||!videoRef.current||!window.videojs)return;
        player=window.videojs(videoRef.current,{controls:true,fluid:true,responsive:true,preload:"metadata",playsinline:true,playbackRates:[0.5,0.75,1,1.25,1.5,2],controlBar:{pictureInPictureToggle:true}});
        player.src({src,type:"video/mp4"});
      };
      if(window.videojs)init();
      else if(window.__dbwebVideoJsLoading)window.__dbwebVideoJsLoading.then(init);
      else{
        window.__dbwebVideoJsLoading=new Promise((resolve,reject)=>{
          const script=document.createElement("script");script.src="https://vjs.zencdn.net/8.23.4/video.min.js";script.onload=resolve;script.onerror=reject;document.head.appendChild(script);
        });
        window.__dbwebVideoJsLoading.then(init).catch(()=>{});
      }
    };
    loadPlayer();
    return()=>{cancelled=true;if(player&&!player.isDisposed())player.dispose();};
  },[src]);
  return <video ref={videoRef} className="video-js vjs-theme-city vjs-big-play-centered sdPlayer" controls playsInline preload="metadata" poster={poster||undefined}><source src={src} type="video/mp4"/></video>;
}

export default function SocialDownloaderPage() {
  const [url,setUrl]=useState(""); const [busy,setBusy]=useState(false); const [result,setResult]=useState(null); const [error,setError]=useState("");
  async function pasteLink(){try{const value=await navigator.clipboard.readText();if(value){setUrl(value.trim());setError("");}}catch{setError("Clipboard access unavailable. Paste the link manually.");}}
  async function submit(e){e.preventDefault();setBusy(true);setError("");setResult(null);try{const response=await fetch("/api/social-download",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({url:url.trim()})});const data=await response.json();if(!response.ok)throw new Error(data.error||"Could not process this link.");setResult(data);}catch(err){setError(err.message||"Something went wrong. Try another public link.");}finally{setBusy(false);}}
  return <main className="igPage sdPage">
    <Link href="/tools" className="igBack"><ArrowLeft size={16}/> All tools</Link>
    <section className="igHero sdHero"><span className="igBadge"><Download size={15}/> DBWEB TOOL</span><h1>Social Media Downloader</h1><p>Download public videos and media from your favorite platforms with one link.</p>
      <form className="igSearch sdSearch" onSubmit={submit}><span className="igAt"><Link2 size={18}/></span><input value={url} onChange={e=>{setUrl(e.target.value);setError("");}} placeholder="Paste a video or post URL" aria-label="Media URL" type="url" required/><button type="button" className="sdPaste" onClick={()=>url.trim()?setUrl(""):pasteLink()} title={url.trim()?"Clear link":"Paste from clipboard"} aria-label={url.trim()?"Clear link":"Paste from clipboard"}>{url.trim()?<X size={17}/>:<><Clipboard size={16}/><span>Paste</span></>}</button><button className="primary sdSubmit" disabled={busy||!url.trim()}>{busy?<LoaderCircle className="sdSpin" size={17}/>:<Download size={17}/>} {busy?"Processing…":"Download"}</button></form>
      {error&&<div className="error sdError" role="alert"><AlertCircle size={17}/>{error}</div>}
    </section>
    {busy&&<section className="card sdLoading" role="status" aria-live="polite"><div className="sdLoaderWrap"><div className="sdSquareLoader" aria-hidden="true">{Array.from({length:8},(_,i)=><span className="sdLoaderSquare" key={i}/>)}</div><strong>Preparing your media</strong><p>Finding the best available quality…</p></div><div className="sdSkeleton sdSkVideo"/><div className="sdSkeleton sdSkLine"/><div className="sdSkeleton sdSkLine short"/><div className="sdLoadBottom"><span className="sdLoadDot"/> Connecting to source</div></section>}
    {result&&<section className="card sdResult"><div className="sdResultTop"><span className="sdReady"><ShieldCheck size={17}/> MEDIA READY</span><span className="sdCount">{(result.links||[]).length} option(s)</span></div>{result.title&&<div className="sdPostHeader"><div className={`sdPostAvatar sdAvatar-${getPlatform(url).color}`}><PlatformIcon url={url}/></div><div className="sdPostMeta"><strong>{getPlatform(url).name} preview</strong><span>{result.title}</span></div><span className="sdPostTag">PUBLIC</span></div>}{(result.links||[]).map((item,i)=><div className="sdMediaBlock" key={i}>{item.type==="image"?<img className="sdThumb" src={item.url} alt={result.title||"Post image"}/>:item.type==="audio"?<audio className="sdPlayer" controls preload="metadata" src={item.url}>Your browser does not support audio playback.</audio>:<DbwebVideoPlayer src={item.url} poster={result.thumbnail}/>}<a className="sdDownloadItem" href={`/api/social-download/file?url=${encodeURIComponent(item.url)}`} download><span className="sdDownloadIcon"><Download size={18}/></span><span className="sdDownloadText"><strong>{item.label||(item.type==="audio"?"Audio download":item.type==="image"?"Image download":"Download file")}</strong><small>{item.type==="audio"?"Audio file":item.type==="image"?"Image file":"Video / media file"} · Save to device</small></span><span className="sdDownloadCTA">DOWNLOAD <Download size={15}/></span></a></div>) }<p className="sdFootnote">Downloads are provided by the source service. Available formats and quality depend on the original post.</p></section>}{!result&&!busy&&<section className="card sdEmpty"><div className="sdEmptyIcon"><Video size={25}/></div><h2>Ready when you are</h2><p>Paste a public media link above and tap Download. Your available files will appear here.</p></section>}
    <section className="sdPlatforms"><span className="sdPlatformsLabel">SUPPORTED SOURCES</span><div>{platforms.map(({name,Icon})=><span className="sdPlatform" key={name}><Icon size={15}/>{name}</span>)}</div></section>
    <div className="sdNotice"><ShieldCheck size={17}/><p>Only download content you own or have permission to save. Private, login-gated, DRM-protected, or restricted media is not supported.</p></div>
    <style jsx>{`
      .sdPage{max-width:850px;margin:0 auto;padding-bottom:60px}.sdHero{margin-bottom:25px}.sdHero h1{letter-spacing:-.035em}
      .sdSearch{max-width:760px;display:flex;align-items:center;gap:7px;padding:7px;border-radius:16px;flex-wrap:wrap}.sdSearch .igAt{width:38px;flex:0 0 38px}.sdSearch input{min-width:0}
      .sdPaste{height:42px;display:flex;align-items:center;gap:6px;padding:0 11px;border:1px solid var(--border,#e5e7eb);border-radius:10px;background:var(--card,transparent);color:var(--foreground,inherit);cursor:pointer;font-size:13px}
      .sdSubmit{height:44px;white-space:nowrap;display:flex;align-items:center;justify-content:center;gap:7px;border-radius:10px;padding:0 18px;font-weight:650;width:100%;flex:0 0 100%;margin-top:3px}
      .sdPaste{width:42px;justify-content:center;padding:0;flex-shrink:0}
      .sdPaste span{display:inline}
      .sdError{display:flex;align-items:center;justify-content:center;gap:8px}
      .sdLoading,.sdEmpty,.sdResult{max-width:700px;margin:22px auto;padding:clamp(18px,4vw,26px);border-radius:20px}
      .sdResult{overflow:hidden;border:1px solid var(--border,rgba(127,127,127,.18));box-shadow:0 12px 35px rgba(0,0,0,.04)}
      .sdPostHeader{display:flex;align-items:center;gap:11px;margin:18px 0 14px;padding:12px 0;border-bottom:1px solid var(--border,rgba(127,127,127,.12))}
      .sdPostAvatar{width:42px;height:42px;display:grid;place-items:center;border-radius:50%;color:#fff;background:linear-gradient(135deg,#f97316,#db2777,#7c3aed);box-shadow:0 0 0 3px rgba(219,39,119,.12)}
      .sdAvatar-yt{background:#dc2626!important;box-shadow:0 0 0 3px rgba(220,38,38,.12)!important}.sdAvatar-pin{background:#bd081c!important;box-shadow:0 0 0 3px rgba(189,8,28,.12)!important}.sdAvatar-fb{background:#1877f2!important}.sdAvatar-tt{background:#111!important}.sdAvatar-ig{background:linear-gradient(135deg,#f97316,#db2777,#7c3aed)!important}.sdPostMeta{display:grid;gap:4px;flex:1;min-width:0}.sdPostMeta strong{font-size:13px}.sdPostMeta span{font-size:12px;color:var(--muted-foreground,#64748b);overflow-wrap:anywhere;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
      .sdPostTag{font-size:10px;font-weight:750;letter-spacing:.08em;padding:6px 9px;border-radius:20px;background:rgba(34,197,94,.1);color:#16a34a}
      .sdLoading{text-align:center}.sdLoaderWrap{display:flex;flex-direction:column;align-items:center;margin-bottom:22px}.sdLoaderWrap strong{font-size:16px;margin-top:17px}.sdLoaderWrap p{margin:6px 0 0;font-size:13px;color:var(--muted-foreground,#64748b)}.sdSquareLoader{position:relative;width:96px;height:96px;transform:rotate(45deg);margin:8px auto 0}.sdLoaderSquare{position:absolute;top:0;left:0;width:28px;height:28px;margin:2px;border-radius:2px;background:#818cf8;background-size:cover;background-position:center;animation:sdSquareAnimation 10s ease-in-out infinite both}.sdLoaderSquare:nth-of-type(1){animation-delay:0s}.sdLoaderSquare:nth-of-type(2){animation-delay:-1.4285714286s}.sdLoaderSquare:nth-of-type(3){animation-delay:-2.8571428571s}.sdLoaderSquare:nth-of-type(4){animation-delay:-4.2857142857s}.sdLoaderSquare:nth-of-type(5){animation-delay:-5.7142857143s}.sdLoaderSquare:nth-of-type(6){animation-delay:-7.1428571429s}.sdLoaderSquare:nth-of-type(7){animation-delay:-8.5714285714s}.sdLoaderSquare:nth-of-type(8){animation-delay:-10s}.sdSkeleton{position:relative;overflow:hidden;background:rgba(127,127,127,.10);border-radius:10px}.sdSkeleton:after{content:"";position:absolute;inset:0;transform:translateX(-100%);background:linear-gradient(90deg,transparent,rgba(255,255,255,.20),transparent);animation:sdShimmer 1.5s infinite}.sdSkVideo{height:180px;margin:0 0 14px;border-radius:14px}.sdSkLine{height:12px;width:72%;margin:10px 0}.sdSkLine.short{width:43%}.sdLoadBottom{display:flex;align-items:center;gap:8px;font-size:12px;color:var(--muted-foreground,#64748b);margin-top:17px}.sdLoadDot{width:7px;height:7px;border-radius:50%;background:#818cf8;box-shadow:0 0 0 4px rgba(129,140,248,.13);animation:sdPulse 1s infinite}.sdLoadingIcon,.sdEmptyIcon{width:52px;height:52px;margin:0 auto 13px;display:grid;place-items:center;border-radius:15px;background:rgba(99,102,241,.12);color:#818cf8}
      .sdLoading strong{font-size:16px}.sdLoading p,.sdEmpty p{font-size:13px;line-height:1.6;color:var(--muted-foreground,#64748b);margin:7px 0 0}.sdProgress{height:4px;background:rgba(99,102,241,.13);border-radius:9px;overflow:hidden;margin:20px auto 0;max-width:280px}.sdProgress span{display:block;width:35%;height:100%;background:#818cf8;border-radius:9px;animation:sdMove 1.4s ease-in-out infinite}
      .sdEmpty{text-align:center}.sdEmpty h2{font-size:18px;margin:0}.sdResultTop{display:flex;justify-content:space-between;align-items:center;gap:10px}.sdReady{display:flex;align-items:center;gap:7px;color:#16a34a;font-size:12px;font-weight:750;letter-spacing:.05em}.sdCount{font-size:12px;color:var(--muted-foreground,#64748b)}
      .sdTitle{font-size:18px;line-height:1.4;margin:13px 0;overflow-wrap:anywhere}.sdMediaBlock{display:grid;gap:12px;margin:18px 0;padding:0 0 18px;border-bottom:1px solid var(--border,rgba(127,127,127,.12))}
      .sdThumb{aspect-ratio:4/5;max-height:650px;object-fit:contain;background:#080808;border-radius:14px}
      .sdThumb{width:100%;max-height:520px;object-fit:contain;background:rgba(127,127,127,.06);border-radius:13px;margin:3px 0 0}.sdPlayer{width:100%;max-height:600px;border-radius:14px;background:#000;display:block;overflow:hidden}
      .sdPlayer.video-js{height:auto;aspect-ratio:16/9;border-radius:16px;overflow:hidden;box-shadow:0 10px 28px rgba(0,0,0,.18)}.sdPlayer.video-js .vjs-big-play-button{width:3.2em;height:2.1em;line-height:2.1em;border:0;border-radius:14px;background:rgba(15,23,42,.78);backdrop-filter:blur(8px);left:50%;top:50%;transform:translate(-50%,-50%)}.sdPlayer.video-js:hover .vjs-big-play-button{background:rgba(220,38,38,.9)}
      .sdPlayer .vjs-control-bar{font-size:13px}
      .sdPlayer audio{width:100%}
      .sdDownloadItem{display:flex;align-items:center;gap:12px;padding:15px;border:1px solid rgba(99,102,241,.25);border-radius:14px;text-decoration:none;color:var(--foreground,inherit);background:linear-gradient(135deg,rgba(99,102,241,.09),rgba(129,140,248,.035));box-shadow:0 5px 16px rgba(99,102,241,.06);transition:transform .18s,background .18s,border-color .18s}.sdDownloadItem:hover{background:rgba(99,102,241,.07);border-color:rgba(99,102,241,.4)}
      .sdDownloadIcon{width:42px;height:42px;display:grid;place-items:center;flex-shrink:0;border-radius:11px;background:rgba(99,102,241,.12);color:#818cf8}.sdDownloadText{display:grid;gap:4px;flex:1;min-width:0}.sdDownloadCTA{display:flex;align-items:center;gap:7px;font-size:11px;font-weight:750;letter-spacing:.04em;color:#818cf8;white-space:nowrap}.sdDownloadText strong{font-size:14px}.sdDownloadText small{font-size:12px;color:var(--muted-foreground,#64748b)}.sdFootnote{font-size:12px;line-height:1.5;color:var(--muted-foreground,#64748b);margin:14px 0 0}
      .sdPlatforms{margin:30px auto 0;text-align:center}.sdPlatformsLabel{font-size:10px;letter-spacing:.15em;font-weight:750;color:var(--muted-foreground,#64748b)}.sdPlatforms>div{display:flex;justify-content:center;gap:8px;flex-wrap:wrap;margin-top:12px}.sdPlatform{display:inline-flex;align-items:center;gap:6px;padding:8px 10px;border:1px solid var(--border,rgba(127,127,127,.2));border-radius:9px;font-size:12px;color:var(--muted-foreground,#64748b)}
      .sdNotice{display:flex;align-items:flex-start;gap:9px;max-width:650px;margin:18px auto 0;color:var(--muted-foreground,#64748b);font-size:12px;line-height:1.55}.sdNotice svg{flex-shrink:0;margin-top:1px;color:#818cf8}.sdNotice p{margin:0}
      .sdSpin{animation:sdSpin 1s linear infinite}@keyframes sdSpin{to{transform:rotate(360deg)}}@keyframes sdSquareAnimation{0%,10.5%{left:0;top:0}12.5%,23%{left:32px;top:0}25%,35.5%{left:64px;top:0}37.5%,48%{left:64px;top:32px}50%,60.5%{left:32px;top:32px}62.5%,73%{left:32px;top:64px}75%,85.5%{left:0;top:64px}87.5%,98%{left:0;top:32px}100%{left:0;top:0}}@keyframes sdShimmer{100%{transform:translateX(100%)}}@keyframes sdPulse{50%{opacity:.55;transform:scale(.96)}}@keyframes sdMove{0%{transform:translateX(-120%)}100%{transform:translateX(350%)}}
      @media(max-width:560px){.sdSearch{flex-wrap:wrap}.sdSearch input{flex:1}.sdPaste{padding:0 10px}.sdSubmit{flex:0 0 100%;width:100%;justify-content:center;margin-top:4px}.sdSearch .igAt{width:30px;flex-basis:30px}.sdPlatforms>div{gap:6px}.sdPlatform{font-size:11px;padding:7px 8px}}
      @media(prefers-reduced-motion:reduce){.sdSpin,.sdProgress span,.sdSkeleton:after,.sdLoadOrb,.sdLoadDot,.sdLoaderSquare{animation:none}}
    `}</style>
  </main>;
}
