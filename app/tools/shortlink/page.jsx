"use client";

import { useState } from "react";
import { ArrowLeft, ArrowUpRight, Link2, ShieldCheck, Copy, Check, RotateCw } from "lucide-react";

export default function ShortlinkResolverPage() {
  const [url, setUrl] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  async function resolveLink(event) {
    event.preventDefault();
    setBusy(true); setError(""); setResult(null); setCopied(false);
    try {
      const response = await fetch("/api/shortlink", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not resolve this link.");
      setResult(data);
    } catch (e) {
      setError(e.message || "Could not resolve this link.");
    } finally { setBusy(false); }
  }

  async function copyDestination() {
    try { await navigator.clipboard.writeText(result.destination); setCopied(true); setTimeout(() => setCopied(false), 1400); }
    catch { setError("Clipboard access was blocked by your browser."); }
  }

  return <main className="igPage shortPage">
    <a className="igBack" href="/tools"><ArrowLeft size={16}/> All tools</a>
    <section className="igHero">
      <span className="igBadge"><Link2 size={15}/> DBWEB TOOL</span>
      <h1>Short Link Resolver</h1>
      <p>Expand a shortened URL and inspect its redirect path.</p>
      <form className="igSearch" onSubmit={resolveLink}>
        <span className="igAt"><Link2 size={17}/></span>
        <input type="url" value={url} onChange={e => setUrl(e.target.value)} placeholder="Paste a short link" aria-label="Short URL" required maxLength={2048}/>
        <button className="primary" disabled={busy}>{busy ? <span className="igLoading"/> : <RotateCw size={17}/>} {busy ? "Resolving…" : "Resolve link"}</button>
      </form>
      {error && <div className="error" role="alert">{error}</div>}
    </section>
    {busy && <section className="card igLoadingCard"><span className="igLoading large"/><div><strong>Following redirects</strong><p>Checking each public redirect destination…</p></div></section>}
    {result && <section className="card igResult shortResult">
      <div className="shortResultHead"><span className="igBadge"><ShieldCheck size={15}/> RESOLVED DESTINATION</span><span className="shortStatus">{result.status || "OK"}{result.contentType ? " · " + result.contentType.split(";")[0] : ""}</span></div>
      <a className="shortDestination" href={result.destination} target="_blank" rel="noreferrer"><span>{result.destination}</span><ArrowUpRight size={17}/></a>
      <div className="shortActions"><button className="secondary" onClick={copyDestination}>{copied ? <Check size={16}/> : <Copy size={16}/>} {copied ? "Copied" : "Copy destination"}</button><a className="secondary" href={result.destination} target="_blank" rel="noreferrer">Open destination <ArrowUpRight size={15}/></a></div>
      <h3 className="shortChainTitle">Redirect path</h3>
      <div className="shortChain">{result.chain?.map((hop, i) => <div className="shortHop" key={hop.url + i}><span>{i + 1}</span><div><strong>{hop.status}</strong><p>{hop.url}</p></div></div>)}</div>
    </section>}
  </main>;
}
