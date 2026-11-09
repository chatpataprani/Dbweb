'use client';

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, Download, Link2, LoaderCircle, ShieldCheck, Video, AlertCircle, ExternalLink, Instagram, Youtube, Facebook, Music2, Clipboard } from "lucide-react";

const platforms = [{name:"Instagram",Icon:Instagram},{name:"YouTube",Icon:Youtube},{name:"TikTok",Icon:Music2},{name:"Facebook",Icon:Facebook},{name:"X / Twitter",Icon:Link2},{name:"Pinterest",Icon:Link2},{name:"Reddit",Icon:Link2}];

function DbwebVideoPlayer({src,poster}) {
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
        player.src({src,type:""});
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
  return <video ref={videoRef} className="video-js vjs-big-play-centered sdPlayer" controls playsInline preload="metadata" poster={poster||undefined}><source src={src}/></video>;
}

export default function SocialDownloaderPage() {
  const [url,setUrl]=useState(""); const [busy,setBusy]=useState(false); const [result,setResult]=useState(null); const [error,setError]=useState("");
  async function pasteLink(){try{const value=await navigator.clipboard.readText();if(value){setUrl(value.trim());setError("");}}catch{setError("Clipboard access unavailable. Paste the link manually.");}}
  async function submit(e){e.preventDefault();setBusy(true);setError("");setResult(null);try{const response=await fetch("/api/social-download",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({url:url.trim()})});const data=await response.json();if(!response.ok)throw new Error(data.error||"Could not process this link.");setResult(data);}catch(err){setError(err.message||"Something went wrong. Try another public link.");}finally{setBusy(false);}}
  return <main className="igPage sdPage">
    <Link href="/tools" className="igBack"><ArrowLeft size={16}/> All tools</Link>
    <section className="igHero sdHero"><span className="igBadge"><Download size={15}/> DBWEB TOOL</span><h1>Social Media Downloader</h1><p>Download public videos and media from your favorite platforms with one link.</p>
      <form className="igSearch sdSearch" onSubmit={submit}><span className="igAt"><Link2 size={18}/></span><input value={url} onChange={e=>{setUrl(e.target.value);setError("");}} placeholder="Paste a video or post URL" aria-label="Media URL" type="url" required/><button type="button" className="sdPaste" onClick={pasteLink} title="Paste from clipboard"><Clipboard size={16}/><span>Paste</span></button><button className="primary sdSubmit" disabled={busy}>{busy?<LoaderCircle className="sdSpin" size={17}/>:<Download size={17}/>} {busy?"Processing…":"Download"}</button></form>
      {error&&<div className="error sdError" role="alert"><AlertCircle size={17}/>{error}</div>}
    </section>
    {busy&&<section className="card sdLoading" role="status" aria-live="polite"><div className="sdLoadingIcon"><LoaderCircle className="sdSpin" size={23}/></div><strong>Getting your media ready</strong><p>Checking the link and available download formats…</p><div className="sdProgress"><span/></div></section>}
    {result&&<section className="card sdResult"><div className="sdResultTop"><span className="sdReady"><ShieldCheck size={17}/> MEDIA READY</span><span className="sdCount">{(result.links||[]).length} option(s)</span></div>{result.title&&<h2 className="sdTitle">{result.title}</h2>}{(result.links||[]).map((item,i)=><div className="sdMediaBlock" key={i}>{item.type==="image"?<img className="sdThumb" src={item.url} alt={result.title||"Post image"}/>:item.type==="audio"?<audio className="sdPlayer" controls preload="metadata" src={item.url}>Your browser does not support audio playback.</audio>:<DbwebVideoPlayer src={item.url} poster={result.thumbnail}/>}<a className="sdDownloadItem" href={`/api/social-download/file?url=${encodeURIComponent(item.url)}`} download><span className="sdDownloadIcon"><Download size={18}/></span><span className="sdDownloadText"><strong>{item.label||(item.type==="audio"?"Audio download":item.type==="image"?"Image download":"Download file")}</strong><small>{item.type==="audio"?"Audio file":item.type==="image"?"Image file":"Video / media file"} · Save to device</small></span><Download size={15}/></a></div>) }<p className="sdFootnote">Downloads are provided by the source service. Available formats and quality depend on the original post.</p></section>}
    {!result&&!busy&&<section className="card sdEmpty"><div className="sdEmptyIcon"><Video size={25}/></div><h2>Ready when you are</h2><p>Paste a public media link above and tap Download. Your available files will appear here.</p></section>}
    <section className="sdPlatforms"><span className="sdPlatformsLabel">SUPPORTED SOURCES</span><div>{platforms.map(({name,Icon})=><span className="sdPlatform" key={name}><Icon size={15}/>{name}</span>)}</div></section>
    <div className="sdNotice"><ShieldCheck size={17}/><p>Only download content you own or have permission to save. Private, login-gated, DRM-protected, or restricted media is not supported.</p></div>
    <style jsx>{`
      .sdPage{max-width:850px;margin:0 auto;padding-bottom:60px}.sdHero{margin-bottom:25px}.sdHero h1{letter-spacing:-.035em}
      .sdSearch{max-width:760px;display:flex;align-items:center;gap:7px;padding:7px;border-radius:16px}.sdSearch .igAt{width:38px;flex:0 0 38px}.sdSearch input{min-width:0}
      .sdPaste{height:42px;display:flex;align-items:center;gap:6px;padding:0 11px;border:1px solid var(--border,#e5e7eb);border-radius:10px;background:var(--card,transparent);color:var(--foreground,inherit);cursor:pointer;font-size:13px}
      .sdSubmit{height:42px;white-space:nowrap;display:flex;align-items:center;gap:7px}.sdError{display:flex;align-items:center;justify-content:center;gap:8px}
      .sdLoading,.sdEmpty,.sdResult{max-width:650px;margin:22px auto;padding:clamp(18px,4vw,26px);border-radius:18px}.sdLoading{text-align:center}.sdLoadingIcon,.sdEmptyIcon{width:52px;height:52px;margin:0 auto 13px;display:grid;place-items:center;border-radius:15px;background:rgba(99,102,241,.12);color:#818cf8}
      .sdLoading strong{font-size:16px}.sdLoading p,.sdEmpty p{font-size:13px;line-height:1.6;color:var(--muted-foreground,#64748b);margin:7px 0 0}.sdProgress{height:4px;background:rgba(99,102,241,.13);border-radius:9px;overflow:hidden;margin:20px auto 0;max-width:280px}.sdProgress span{display:block;width:35%;height:100%;background:#818cf8;border-radius:9px;animation:sdMove 1.4s ease-in-out infinite}
      .sdEmpty{text-align:center}.sdEmpty h2{font-size:18px;margin:0}.sdResultTop{display:flex;justify-content:space-between;align-items:center;gap:10px}.sdReady{display:flex;align-items:center;gap:7px;color:#16a34a;font-size:12px;font-weight:750;letter-spacing:.05em}.sdCount{font-size:12px;color:var(--muted-foreground,#64748b)}
      .sdTitle{font-size:18px;line-height:1.4;margin:13px 0;overflow-wrap:anywhere}.sdMediaBlock{display:grid;gap:9px;margin:14px 0}.sdThumb{width:100%;max-height:520px;object-fit:contain;background:rgba(127,127,127,.06);border-radius:13px;margin:3px 0 0}.sdPlayer{width:100%;max-height:520px;border-radius:13px;background:#000;display:block}.sdPlayer audio{width:100%}
      .sdDownloadItem{display:flex;align-items:center;gap:12px;padding:13px;border:1px solid var(--border,rgba(127,127,127,.2));border-radius:12px;text-decoration:none;color:var(--foreground,inherit);transition:background .18s,border-color .18s}.sdDownloadItem:hover{background:rgba(99,102,241,.07);border-color:rgba(99,102,241,.4)}
      .sdDownloadIcon{width:38px;height:38px;display:grid;place-items:center;flex-shrink:0;border-radius:11px;background:rgba(99,102,241,.12);color:#818cf8}.sdDownloadText{display:grid;gap:4px;flex:1;min-width:0}.sdDownloadText strong{font-size:14px}.sdDownloadText small{font-size:12px;color:var(--muted-foreground,#64748b)}.sdFootnote{font-size:12px;line-height:1.5;color:var(--muted-foreground,#64748b);margin:14px 0 0}
      .sdPlatforms{margin:30px auto 0;text-align:center}.sdPlatformsLabel{font-size:10px;letter-spacing:.15em;font-weight:750;color:var(--muted-foreground,#64748b)}.sdPlatforms>div{display:flex;justify-content:center;gap:8px;flex-wrap:wrap;margin-top:12px}.sdPlatform{display:inline-flex;align-items:center;gap:6px;padding:8px 10px;border:1px solid var(--border,rgba(127,127,127,.2));border-radius:9px;font-size:12px;color:var(--muted-foreground,#64748b)}
      .sdNotice{display:flex;align-items:flex-start;gap:9px;max-width:650px;margin:18px auto 0;color:var(--muted-foreground,#64748b);font-size:12px;line-height:1.55}.sdNotice svg{flex-shrink:0;margin-top:1px;color:#818cf8}.sdNotice p{margin:0}
      .sdSpin{animation:sdSpin 1s linear infinite}@keyframes sdSpin{to{transform:rotate(360deg)}}@keyframes sdMove{0%{transform:translateX(-120%)}100%{transform:translateX(350%)}}
      @media(max-width:560px){.sdSearch{flex-wrap:wrap}.sdSearch input{flex:1}.sdPaste{padding:0 10px}.sdSubmit{flex:1;justify-content:center}.sdSearch .igAt{width:30px;flex-basis:30px}.sdPlatforms>div{gap:6px}.sdPlatform{font-size:11px;padding:7px 8px}}
      @media(prefers-reduced-motion:reduce){.sdSpin,.sdProgress span{animation:none}}
    `}</style>
  </main>;
}
