import { NextResponse } from "next/server";
import dns from "node:dns/promises";
import net from "node:net";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isPrivateIPv4(ip) {
  const p = ip.split(".").map(Number);
  if (p.length !== 4 || p.some(n => !Number.isInteger(n) || n < 0 || n > 255)) return true;
  return p[0] === 0 || p[0] === 10 || p[0] === 127 ||
    (p[0] === 169 && p[1] === 254) ||
    (p[0] === 172 && p[1] >= 16 && p[1] <= 31) ||
    (p[0] === 192 && p[1] === 168) ||
    (p[0] === 100 && p[1] >= 64 && p[1] <= 127) ||
    p[0] >= 224;
}
function isPrivateIPv6(ip) {
  const s = ip.toLowerCase().split("%")[0];
  return s === "::" || s === "::1" || s.startsWith("fc") || s.startsWith("fd") ||
    /^fe[89ab]/.test(s) || s.startsWith("ff") || s.startsWith("::ffff:127.") ||
    s.startsWith("::ffff:10.") || s.startsWith("::ffff:192.168.");
}
async function validatePublicUrl(value) {
  let u;
  try { u = new URL(value); } catch { throw new Error("Enter a valid URL."); }
  if (!["http:", "https:"].includes(u.protocol)) throw new Error("Only HTTP and HTTPS links are supported.");
  if (u.username || u.password) throw new Error("Links containing embedded credentials are not supported.");
  const host = u.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (!host || host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local")) {
    throw new Error("That host is not allowed.");
  }
  if (net.isIP(host)) {
    if (net.isIPv4(host) ? isPrivateIPv4(host) : isPrivateIPv6(host)) throw new Error("Private network addresses are not allowed.");
  } else {
    let addresses;
    try { addresses = await dns.lookup(host, { all: true, verbatim: true }); }
    catch { throw new Error("The link host could not be resolved."); }
    if (!addresses.length || addresses.some(a => net.isIPv4(a.address) ? isPrivateIPv4(a.address) : isPrivateIPv6(a.address))) {
      throw new Error("Links resolving to private network addresses are not allowed.");
    }
  }
  return u;
}

export async function POST(request) {
  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Send a valid JSON body." }, { status: 400 }); }
  let current = String(body?.url || "").trim();
  if (!current || current.length > 2048) return NextResponse.json({ error: "Enter a URL up to 2048 characters." }, { status: 400 });
  if (!/^https?:\/\//i.test(current)) current = "https://" + current;

  const chain = [];
  try {
    for (let hop = 0; hop < 8; hop++) {
      const url = await validatePublicUrl(current);
      if (chain.some(item => item.url === url.href)) throw new Error("A redirect loop was detected.");
      const response = await fetch(url, {
        method: "GET",
        redirect: "manual",
        signal: AbortSignal.timeout(8000),
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; DbwebLinkResolver/1.0)",
          "Accept": "text/html,application/xhtml+xml,*/*;q=0.8",
        },
      });
      chain.push({ url: url.href, status: response.status });
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        if (!location) return NextResponse.json({ destination: url.href, chain, status: response.status });
        current = new URL(location, url).href;
        continue;
      }
      return NextResponse.json({
        input: String(body.url).trim(),
        destination: url.href,
        status: response.status,
        contentType: response.headers.get("content-type") || "",
        chain,
      }, { headers: { "Cache-Control": "no-store" } });
    }
    return NextResponse.json({ error: "This link has too many redirects.", chain }, { status: 422 });
  } catch (error) {
    return NextResponse.json({ error: error?.name === "TimeoutError" ? "The link took too long to respond." : (error?.message || "Could not resolve this link."), chain }, { status: 422 });
  }
}
