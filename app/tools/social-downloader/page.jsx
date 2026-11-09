'use client';

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Download, Link2, LoaderCircle, ShieldCheck, Video, Music2, AlertCircle, ExternalLink } from "lucide-react";

const platforms = ["Instagram", "YouTube", "TikTok", "Facebook", "X / Twitter", "Pinterest", "Reddit", "Snapchat", "Other"];

export default function SocialDownloaderPage() {
  const [url, setUrl] = useState("");
    const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setError(""); setResult(null);
    try {
      const response = await fetch("/api/social-download", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not process this link.");
      setResult(data);
    } catch (err) { setError(err.message || "Something went wrong."); }
    finally { setBusy(false); }
  }

  return <main className="socialdl-page">
    <div className="socialdl-wrap">
      <Link href="/tools" className="socialdl-back"><ArrowLeft size={16}/> Tools directory</Link>
      <section className="socialdl-hero">
        <div className="socialdl-icon"><Download size={25}/></div>
        <span className="socialdl-eyebrow">DBWEB • MEDIA TOOLS</span>
        <h1>Social media <span>downloader</span></h1>
        <p>Paste a public post link. Get supported video or audio media ready to save.</p>
      </section>
      <section className="socialdl-card">
        <form onSubmit={submit}>
          <label className="socialdl-label" htmlFor="social-url">Media link</label>
          <div className="socialdl-input"><Link2 size={18}/><input id="social-url" type="url" placeholder="https://…" value={url} onChange={e=>setUrl(e.target.value)} required/></div>
          <button className="socialdl-submit" disabled={busy}>{busy?<><LoaderCircle className="socialdl-spin" size={18}/> Processing link…</>:<><Download size={18}/> Find media</>}</button>
        </form>
        {error && <div className="socialdl-alert"><AlertCircle size={18}/><span>{error}</span></div>}
        {result && <div className="socialdl-result">
          <div className="socialdl-resulthead"><span className="socialdl-success"><ShieldCheck size={17}/> Media ready</span>{result.title && <strong>{result.title}</strong>}</div>
          {result.thumbnail && <img className="socialdl-thumb" src={result.thumbnail} alt="Media thumbnail"/>}
          <div className="socialdl-actions">{(result.links || []).map((item,i)=><a key={i} href={item.url} target="_blank" rel="noreferrer"><Download size={16}/>{item.label || (item.type==="audio"?"Audio":"Download")}<ExternalLink size={14}/></a>)}</div>
          <small>Downloads open from the media provider. Availability and quality depend on the original platform.</small>
        </div>}
      </section>
      <div className="socialdl-note"><ShieldCheck size={18}/><p>Use only for public content you own or have permission to save. Private, login-gated, DRM-protected, or restricted media is not supported.</p></div>
      <div className="socialdl-platforms"><Video size={17}/>{platforms.slice(0,-1).join(" · ")}</div>
    </div>
    <style jsx>{`
      .socialdl-page{min-height:100vh;padding:36px 18px 70px;background:var(--background,#090b10);color:var(--foreground,#f4f6fb)}
      .socialdl-wrap{max-width:760px;margin:auto}.socialdl-back{display:inline-flex;align-items:center;gap:8px;color:var(--muted-foreground,#a0a8b8);text-decoration:none;font-size:14px;margin-bottom:34px}
      .socialdl-hero{text-align:center;margin:0 auto 28px}.socialdl-icon{width:56px;height:56px;margin:0 auto 16px;display:grid;place-items:center;border-radius:17px;background:rgba(99,102,241,.14);color:#9da5ff;border:1px solid rgba(129,140,248,.25}
      .socialdl-eyebrow{font-size:11px;letter-spacing:.17em;font-weight:700;color:#9da5ff}.socialdl-hero h1{font-size:clamp(32px,6vw,48px);letter-spacing:-.045em;margin:10px 0;font-weight:750}.socialdl-hero h1 span{color:#9da5ff}.socialdl-hero p{color:var(--muted-foreground,#a0a8b8);font-size:15px}
      .socialdl-card{border:1px solid var(--border,rgba(255,255,255,.12));background:var(--card,rgba(255,255,255,.035));border-radius:22px;padding:clamp(18px,4vw,30px);box-shadow:0 18px 60px rgba(0,0,0,.16)}
      .socialdl-label{display:block;font-size:13px;font-weight:650;margin:0 0 9px}.socialdl-input{height:52px;display:flex;align-items:center;gap:10px;padding:0 14px;border:1px solid var(--border,rgba(255,255,255,.15));border-radius:13px;margin-bottom:20px;color:var(--muted-foreground,#a0a8b8)}.socialdl-input input{background:transparent;border:0;outline:0;width:100%;color:inherit;font:inherit;min-width:0}
      select{width:100%;height:48px;padding:0 13px;border-radius:12px;border:1px solid var(--border,rgba(255,255,255,.15));background:var(--background,#090b10);color:inherit;margin-bottom:20px}
      .socialdl-submit{width:100%;height:50px;border:0;border-radius:13px;background:#6366f1;color:white;font-weight:700;display:flex;align-items:center;justify-content:center;gap:9px;cursor:pointer}.socialdl-submit:disabled{opacity:.65;cursor:wait}
      .socialdl-alert{display:flex;gap:10px;align-items:flex-start;color:#ffb4b4;background:rgba(239,68,68,.09);border:1px solid rgba(239,68,68,.2);padding:13px;border-radius:12px;margin-top:16px;font-size:14px}
      .socialdl-result{margin-top:18px;border:1px solid rgba(99,102,241,.28);background:rgba(99,102,241,.06);padding:16px;border-radius:15px}.socialdl-resulthead{display:flex;flex-direction:column;gap:9px;margin-bottom:12px}.socialdl-success{display:flex;align-items:center;gap:7px;color:#a5f3c4;font-size:13px}.socialdl-resulthead strong{font-size:15px}.socialdl-thumb{width:100%;max-height:260px;object-fit:cover;border-radius:10px;margin:10px 0}
      .socialdl-actions{display:grid;gap:9px}.socialdl-actions a{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:12px;border-radius:10px;background:rgba(99,102,241,.16);color:inherit;text-decoration:none;font-size:14px;font-weight:650}.socialdl-result small{display:block;color:var(--muted-foreground,#a0a8b8);margin-top:12px;line-height:1.5}
      .socialdl-note{display:flex;gap:11px;align-items:flex-start;margin:20px 4px;color:var(--muted-foreground,#a0a8b8);font-size:13px;line-height:1.55}.socialdl-note svg{flex-shrink:0;color:#9da5ff;margin-top:2px}.socialdl-note p{margin:0}.socialdl-platforms{display:flex;align-items:center;gap:8px;justify-content:center;flex-wrap:wrap;color:var(--muted-foreground,#858d9d);font-size:12px;margin-top:28px}
      .socialdl-spin{animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}@media(prefers-reduced-motion:reduce){.socialdl-spin{animation:none}}
    `}</style>
  </main>;
}
