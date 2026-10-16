export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UPSTREAM = "https://api.mail.gw";
const ALLOWED_METHODS = new Set(["GET", "POST", "PATCH", "DELETE"]);

async function handler(request, { params }) {
  const { path = [] } = await params;

  if (!Array.isArray(path) || path.length === 0 ||
      path.some((part) => !part || part === "." || part === ".." || part.includes("\\"))) {
    return Response.json({ message: "Invalid mail API path." }, { status: 400 });
  }

  if (!ALLOWED_METHODS.has(request.method)) {
    return Response.json({ message: "Method not allowed." }, {
      status: 405,
      headers: { Allow: "GET, POST, PATCH, DELETE" }
    });
  }

  const pathname = "/" + path.map((part) => encodeURIComponent(part)).join("/");
  const incomingUrl = new URL(request.url);
  const targetUrl = UPSTREAM + pathname + incomingUrl.search;
  const headers = new Headers();

  for (const name of ["authorization", "content-type", "accept"]) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }

  const init = {
    method: request.method,
    headers,
    cache: "no-store",
    redirect: "error"
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    const body = await request.arrayBuffer();
    if (body.byteLength > 1024 * 1024) {
      return Response.json({ message: "Request body is too large." }, { status: 413 });
    }
    if (body.byteLength) init.body = body;
  }

  try {
    const upstream = await fetch(targetUrl, init);
    const responseHeaders = new Headers();
    const contentType = upstream.headers.get("content-type");
    if (contentType) responseHeaders.set("content-type", contentType);
    responseHeaders.set("cache-control", "no-store");

    if (upstream.status === 204 || upstream.status === 304) {
      return new Response(null, { status: upstream.status, headers: responseHeaders });
    }

    return new Response(upstream.body, {
      status: upstream.status,
      headers: responseHeaders
    });
  } catch {
    return Response.json(
      { message: "The mail provider could not be reached from the server. Please try again shortly." },
      { status: 502, headers: { "cache-control": "no-store" } }
    );
  }
}

export { handler as GET, handler as POST, handler as PATCH, handler as DELETE };
