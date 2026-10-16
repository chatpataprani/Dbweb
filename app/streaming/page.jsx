"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Search, Play, Film, Tv, Sparkles, X, ExternalLink, Download, LoaderCircle, Star, Bookmark, BookmarkCheck } from "lucide-react";

const IMG = "https://image.tmdb.org/t/p/";
const kinds = [
  { id: "trending", label: "For you", icon: Sparkles },
  { id: "movies", label: "Movies", icon: Film },
  { id: "shows", label: "TV shows", icon: Tv },
  { id: "anime", label: "Anime", icon: Play },
];

function titleOf(item) { return item.title || item.name || item.original_title || item.original_name || "Untitled"; }
function yearOf(item) { return (item.release_date || item.first_air_date || "").slice(0, 4); }
function mediaOf(item) { return item.media_type === "tv" || item.first_air_date ? "tv" : "movie"; }

export default function StreamingPage() {
  const [tab, setTab] = useState("trending");
  const [items, setItems] = useState([]);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);
  const [detailBusy, setDetailBusy] = useState(false);
  const [saved, setSaved] = useState([]);
  const [savedOnly, setSavedOnly] = useState(false);

  useEffect(() => {
    try { setSaved(JSON.parse(localStorage.getItem("dbweb_stream_saved") || "[]")); } catch {}
  }, []);

  const load = useCallback(async (nextTab = tab, q = "") => {
    setBusy(true); setError("");
    try {
      const action = q.trim() ? "search" : nextTab === "anime" ? "anime" : "trending";
      const params = new URLSearchParams({ action });
      if (q.trim()) { params.set("q", q.trim()); params.set("type", "all"); }
      else if (nextTab !== "anime") params.set("category", nextTab);
      const response = await fetch("/api/streaming?" + params.toString());
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load titles.");
      const results = data.results || [];
      setItems(results.map(x => ({ ...x, media_type: x.media_type || (nextTab === "shows" || nextTab === "anime" ? "tv" : "movie") })));
    } catch (e) { setError(e.message); setItems([]); }
    finally { setBusy(false); }
  }, [tab]);

  useEffect(() => { load(tab); }, [tab, load]);

  async function openDetails(item) {
    const type = mediaOf(item);
    setSelected({ ...item, media_type: type }); setDetailBusy(true);
    try {
      const response = await fetch("/api/streaming?" + new URLSearchParams({ action: "details", type, id: String(item.id) }));
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Details unavailable.");
      setSelected({ ...data, media_type: type });
    } catch (e) { setError(e.message); }
    finally { setDetailBusy(false); }
  }

  function toggleSaved(item) {
    const type = mediaOf(item);
    const entry = { id: item.id, media_type: type, title: titleOf(item), poster_path: item.poster_path, vote_average: item.vote_average, release_date: item.release_date, first_air_date: item.first_air_date };
    const next = saved.some(x => x.id === entry.id && x.media_type === type)
      ? saved.filter(x => !(x.id === entry.id && x.media_type === type))
      : [entry, ...saved];
    setSaved(next);
    try { localStorage.setItem("dbweb_stream_saved", JSON.stringify(next)); } catch {}
  }

  const shown = savedOnly ? saved : items;
  const trailer = selected?.videos?.results?.find(v => v.site === "YouTube" && (v.type === "Trailer" || v.type === "Teaser"));
  const providers = selected?.["watch/providers"]?.results?.IN || selected?.["watch/providers"]?.results?.US;
  const providerList = [...(providers?.flatrate || []), ...(providers?.free || []), ...(providers?.ads || []), ...(providers?.rent || []), ...(providers?.buy || [])].filter((p, i, a) => a.findIndex(x => x.provider_id === p.provider_id) === i);
  const justWatch = selected ? "https://www.justwatch.com/in/search?q=" + encodeURIComponent(titleOf(selected)) : "#";

  return <main className="streamPage">
    <a className="streamBack" href="/"><ArrowLeft size={16}/> Back to Dbweb</a>
    <section className="streamHero">
      <div className="streamEyebrow"><Sparkles size={14}/> DBWEB ENTERTAINMENT</div>
      <h1>Find your next <span>watch.</span></h1>
      <p>Explore movies, anime and TV shows. Find trailers and check official streaming or download options.</p>
      <form className="streamSearch" onSubmit={e => { e.preventDefault(); load(tab, query); }}>
        <Search size={19}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search movies, anime or TV shows…" aria-label="Search titles"/>
        {query && <button type="button" className="streamClear" onClick={() => { setQuery(""); load(tab, ""); }} aria-label="Clear search"><X size={16}/></button>}
        <button className="streamSearchButton" type="submit">Search</button>
      </form>
      <div className="streamStats"><span><Film size={14}/> Movies</span><span><Play size={14}/> Anime</span><span><Tv size={14}/> TV shows</span><span><Bookmark size={14}/> Saved list</span></div>
    </section>

    <div className="streamToolbar">
      <div className="streamTabs">{kinds.map(({id,label,icon:Icon}) => <button key={id} className={tab === id && !savedOnly ? "active" : ""} onClick={() => { setSavedOnly(false); setTab(id); setQuery(""); }}>{<Icon size={15}/>} {label}</button>)}</div>
      <button className={"streamSaved " + (savedOnly ? "active" : "")} onClick={() => { setSavedOnly(v => !v); setQuery(""); if (savedOnly) load(tab, ""); }}><BookmarkCheck size={15}/> My list ({saved.length})</button>
    </div>

    {error && <div className="streamError" role="alert">{error}{error.includes("TMDB_READ_ACCESS_TOKEN") && <span> Add the token to Vercel Environment Variables, then redeploy.</span>}</div>}
    {busy && <div className="streamLoading"><LoaderCircle className="streamSpin" size={23}/> Loading titles…</div>}
    {!busy && !error && shown.length === 0 && <div className="streamEmpty"><Film size={28}/><strong>{savedOnly ? "Your list is empty" : "No titles found"}</strong><span>{savedOnly ? "Save a movie or show to find it here later." : "Try another search or category."}</span></div>}
    {!busy && shown.length > 0 && <section className="streamGrid" aria-label="Titles">{shown.map(item => {
      const isSaved = saved.some(x => x.id === item.id && x.media_type === mediaOf(item));
      return <article className="streamCard" key={item.media_type + "-" + item.id}>
        <button className="streamPosterButton" onClick={() => openDetails(item)} aria-label={"View " + titleOf(item)}>
          {item.poster_path ? <img src={IMG + "w500" + item.poster_path} alt={titleOf(item) + " poster"} loading="lazy"/> : <div className="streamNoPoster"><Film size={26}/></div>}
          <span className="streamPlay"><Play size={17} fill="currentColor"/></span>
          <span className="streamType">{mediaOf(item) === "tv" ? "SERIES" : "MOVIE"}</span>
        </button>
        <div className="streamCardInfo"><button className="streamTitle" onClick={() => openDetails(item)}>{titleOf(item)}</button><div className="streamMeta"><span>{yearOf(item) || "Year unknown"}</span><span><Star size={12} fill="currentColor"/> {Number(item.vote_average || 0).toFixed(1)}</span></div><button className="streamSaveIcon" onClick={() => toggleSaved(item)} aria-label={isSaved ? "Remove from list" : "Save to list"}>{isSaved ? <BookmarkCheck size={16}/> : <Bookmark size={16}/>}</button></div>
      </article>;
    })}</section>}

    <p className="streamLegal">Dbweb lists title metadata and official viewing options. Playback and downloads are available only through authorized providers or content you have permission to use.</p>

    {selected && <div className="streamModalBackdrop" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) setSelected(null); }}>
      <section className="streamModal" role="dialog" aria-modal="true" aria-label={titleOf(selected) + " details"}>
        <button className="streamModalClose" onClick={() => setSelected(null)} aria-label="Close details"><X size={19}/></button>
        <div className="streamDetailHero" style={selected.backdrop_path ? { backgroundImage: "linear-gradient(90deg,var(--stream-modal-bg),rgba(10,12,18,.45)),url(" + IMG + "w1280" + selected.backdrop_path + ")" } : {}}>
          <div className="streamDetailText"><span className="streamDetailBadge">{selected.media_type === "tv" ? "TV SHOW" : "MOVIE"}{selected.original_language ? " · " + selected.original_language.toUpperCase() : ""}</span><h2>{titleOf(selected)}</h2><p>{yearOf(selected)} {selected.vote_average ? " · ★ " + Number(selected.vote_average).toFixed(1) : ""}</p><p className="streamOverview">{selected.overview || "No description available."}</p><button className="streamDetailSave" onClick={() => toggleSaved(selected)}><Bookmark size={15}/> {saved.some(x => x.id === selected.id && x.media_type === selected.media_type) ? "Saved to My list" : "Add to My list"}</button></div>
        </div>
        <div className="streamModalBody">
          {detailBusy && <p className="streamHint"><LoaderCircle className="streamSpin" size={15}/> Loading availability…</p>}
          <h3>Watch legally</h3>
          {providerList.length > 0 ? <div className="streamProviders">{providerList.map(p => <div className="streamProvider" key={p.provider_id}>{p.logo_path && <img src={IMG + "w92" + p.logo_path} alt=""/>}<span>{p.provider_name}</span></div>)}</div> : <p className="streamHint">Provider availability was not returned by TMDB for this region. Check the official listing below.</p>}
          <a className="streamOfficialLink" href={justWatch} target="_blank" rel="noopener noreferrer"><ExternalLink size={16}/> Find official streaming, rental and purchase options <ArrowLeft size={14} className="streamExternalArrow"/></a>
          {trailer && <div className="streamTrailer"><h3>Trailer</h3><div className="streamVideo"><iframe src={"https://www.youtube-nocookie.com/embed/" + encodeURIComponent(trailer.key)} title={titleOf(selected) + " trailer"} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen/></div></div>}
          <div className="streamDownloadNote"><Download size={17}/><div><strong>Downloads</strong><p>Use the official app or store shown by the provider for offline downloads when supported. This site does not host or generate unauthorized copies.</p></div></div>
        </div>
      </section>
    </div>}
  </main>;
}
