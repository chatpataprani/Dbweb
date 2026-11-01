"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDownToLine, ArrowLeft, ArrowUpRight, Box, Check, ChevronDown, Code2, FileArchive, FilePlus2, Filter, Layers3, Package, Puzzle, Search, ShieldCheck, Smartphone, Trash2, UploadCloud, X } from "lucide-react";

const filters = ["All", "Apps", "Plugins", "Extensions"];
const kindLabel = { app: "App", plugin: "Plugin", extension: "Extension" };

function formatSize(bytes = 0) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function iconFor(kind) {
  if (kind === "app") return Smartphone;
  if (kind === "plugin") return Puzzle;
  return Layers3;
}

export default function DownloadsPage() {
  const [releases, setReleases] = useState([]);
  const [admin, setAdmin] = useState(false);
  const [filter, setFilter] = useState("All");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [notice, setNotice] = useState("");
  const [form, setForm] = useState({ title: "", version: "1.0.0", kind: "app", platform: "Android", description: "", changelog: "" });
  const [file, setFile] = useState(null);
  const fileRef = useRef(null);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/releases", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok && !data.releases) throw new Error(data.error || "Could not load downloads.");
      setReleases(Array.isArray(data.releases) ? data.releases : []);
      setAdmin(!!data.admin);
      if (data.error) setError(data.error);
    } catch (e) {
      setError(e.message || "Could not load the release catalogue.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const visible = useMemo(() => releases.filter(item => {
    const typeMatch = filter === "All" || kindLabel[item.kind] === filter.slice(0, -1) || (filter === "Apps" && item.kind === "app");
    const haystack = [item.title, item.description, item.version, item.platform, item.kind].join(" ").toLowerCase();
    return typeMatch && haystack.includes(query.trim().toLowerCase());
  }), [releases, filter, query]);

  async function submitUpload(event) {
    event.preventDefault();
    if (!file) { setError("Choose a package file first."); return; }
    setUploading(true);
    setError("");
    setNotice("");
    try {
      const body = new FormData();
      Object.entries(form).forEach(([key, value]) => body.append(key, value));
      body.append("file", file);
      const response = await fetch("/api/releases", { method: "POST", body });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Upload failed.");
      setReleases(items => [data.release, ...items]);
      setForm({ title: "", version: "1.0.0", kind: "app", platform: "Android", description: "", changelog: "" });
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
      setUploadOpen(false);
      setNotice("Your release has been uploaded and is now available in the catalogue.");
    } catch (e) {
      setError(e.message || "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function removeRelease(id) {
    if (!window.confirm("Remove this release from Dbweb downloads?")) return;
    try {
      const response = await fetch("/api/releases", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ id }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not remove release.");
      setReleases(items => items.filter(item => item.id !== id));
      setNotice("Release removed.");
    } catch (e) {
      setError(e.message || "Could not remove release.");
    }
  }

  return (
    <div className="releasePage">
      <style jsx global>{`
        .releasePage{--rp-bg:var(--background,#f5f6f8);--rp-card:var(--card,#fff);--rp-text:var(--foreground,#17191f);--rp-muted:var(--muted,#737987);--rp-line:var(--border,#e5e7eb);min-height:100vh;background:var(--rp-bg);color:var(--rp-text);padding:28px 22px 64px;font-family:inherit}
        .rp-wrap{max-width:1120px;margin:0 auto}.rp-top{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:38px}.rp-brand{display:flex;align-items:center;gap:10px;text-decoration:none;color:inherit;font-weight:800;font-size:20px;letter-spacing:-.5px}.rp-brand img{width:34px;height:34px;object-fit:contain}.rp-back{display:inline-flex;align-items:center;gap:8px;color:var(--rp-muted);font-size:13px;text-decoration:none}.rp-back:hover{color:var(--rp-text)}
        .rp-hero{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:30px;align-items:end;margin-bottom:30px}.rp-kicker{font-size:11px;letter-spacing:2px;text-transform:uppercase;font-weight:800;color:#5369c9;margin-bottom:12px}.rp-hero h1{font-size:clamp(32px,5vw,52px);letter-spacing:-2.2px;line-height:1.05;margin:0 0 14px}.rp-hero p{max-width:660px;color:var(--rp-muted);line-height:1.7;font-size:15px;margin:0}.rp-admin{border:1px solid var(--rp-line);background:var(--rp-card);border-radius:12px;padding:11px 15px;display:inline-flex;align-items:center;gap:8px;font-weight:700;color:var(--rp-text);cursor:pointer;white-space:nowrap}.rp-admin:hover{border-color:#8291dc}
        .rp-callout{display:flex;gap:12px;align-items:flex-start;background:var(--rp-card);border:1px solid var(--rp-line);border-radius:14px;padding:16px 18px;margin:0 0 28px}.rp-callout svg{color:#5369c9;flex:0 0 auto;margin-top:2px}.rp-callout strong{display:block;font-size:13px;margin-bottom:4px}.rp-callout span{font-size:12px;color:var(--rp-muted);line-height:1.6}
        .rp-tools{display:flex;gap:12px;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap}.rp-filters{display:flex;gap:6px;flex-wrap:wrap}.rp-filter{border:1px solid var(--rp-line);background:var(--rp-card);color:var(--rp-muted);padding:9px 13px;border-radius:9px;font-size:12px;font-weight:700;cursor:pointer}.rp-filter.active{background:var(--rp-text);border-color:var(--rp-text);color:var(--rp-bg)}.rp-search{display:flex;align-items:center;gap:8px;border:1px solid var(--rp-line);background:var(--rp-card);border-radius:10px;padding:0 12px;min-width:min(100%,270px);height:40px;color:var(--rp-muted)}.rp-search input{background:transparent;border:0;outline:0;color:var(--rp-text);width:100%;font:inherit;font-size:13px}
        .rp-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}.rp-card{background:var(--rp-card);border:1px solid var(--rp-line);border-radius:15px;padding:18px;min-width:0;display:flex;flex-direction:column;min-height:245px;transition:transform .18s,border-color .18s}.rp-card:hover{transform:translateY(-2px);border-color:#aab3dc}.rp-cardtop{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:18px}.rp-icon{width:42px;height:42px;border-radius:12px;background:color-mix(in srgb,#596fcb 12%,transparent);color:#596fcb;display:grid;place-items:center}.rp-badge{font-size:10px;font-weight:800;letter-spacing:.6px;text-transform:uppercase;border:1px solid var(--rp-line);border-radius:30px;padding:6px 9px;color:var(--rp-muted)}.rp-card h2{font-size:17px;letter-spacing:-.3px;margin:0 0 7px;overflow-wrap:anywhere}.rp-card p{font-size:12px;line-height:1.65;color:var(--rp-muted);margin:0 0 15px;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}.rp-meta{display:flex;gap:8px;flex-wrap:wrap;color:var(--rp-muted);font-size:10px;margin-top:auto;padding:12px 0}.rp-meta span{border-right:1px solid var(--rp-line);padding-right:8px}.rp-meta span:last-child{border:0}.rp-download{display:flex;align-items:center;justify-content:center;gap:8px;background:var(--rp-text);color:var(--rp-bg);text-decoration:none;border-radius:9px;padding:11px 12px;font-size:12px;font-weight:800}.rp-download:hover{opacity:.85}.rp-delete{border:0;background:transparent;color:#c04b4b;cursor:pointer;padding:8px}.rp-empty{grid-column:1/-1;text-align:center;padding:54px 20px;border:1px dashed var(--rp-line);border-radius:15px;color:var(--rp-muted)}.rp-empty svg{margin:0 auto 12px;opacity:.65}.rp-empty strong{display:block;color:var(--rp-text);margin-bottom:5px}.rp-empty p{font-size:12px;margin:0}
        .rp-explain{margin-top:50px}.rp-sectionhead{margin-bottom:16px}.rp-sectionhead small{color:#5369c9;font-weight:800;letter-spacing:1.7px;text-transform:uppercase;font-size:10px}.rp-sectionhead h2{font-size:25px;letter-spacing:-.8px;margin:7px 0}.rp-sectionhead p{font-size:13px;color:var(--rp-muted);margin:0}.rp-explainGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}.rp-explainCard{background:var(--rp-card);border:1px solid var(--rp-line);border-radius:14px;padding:20px}.rp-explainCard svg{color:#596fcb;margin-bottom:13px}.rp-explainCard h3{font-size:15px;margin:0 0 8px}.rp-explainCard p{font-size:12px;line-height:1.7;color:var(--rp-muted);margin:0}
        .rp-steps{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:16px}.rp-step{border-top:2px solid var(--rp-line);padding-top:13px}.rp-step b{font-size:12px}.rp-step p{font-size:11px;color:var(--rp-muted);line-height:1.6;margin:5px 0 0}.rp-footer{border-top:1px solid var(--rp-line);margin-top:48px;padding-top:18px;display:flex;justify-content:space-between;gap:15px;color:var(--rp-muted);font-size:11px}.rp-footer a{color:inherit;text-decoration:none}
        .rp-alert{padding:12px 14px;border-radius:10px;font-size:12px;margin:0 0 14px;background:color-mix(in srgb,#d39b38 13%,var(--rp-card));border:1px solid color-mix(in srgb,#d39b38 35%,var(--rp-line));color:var(--rp-text)}.rp-alert.error{background:color-mix(in srgb,#c04b4b 10%,var(--rp-card));border-color:color-mix(in srgb,#c04b4b 35%,var(--rp-line))}
        .rp-modalback{position:fixed;inset:0;background:#10131dcc;z-index:1000;display:grid;place-items:center;padding:18px}.rp-modal{width:min(100%,580px);max-height:92vh;overflow:auto;background:var(--rp-card);color:var(--rp-text);border:1px solid var(--rp-line);border-radius:17px;padding:22px;box-shadow:0 22px 80px #0005}.rp-modalhead{display:flex;justify-content:space-between;gap:10px;align-items:center;margin-bottom:18px}.rp-modalhead h2{margin:0;font-size:20px}.rp-close{border:0;background:transparent;color:var(--rp-muted);cursor:pointer}.rp-form{display:grid;grid-template-columns:1fr 1fr;gap:13px}.rp-field{display:grid;gap:6px}.rp-field.full{grid-column:1/-1}.rp-field label{font-size:11px;font-weight:750;color:var(--rp-muted)}.rp-field input,.rp-field textarea,.rp-field select{width:100%;background:var(--rp-bg);border:1px solid var(--rp-line);border-radius:9px;padding:11px;color:var(--rp-text);font:inherit;font-size:13px;outline:none}.rp-field textarea{min-height:86px;resize:vertical}.rp-file{border:1px dashed var(--rp-line);border-radius:11px;padding:16px;display:flex;align-items:center;gap:12px;cursor:pointer}.rp-file svg{color:#596fcb}.rp-file span{font-size:12px;color:var(--rp-muted);overflow-wrap:anywhere}.rp-submit{grid-column:1/-1;border:0;border-radius:10px;background:var(--rp-text);color:var(--rp-bg);font-weight:800;padding:13px;cursor:pointer}.rp-submit:disabled{opacity:.5;cursor:wait}
        @media(max-width:850px){.rp-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.rp-hero{grid-template-columns:1fr}.rp-explainGrid{grid-template-columns:1fr}.rp-steps{grid-template-columns:1fr 1fr}}
        @media(max-width:560px){.releasePage{padding:18px 14px 44px}.rp-top{margin-bottom:28px}.rp-brand{font-size:18px}.rp-hero h1{letter-spacing:-1.4px}.rp-hero p{font-size:13px}.rp-grid{grid-template-columns:1fr}.rp-tools{align-items:stretch}.rp-search{width:100%}.rp-steps{grid-template-columns:1fr}.rp-form{grid-template-columns:1fr}.rp-field.full{grid-column:auto}.rp-submit{grid-column:auto}.rp-footer{flex-direction:column}.rp-callout{padding:13px}}
      `}</style>

      <div className="rp-wrap">
        <div className="rp-top">
          <a className="rp-brand" href="/"><img src="/dbweb-logo.svg" alt="" />Dbweb</a>
          <a className="rp-back" href="/"><ArrowLeft size={15} /> Back to Dbweb</a>
        </div>

        <section className="rp-hero">
          <div>
            <div className="rp-kicker">Dbweb downloads & marketplace</div>
            <h1>Binge Dbweb</h1>
            <p>One place for official Dbweb releases. Find the main app, add new features with plugins, and install browser extensions. Every release includes its version, platform and notes.</p>
          </div>
          {admin && <button className="rp-admin" onClick={() => setUploadOpen(true)}><FilePlus2 size={16} /> Upload a release</button>}
        </section>

        <div className="rp-callout"><ShieldCheck size={19} /><div><strong>Official Dbweb downloads</strong><span>Only install packages published here by the Dbweb administrator. Check the version and platform before installing. Never install a package if you do not trust its source.</span></div></div>

        {notice && <div className="rp-alert">{notice}</div>}
        {error && <div className="rp-alert error">{error}</div>}

        <div className="rp-tools">
          <div className="rp-filters" aria-label="Filter downloads">
            {filters.map(item => <button key={item} className={"rp-filter " + (filter === item ? "active" : "")} onClick={() => setFilter(item)}>{item}</button>)}
          </div>
          <label className="rp-search"><Search size={15} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search releases..." /></label>
        </div>

        <div className="rp-grid">
          {loading ? <div className="rp-empty"><Package size={25} /><strong>Loading Dbweb releases</strong><p>Getting the latest app and extension packages…</p></div> :
            visible.length ? visible.map(item => {
              const Icon = iconFor(item.kind);
              return <article className="rp-card" key={item.id}>
                <div className="rp-cardtop"><div className="rp-icon"><Icon size={20} /></div><span className="rp-badge">{kindLabel[item.kind] || "Package"}</span></div>
                <h2>{item.title}</h2><p>{item.description}</p>{item.changelog && <details style={{fontSize:12,color:"var(--rp-muted)",marginBottom:8}}><summary style={{cursor:"pointer",fontWeight:700}}>What&apos;s new in this version</summary><p style={{marginTop:7,whiteSpace:"pre-wrap"}}>{item.changelog}</p></details>}
                <div className="rp-meta"><span>v{item.version}</span>{item.platform && <span>{item.platform}</span>}<span>{formatSize(item.fileSize)}</span><span>{new Date(item.createdAt).toLocaleDateString()}</span></div>
                <a className="rp-download" href={item.fileUrl} download={item.fileName}><ArrowDownToLine size={15} /> Download {item.fileName}</a>
                {admin && <button className="rp-delete" onClick={() => removeRelease(item.id)}><Trash2 size={14} /> Remove release</button>}
              </article>;
            }) : <div className="rp-empty"><FileArchive size={26} /><strong>{releases.length ? "No matching releases" : "No releases published yet"}</strong><p>{releases.length ? "Try another search or category." : admin ? "Upload your first Dbweb app, plugin or extension to get started." : "Official Dbweb packages will appear here when they are published."}</p></div>}
        </div>

        <section className="rp-explain">
          <div className="rp-sectionhead"><small>Understand the ecosystem</small><h2>What are these downloads?</h2><p>Each package has a different job. Here is how they fit together.</p></div>
          <div className="rp-explainGrid">
            <article className="rp-explainCard"><Smartphone size={22} /><h3>Dbweb app</h3><p>The main installable Dbweb application. Android releases are normally provided as APK files. Download the APK, open it on your Android device, review the install prompt and only continue if the publisher and package are trusted.</p></article>
            <article className="rp-explainCard"><Puzzle size={22} /><h3>Plugins</h3><p>Optional add-ons that connect extra capabilities to a supported Dbweb app. A plugin should list the app version it supports, what permissions it needs and what new feature it adds.</p></article>
            <article className="rp-explainCard"><Layers3 size={22} /><h3>Browser extensions</h3><p>Small browser add-ons that can change or extend browser behaviour. Chrome-based extensions may be distributed as ZIP or CRX packages; Firefox extensions commonly use XPI. Install only from a trusted release.</p></article>
          </div>
          <div className="rp-sectionhead" style={{marginTop:34}}><small>Quick guide</small><h2>How to use this page</h2></div>
          <div className="rp-steps">
            <div className="rp-step"><b>01 · Choose a category</b><p>Use Apps, Plugins or Extensions to narrow the catalogue.</p></div>
            <div className="rp-step"><b>02 · Check release details</b><p>Review the version, platform, file size and description before downloading.</p></div>
            <div className="rp-step"><b>03 · Install carefully</b><p>Follow the instructions for your device or browser. Keep older versions only when you need a rollback.</p></div>
          </div>
        </section>

        <footer className="rp-footer"><span>© {new Date().getFullYear()} Dbweb · Official release catalogue</span><span><a href="/docs">Documentation</a>　·　<a href="mailto:lumenomore@hotmail.com">Contact developer</a></span></footer>
      </div>

      {uploadOpen && admin && <div className="rp-modalback" onMouseDown={e => { if (e.target === e.currentTarget) setUploadOpen(false); }}>
        <section className="rp-modal" role="dialog" aria-modal="true" aria-labelledby="rp-upload-title">
          <div className="rp-modalhead"><h2 id="rp-upload-title">Publish a Dbweb release</h2><button className="rp-close" onClick={() => setUploadOpen(false)} aria-label="Close"><X size={20} /></button></div>
          <form className="rp-form" onSubmit={submitUpload}>
            <div className="rp-field"><label htmlFor="rp-title">Package name</label><input id="rp-title" required maxLength={100} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Dbweb for Android" /></div>
            <div className="rp-field"><label htmlFor="rp-version">Version</label><input id="rp-version" required maxLength={40} value={form.version} onChange={e => setForm({ ...form, version: e.target.value })} placeholder="1.0.0" /></div>
            <div className="rp-field"><label htmlFor="rp-kind">Release type</label><select id="rp-kind" value={form.kind} onChange={e => setForm({ ...form, kind: e.target.value })}><option value="app">App</option><option value="plugin">Plugin</option><option value="extension">Extension</option></select></div>
            <div className="rp-field"><label htmlFor="rp-platform">Platform</label><input id="rp-platform" maxLength={80} value={form.platform} onChange={e => setForm({ ...form, platform: e.target.value })} placeholder="Android / Chrome / Firefox" /></div>
            <div className="rp-field full"><label htmlFor="rp-description">Description</label><textarea id="rp-description" required maxLength={1200} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="What does this release do? Who is it for?" /></div>
            <div className="rp-field full"><label htmlFor="rp-changelog">What's new (optional)</label><textarea id="rp-changelog" maxLength={1600} value={form.changelog} onChange={e => setForm({ ...form, changelog: e.target.value })} placeholder="Bug fixes, new features, compatibility notes..." /></div>
            <div className="rp-field full"><label>Package file · maximum 100 MB</label><label className="rp-file"><UploadCloud size={22} /><span>{file ? file.name + " · " + formatSize(file.size) : "Choose APK, AAB, ZIP, CRX, XPI, JS, JSON or CSS"}</span><input ref={fileRef} hidden type="file" accept=".apk,.aab,.zip,.crx,.xpi,.js,.json,.css" onChange={e => setFile(e.target.files?.[0] || null)} /></label></div>
            <button className="rp-submit" type="submit" disabled={uploading}>{uploading ? "Uploading package…" : "Publish release"}</button>
          </form>
        </section>
      </div>}
    </div>
  );
}
