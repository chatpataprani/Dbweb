import { NextResponse } from "next/server";

const SEARCH_API = "https://archive.org/advancedsearch.php";
const COMMONS_API = "https://commons.wikimedia.org/w/api.php";
const CACHE_HEADERS = { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=900" };
const TIMEOUT_MS = 9000;
const ALLOWED_TYPES = new Set(["movie", "series"]);

function addonUrls() {
  return (process.env.STREMIO_ADDON_URLS || "")
    .split(",").map((value) => value.trim()).filter(Boolean)
    .filter((value) => {
      try {
        const url = new URL(value);
        return url.protocol === "https:" && !url.username && !url.password;
      } catch { return false; }
    }).slice(0, 8);
}

async function fetchJson(url) {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { Accept: "application/json" },
    cache: "no-store",
    redirect: "follow",
  });
  if (!response.ok) throw new Error(`Upstream returned ${response.status}`);
  return response.json();
}

function safeQuery(value) {
  return String(value || "").replace(/[^\p{L}\p{N}\s'-]/gu, " ").replace(/\s+/g, " ").trim().slice(0, 100);
}
function first(value) { return Array.isArray(value) ? value[0] : value; }
function reusableLicense(value) { return /^(public domain|cc0|cc by(?:-sa)?(?:\s+\d+(?:\.\d+)?)?)$/i.test(String(value || "").trim()); }
function plainText(value) { return String(value || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim(); }
function encodeCommonsItem(title) { return "commons:" + Buffer.from(title).toString("base64url"); }
function decodeCommonsItem(id) { try { return Buffer.from(id.slice(8), "base64url").toString("utf8"); } catch { return ""; } }
function encodeAddonItem(payload) { return "stremio:" + Buffer.from(JSON.stringify(payload)).toString("base64url"); }
function decodeAddonItem(id) {
  if (!String(id).startsWith("stremio:")) return null;
  try {
    const value = JSON.parse(Buffer.from(id.slice(8), "base64url").toString("utf8"));
    const addon = new URL(value.addon);
    if (addon.protocol !== "https:" || !ALLOWED_TYPES.has(value.type) || typeof value.itemId !== "string" || !value.itemId) return null;
    return value;
  } catch { return null; }
}
function addonRoot(manifestUrl) {
  const url = new URL(manifestUrl);
  url.search = "";
  url.hash = "";
  url.pathname = url.pathname.replace(/\/manifest\.json\/?$/i, "").replace(/\/+$/, "");
  return url.toString().replace(/\/+$/, "");
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
  const hint = String(stream.behaviorHints?.filename || stream.name || url).toLowerCase();
  const mime = String(stream.type || "").toLowerCase();
  return /\.(mp4|webm|m3u8)(?:[?#]|$)/i.test(hint) ||
    ["video/mp4", "video/webm", "application/vnd.apple.mpegurl", "application/x-mpegurl"].includes(mime);
}
function playableStreams(streams) {
  return (streams || []).filter(browserPlayable).map((stream) => ({
    name: stream.name || stream.title || "Stream",
    title: stream.title || stream.name || "Stream",
    url: safeMediaUrl(stream.url),
    type: stream.type || "",
  })).filter((stream) => stream.url).slice(0, 12);
}

async function searchAddons(query, category) {
  const configured = addonUrls();
  if (!configured.length) return [];
  const results = await Promise.allSettled(configured.map(async (addonUrl) => {
    const manifest = await fetchJson(addonUrl);
    const root = addonRoot(addonUrl);
    const catalogs = (manifest.catalogs || []).filter((catalog) => ALLOWED_TYPES.has(catalog.type) && catalog.id);
    const chosen = query
      ? catalogs.filter((catalog) => (catalog.extra || []).some((extra) => extra.name === "search"))
      : catalogs.filter((catalog) => category === "series" ? catalog.type === "series" : catalog.type === "movie");
    const items = await Promise.all(chosen.slice(0, 6).map(async (catalog) => {
      const type = encodeURIComponent(catalog.type);
      const id = encodeURIComponent(catalog.id);
      const extras = query ? "/" + new URLSearchParams({ search: query }).toString() : "";
      // Stremio search extras belong in the path, before .json—not in a query string.
      const data = await fetchJson(`${root}/catalog/${type}/${id}${extras}.json`);
      return (data.metas || []).filter((item) => item?.id).map((item) => ({
        id: encodeAddonItem({ addon: addonUrl, type: ALLOWED_TYPES.has(item.type) ? item.type : catalog.type, itemId: item.id }),
        title: item.name || item.title || item.id,
        year: String(item.releaseInfo || item.year || "").slice(0, 4),
        description: item.description || "",
        creator: manifest.name || "Third-party addon",
        poster: item.poster || item.background || "",
        media_type: ALLOWED_TYPES.has(item.type) ? item.type : catalog.type,
        source: manifest.name || "Third-party addon",
        external: true,
      }));
    }));
    return items.flat();
  }));
  const deduped = new Map();
  for (const result of results) {
    if (result.status !== "fulfilled") continue;
    for (const item of result.value) if (!deduped.has(item.id)) deduped.set(item.id, item);
  }
  return [...deduped.values()].slice(0, 36);
}

async function searchArchive({ query = "", category = "trending" }) {
  let extra = "";
  if (query) extra = `title:("${safeQuery(query)}")`;
  else if (category === "animation") extra = "(subject:animation OR subject:cartoons OR subject:anime)";
  else if (category === "shorts") extra = "(subject:short films OR subject:shorts)";
  const params = new URLSearchParams({
    q: ["mediatype:movies", "licenseurl:*creativecommons.org*", extra].filter(Boolean).join(" AND "),
    fl: "identifier,title,year,description,creator,licenseurl,collection,downloads,publicdate,subject",
    rows: "36", page: "1", output: "json", sort: "downloads desc",
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

async function searchWikimedia(query) {
  const params = new URLSearchParams({ action: "query", generator: "search", gsrsearch: ["filetype:video", query].filter(Boolean).join(" "), gsrnamespace: "6", gsrlimit: "40", prop: "imageinfo", iiprop: "url|mime|extmetadata", iiurlwidth: "420", format: "json", formatversion: "2" });
  const data = await fetchJson(`${COMMONS_API}?${params}`);
  return (data.query?.pages || []).map((page) => {
    const info = page.imageinfo?.[0];
    const ext = info?.extmetadata || {};
    const license = plainText(ext.LicenseShortName?.value || "");
    if (!info || !/^video\/(mp4|webm)$/i.test(info.mime || "") || !reusableLicense(license)) return null;
    return { id: encodeCommonsItem(page.title), title: page.title.replace(/^File:/i, ""), year: String(ext.DateTimeOriginal?.value || ext.DateTime?.value || "").slice(0, 4), description: plainText(ext.ImageDescription?.value || ""), creator: plainText(ext.Artist?.value || "") || "Wikimedia Commons contributor", licenseurl: ext.LicenseUrl?.value || "", poster: info.thumburl || "", media_type: "movie", source: "Wikimedia Commons" };
  }).filter(Boolean).slice(0, 24);
}

async function getCommonsDetails(id) {
  const title = decodeCommonsItem(id);
  if (!title || !title.startsWith("File:")) throw new Error("Invalid Wikimedia Commons item.");
  const params = new URLSearchParams({ action: "query", titles: title, prop: "imageinfo", iiprop: "url|mime|extmetadata", iiurlwidth: "640", format: "json", formatversion: "2" });
  const data = await fetchJson(`${COMMONS_API}?${params}`);
  const page = data.query?.pages?.[0];
  const info = page?.imageinfo?.[0];
  const ext = info?.extmetadata || {};
  const license = plainText(ext.LicenseShortName?.value || "");
  if (!info || !/^video\/(mp4|webm)$/i.test(info.mime || "") || !reusableLicense(license)) throw new Error("This Commons file is not a supported MP4/WebM video with a reusable license.");
  const videoUrl = safeMediaUrl(info.url || "");
  if (!videoUrl) throw new Error("This Commons video does not provide a secure HTTPS stream.");
  return { id, title: (page.title || title).replace(/^File:/i, ""), year: String(ext.DateTimeOriginal?.value || ext.DateTime?.value || "").slice(0, 4), description: plainText(ext.ImageDescription?.value || ""), creator: plainText(ext.Artist?.value || "") || "Wikimedia Commons contributor", licenseurl: ext.LicenseUrl?.value || "", poster: info.thumburl || "", videoUrl, media_type: "movie", source: "Wikimedia Commons" };
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
    return !file.private && (name.toLowerCase().endsWith(".mp4") || String(file.format || "").toLowerCase().includes("mpeg4")) &&
      Number(file.size || 0) > 0 && !name.startsWith("__ia_thumb");
  }).sort((a, b) => Number(b.size || 0) - Number(a.size || 0));
  const video = files[0];
  if (!video) throw new Error("No browser-compatible MP4 file was found for this film.");
  return {
    id: identifier, title: first(metadata.title) || identifier,
    year: String(first(metadata.year) || first(metadata.date) || "").slice(0, 4),
    description: Array.isArray(metadata.description) ? metadata.description.join("\n\n") : metadata.description || "",
    creator: Array.isArray(metadata.creator) ? metadata.creator.join(", ") : metadata.creator || "",
    licenseurl: metadata.licenseurl || metadata.license || "",
    poster: `https://archive.org/services/img/${encodeURIComponent(identifier)}`,
    videoUrl: `https://archive.org/download/${encodeURIComponent(identifier)}/${encodeURIComponent(video.name)}`,
    media_type: "movie", source: "Internet Archive",
  };
}

async function getAddonDetails(id, requestedEpisode = "") {
  const parsed = decodeAddonItem(id);
  const configured = addonUrls();
  if (!parsed || !configured.includes(parsed.addon)) throw new Error("This addon item is invalid or its source is not configured.");
  const root = addonRoot(parsed.addon);
  let title = parsed.itemId;
  let poster = "";
  let description = "Provided by a configured third-party Stremio-compatible addon.";
  let year = "";
  let videoId = parsed.itemId;
  let episodes = [];
  if (parsed.type === "series") {
    const meta = await fetchJson(`${root}/meta/series/${encodeURIComponent(parsed.itemId)}.json`);
    const item = meta.meta || {};
    title = item.name || item.title || title;
    poster = item.poster || item.background || "";
    description = item.description || description;
    year = String(item.releaseInfo || item.year || "").slice(0, 4);
    episodes = (item.videos || []).filter((video) => video?.id).map((video) => ({
      id: video.id, title: video.title || video.name || video.episode || video.id, released: video.released || "",
    }));
    if (!episodes.length) throw new Error("This addon did not provide episode IDs for this series.");
    const chosenEpisode = episodes.find((episode) => episode.id === requestedEpisode) || episodes[0];
    videoId = chosenEpisode.id;
    title = title + " — " + chosenEpisode.title;
  }
  const data = await fetchJson(`${root}/stream/${encodeURIComponent(parsed.type)}/${encodeURIComponent(videoId)}.json`);
  const streams = playableStreams(data.streams);
  if (!streams.length) throw new Error("This addon returned no direct HTTPS MP4, WebM, or HLS streams supported by Dbweb. Torrent and external-player links cannot play in the built-in player.");
  return {
    id, title, year, description, creator: "Third-party addon", poster,
    media_type: parsed.type, source: "Third-party addon", episodes, selectedEpisodeId: videoId,
    streams, videoUrl: streams[0].url, streamName: streams[0].name,
  };
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action") || "trending";
  try {
    if (action === "details") {
      const id = searchParams.get("id") || "";
      const details = id.startsWith("stremio:") ? await getAddonDetails(id, searchParams.get("episode") || "") : id.startsWith("commons:") ? await getCommonsDetails(id) : await getArchiveDetails(id);
      return NextResponse.json(details, { headers: CACHE_HEADERS });
    }
    const query = safeQuery(searchParams.get("q") || "");
    const category = searchParams.get("category") || "trending";
    const [archiveResults, commonsResults, addonResults] = await Promise.allSettled([
      searchArchive({ query, category }),
      searchWikimedia(query),
      searchAddons(query, category),
    ]);
    const archive = archiveResults.status === "fulfilled" ? archiveResults.value : [];
    const commons = commonsResults.status === "fulfilled" ? commonsResults.value : [];
    const addons = addonResults.status === "fulfilled" ? addonResults.value : [];
    const results = [...addons, ...archive, ...commons].slice(0, 60);
    if (!results.length && archiveResults.status === "rejected" && commonsResults.status === "rejected") throw archiveResults.reason;
    return NextResponse.json({
      results,
      source: "Internet Archive + Wikimedia Commons + configured Stremio-compatible addons",
      addonCount: addonUrls().length,
      addonWarning: addonUrls().length && !addons.length ? "Configured addons did not return searchable catalog results. Check their manifest and search support." : "",
      sourceStatus: { internetArchive: archiveResults.status === "fulfilled", wikimediaCommons: commonsResults.status === "fulfilled", configuredAddons: addonResults.status === "fulfilled" },
      licensedOnly: true,
    }, { headers: CACHE_HEADERS });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Could not load films." }, { status: 502 });
  }
}
