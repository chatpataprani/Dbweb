"use client";

import { useState } from "react";
import Link from "next/link";
import { getSupabaseBrowserClient } from "../../lib/supabase-browser";

export default function LoginPage() {
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const callbackUrl = () => `${window.location.origin}/auth/callback`;

  async function submit(event) {
    event.preventDefault();
    setBusy(true); setError(""); setMessage("");
    try {
      const supabase = getSupabaseBrowserClient();
      if (mode === "signup") {
        const { data, error: authError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { full_name: name.trim() },
            emailRedirectTo: callbackUrl()
          }
        });
        if (authError) throw authError;
        if (data.session) window.location.assign("/account");
        else setMessage("Account created. Check your email to verify your address, then sign in.");
      } else {
        const { error: authError } = await supabase.auth.signInWithPassword({
          email: email.trim(), password
        });
        if (authError) throw authError;
        window.location.assign("/account");
      }
    } catch (e) {
      setError(e?.message || "Could not complete authentication.");
    } finally {
      setBusy(false);
    }
  }

  async function social(provider) {
    setBusy(true); setError(""); setMessage("");
    try {
      const { error: authError } = await getSupabaseBrowserClient().auth.signInWithOAuth({
        provider,
        options: { redirectTo: callbackUrl() }
      });
      if (authError) throw authError;
    } catch (e) {
      setError(e?.message || "Could not start social login.");
      setBusy(false);
    }
  }

  return (
    <main style={styles.page}>
      <section style={styles.card}>
        <Link href="/" style={styles.brand}>Dbweb</Link>
        <p style={styles.eyebrow}>YOUR ACCOUNT</p>
        <h1 style={styles.heading}>{mode === "signup" ? "Create your account" : "Welcome back"}</h1>
        <p style={styles.sub}>{mode === "signup" ? "Sign up to access your Dbweb account." : "Sign in to continue to Dbweb."}</p>

        <div style={styles.socials}>
          <button type="button" style={styles.secondary} disabled={busy} onClick={() => social("google")}>Continue with Google</button>
          <button type="button" style={styles.secondary} disabled={busy} onClick={() => social("github")}>Continue with GitHub</button>
        </div>

        <div style={styles.divider}><span>or use email</span></div>

        <form onSubmit={submit} style={styles.form}>
          {mode === "signup" && <label style={styles.label}>Full name<input style={styles.input} autoComplete="name" value={name} onChange={e => setName(e.target.value)} required minLength={2} maxLength={80} /></label>}
          <label style={styles.label}>Email address<input style={styles.input} type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} required /></label>
          <label style={styles.label}>Password<input style={styles.input} type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} value={password} onChange={e => setPassword(e.target.value)} required minLength={mode === "signup" ? 8 : 1} /></label>
          {mode === "signin" && <div style={{textAlign:"right"}}><Link style={styles.link} href="/auth/reset">Forgot password?</Link></div>}
          <button type="submit" style={styles.primary} disabled={busy}>{busy ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}</button>
        </form>

        {error && <p role="alert" style={styles.error}>{error}</p>}
        {message && <p role="status" style={styles.success}>{message}</p>}

        <p style={styles.switchText}>
          {mode === "signup" ? "Already have an account? " : "New to Dbweb? "}
          <button type="button" style={styles.textButton} onClick={() => { setMode(mode === "signup" ? "signin" : "signup"); setError(""); setMessage(""); }}>
            {mode === "signup" ? "Sign in" : "Create account"}
          </button>
        </p>
        <p style={styles.footer}>By continuing, you agree to Dbweb’s <Link style={styles.link} href="/terms">Terms</Link> and <Link style={styles.link} href="/privacy">Privacy Policy</Link>.</p>
        <Link href="/" style={styles.back}>← Back to Dbweb</Link>
      </section>
    </main>
  );
}

const styles = {
  page:{minHeight:"100dvh",display:"grid",placeItems:"center",padding:20,background:"var(--bg,#f4f5f7)",color:"var(--text,#15171a)",fontFamily:"Arial,Helvetica,sans-serif"},
  card:{width:"100%",maxWidth:430,boxSizing:"border-box",padding:"clamp(24px,5vw,38px)",border:"1px solid var(--border,#e3e5e8)",borderRadius:22,background:"var(--surface,#fff)",boxShadow:"0 18px 55px rgba(0,0,0,.07)"},
  brand:{display:"inline-block",fontSize:25,fontWeight:800,letterSpacing:"-1px",color:"inherit",textDecoration:"none"},
  eyebrow:{margin:"28px 0 8px",fontSize:11,fontWeight:700,letterSpacing:"2px",opacity:.65},
  heading:{margin:"0 0 9px",fontSize:30,letterSpacing:"-1px"},
  sub:{margin:"0 0 24px",fontSize:14,lineHeight:1.6,opacity:.72},
  socials:{display:"grid",gap:10},
  secondary:{width:"100%",padding:"13px 15px",border:"1px solid var(--border,#dfe2e6)",borderRadius:11,background:"transparent",color:"inherit",fontWeight:650,fontSize:14,cursor:"pointer"},
  divider:{display:"flex",alignItems:"center",gap:12,margin:"22px 0",fontSize:12,opacity:.55},
  form:{display:"grid",gap:15},
  label:{display:"grid",gap:7,fontSize:13,fontWeight:650},
  input:{width:"100%",boxSizing:"border-box",padding:"13px 12px",border:"1px solid var(--border,#dfe2e6)",borderRadius:10,background:"var(--input-bg,#fff)",color:"inherit",fontSize:15,outlineOffset:2},
  primary:{width:"100%",padding:14,border:0,borderRadius:11,background:"var(--accent,#17191c)",color:"var(--accent-contrast,#fff)",fontSize:14,fontWeight:750,cursor:"pointer"},
  link:{color:"var(--accent,#17191c)",fontWeight:650},
  error:{padding:12,borderRadius:9,background:"#fff0f0",color:"#a21b1b",fontSize:13,lineHeight:1.5},
  success:{padding:12,borderRadius:9,background:"#edf9f0",color:"#176b35",fontSize:13,lineHeight:1.5},
  switchText:{margin:"22px 0 0",textAlign:"center",fontSize:13,opacity:.8},
  textButton:{border:0,background:"transparent",padding:0,fontWeight:750,color:"var(--accent,#17191c)",cursor:"pointer"},
  footer:{margin:"22px 0 0",fontSize:11,lineHeight:1.7,opacity:.62},
  back:{display:"inline-block",marginTop:20,fontSize:13,color:"inherit",textDecoration:"none",opacity:.75}
};
