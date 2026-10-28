"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSupabaseBrowserClient } from "../../../lib/supabase-browser";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [recovery, setRecovery] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function checkRecovery() {
      try {
        const supabase = getSupabaseBrowserClient();
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");
        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) throw exchangeError;
        }
        const { data } = await supabase.auth.getSession();
        if (active && data.session) setRecovery(true);
      } catch (e) { if (active) setError(e?.message || "This reset link is invalid or expired."); }
    }
    checkRecovery();
    return () => { active = false; };
  }, []);

  async function requestReset(event) {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    try {
      const { error: resetError } = await getSupabaseBrowserClient().auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/reset`
      });
      if (resetError) throw resetError;
      setMessage("If an account exists for this email, a password-reset link will be sent.");
    } catch (e) { setError(e?.message || "Could not request a reset link."); }
    finally { setBusy(false); }
  }

  async function updatePassword(event) {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    if (password.length < 8) { setError("Use at least 8 characters for your new password."); setBusy(false); return; }
    if (password !== confirm) { setError("Passwords do not match."); setBusy(false); return; }
    try {
      const { error: updateError } = await getSupabaseBrowserClient().auth.updateUser({ password });
      if (updateError) throw updateError;
      setMessage("Password updated. You can now sign in with your new password.");
      setPassword(""); setConfirm("");
      await getSupabaseBrowserClient().auth.signOut();
      setRecovery(false);
    } catch (e) { setError(e?.message || "Could not update password."); }
    finally { setBusy(false); }
  }

  return <main style={styles.page}><section style={styles.card}>
    <Link href="/" style={styles.brand}>Dbweb</Link>
    <p style={styles.eyebrow}>ACCOUNT SECURITY</p>
    <h1 style={styles.heading}>{recovery ? "Choose a new password" : "Reset your password"}</h1>
    <p style={styles.sub}>{recovery ? "Choose a strong password you have not used before." : "Enter the email address linked to your account."}</p>
    <form onSubmit={recovery ? updatePassword : requestReset} style={styles.form}>
      {!recovery && <label style={styles.label}>Email address<input style={styles.input} type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} required /></label>}
      {recovery && <>
        <label style={styles.label}>New password<input style={styles.input} type="password" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} minLength={8} required /></label>
        <label style={styles.label}>Confirm new password<input style={styles.input} type="password" autoComplete="new-password" value={confirm} onChange={e => setConfirm(e.target.value)} minLength={8} required /></label>
      </>}
      <button style={styles.primary} disabled={busy}>{busy ? "Please wait…" : recovery ? "Update password" : "Send reset link"}</button>
    </form>
    {message && <p role="status" style={styles.success}>{message}</p>}
    {error && <p role="alert" style={styles.error}>{error}</p>}
    <Link href="/login" style={styles.back}>← Back to login</Link>
  </section></main>;
}

const styles = {
  page:{minHeight:"100dvh",display:"grid",placeItems:"center",padding:20,background:"var(--bg,#f4f5f7)",color:"var(--text,#15171a)",fontFamily:"Arial,Helvetica,sans-serif"},
  card:{width:"100%",maxWidth:430,boxSizing:"border-box",padding:"clamp(24px,5vw,38px)",border:"1px solid var(--border,#e3e5e8)",borderRadius:22,background:"var(--surface,#fff)",boxShadow:"0 18px 55px rgba(0,0,0,.07)"},
  brand:{display:"inline-block",fontSize:25,fontWeight:800,letterSpacing:"-1px",color:"inherit",textDecoration:"none"},
  eyebrow:{margin:"28px 0 8px",fontSize:11,fontWeight:700,letterSpacing:"2px",opacity:.65},
  heading:{margin:"0 0 9px",fontSize:30,letterSpacing:"-1px"},
  sub:{margin:"0 0 24px",fontSize:14,lineHeight:1.6,opacity:.72},
  form:{display:"grid",gap:15},
  label:{display:"grid",gap:7,fontSize:13,fontWeight:650},
  input:{width:"100%",boxSizing:"border-box",padding:"13px 12px",border:"1px solid var(--border,#dfe2e6)",borderRadius:10,background:"var(--input-bg,#fff)",color:"inherit",fontSize:15},
  primary:{padding:14,border:0,borderRadius:11,background:"var(--accent,#17191c)",color:"var(--accent-contrast,#fff)",fontSize:14,fontWeight:750,cursor:"pointer"},
  success:{padding:12,borderRadius:9,background:"#edf9f0",color:"#176b35",fontSize:13,lineHeight:1.5},
  error:{padding:12,borderRadius:9,background:"#fff0f0",color:"#a21b1b",fontSize:13,lineHeight:1.5},
  back:{display:"inline-block",marginTop:22,fontSize:13,color:"inherit"}
};
