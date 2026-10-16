export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PROVIDERS = {
  catchmail: "https://api.catchmail.io/api/v1",
  grabmail: "https://grabmail.io/api/v1",
};
const ALLOWED_METHODS = new Set(["GET", "DELETE"]);
const ALLOWED_ROOTS = new Set(["domains", "mailbox", "message", "attachment"]);

async function handler(request, { params }) {
  const { provider, path = [] } = await params;

  if (!Object.prototype.hasOwnProperty.call(PROVIDERS, provider)) {
    return Response.json({ message: "Unknown mail provider." }, { status: 404 });
  }
  if (!Array.isArray(path) || path.length === 0 ||
      path.some((part) => !part || part === "." || part === ".." || part.includes("\\")) ||
      !ALLOWED_ROOTS.has(path[0])) {
    return Response.json({ message: "Invalid mail API path." }, { status: 400 });
  }
  if (!ALLOWED_METHODS.has(request.method)) {
    return Response.json({ message: "Method not allowed." }, {
      status: 405,
      headers: { Allow: "GET, DELETE" }
    });
  }

  const pathname = "/" + path.map((part) => encodeURIComponent(part)).join("/");
  const incomingUrl = new URL(request.url);
  const targetUrl = PROVIDERS[provider] + pathname + incomingUrl.search;

  try {
    const upstream = await fetch(targetUrl, {
      method: request.method,
      headers: { accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
    const headers = new Headers({ "cache-control": "no-store" });
    const contentType = upstream.headers.get("content-type");
    if (contentType) headers.set("content-type", contentType);

    if (upstream.status === 204 || upstream.status === 304) {
      return new Response(null, { status: upstream.status, headers });
    }
    return new Response(upstream.body, { status: upstream.status, headers });
  } catch (error) {
    console.error("[Dbweb Mail] Public provider request failed", {
      provider,
      path: pathname,
      reason: error instanceof Error ? error.message : "Unknown network error",
    });
    return Response.json({
      message: "Dbweb Mail could not connect to " + provider + ".",
      code: error && error.cause && error.cause.code ? String(error.cause.code) : "FetchError",
    }, { status: 502, headers: { "cache-control": "no-store" } });
  }
}

export { handler as GET, handler as DELETE };
