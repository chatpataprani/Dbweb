"use client";

import { useCallback, useEffect, useRef, useState } from "react";\nimport Hls from "hls.js";
import { ArrowLeft, Search, Play, Film, Sparkles, X, LoaderCircle, Bookmark, BookmarkCheck, ExternalLink, ShieldCheck, Info, Tv } from "lucide-react";

const kinds = [
  { id: "trending", label: "Discover", icon: Sparkles },
  { id: "movies", label: "Movies", icon: Film },
  { id: "series", label: "Series", icon: Tv },
  { id: "animation", label: "Animation", icon: Play },
  { id: "shorts", label: "Short films", icon: Info },
];

function titleOf(item) { return item.title || item.name || item.id || "Untitled film"; }
function yearOf(item) { return String(item.year || "").slice(0, 4); }

export default function StreamingPage() {
  const [tab, setTab] = useState("trending");
  const [items, setItems] = useState([]);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);
  const [streamChoice, setStreamChoice] = useState("");\n  const [episodeChoice, setEpisodeChoice] = useState("");
  const [detailBusy, setDetailBusy] = useState(false);
  const [saved, setSaved] = useState([]);
  const [savedOnly, setSavedOnly] = useState(false);\n  const videoRef = useRef(null);

  useEffect(() => {
    try { setSaved(JSON.parse(localStorage.getItem("dbweb_stream_saved") || "[]")); } catch {}
  }, []);

  const load = useCallback(async (nextTab = tab, q = "") => {
    setBusy(true);
    setError("");
    try {
      const params = new URLSearchParams({ action: q.trim() ? "search" : "trending" });
      if (q.trim()) params.set("q", q.trim());
      else params.set("category", nextTab);
      const response = await fetch("/api/streaming?" + params.toString());
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load free films.");
      setItems(data.results || []);
    } catch (e) {
      setError(e.message || "Could not load free films.");
      setItems([]);
    } finally {
      setBusy(false);
    }
  }, [tab]);

  useEffect(() => { load(tab); }, [tab, load]);

  async function openDetails(item) {
    setStreamChoice("");
    setSelected({ ...item, videoUrl: "" });
    setDetailBusy(true);
    setError("");
    try {
      const response = await fetch("/api/streaming?" + new URLSearchParams({ action: "details", id: String(item.id) }));
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "This film cannot be played.");
      setSelected(data);
    } catch (e) {
      setSelected({ ...item, playerError: e.message || "This film cannot be played." });
    } finally {
      setDetailBusy(false);
    }
  }

  async function changeEpisode(item, episodeId) {
    setEpisodeChoice(episodeId);
    setStreamChoice("");
    setDetailBusy(true);
    try {
      const params = new URLSearchParams({ action: "details", id: String(item.id), episode: episodeId });
      const response = await fetch("/api/streaming?" + params.toString());
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load this episode.");
      setSelected(data);
      setEpisodeChoice(data.selectedEpisodeId || episodeId);
    } catch (e) {
      setSelected((current) => ({ ...current, playerError: e.message || "Could not load this episode." }));
    } finally {
      setDetailBusy(false);
    }
  }

  function toggleSaved(item) {
    const entry = { id: item.id, title: titleOf(item), poster: item.poster, year: item.year, creator: item.creator };
    const next = saved.some(x => x.id === entry.id)
      ? saved.filter(x => x.id !== entry.id)
      : [entry, ...saved];
    setSaved(next);
    try { localStorage.setItem("dbweb_stream_saved", JSON.stringify(next)); } catch {}
  }

  const shown = savedOnly ? saved : items;

  return <main className="streamPage">
    <a className="streamBack" href="/"><ArrowLeft size={16}/> Back to Dbweb</a>
    <section className="streamHero">
      <div className="streamEyebrow"><Sparkles size={14}/> DBWEB ENTERTAINMENT</div>
      <h1>Press play. <span>For free.</span></h1>
      <p>Search Internet Archive and configured third-party Stremio-compatible scraper addons. Compatible direct streams can play right here on Dbweb.</p>
      <form className="streamSearch" onSubmit={e => { e.preventDefault(); setSavedOnly(false); load(tab, query); }}>
        <Search size={19}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search movies and series…" aria-label="Search movies and series"/>
        {query && <button type="button" className="streamClear" onClick={() => { setQuery(""); setSavedOnly(false); load(tab, ""); }} aria-label="Clear search"><X size={16}/></button>}
        <button className="streamSearchButton" type="submit">Search</button>
      </form>
      <div className="streamStats"><span><Play size={14}/> In-page video player</span><span><ShieldCheck size={14}/> Multiple sources</span><span><Bookmark size={14}/> Saved list</span><span>No API key</span></div>
    </section>

    <div className="streamToolbar">
      <div className="streamTabs">{kinds.map(({id,label,icon:Icon}) => <button key={id} className={tab === id && !savedOnly ? "active" : ""} onClick={() => { setSavedOnly(false); setTab(id); setQuery(""); }}>{<Icon size={15}/>} {label}</button>)}</div>
      <button className={"streamSaved " + (savedOnly ? "active" : "")} onClick={() => { setSavedOnly(v => !v); setQuery(""); if (savedOnly) load(tab, ""); }}><BookmarkCheck size={15}/> My list ({saved.length})</button>
    </div>

    {error && <div className="streamError" role="alert">{error}</div>}
    {busy && !savedOnly && <div className="streamLoading"><LoaderCircle className="streamSpin" size={23}/> Loading free films…</div>}
    {!busy && !error && shown.length === 0 && <div className="streamEmpty"><Film size={28}/><strong>{savedOnly ? "Your list is empty" : "No films found"}</strong><span>{savedOnly ? "Save a film and it will appear here." : "Try another title or category. Some archive items do not have a browser-playable video."}</span></div>}
    {(!busy || savedOnly) && shown.length > 0 && <section className="streamGrid" aria-label="Free licensed films">{shown.map(item => {
      const isSaved = saved.some(x => x.id === item.id);
      return <article className="streamCard" key={item.id}>
        <button className="streamPosterButton" onClick={() => openDetails(item)} aria-label={"Watch " + titleOf(item)}>
          {item.poster ? <img src={item.poster} alt={titleOf(item) + " poster"} loading="lazy" onError={e => { e.currentTarget.style.display = "none"; }}/> : <div className="streamNoPoster"><Film size={26}/></div>}
          <span className="streamPlay"><Play size={17} fill="currentColor"/></span>
          <span className="streamType">{item.source || "FREE FILM"}</span>
        </button>
        <div className="streamCardInfo">
          <button className="streamTitle" onClick={() => openDetails(item)}>{titleOf(item)}</button>
          <div className="streamMeta"><span>{yearOf(item) || "Year unknown"}</span><span>{item.creator || "Internet Archive"}</span></div>
          <button className="streamSaveIcon" onClick={() => toggleSaved(item)} aria-label={isSaved ? "Remove from list" : "Save to list"}>{isSaved ? <BookmarkCheck size={16}/> : <Bookmark size={16}/>}</button>
        </div>
      </article>;
    })}</section>}

    <p className="streamLegal">Results can come from Internet Archive or configured third-party Stremio-compatible addons. Dbweb does not host or proxy videos. Addons may return torrents, external-player links, or unsupported formats; only direct HTTPS streams compatible with the built-in player are offered.</p>

    {selected && <div className="streamModalBackdrop" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) setSelected(null); }}>
      <section className="streamModal" role="dialog" aria-modal="true" aria-label={titleOf(selected) + " player"}>
        <button className="streamModalClose" onClick={() => setSelected(null)} aria-label="Close player"><X size={19}/></button>
        <div className="streamDetailHero" style={selected.poster ? { backgroundImage: "linear-gradient(90deg,var(--stream-modal-bg),rgba(10,12,18,.4)),url(" + selected.poster + ")" } : {}}>
          <div className="streamDetailText"><span className="streamDetailBadge">{selected.id?.startsWith("stremio:") ? (selected.source || "THIRD-PARTY SOURCE").toUpperCase() : "FREE-LICENSED ARCHIVE FILM"}</span><h2>{titleOf(selected)}</h2><p>{yearOf(selected)}{selected.creator ? " · " + selected.creator : ""}</p><p className="streamOverview">{selected.description || "No description supplied by the archive."}</p><button className="streamDetailSave" onClick={() => toggleSaved(selected)}><Bookmark size={15}/> {saved.some(x => x.id === selected.id) ? "Saved to My list" : "Add to My list"}</button></div>
        </div>
        <div className="streamModalBody">
          {detailBusy && <p className="streamHint"><LoaderCircle className="streamSpin" size={15}/> Checking rights and preparing player…</p>}
          {selected.episodes?.length > 1 && <label className="streamHint">Choose episode <select value={episodeChoice || selected.selectedEpisodeId || selected.episodes[0].id} onChange={e => changeEpisode(selected, e.target.value)}>{selected.episodes.map((episode, index) => <option key={episode.id} value={episode.id}>{episode.title || ("Episode " + (index + 1))}</option>)}</select></label>}
          {selected.streams?.length > 1 && <label className="streamHint">Choose source <select value={streamChoice || selected.streams[0].url} onChange={e => setStreamChoice(e.target.value)}>{selected.streams.map((stream, index) => <option key={stream.url} value={stream.url}>{stream.name || stream.title || ("Source " + (index + 1))}</option>)}</select></label>}
          {(selected.videoUrl || streamChoice) && <div className="streamArchivePlayer"><video ref={videoRef} key={streamChoice || selected.videoUrl} controls playsInline preload="metadata" src={isHlsSource ? undefined : playerSource} poster={selected.poster || undefined}>Your browser does not support HTML video.</video></div>}
          {selected.playerError && <p className="streamError" role="alert">{selected.playerError}</p>}
          {selected.licenseurl && <a className="streamOfficialLink" href={selected.licenseurl} target="_blank" rel="noopener noreferrer"><ExternalLink size={16}/> View this film's license <ArrowLeft size={14} className="streamExternalArrow"/></a>}
          <p className="streamHint"><Info size={15}/> If playback fails, the archive item may be unavailable or its video format may not be supported by your browser.</p>
          {selected.id?.startsWith("stremio:") ? <p className="streamHint"><Info size={15}/> Source: {selected.source || "Third-party addon"}</p> : <a className="streamOfficialLink" href={"https://archive.org/details/" + encodeURIComponent(selected.id)} target="_blank" rel="noopener noreferrer"><ExternalLink size={16}/> View item on Internet Archive <ArrowLeft size={14} className="streamExternalArrow"/></a>}
        </div>
      </section>
    </div>}
  </main>;
}
