"use client";

import { useState } from "react";
import { ArrowLeft, Instagram, Search, ExternalLink, Users, Image as ImageIcon, FileText, UserRound } from "lucide-react";

export default function InstagramAnalyzerPage() {
  const [username, setUsername] = useState("");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function analyze(event) {
    event.preventDefault();
    const clean = username.trim().replace(/^@+/, "");
    if (!clean) return;
    setBusy(true);
    setError("");
    setData(null);
    try {
      const response = await fetch("/api/instagram?username=" + encodeURIComponent(clean), { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not load this profile.");
      setData(result);
    } catch (e) {
      setError(e.message || "Could not load this profile.");
    } finally {
      setBusy(false);
    }
  }

  return <main className="igPage">
    <a className="igBack" href="/tools"><ArrowLeft size={16}/> All tools</a>
    <section className="igHero">
      <span className="igBadge"><Instagram size={15}/> DBWEB TOOL</span>
      <h1>Instagram Profile Analyzer</h1>
      <p>View public profile details and profile picture.</p>
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
        <div className="igAvatar">{data.photoUrl ? <img src={data.photoUrl} alt={data.username + " profile picture"} referrerPolicy="no-referrer"/> : <UserRound size={36}/>}</div>
        <div className="igProfileIdentity"><span>INSTAGRAM PROFILE</span><h2>{data.fullName}</h2><p>@{data.username}</p><a href={data.profileUrl} target="_blank" rel="noreferrer">Open profile <ExternalLink size={14}/></a></div>
      </div>
      <div className="igStats">
        <div><Users size={18}/><span>Followers</span><strong>{data.followers}</strong></div>
        <div><UserRound size={18}/><span>Following</span><strong>{data.following}</strong></div>
        <div><FileText size={18}/><span>Posts</span><strong>{data.posts}</strong></div>
      </div>
      <div className="igPhotoLink">{data.photoUrl ? <a href={data.photoUrl} target="_blank" rel="noreferrer"><ImageIcon size={16}/> Open profile picture <ExternalLink size={13}/></a> : <span>Profile picture unavailable</span>}</div>
    </section>}
    <p className="igFootnote">Only public profile information is requested. Instagram may limit requests, and some profiles may not return complete details.</p>
  </main>;
}
