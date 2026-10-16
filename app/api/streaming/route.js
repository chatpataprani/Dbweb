import { NextResponse } from "next/server";

const SEARCH_API = "https://archive.org/advancedsearch.php";
const CACHE_HEADERS = { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=900" };
const TIMEOUT_MS = 9000;

// Optional Stremio-compatible scraper/catalog addons. Configure one or more
// HTTPS manifest URLs in STREMIO_ADDON_URLS (comma-separated) in Vercel.
function addonUrls() {
  return (process.env.STREMIO_ADDON_URLS || "")
    .split(",").map((value) => value.trim()).filter(Boolean)
    .filter((value) => {
      try { return new URL(value).protocol === "https:"; } catch { return false; }
    }).slice(0, 8);
}

async function fetchJson(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS), headers: { Accept: "application/json" }, cache: "no-store" });
  if (!response.ok) throw new Error(`Upstream returned ${response.status}`);
  return response.json();
}

function safeQuery(value) {
  return value.replace(/[^\\p{L}\\p{N}\\s'-]/gu, " ").replace(/\\s+/g, " ").trim().slice(0, 100);
}
function first(value) { return Array.isArray(value) ? value[0] : value; }
function encodeAddonItem(payload) { return "stremio:" + Buffer.from(JSON.stringify(payload)).toString("base64url"); }
function decodeAddonItem(id) {
  if (!id.startsWith("stremio:")) return null;
  try {
    const value = JSON.parse(Buffer.from(id.slice(8), "base64url").toString("utf8"));
    if (!value || typeof value.addon !== "string" || !value.addon.startsWith("https://") || !["movie", "series"].includes(value.type) || typeof value.itemId !== "string") return null;
    return value;
  } catch { return null; }
}
function safeMediaUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password ? url.toString() : "";
  } catch { return ""; }
}
function browserPlayable(stream) {
  const url = safeMediaUrl(stream.url || "");
  if (!url) return false;
  const type = String(stream.behaviorHints?.filename || stream.name || url).toLowerCase();
  return /\\.(mp4|webm|m3u8)(?:[?#]|$)/i.test(type) || ["video/mp4", "video/webm", "application/vnd.apple.mpegurl", "application/x-mpegurl"].includes(String(stream.type || "").toLowerCase());
}

async function searchAddons(query, category) {
  const configured = addonUrls();
  if (!configured.length) return [];
  const results = await Promise.allSettled(configured.map(async (addonUrl) => {
    const manifest = await fetchJson(addonUrl);
    const root = addonUrl.replace(/\\/$/, "");
    const catalogs = (manifest.catalogs || []).filter((c) => ["movie", "series"].includes(c.type));
    const chosen = query
      ? catalogs.filter((c) => !c.extra || c.extra.some((e) => e.name === "search"))
      : catalogs.filter((c) => category === "series" ? c.type === "series" : c.type === "movie");
    const items = await Promise.all(chosen.slice(0, 4).map(async (catalog) => {
      const extra = query ? "?search=" + encodeURIComponent(query) : "";
      const data = await fetchJson(`${root}/catalog/${encodeURIComponent(catalog.type)}/${encodeURIComponent(catalog.id)}.json${extra}`);
      return (data.metas || []).map((item) => ({
        id: encodeAddonItem({ addon: root, type: item.type || catalog.type, itemId: item.id }),
        title: item.name || item.title || item.id,
        year: String(item.releaseInfo || item.year || "").slice(0, 4),
        description: item.description || "",
        creator: manifest.name || "Third-party addon",
        poster: item.poster || item.background || "",
        media_type: item.type || catalog.type,
        source: manifest.name || "Third-party addon",
        external: true
      }));
    }));
    return items.flat();
  }));
  const deduped = new Map();
  for (const result of results) if (result.status === "fulfilled") {
    for (const item of result.value) if (!deduped.has(item.id)) deduped.set(item.id, item);
  }
  return [...deduped.values()].slice(0, 36);
}

async function searchArchive({ query = "", category = "trending" }) {
  let extra = "";
  if (query) extra = `title:(${safeQuery(query)})`;
  else if (category === "animation") extra = "(subject:animation OR subject:cartoons OR subject:anime)";
  else if (category === "shorts") extra = "(subject:short films OR subject:shorts)";
  const params = new URLSearchParams({
    q: ["mediatype:movies", "licenseurl:*creativecommons.org*", extra].filter(Boolean).join(" AND "),
    fl: "identifier,title,year,description,creator,licenseurl,collection,downloads,publicdate,subject",
    rows: "36", page: "1", output: "json", sort: "downloads desc"
  });
  const response = await fetch(`${SEARCH_API}?${params}`, { signal: AbortSignal.timeout(TIMEOUT_MS), next: { revalidate: 600 } });
  if (!response.ok) throw new Error("The free movie catalogue is temporarily unavailable.");
  const data = await response.json();
  return (data.response?.docs || []).map((item) => ({
    id: item.identifier,
    title: first(item.title) || item.identifier,
    year: String(first(item.year) || "").slice(0, 4),
    description: first(item.description) || "",
    creator: first(item.creator) || "Internet Archive",
    licenseurl: first(item.licenseurl) || "",
    collection: item.collection || [],
    downloads: Number(item.downloads || 0),
    poster: `https://archive.org/services/img/${encodeURIComponent(item.identifier)}`,
    media_type: "movie",
    source: "Internet Archive",
  }));
}

async function getArchiveDetails(identifier) {
  if (!/^[a-zA-Z0-9._-]{1,180}$/.test(identifier)) throw new Error("Invalid archive item.");
  const response = await fetch(`https://archive.org/metadata/${encodeURIComponent(identifier)}`, { signal: AbortSignal.timeout(TIMEOUT_MS), next: { revalidate: 600 } });
  if (!response.ok) throw new Error("Could not load this film.");
  const data = await response.json();
  const metadata = data.metadata || {};
  const license = String(metadata.licenseurl || metadata.license || "").toLowerCase();
  const rights = String(metadata.rights || metadata.description || "").toLowerCase();
  if (!(license.includes("creativecommons.org") || rights.includes("creative commons") || rights.includes("public domain"))) {
    throw new Error("This item does not provide clear free-use licensing, so playback is unavailable.");
  }
  const files = (data.files || []).filter((file) => {
    const name = String(file.name || "");
    return !file.private && (name.toLowerCase().endsWith(".mp4") || String(file.format || "").toLowerCase().includes("mpeg4")) && Number(file.size || 0) > 0 && !name.startsWith("__ia_thumb");
  }).sort((a, b) => Number(b.size || 0) - Number(a.size || 0));
  const video = files[0];
  if (!video) throw new Error("No browser-compatible MP4 file was found for this film.");
  return {
    id: identifier, title: first(metadata.title) || identifier,
    year: String(first(metadata.year) || first(metadata.date) || "").slice(0, 4),
    description: Array.isArray(metadata.description) ? metadata.description.join("\\n\\n") : metadata.description || "",
    creator: Array.isArray(metadata.creator) ? metadata.creator.join(", ") : metadata.creator || "",
    licenseurl: metadata.licenseurl || metadata.license || "",
    poster: `https://archive.org/services/img/${encodeURIComponent(identifier)}`,
    videoUrl: `https://archive.org/download/${encodeURIComponent(identifier)}/${encodeURIComponent(video.name)}`,
    media_type: "movie", source: "Internet Archive"
  };
}

async function getAddonDetails(id) {
  const parsed = decodeAddonItem(id);
  if (!parsed || !addonUrls().includes(parsed.addon)) throw new Error("This addon item is invalid or its source is not configured.");
  const root = parsed.addon.replace(/\\/$/, "");
  const data = await fetchJson(`${root}/stream/${encodeURIComponent(parsed.type)}/${encodeURIComponent(parsed.itemId)}.json`);
  const streams = (data.streams || []).filter(browserPlayable).map((stream) => ({
    name: stream.name || stream.title || "Stream",
    title: stream.title || stream.name || "Stream",
    url: safeMediaUrl(stream.url),
    type: stream.type || "",
  })).filter((stream) => stream.url).slice(0, 12);
  if (!streams.length) throw new Error("The addon returned no direct HTTPS video streams supported by the built-in player. Torrent, external-player, and unsupported streams are skipped.");
  return {
    id, title: parsed.itemId, year: "", description: "Provided by a configured third-party Stremio-compatible addon.",
    creator: "Third-party addon", poster: "", media_type: parsed.type, source: "Third-party addon",
    streams, videoUrl: streams[0].url, streamName: streams[0].name,
  };
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action") || "trending";
  try {
    if (action === "details") {
      const id = searchParams.get("id") || "";
      const details = id.startsWith("stremio:") ? await getAddonDetails(id) : await getArchiveDetails(id);
      return NextResponse.json(details, { headers: CACHE_HEADERS });
    }
    const query = safeQuery(searchParams.get("q") || "");
    const category = searchParams.get("category") || "trending";
    const [archiveResults, addonResults] = await Promise.allSettled([
      searchArchive({ query, category }),
      searchAddons(query, category),
    ]);
    const archive = archiveResults.status === "fulfilled" ? archiveResults.value : [];
    const addons = addonResults.status === "fulfilled" ? addonResults.value : [];
    const results = [...addons, ...archive].slice(0, 48);
    if (!results.length && archiveResults.status === "rejected") throw archiveResults.reason;
    return NextResponse.json({
      results, source: "Internet Archive + configured Stremio-compatible addons",
      addonCount: addonUrls().length,
      addonWarning: addonUrls().length && !addons.length ? "Configured addons did not return searchable catalog results." : "",
      licensedOnly: true,
    }, { headers: CACHE_HEADERS });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Could not load films." }, { status: 502 });
  }
}
