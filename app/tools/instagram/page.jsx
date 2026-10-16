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

    {busy && <section className="card igLoadingCard"><span className="igLoading large"/><div><strong>Loading public profile</strong><p>Requesting profile details from Instagram…</p></div></section>}

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
        <h3 style={{margin:"0 0 10px",fontSize:17}}>Downloads</h3>
        <label style={{display:"flex",alignItems:"center",gap:9,fontSize:13,marginBottom:13,cursor:"pointer"}}>
          <input type="checkbox" checked={includeTimestamp} onChange={e => setIncludeTimestamp(e.target.checked)}/>
          Include date and time of data capture in the full-info file
        </label>
        <div style={{display:"flex",flexWrap:"wrap",gap:9}}>
          <button type="button" className="primary" onClick={downloadFullInfo}><Download size={16}/> Download full info (.json)</button>
          <button type="button" className="primary" onClick={downloadProfilePicture} disabled={!data.photoUrl || downloadBusy}><ImageIcon size={16}/> {downloadBusy ? "Preparing picture…" : "Download PFP"}</button>
        </div>
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
