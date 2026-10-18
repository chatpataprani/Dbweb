"use client";

import { useState } from "react";
import {
  ArrowLeft, Instagram, Search, ExternalLink, Users, Image as ImageIcon,
  FileText, UserRound, Download, Bookmark, BellRing, CheckCircle2, Clock3
} from "lucide-react";

const SNAPSHOT_PREFIX = "dbweb_ig_snapshot_v1:";
const TRACK_PREFIX = "dbweb_ig_tracking_v1:";

function cleanHandle(value) {
  return String(value || "").trim().replace(/^@+/, "").toLowerCase();
}

function parseCount(value) {
  if (value === null || value === undefined || value === "" || value === "Unavailable") return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const raw = String(value).replace(/,/g, "").trim();
  const match = raw.match(/^([\d.]+)\s*([KMB])?$/i);
  if (!match) return null;
  const multiplier = { K: 1e3, M: 1e6, B: 1e9 }[(match[2] || "").toUpperCase()] || 1;
  const number = Number(match[1]) * multiplier;
  return Number.isFinite(number) ? number : null;
}

function snapshotOf(profile) {
  return {
    username: profile.username,
    fullName: profile.fullName,
    followers: profile.followers,
    following: profile.following,
    posts: profile.posts,
    bio: profile.bio,
    website: profile.website,
    category: profile.category,
    verified: profile.verified,
    photoUrl: profile.photoUrl || null,
    capturedAt: profile.dataCapturedAt || new Date().toISOString()
  };
}

function compareSnapshots(previous, current) {
  const changes = [];
  for (const key of ["followers", "following", "posts"]) {
    const before = parseCount(previous?.[key]);
    const after = parseCount(current?.[key]);
    if (before !== null && after !== null && before !== after) {
      changes.push({
        label: key === "followers" ? "Followers" : key === "following" ? "Following" : "Posts",
        before: previous[key],
        after: current[key],
        difference: after - before
      });
    }
  }
  if (previous?.bio !== current.bio) changes.push({ label: "Bio", before: previous?.bio || "(empty)", after: current.bio || "(empty)" });
  if ((previous?.website || "") !== (current.website || "")) changes.push({ label: "Website", before: previous?.website || "(empty)", after: current.website || "(empty)" });
  if (Boolean(previous?.verified) !== Boolean(current.verified)) changes.push({ label: "Verified status", before: previous?.verified ? "Yes" : "No", after: current.verified ? "Yes" : "No" });
  if ((previous?.photoUrl || "") !== (current.photoUrl || "")) changes.push({ label: "Profile picture URL", before: "Previous picture", after: "Picture URL changed" });
  return changes;
}

