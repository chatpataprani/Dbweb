"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSupabaseBrowserClient } from "../../../lib/supabase-browser";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
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
      } catch (e) {
        if (active) setError(e?.message || "This reset link is invalid or expired.");
      }
    }
    checkRecovery();
    return () => { active = false; };
  }, []);

  async function requestReset(event) {
    event.preventDefault();
    setBusy(true); setError(""); setMessage("");
    try {
      const { error: resetError } = await getSupabaseBrowserClient().auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/reset`
      });
      if (resetError) throw resetError;
      setOtpSent(true);
      setMessage("If an account exists for this email, a recovery email has been sent. Open its reset link or enter the recovery code below.");
    } catch (e) {
      setError(e?.message || "Could not request a reset email.");
    } finally {
      setBusy(false);
    }
  }

  async function verifyRecoveryCode(event) {
    event.preventDefault();
    setBusy(true); setError(""); setMessage("");
    try {
      const token = otp.replace(/\\s/g, "");
      if (!/^\\d{6,8}$/.test(token)) throw new Error("Enter the 6–8 digit recovery code from your email.");
      const { error: verifyError } = await getSupabaseBrowserClient().auth.verifyOtp({
        email: email.trim(),
        token,
        type: "recovery"
      });
      if (verifyError) throw verifyError;
      setRecovery(true);
      setMessage("Email verified. Choose your new password.");
    } catch (e) {
      setError(e?.message || "That recovery code is invalid or expired.");
    } finally {
      setBusy(false);
    }
  }

  async function updatePassword(event) {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    if (password.length < 8) { setError("Use at least 8 characters for your new password."); setBusy(false); return; }
    if (password !== confirm) { setError("Passwords do not match."); setBusy(false); return; }
    try {
      const { error: updateError } = await getSupabaseBrowserClient().auth.updateUser({ password });
      if (updateError) throw updateError;
      await getSupabaseBrowserClient().auth.signOut();
      setRecovery(false);
      setOtpSent(false);
      setOtp("");
      setPassword("");
      setConfirm("");
      setMessage("Password updated successfully. You can now sign in using your new password.");
    } catch (e) {
      setError(e?.message || "Could not update password.");
    } finally {
      setBusy(false);
    }
  }

  return <main style={styles.page}><section style={styles.card}>
    <Link href="/" style={styles.brand}>Dbweb</Link>
    <p style={styles.eyebrow}>ACCOUNT SECURITY</p>
    <h1 style={styles.heading}>{recovery ? "Choose a new password" : "Reset your password"}</h1>
    <p style={styles.sub}>{recovery ? "Choose a strong password you have not used before." : "Enter the email address linked to your account. You can reset using the email link or its recovery code."}</p>
    <form onSubmit={recovery ? updatePassword : otpSent ? verifyRecoveryCode : requestReset} style={styles.form}>
      {!recovery && <>
        <label style={styles.label}>Email address<input style={styles.input} type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} required readOnly={otpSent} /></label>
        {otpSent && <label style={styles.label}>Recovery code<input style={styles.input} inputMode="numeric" autoComplete="one-time-code" value={otp} onChange={e => setOtp(e.target.value.replace(/\\D/g, "").slice(0,8))} minLength={6} maxLength={8} required placeholder="Enter the code from your email" /></label>}
      </>}
      {recovery && <>
        <label style={styles.label}>New password<input style={styles.input} type="password" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} minLength={8} required /></label>
        <label style={styles.label}>Confirm new password<input style={styles.input} type="password" autoComplete="new-password" value={confirm} onChange={e => setConfirm(e.target.value)} minLength={8} required /></label>
      </>}
      <button style={styles.primary} disabled={busy}>{busy ? "Please wait…" : recovery ? "Update password" : otpSent ? "Verify code" : "Send recovery email"}</button>
    </form>
    {!recovery && otpSent && <button type="button" style={styles.resend} disabled={busy} onClick={requestReset}>Resend recovery email</button>}
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
  resend:{marginTop:14,padding:0,border:0,background:"transparent",color:"var(--accent,#17191c)",fontWeight:700,cursor:"pointer"},
  success:{padding:12,borderRadius:9,background:"#edf9f0",color:"#176b35",fontSize:13,lineHeight:1.5},
  error:{padding:12,borderRadius:9,background:"#fff0f0",color:"#a21b1b",fontSize:13,lineHeight:1.5},
  back:{display:"inline-block",marginTop:22,fontSize:13,color:"inherit"}
};
