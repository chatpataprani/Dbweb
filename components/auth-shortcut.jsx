"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getSupabaseBrowserClient } from "../lib/supabase-browser";

export default function AuthShortcut() {
  const pathname = usePathname();
  const [signedIn, setSignedIn] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    let subscription;
    try {
      const supabase = getSupabaseBrowserClient();
      supabase.auth.getSession().then(({ data }) => {
        if (active) {
          setSignedIn(Boolean(data.session));
          setReady(true);
        }
      }).catch(() => { if (active) setReady(true); });
      const listener = supabase.auth.onAuthStateChange((_event, session) => {
        if (active) {
          setSignedIn(Boolean(session));
          setReady(true);
        }
      });
      subscription = listener.data.subscription;
    } catch {
      setReady(true);
    }
    return () => {
      active = false;
      subscription?.unsubscribe();
    };
  }, []);

  if (!ready || pathname === "/login" || pathname === "/account" || pathname.startsWith("/auth/")) return null;
  return (
    <Link
      href={signedIn ? "/account" : "/login"}
      aria-label={signedIn ? "Open your Dbweb account" : "Sign in to Dbweb"}
      style={{
        position: "fixed", right: 16, top: 16, zIndex: 1000,
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        padding: "9px 13px", borderRadius: 999,
        border: "1px solid var(--border, #e1e4ea)",
        background: "var(--surface, #fff)", color: "var(--text, #17191c)",
        boxShadow: "0 4px 18px rgba(20,28,50,.08)",
        fontSize: 12, fontWeight: 750, textDecoration: "none"
      }}
    >
      {signedIn ? "My account" : "Sign in"}
    </Link>
  );
}
