import { NextResponse } from "next/server";

const SEARCH_API = "https://archive.org/advancedsearch.php";
const CACHE_HEADERS = { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=1800" };

// This catalogue is limited to Internet Archive movie items marked with a
// Creative Commons license. Dbweb does not proxy, store, or re-host video files.
function licensedQuery(extra = "") {
  return ["mediatype:movies", "licenseurl:*creativecommons.org*", extra].filter(Boolean).join(" AND ");
}

function safeQuery(value) {
  return value.replace(/[\\{}[\]^"~*?:/]/g, " ").replace(/\s+/g, " ").trim().slice(0, 100);
}

async function searchArchive({ query = "", category = "trending" }) {
  let extra = "";
  if (query) extra = `title:(${safeQuery(query)})`;
  else if (category === "animation") extra = "(subject:animation OR subject:cartoons OR subject:anime)";
  else if (category === "shorts") extra = "(subject:short films OR subject:shorts)";
  const params = new URLSearchParams({
    q: licensedQuery(extra),
    fl: "identifier,title,year,description,creator,licenseurl,collection,downloads,publicdate,subject",
    rows: "36",
    page: "1",
    output: "json",
    sort: "downloads desc"
  });
  const response = await fetch(`${SEARCH_API}?${params}`, { next: { revalidate: 600 } });
  if (!response.ok) throw new Error("The free movie catalogue is temporarily unavailable.");
  const data = await response.json();
  return (data.response?.docs || []).map((item) => ({
    id: item.identifier,
    title: Array.isArray(item.title) ? item.title[0] : item.title || item.identifier,
    year: String(item.year || "").slice(0, 4),
    description: Array.isArray(item.description) ? item.description[0] : item.description || "",
    creator: Array.isArray(item.creator) ? item.creator[0] : item.creator || "",
    licenseurl: Array.isArray(item.licenseurl) ? item.licenseurl[0] : item.licenseurl || "",
    collection: item.collection || [],
    downloads: Number(item.downloads || 0),
    poster: `https://archive.org/services/img/${encodeURIComponent(item.identifier)}`,
    media_type: "movie"
  }));
}

async function getDetails(identifier) {
  if (!/^[a-zA-Z0-9._-]{1,180}$/.test(identifier)) {
    throw new Error("Invalid archive item.");
  }
  const response = await fetch(`https://archive.org/metadata/${encodeURIComponent(identifier)}`, { next: { revalidate: 600 } });
  if (!response.ok) throw new Error("Could not load this film.");
  const data = await response.json();
  const metadata = data.metadata || {};
  const license = String(metadata.licenseurl || metadata.license || "").toLowerCase();
  const rights = String(metadata.rights || metadata.description || "").toLowerCase();
  const explicitlyLicensed = license.includes("creativecommons.org") ||
    rights.includes("creative commons") || rights.includes("public domain");
  if (!explicitlyLicensed) throw new Error("This item does not provide clear free-use licensing, so playback is unavailable.");

  const files = (data.files || []).filter((file) => {
    const name = String(file.name || "");
    const format = String(file.format || "").toLowerCase();
    return !file.private && (name.toLowerCase().endsWith(".mp4") || format.includes("mpeg4")) &&
      Number(file.size || 0) > 0 && !name.startsWith("__ia_thumb");
  }).sort((a, b) => Number(b.size || 0) - Number(a.size || 0));
  const video = files[0];
  if (!video) throw new Error("No browser-compatible MP4 file was found for this film.");
  return {
    id: identifier,
    title: Array.isArray(metadata.title) ? metadata.title[0] : metadata.title || identifier,
    year: String(metadata.year || metadata.date || "").slice(0, 4),
    description: Array.isArray(metadata.description) ? metadata.description.join("\n\n") : metadata.description || "",
    creator: Array.isArray(metadata.creator) ? metadata.creator.join(", ") : metadata.creator || "",
    licenseurl: metadata.licenseurl || metadata.license || "",
    poster: `https://archive.org/services/img/${encodeURIComponent(identifier)}`,
    videoUrl: `https://archive.org/download/${encodeURIComponent(identifier)}/${encodeURIComponent(video.name)}`,
    videoName: video.name,
    media_type: "movie"
  };
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action") || "trending";
  try {
    if (action === "details") {
      const id = searchParams.get("id") || "";
      const details = await getDetails(id);
      return NextResponse.json(details, { headers: CACHE_HEADERS });
    }
    const query = safeQuery(searchParams.get("q") || "");
    const category = searchParams.get("category") || "trending";
    const results = await searchArchive({ query, category });
    return NextResponse.json({ results, source: "Internet Archive", licensedOnly: true }, { headers: CACHE_HEADERS });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Could not load free films." }, { status: 502 });
  }
}
