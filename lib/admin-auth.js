import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";

const COOKIE_NAME = "dbweb_admin";
const SESSION_TTL_SECONDS = 8 * 60 * 60;

function secret() {
  return process.env.ADMIN_PANEL_PASSWORD || "";
}

function sign(value) {
  return createHmac("sha256", secret()).update(value).digest("hex");
}

function safeEqual(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  return left.length === right.length && timingSafeEqual(left, right);
}

function readCookie(request, name) {
  const header = request.headers.get("cookie") || "";
  for (const part of header.split(";")) {
    const index = part.indexOf("=");
    if (index < 0) continue;
    if (part.slice(0, index).trim() === name) {
      try { return decodeURIComponent(part.slice(index + 1).trim()); }
      catch { return null; }
    }
  }
  return null;
}

export function validAdminRequest(request) {
  const key = secret();
  if (!key) return false;

  const token = readCookie(request, COOKIE_NAME);
  if (!token) return false;

  const separator = token.lastIndexOf(".");
  if (separator < 1) return false;

  const payload = token.slice(0, separator);
  const signature = token.slice(separator + 1);
  if (!safeEqual(signature, sign(payload))) return false;

  const issuedAt = Number(payload);
  if (!Number.isSafeInteger(issuedAt)) return false;
  const now = Math.floor(Date.now() / 1000);
  return issuedAt <= now + 60 && now - issuedAt <= SESSION_TTL_SECONDS;
}

export function adminLoginResponse(ok) {
  if (!ok || !secret()) {
    return NextResponse.json(
      { error: "Invalid password or admin password is not configured." },
      { status: 401 }
    );
  }

  const payload = String(Math.floor(Date.now() / 1000));
  const token = encodeURIComponent(payload + "." + sign(payload));
  const response = NextResponse.json({ ok: true });
  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
  return response;
}

export function adminLogoutResponse() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });
  return response;
}
