export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UPSTREAM = "https://otp-api.shelex.dev/api";
const SOURCES = new Set([
  "receive-sms-free.cc",
  "anonymsms.com",
  "quackr.io",
  "smstome.com",
  "receivesms.co",
  "receivesmsonline.com",
  "receive-smss-online.com",
]);

export async function GET(request, { params }) {
  const { path = [] } = await params;
  if (!Array.isArray(path) || path.length < 1 || path.length > 2 ||
      path.some((part) => !part || part === "." || part === ".." || part.includes("\\"))) {
    return Response.json({ message: "Invalid SMS API path." }, { status: 400 });
  }

  if (path.length === 1 && path[0] !== "countries") {
    return Response.json({ message: "Unknown SMS endpoint." }, { status: 404 });
  }

  if (path.length === 2 && path[0] === "list") {
    if (!/^[A-Za-z -]{2,40}$/.test(path[1])) {
      return Response.json({ message: "Invalid country." }, { status: 400 });
    }
  } else if (path.length === 2) {
    if (!/^[A-Za-z -]{2,40}$/.test(path[0]) || !/^\d{10,13}$/.test(path[1])) {
      return Response.json({ message: "Invalid country or phone number." }, { status: 400 });
    }
  }

  const incoming = new URL(request.url);
  const source = incoming.searchParams.get("source");
  if (source && !SOURCES.has(source)) {
    return Response.json({ message: "Invalid SMS source." }, { status: 400 });
  }

  const allowedQuery = new URLSearchParams();
  const ago = incoming.searchParams.get("ago");
  if (ago && /^\d+[smh]$/.test(ago)) allowedQuery.set("ago", ago);
  if (source) allowedQuery.set("source", source);
  const match = incoming.searchParams.get("match");
  if (match && match.length <= 80) allowedQuery.set("match", match);
  const since = incoming.searchParams.get("since");
  if (since && /^\d{1,16}$/.test(since)) allowedQuery.set("since", since);

  const pathname = "/" + path.map((part) => encodeURIComponent(part)).join("/");
  const target = UPSTREAM + pathname + (allowedQuery.size ? "?" + allowedQuery.toString() : "");

  try {
    const upstream = await fetch(target, {
      method: "GET",
      headers: { accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(8500),
    });
    const headers = new Headers({ "cache-control": "no-store" });
    const type = upstream.headers.get("content-type");
    if (type) headers.set("content-type", type);
    return new Response(upstream.body, { status: upstream.status, headers });
  } catch (error) {
    return Response.json({
      message: "The free public SMS source did not respond in time.",
      code: error && error.name ? String(error.name) : "FetchError",
    }, { status: 502, headers: { "cache-control": "no-store" } });
  }
}
