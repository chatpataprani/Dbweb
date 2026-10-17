"use client";

import { useState } from "react";
import { ArrowLeft, Download, ExternalLink, Instagram, Link2, LoaderCircle, ShieldCheck, Youtube } from "lucide-react";

const platforms = [
  { id: "instagram", label: "Instagram", hint: "Public posts and Reels", placeholder: "https://www.instagram.com/reel/..." },
  { id: "facebook", label: "Facebook", hint: "Public videos", placeholder: "https://www.facebook.com/..." },
  { id: "pinterest", label: "Pinterest", hint: "Public Pins and videos", placeholder: "https://pin.it/..." },
  { id: "snapchat", label: "Snapchat", hint: "Public media only", placeholder: "https://www.snapchat.com/..." },
  { id: "youtube", label: "YouTube", hint: "Public videos", placeholder: "https://www.youtube.com/watch?v=..." },
];

export default function SocialDownloaderPage() {
  const [platform, setPlatform] = useState("instagram");
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  async function findMedia(event) {
    event.preventDefault();
    setError("");
    setResult(null);
    if (!url.trim()) {
      setError("Paste a public post or video URL first.");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch("/api/social_downloader?platform=" + encodeURIComponent(platform) + "&url=" + encodeURIComponent(url.trim()), {
        method: "GET", headers: { Accept: "application/json" }, cache: "no-store",
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.status !== "success") throw new Error(data.message || "Could not find downloadable media.");
      setResult(data);
    } catch (e) {
      setError(e.message || "Something went wrong. Please try another public link.");
    } finally {
      setLoading(false);
    }
  }

  const selected = platforms.find((item) => item.id === platform);
  const items = result?.items || [];

  return <main className="socialDlPage">
    <a className="socialDlBack" href="/tools"><ArrowLeft size={17}/> All tools</a>
    <section className="socialDlHero">
      <span className="socialDlBrand"><Download size={16}/> DBWEB TOOLS</span>
      <h1>Social Media Downloader</h1>
      <p>Find available media links from supported public posts, all in one place.</p>
      <div className="socialDlNotice"><ShieldCheck size={17}/><span>Use only for content you own or have permission to save. Private, login-gated, or restricted posts are not supported.</span></div>
    </section>
    <section className="socialDlCard">
      <div className="socialDlPlatforms" aria-label="Choose platform">
        {platforms.map((item) => <button type="button" key={item.id} className={platform === item.id ? "active" : ""} onClick={() => { setPlatform(item.id); setError(""); setResult(null); }}>
          <span>{item.label === "Instagram" ? <Instagram size={18}/> : item.label === "YouTube" ? <Youtube size={18}/> : <Link2 size={18}/>}</span>
          <strong>{item.label}</strong><small>{item.hint}</small>
        </button>)}
      </div>
      <form onSubmit={findMedia} className="socialDlForm">
        <label htmlFor="social-dl-url">Public post or video URL</label>
        <div className="socialDlInputRow">
          <input id="social-dl-url" type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder={selected.placeholder} autoComplete="url" required />
          <button type="submit" disabled={loading}>{loading ? <LoaderCircle size={18} className="socialDlSpin"/> : <Download size={18}/>}<span>{loading ? "Checking…" : "Find media"}</span></button>
        </div>
        <p className="socialDlHelp">Selected: {selected.label}. Availability depends on the platform and its current public access rules.</p>
      </form>
      {error && <div className="socialDlError" role="alert"><p>{error}</p>{platform === "youtube" && /^https?:\\/\\/(www\\.)?(youtube\\.com|youtu\\.be|music\\.youtube\\.com)\\//i.test(url.trim()) && <a className="socialDlOpenOriginal" href={url.trim()} target="_blank" rel="noopener noreferrer"><ExternalLink size={15}/> Open original on YouTube</a>}</div>}
      {loading && <div className="socialDlLoading"><LoaderCircle size={20} className="socialDlSpin"/> Checking the public link…</div>}
      {result && <section className="socialDlResults" aria-live="polite">
        <div className="socialDlResultHeader"><div><small>RESULT</small><h2>{result.title || selected.label + " media"}</h2>{result.author && <p>By {result.author}</p>}</div>{result.thumbnail && <img src={result.thumbnail} alt="" loading="lazy"/>}</div>
        {items.length ? <div className="socialDlItems">{items.map((item, index) => <article className="socialDlItem" key={item.url + index}>
          <div><strong>{item.quality || "Original"}</strong><span>{item.type || "media"}{item.title && item.title !== result.title ? " · " + item.title : ""}</span></div>
          <a href={item.url} target="_blank" rel="noopener noreferrer" download><Download size={16}/> Open / save <ExternalLink size={14}/></a>
        </article>)}</div> : <p>No downloadable media was found for this link.</p>}
        <p className="socialDlDisclaimer">Some providers return temporary links. If one expires, run the search again.</p>
      </section>}
    </section>
    <style jsx global>{`
      .socialDlPage{max-width:980px;margin:0 auto;padding:24px 18px 70px;color:var(--foreground,#171717)}
      .socialDlBack{display:inline-flex;align-items:center;gap:8px;color:inherit;text-decoration:none;opacity:.78;margin:0 0 24px;font-size:14px}
      .socialDlHero{padding:clamp(22px,5vw,44px);border:1px solid var(--border,rgba(128,128,128,.25));border-radius:26px;background:linear-gradient(135deg,rgba(145,145,145,.12),rgba(145,145,145,.035))}
      .socialDlBrand{display:inline-flex;align-items:center;gap:8px;font-size:11px;letter-spacing:.14em;font-weight:750;opacity:.72}
      .socialDlHero h1{font-size:clamp(29px,5vw,46px);letter-spacing:-.045em;line-height:1.08;margin:18px 0 10px}
      .socialDlHero>p{margin:0;max-width:620px;line-height:1.65;opacity:.75}
      .socialDlNotice{display:flex;gap:10px;align-items:flex-start;margin-top:22px;padding:12px 14px;border:1px solid var(--border,rgba(128,128,128,.2));border-radius:14px;font-size:12px;line-height:1.55;opacity:.9}
      .socialDlNotice svg{flex-shrink:0;margin-top:1px}
      .socialDlCard{margin-top:18px;padding:clamp(16px,3vw,26px);border:1px solid var(--border,rgba(128,128,128,.25));border-radius:24px;background:var(--card,rgba(128,128,128,.035))}
      .socialDlPlatforms{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:9px}
      .socialDlPlatforms button{min-width:0;text-align:left;display:flex;flex-direction:column;align-items:flex-start;gap:7px;padding:13px 11px;border:1px solid var(--border,rgba(128,128,128,.25));border-radius:14px;background:transparent;color:inherit;cursor:pointer}
      .socialDlPlatforms button.active{border-color:currentColor;background:rgba(128,128,128,.12)}
      .socialDlPlatforms button span{display:grid;place-items:center;width:31px;height:31px;border-radius:10px;background:rgba(128,128,128,.12)}
      .socialDlPlatforms button strong{font-size:13px}
      .socialDlPlatforms button small{font-size:10px;opacity:.68;line-height:1.35}
      .socialDlForm{margin-top:26px}
      .socialDlForm label{display:block;font-size:13px;font-weight:650;margin-bottom:9px}
      .socialDlInputRow{display:flex;gap:9px}
      .socialDlInputRow input{min-width:0;flex:1;border:1px solid var(--border,rgba(128,128,128,.3));border-radius:13px;background:var(--background,transparent);color:inherit;padding:14px;font:inherit;font-size:14px}
      .socialDlInputRow button{display:inline-flex;justify-content:center;align-items:center;gap:8px;border:0;border-radius:13px;padding:0 17px;background:var(--foreground,#171717);color:var(--background,#fff);font-weight:700;font-size:13px;cursor:pointer;white-space:nowrap}
      .socialDlInputRow button:disabled{opacity:.6;cursor:wait}
      .socialDlHelp{font-size:12px;opacity:.65;margin:10px 0 0;line-height:1.5}
      .socialDlError{margin-top:17px;padding:13px 15px;border-radius:12px;background:rgba(220,60,60,.09);border:1px solid rgba(220,60,60,.25);font-size:13px;line-height:1.5}\n      .socialDlError p{margin:0}\n      .socialDlOpenOriginal{display:inline-flex;align-items:center;gap:7px;margin-top:11px;padding:9px 11px;border:1px solid var(--border,rgba(128,128,128,.3));border-radius:10px;color:inherit;text-decoration:none;font-size:12px;font-weight:650}
      .socialDlLoading{display:flex;align-items:center;gap:10px;padding:20px 0;font-size:13px;opacity:.8}
      .socialDlSpin{animation:socialDlSpin 1s linear infinite}
      @keyframes socialDlSpin{to{transform:rotate(360deg)}}
      .socialDlResults{margin-top:22px;padding-top:20px;border-top:1px solid var(--border,rgba(128,128,128,.2))}
      .socialDlResultHeader{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;margin-bottom:14px}
      .socialDlResultHeader small{font-size:10px;letter-spacing:.15em;opacity:.65;font-weight:750}
      .socialDlResultHeader h2{font-size:19px;line-height:1.35;margin:5px 0;overflow-wrap:anywhere}
      .socialDlResultHeader p{margin:0;font-size:12px;opacity:.7}
      .socialDlResultHeader img{width:76px;height:76px;object-fit:cover;border-radius:12px}
      .socialDlItems{display:grid;gap:9px}
      .socialDlItem{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:13px 14px;border:1px solid var(--border,rgba(128,128,128,.2));border-radius:13px}
      .socialDlItem>div{display:grid;gap:5px;min-width:0}
      .socialDlItem strong{font-size:13px}
      .socialDlItem span{font-size:11px;opacity:.65;overflow-wrap:anywhere}
      .socialDlItem a{display:inline-flex;align-items:center;justify-content:center;gap:7px;text-decoration:none;color:inherit;border:1px solid var(--border,rgba(128,128,128,.3));border-radius:10px;padding:9px 11px;font-size:12px;font-weight:650;white-space:nowrap}
      .socialDlDisclaimer{font-size:11px;opacity:.62;line-height:1.5;margin:14px 0 0}
      @media(max-width:650px){.socialDlPlatforms{grid-template-columns:repeat(2,minmax(0,1fr))}.socialDlPlatforms button:last-child{grid-column:span 2}.socialDlInputRow{flex-direction:column}.socialDlInputRow button{min-height:46px}.socialDlItem{align-items:flex-start;flex-direction:column}.socialDlItem a{width:100%}.socialDlResultHeader img{width:58px;height:58px}}
    `}</style>
  </main>;
}