function downloadBlob(blob, filename) {
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

export default function InstagramAnalyzerPage() {
  const [username, setUsername] = useState("");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [includeTimestamp, setIncludeTimestamp] = useState(true);
  const [tracking, setTracking] = useState(false);
  const [changes, setChanges] = useState(null);
  const [downloadBusy, setDownloadBusy] = useState(false);
  const [trackMessage, setTrackMessage] = useState("");

  async function analyze(event) {
    event.preventDefault();
    const clean = cleanHandle(username);
    if (!clean) return;
    setBusy(true);
    setError("");
    setData(null);
    setChanges(null);
    setTrackMessage("");
    try {
      const response = await fetch("/api/instagram?username=" + encodeURIComponent(clean), { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not load this profile.");
      const resultWithTimestamp = { ...result, dataCapturedAt: new Date().toISOString() };
      setData(resultWithTimestamp);
      const handle = cleanHandle(resultWithTimestamp.username || clean);
      const isTracking = window.localStorage.getItem(TRACK_PREFIX + handle) === "1";
      setTracking(isTracking);
      if (isTracking) {
        const key = SNAPSHOT_PREFIX + handle;
        const previous = JSON.parse(window.localStorage.getItem(key) || "null");
        const current = snapshotOf(resultWithTimestamp);
        if (previous) {
          setChanges(compareSnapshots(previous, current));
          setTrackMessage("Compared with your previous saved check. The latest check is now saved.");
        } else {
          setChanges([]);
          setTrackMessage("Tracking started. This check is your baseline; analyze again another day to compare.");
        }
        window.localStorage.setItem(key, JSON.stringify(current));
      }
    } catch (e) {
      setError(e.message || "Could not load this profile.");
    } finally {
      setBusy(false);
    }
  }

  function saveSnapshot() {
    if (!data) return;
    try {
      const handle = cleanHandle(data.username);
      window.localStorage.setItem(SNAPSHOT_PREFIX + handle, JSON.stringify(snapshotOf(data)));
      window.localStorage.setItem(TRACK_PREFIX + handle, "1");
      setTracking(true);
      setChanges(null);
      setTrackMessage("Saved this profile as your baseline. Analyze it again later to check what changed.");
    } catch {
      setTrackMessage("Could not save in this browser. Check that browser storage is enabled.");
    }
  }

  function stopTracking() {
    if (!data) return;
    window.localStorage.removeItem(TRACK_PREFIX + cleanHandle(data.username));
    setTracking(false);
    setTrackMessage("Change tracking is off. Your last saved snapshot remains in this browser.");
  }

  function downloadFullInfo() {
    if (!data) return;
    const exported = { ...data };
    if (includeTimestamp) exported.dataCapturedAt = data.dataCapturedAt || new Date().toISOString();
    else delete exported.dataCapturedAt;
    const suffix = includeTimestamp ? "-" + (data.dataCapturedAt || new Date().toISOString()).replace(/[:.]/g, "-") : "";
    downloadBlob(new Blob([JSON.stringify(exported, null, 2)], { type: "application/json;charset=utf-8" }), "instagram-" + cleanHandle(data.username) + "-info" + suffix + ".json");
  }

  function createPdfReport() {
    if (!data) return;
    const reportWindow = window.open("", "_blank");
    if (!reportWindow) {
      setError("Your browser blocked the report window. Allow pop-ups for this site and try again.");
      return;
    }
    const esc = value => String(value ?? "Unavailable").replace(/[&<>"']/g, char => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[char]));
    const capturedAt = data.dataCapturedAt ? new Date(data.dataCapturedAt).toLocaleString() : new Date().toLocaleString();
    const timestampRow = includeTimestamp ? `<p class="timestamp"><b>Data captured:</b> ${esc(capturedAt)}</p>` : "";
    const avatar = data.photoUrl
      ? `<img class="avatar" src="${esc(window.location.origin + "/api/instagram/avatar?url=" + encodeURIComponent(data.photoUrl))}" alt="Instagram profile picture" />`
      : `<div class="avatar placeholder">No profile picture available</div>`;
    const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Instagram report - ${esc(data.username)}</title>
      <style>
        *{box-sizing:border-box}body{font-family:Arial,Helvetica,sans-serif;color:#172033;margin:0;padding:32px;background:#f4f6fa}
        .sheet{max-width:760px;margin:0 auto;background:white;padding:34px;border-radius:18px;box-shadow:0 8px 35px #17203312}
        .top{display:flex;align-items:center;gap:22px;border-bottom:1px solid #e5e7eb;padding-bottom:24px}
        .avatar{width:116px;height:116px;border-radius:50%;object-fit:cover;background:#f1f5f9;border:1px solid #e5e7eb;flex-shrink:0}
        .placeholder{display:flex;align-items:center;justify-content:center;text-align:center;font-size:12px}
        .eyebrow{font-size:11px;letter-spacing:1.5px;color:#64748b;font-weight:bold}
        h1{font-size:26px;margin:8px 0 5px;overflow-wrap:anywhere}a{color:#4f46e5;overflow-wrap:anywhere}.handle{color:#64748b;margin:0 0 12px}
        .stats{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:22px 0}
        .stat{border:1px solid #e5e7eb;border-radius:12px;padding:15px}.stat span{display:block;color:#64748b;font-size:12px;margin-bottom:7px}.stat strong{font-size:20px;overflow-wrap:anywhere}
        h2{font-size:16px;margin:24px 0 8px}.field{white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.6;margin:0}
        .meta{display:grid;grid-template-columns:150px 1fr;gap:10px;border-top:1px solid #eef0f4;padding:11px 0;font-size:13px}
        .meta b{color:#64748b}.timestamp{font-size:12px;color:#64748b;margin-top:20px}.foot{margin-top:28px;padding-top:14px;border-top:1px solid #e5e7eb;color:#64748b;font-size:11px}
        .actions{max-width:760px;margin:0 auto 16px;display:flex;gap:10px}.actions button{border:0;border-radius:9px;padding:12px 16px;background:#4338ca;color:white;font-weight:bold;cursor:pointer}
        @media print{body{padding:0;background:white}.sheet{box-shadow:none;border-radius:0;padding:10px;max-width:none}.actions{display:none}@page{size:auto;margin:14mm}}
        @media(max-width:520px){body{padding:12px}.sheet{padding:18px}.top{align-items:flex-start;gap:14px}.avatar{width:82px;height:82px}h1{font-size:21px}.stats{gap:6px}.stat{padding:9px}.stat strong{font-size:15px}.meta{grid-template-columns:110px 1fr}}
      </style></head><body>
      <div class="actions"><button onclick="window.print()">Print / Save as PDF</button><button onclick="window.close()">Close</button></div>
      <article class="sheet"><header class="top">${avatar}<div><div class="eyebrow">DBWEB · INSTAGRAM PROFILE REPORT</div><h1>${esc(data.fullName)}</h1><p class="handle">@${esc(data.username)}</p><a href="${esc(data.profileUrl)}">${esc(data.profileUrl)}</a></div></header>
      <section class="stats"><div class="stat"><span>Followers</span><strong>${esc(data.followers)}</strong></div><div class="stat"><span>Following</span><strong>${esc(data.following)}</strong></div><div class="stat"><span>Posts</span><strong>${esc(data.posts)}</strong></div></section>
      <h2>Profile information</h2>
      <div class="meta"><b>Full name</b><span>${esc(data.fullName)}</span></div>
      <div class="meta"><b>Username</b><span>@${esc(data.username)}</span></div>
      <div class="meta"><b>Verified</b><span>${data.verified ? "Yes" : "No / unavailable"}</span></div>
      <div class="meta"><b>Category</b><span>${esc(data.category || "Unavailable")}</span></div>
      <div class="meta"><b>Website</b><span>${data.website ? `<a href="${esc(data.website)}">${esc(data.website)}</a>` : "Unavailable"}</span></div>
      <h2>Bio</h2><p class="field">${esc(data.bio || "Unavailable")}</p>
      ${timestampRow}<footer class="foot">Generated by Dbweb Instagram Profile Analyzer. Public data may be incomplete or change over time. This report reflects the information available when analyzed.</footer></article>
      <script>const img=document.querySelector(".avatar[src]");if(img){img.onload=()=>setTimeout(()=>window.print(),250);img.onerror=()=>setTimeout(()=>window.print(),500);setTimeout(()=>{if(!img.complete)window.print()},2500)}else{setTimeout(()=>window.print(),250)}</script>
      </body></html>`;
    reportWindow.document.open();
    reportWindow.document.write(html);
    reportWindow.document.close();
  }

  async function downloadProfilePicture() {
    if (!data?.photoUrl) return;
    setDownloadBusy(true);
    setError("");
    try {
      const response = await fetch("/api/instagram/avatar?url=" + encodeURIComponent(data.photoUrl), { cache: "no-store" });
      if (!response.ok) throw new Error("Could not download this profile picture. Try opening it directly.");
      const blob = await response.blob();
      const extension = blob.type.includes("png") ? "png" : blob.type.includes("webp") ? "webp" : "jpg";
      downloadBlob(blob, "instagram-" + cleanHandle(data.username) + "-profile-picture." + extension);
    } catch (e) {
      setError(e.message || "Could not download the profile picture.");
    } finally {
      setDownloadBusy(false);
    }
  }

  return <main className="igPage">
    <a className="igBack" href="/tools"><ArrowLeft size={16}/> All tools</a>
    <section className="igHero">
      <span className="igBadge"><Instagram size={15}/> DBWEB TOOL</span>
      <h1>Instagram Profile Analyzer</h1>
      <p>Analyze public profile stats, bio, profile picture and available business details. No Instagram login required; results depend on public data access.</p>
      <form className="igSearch" onSubmit={analyze}>
        <span className="igAt">@</span>
        <input value={username} onChange={e => setUsername(e.target.value)} placeholder="Enter Instagram username" aria-label="Instagram username" autoCapitalize="none" autoCorrect="off" maxLength={31} required />
        <button className="primary" disabled={busy}>{busy ? <span className="igLoading"/> : <Search size={17}/>} {busy ? "Checking…" : "Analyze"}</button>
      </form>
      {error && <div className="error" role="alert">{error}</div>}
    </section>

    {busy && <section className="igSkeletonWrap" role="status" aria-live="polite" aria-label="Loading Instagram profile">
      <style jsx>{`
        .igSkeletonWrap{width:100%;max-width:520px;margin:24px auto 0;padding:18px;background:var(--card,#fff);border:1px solid var(--border,#e5e7eb);border-radius:16px;box-shadow:0 8px 28px rgba(15,23,42,.08);color:var(--foreground,#172033)}
        .igSkeletonHead{display:flex;align-items:center;gap:15px}
        .igSkeletonAvatar,.igSkeletonLine{background:linear-gradient(120deg,#e5e5e5 30%,#f0f0f0 38%,#f0f0f0 40%,#e5e5e5 48%);background-size:200% 100%;animation:igSkeletonShimmer 1.6s ease-in-out infinite}
        .igSkeletonAvatar{width:70px;height:70px;flex:0 0 70px;border-radius:50%}
        .igSkeletonDetails{flex:1;min-width:0;display:grid;gap:10px}
        .igSkeletonLine{height:10px;border-radius:5px}
        .igSkeletonTitle{width:min(65%,180px)}
        .igSkeletonDescription{height:42px;width:100%;margin-top:2px}
        .igSkeletonStats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:18px}
        .igSkeletonStat{height:48px;border-radius:9px}
        .igSkeletonCaption{font-size:13px;line-height:1.5;color:var(--muted-foreground,#64748b);margin:15px 0 0}
        @keyframes igSkeletonShimmer{to{background-position:-100% 0}}
        @media(prefers-reduced-motion:reduce){.igSkeletonAvatar,.igSkeletonLine{animation:none}}
      `}</style>
      <div className="igSkeletonHead">
        <div className="igSkeletonAvatar" />
        <div className="igSkeletonDetails">
          <div className="igSkeletonLine igSkeletonTitle" />
          <div className="igSkeletonLine" style={{width:"82%"}} />
          <div className="igSkeletonLine" style={{width:"54%"}} />
        </div>
      </div>
      <div className="igSkeletonLine igSkeletonDescription" />
      <div className="igSkeletonStats"><div className="igSkeletonLine igSkeletonStat"/><div className="igSkeletonLine igSkeletonStat"/><div className="igSkeletonLine igSkeletonStat"/></div>
      <p className="igSkeletonCaption">Loading public profile details…</p>
    </section>}

    {data && <section className="card igResult">
      <div className="igProfileHead">
        <div className="igAvatar">{data.photoUrl ? <img src={"/api/instagram/avatar?url=" + encodeURIComponent(data.photoUrl)} alt={data.username + " profile picture"} referrerPolicy="no-referrer"/> : <UserRound size={36}/>}</div>
        <div className="igProfileIdentity"><span>INSTAGRAM PROFILE</span><h2>{data.fullName}</h2><p>@{data.username}</p><a href={data.profileUrl} target="_blank" rel="noreferrer">Open profile <ExternalLink size={14}/></a></div>
      </div>
      <div className="igStats">
        <div><Users size={18}/><span>Followers</span><strong>{data.followers}</strong></div>
        <div><UserRound size={18}/><span>Following</span><strong>{data.following}</strong></div>
        <div><FileText size={18}/><span>Posts</span><strong>{data.posts}</strong></div>
      </div>
      {(data.bio || data.category || data.website || data.verified) && <div className="igNotice"><strong>{data.verified ? "Verified account" : data.category || "Public profile details"}</strong>{data.bio && <p style={{whiteSpace:"pre-wrap",margin:"8px 0 0"}}>{data.bio}</p>}{data.website && <p style={{margin:"8px 0 0"}}><a href={data.website} target="_blank" rel="noreferrer">{data.website}</a></p>}</div>}
      <div className="igPhotoLink">{data.photoUrl ? <a href={data.photoUrl} target="_blank" rel="noreferrer"><ImageIcon size={16}/> Open profile picture <ExternalLink size={13}/></a> : <span>Profile picture unavailable</span>}</div>
      {data.note && <p className="igNotice" role="status">{data.note}</p>}
      {data.limited && <a className="igOpenProfile" href={data.profileUrl} target="_blank" rel="noreferrer">Open @{data.username} on Instagram <ExternalLink size={14}/></a>}

      <div style={{marginTop:20,borderTop:"1px solid var(--border, #e5e7eb)",paddingTop:18}}>
        <h3 style={{margin:"0 0 6px",fontSize:17}}>Download options</h3>
        <p style={{fontSize:13,lineHeight:1.5,margin:"0 0 13px",opacity:.8}}>Choose a format. JSON contains data only; the PDF report includes the profile picture and readable profile details.</p>
        <label style={{display:"flex",alignItems:"center",gap:9,fontSize:13,marginBottom:13,cursor:"pointer"}}>
          <input type="checkbox" checked={includeTimestamp} onChange={e => setIncludeTimestamp(e.target.checked)}/>
          Include data capture date & time
        </label>
        <div style={{display:"flex",flexWrap:"wrap",gap:9}}>
          <button type="button" className="primary" onClick={downloadFullInfo}><Download size={16}/> Download JSON (data only)</button>
          <button type="button" className="primary" onClick={createPdfReport}><FileText size={16}/> Create PDF report (with PFP)</button>
          <button type="button" className="primary" onClick={downloadProfilePicture} disabled={!data.photoUrl || downloadBusy}><ImageIcon size={16}/> {downloadBusy ? "Preparing picture…" : "Download PFP only"}</button>
        </div>
        <p style={{fontSize:12,lineHeight:1.5,margin:"10px 0 0",opacity:.7}}>For PDF: in the print screen, choose “Save as PDF” as the destination. Date & time is included in the report only when the checkbox above is selected.</p>
      </div>

      <div style={{marginTop:22,borderTop:"1px solid var(--border, #e5e7eb)",paddingTop:18}}>
        <h3 style={{margin:"0 0 7px",fontSize:17}}><Clock3 size={17} style={{display:"inline",verticalAlign:"-3px",marginRight:7}}/>Remember & compare later</h3>
        <p style={{fontSize:13,lineHeight:1.6,margin:"0 0 12px",opacity:.8}}>Save a baseline in this browser, then analyze the same username another day. Dbweb will compare available follower, following and post counts, plus public profile details.</p>
        <div style={{display:"flex",flexWrap:"wrap",gap:9}}>
          {!tracking
            ? <button type="button" className="primary" onClick={saveSnapshot}><Bookmark size={16}/> Save & track changes</button>
            : <button type="button" className="primary" onClick={stopTracking}><BellRing size={16}/> Stop tracking</button>}
        </div>
        {trackMessage && <p role="status" style={{fontSize:13,lineHeight:1.5,margin:"12px 0 0"}}><CheckCircle2 size={15} style={{display:"inline",verticalAlign:"-3px",marginRight:6}}/>{trackMessage}</p>}
        {changes && <div className="igNotice" style={{marginTop:12}}>
          <strong>{changes.length ? "Changes found since the previous check" : "No changes found in the available fields"}</strong>
          {changes.length > 0 && <ul style={{paddingLeft:20,margin:"8px 0 0"}}>
            {changes.map((change, index) => <li key={change.label + index} style={{marginBottom:7}}>
              <b>{change.label}:</b> {change.before} → {change.after}
              {typeof change.difference === "number" && <span> ({change.difference > 0 ? "+" : ""}{change.difference.toLocaleString("en-US")})</span>}
            </li>)}
          </ul>}
          <p style={{fontSize:12,margin:"10px 0 0",opacity:.8}}>This compares public profile fields and counts, not the actual list of individual followers or accounts followed. Results can be incomplete if Instagram limits public data.</p>
        </div>}
        <p style={{fontSize:12,lineHeight:1.5,margin:"12px 0 0",opacity:.7}}>Saved snapshots stay in this browser/device only. Dbweb does not automatically check profiles in the background or send notifications; open this tool and analyze again to compare.</p>
      </div>
    </section>}
  </main>;
}
