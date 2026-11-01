import { NextResponse } from "next/server";
import { validAdminRequest } from "../../../../lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUCKET = "dbweb-releases";
const MANIFEST = "releases.json";
const MAX_FILE_SIZE = 100 * 1024 * 1024;
const EXTENSIONS = new Set([".apk", ".aab", ".zip", ".crx", ".xpi", ".js", ".json", ".css"]);
const MIME_TYPES = ["application/vnd.android.package-archive", "application/octet-stream", "application/zip", "application/x-zip-compressed", "application/x-chrome-extension", "application/x-xpinstall", "application/javascript", "text/javascript", "application/json", "text/css"];

function config() {
  return {
    url: (process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, ""),
    key: process.env.SUPABASE_SERVICE_ROLE_KEY || ""
  };
}

async function storage(path, init = {}) {
  const { url, key } = config();
  if (!url || !key) throw new Error("Release storage is not configured. Add the Supabase URL and service role key in Vercel.");
  const response = await fetch(url + "/storage/v1" + path, {
    ...init,
    headers: { apikey: key, Authorization: "Bearer " + key, ...(init.headers || {}) },
    cache: "no-store"
  });
  const body = await response.text();
  if (!response.ok) throw new Error(body.slice(0, 240) || "Supabase Storage request failed.");
  return body ? JSON.parse(body) : {};
}

async function ensureBucket() {
  try {
    await storage("/bucket/" + BUCKET);
  } catch {
    try {
      await storage("/bucket", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: BUCKET, name: BUCKET, public: true, file_size_limit: MAX_FILE_SIZE, allowed_mime_types: MIME_TYPES })
      });
    } catch (error) {
      if (!String(error.message).toLowerCase().includes("already")) throw error;
      await storage("/bucket/" + BUCKET, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ public: true, file_size_limit: MAX_FILE_SIZE, allowed_mime_types: MIME_TYPES })
      });
    }
  }
}

async function readManifest() {
  const { url, key } = config();
  const response = await fetch(url + "/storage/v1/object/" + BUCKET + "/" + MANIFEST, {
    headers: { apikey: key, Authorization: "Bearer " + key },
    cache: "no-store"
  });
  if (response.status === 404) return [];
  if (!response.ok) throw new Error("Could not load the release catalogue.");
  const data = await response.json();
  return Array.isArray(data) ? data : [];
}

async function writeManifest(releases) {
  await storage("/object/" + BUCKET + "/" + MANIFEST, {
    method: "POST",
    headers: { "content-type": "application/json", "x-upsert": "true" },
    body: JSON.stringify(releases)
  });
}

function safeName(name) {
  return String(name || "download").normalize("NFKD").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-").slice(-110) || "download";
}

export async function GET(request) {
  try {
    await ensureBucket();
    const releases = await readManifest();
    return NextResponse.json({ releases, admin: validAdminRequest(request) });
  } catch (error) {
    return NextResponse.json({ releases: [], admin: validAdminRequest(request), error: error.message || "Release catalogue is unavailable." }, { status: 503 });
  }
}

export async function POST(request) {
  if (!validAdminRequest(request)) return NextResponse.json({ error: "Admin access required. Sign in through the Dbweb admin panel first." }, { status: 403 });

  try {
    await ensureBucket();
    const form = await request.formData();
    const title = String(form.get("title") || "").trim().slice(0, 100);
    const version = String(form.get("version") || "").trim().slice(0, 40);
    const kind = String(form.get("kind") || "").trim().toLowerCase();
    const description = String(form.get("description") || "").trim().slice(0, 1200);
    const changelog = String(form.get("changelog") || "").trim().slice(0, 1600);
    const platform = String(form.get("platform") || "").trim().slice(0, 80);
    const file = form.get("file");

    if (!title || !version || !description) return NextResponse.json({ error: "Name, version and description are required." }, { status: 400 });
    if (!["app", "plugin", "extension"].includes(kind)) return NextResponse.json({ error: "Choose an app, plugin or extension." }, { status: 400 });
    if (!(file instanceof File) || !file.size) return NextResponse.json({ error: "Choose a package file to upload." }, { status: 400 });
    if (file.size > MAX_FILE_SIZE) return NextResponse.json({ error: "The maximum upload size is 100 MB." }, { status: 413 });

    const fileName = safeName(file.name);
    const extension = fileName.slice(fileName.lastIndexOf(".")).toLowerCase();
    if (!EXTENSIONS.has(extension)) return NextResponse.json({ error: "Supported files: APK, AAB, ZIP, CRX, XPI, JS, JSON and CSS." }, { status: 415 });

    const objectName = Date.now() + "-" + crypto.randomUUID().slice(0, 8) + "-" + fileName;
    const mimeByExtension = { ".apk": "application/vnd.android.package-archive", ".aab": "application/octet-stream", ".zip": "application/zip", ".crx": "application/octet-stream", ".xpi": "application/zip", ".js": "text/javascript", ".json": "application/json", ".css": "text/css" };\n    const mime = mimeByExtension[extension] || "application/octet-stream";
    const { url } = config();
    await storage("/object/" + BUCKET + "/" + encodeURIComponent(objectName), {
      method: "POST",
      headers: { "content-type": mime, "x-upsert": "false" },
      body: Buffer.from(await file.arrayBuffer())
    });

    const release = {
      id: crypto.randomUUID(),
      title,
      version,
      kind,
      description,
      changelog,
      platform,
      fileName,
      fileSize: file.size,
      fileUrl: url + "/storage/v1/object/public/" + BUCKET + "/" + encodeURIComponent(objectName),
      objectName,
      createdAt: new Date().toISOString()
    };
    const releases = await readManifest();
    releases.unshift(release);
    await writeManifest(releases);
    const { objectName: privateObjectName, ...publicRelease } = release;
    return NextResponse.json({ ok: true, release: publicRelease });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Upload failed." }, { status: 500 });
  }
}

export async function DELETE(request) {
  if (!validAdminRequest(request)) return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  try {
    const { id } = await request.json();
    const releases = await readManifest();
    const target = releases.find(item => item.id === id);
    if (!target) return NextResponse.json({ error: "Release not found." }, { status: 404 });
    await writeManifest(releases.filter(item => item.id !== id));
    try {
      await storage("/object/" + BUCKET, {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ prefixes: [target.objectName] })
      });
    } catch {}
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Could not remove release." }, { status: 500 });
  }
}
