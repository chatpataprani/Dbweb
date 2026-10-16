import { NextResponse } from "next/server";

const API = "https://api.themoviedb.org/3";
const headers = () => {
  const token = process.env.TMDB_READ_ACCESS_TOKEN;
  if (!token) throw new Error("TMDB_READ_ACCESS_TOKEN is not configured in Vercel.");
  return { Authorization: `Bearer ${token}`, accept: "application/json" };
};

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action") || "trending";
  const query = (searchParams.get("q") || "").trim().slice(0, 100);
  const type = searchParams.get("type") || "all";
  const id = searchParams.get("id");
  const media = type === "movie" || type === "tv" ? type : "all";

  try {
    let path;
    const params = new URLSearchParams({ language: "en-US", page: "1" });

    if (action === "search") {
      if (!query) return NextResponse.json({ results: [] });
      if (media === "all") {
        const [movies, shows] = await Promise.all([
          fetch(`${API}/search/movie?${new URLSearchParams({ ...Object.fromEntries(params), query })}`, { headers: headers(), next: { revalidate: 300 } }),
          fetch(`${API}/search/tv?${new URLSearchParams({ ...Object.fromEntries(params), query })}`, { headers: headers(), next: { revalidate: 300 } })
        ]);
        if (!movies.ok || !shows.ok) throw new Error("TMDB search request failed.");
        const [m, t] = await Promise.all([movies.json(), shows.json()]);
        return NextResponse.json({ results: [...(m.results || []).map(x => ({ ...x, media_type: "movie" })), ...(t.results || []).map(x => ({ ...x, media_type: "tv" }))].sort((a,b) => (b.popularity||0)-(a.popularity||0)).slice(0, 30) });
      }
      path = `/search/${media}?${new URLSearchParams({ ...Object.fromEntries(params), query })}`;
    } else if (action === "details" && id && (type === "movie" || type === "tv")) {
      path = `/${type}/${encodeURIComponent(id)}?${new URLSearchParams({ language: "en-US", append_to_response: "videos,watch/providers,credits" })}`;
    } else if (action === "anime") {
      path = `/discover/tv?${new URLSearchParams({ ...Object.fromEntries(params), with_genres: "16", with_original_language: "ja", sort_by: "popularity.desc" })}`;
    } else {
      const category = searchParams.get("category") || "trending";
      if (category === "movies") path = `/movie/popular?${params}`;
      else if (category === "shows") path = `/tv/popular?${params}`;
      else if (category === "anime-movies") path = `/discover/movie?${new URLSearchParams({ ...Object.fromEntries(params), with_genres: "16", with_original_language: "ja", sort_by: "popularity.desc" })}`;
      else path = `/trending/all/week?${params}`;
    }

    const response = await fetch(API + path, { headers: headers(), next: { revalidate: 300 } });
    if (!response.ok) return NextResponse.json({ error: "TMDB request failed. Check the token and try again." }, { status: response.status });
    return NextResponse.json(await response.json(), { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Could not load streaming catalogue." }, { status: 500 });
  }
}
