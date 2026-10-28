"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSupabaseBrowserClient } from "../../../lib/supabase-browser";

export default function AuthCallbackPage() {
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function finish() {
      try {
        const supabase = getSupabaseBrowserClient();
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");
        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) throw exchangeError;
        }
        const { data, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;
        if (!data.user) throw new Error("Sign-in was not completed. Please try again.");
        const next = url.searchParams.get("next") || "/account";
        window.location.replace(next.startsWith("/") && !next.startsWith("//") ? next : "/account");
      } catch (e) {
        if (active) setError(e?.message || "Could not finish sign-in.");
      }
    }
    finish();
    return () => { active = false; };
  }, []);

  return <main style={{minHeight:"100dvh",display:"grid",placeItems:"center",padding:24,fontFamily:"Arial,Helvetica,sans-serif",background:"var(--bg,#f4f5f7)",color:"var(--text,#15171a)"}}>
    <section style={{maxWidth:420,textAlign:"center",padding:30,border:"1px solid var(--border,#e3e5e8)",borderRadius:18,background:"var(--surface,#fff)"}}>
      <h1>{error ? "Sign-in needs attention" : "Signing you in…"}</h1>
      <p>{error || "Please wait while Dbweb securely completes your sign-in."}</p>
      {error && <Link href="/login">Return to login</Link>}
    </section>
  </main>;
}
