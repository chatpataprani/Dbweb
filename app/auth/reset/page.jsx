"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSupabaseBrowserClient } from "../../../lib/supabase-browser";

function EyeIcon({ visible }) {
  return <svg aria-hidden="true" viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>{!visible && <path d="m3 3 18 18"/>}</svg>;
}

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [secureAccount, setSecureAccount] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [recovery, setRecovery] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams(window.location.search);
    if (params.get("secure") === "1") setSecureAccount(true);
    async function checkRecovery() {
      try {
        const supabase = getSupabaseBrowserClient();
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");
        const tokenHash = url.searchParams.get("token_hash");
        const type = url.searchParams.get("type");
        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) throw exchangeError;
        } else if (tokenHash && type === "recovery") {
          const { error: verifyError } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "recovery" });
          if (verifyError) throw verifyError;
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
      setMessage("If an account exists for this email, a reset email has been sent. Open its reset link, or enter the Recovery code from the email below.");
    } catch (e) {
      setError(e?.message || "Could not request a reset email.");
    } finally {
      setBusy(false);
    }
  }

  async function verifyRecoveryOtp(event) {
    event.preventDefault();
    setBusy(true); setError(""); setMessage("");
    try {
      const { error: verifyError } = await getSupabaseBrowserClient().auth.verifyOtp({ email: email.trim(), token: otp.trim(), type: "recovery" });
      if (verifyError) throw verifyError;
      setRecovery(true);
      setOtp("");
      setMessage("Code verified. Choose your new password.");
    } catch (e) {
      setError(e?.message || "That recovery code is invalid or expired. Request a new reset email.");
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
      setPassword("");
      setConfirm("");
      setMessage("Password updated successfully. You can now sign in using your email or username and your new password.");
    } catch (e) {
      setError(e?.message || "Could not update password.");
    } finally {
      setBusy(false);
    }
  }

  const passwordField = (label, value, setter, visible, toggle) => <label style={styles.label}>{label}<span style={styles.passwordWrap}><input style={styles.passwordInput} type={visible ? "text" : "password"} autoComplete="new-password" value={value} onChange={e => setter(e.target.value)} minLength={8} required /><button type="button" style={styles.eye} aria-label={visible ? "Hide password" : "Show password"} aria-pressed={visible} onClick={() => toggle(v => !v)}><EyeIcon visible={visible}/></button></span></label>;

  return <main style={styles.page}><section style={styles.card}>
    <Link href="/" style={styles.brand}>Dbweb</Link>
    <p style={styles.eyebrow}>ACCOUNT SECURITY</p>
    <h1 style={styles.heading}>{recovery ? "Choose a new password" : secureAccount ? "Secure your Dbweb account" : "Reset your password"}</h1>
    <p style={styles.sub}>{recovery ? "Choose a strong password you have not used before." : secureAccount ? "If you did not change your password, enter your account email below. We will send a secure password-reset link so you can choose a new password." : "Enter the email address linked to your account. We will send you a secure password-reset link."}</p>
    <form onSubmit={recovery ? updatePassword : requestReset} style={styles.form}>
      {!recovery && <>
        <label style={styles.label}>Email address<input style={styles.input} type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} required /></label>
        {otpSent && <label style={styles.label}>6-digit recovery code<input style={styles.input} type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={8} pattern="[0-9]{6,8}" value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, "").slice(0, 8))} placeholder="Enter code from email" /></label>}
      </>}
      {recovery && <>
        {passwordField("New password", password, setPassword, showPassword, setShowPassword)}
        {passwordField("Confirm new password", confirm, setConfirm, showConfirm, setShowConfirm)}
      </>}
      {!recovery && otpSent && <button type="button" style={styles.primary} disabled={busy || (otp.trim().length < 6 || otp.trim().length > 8)} onClick={verifyRecoveryOtp}>{busy ? "Please wait…" : "Verify code"}</button>}
      <button style={styles.primary} disabled={busy}>{busy ? "Please wait…" : recovery ? "Update password" : otpSent ? "Resend reset email" : secureAccount ? "Send secure reset email" : "Send reset email"}</button>
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
  passwordWrap:{display:"flex",alignItems:"center",border:"1px solid var(--border,#dfe2e6)",borderRadius:10,background:"var(--input-bg,#fff)"},
  passwordInput:{width:"100%",minWidth:0,boxSizing:"border-box",padding:"13px 12px",border:0,borderRadius:10,background:"transparent",color:"inherit",fontSize:15,outline:"none"},
  eye:{display:"grid",placeItems:"center",flex:"0 0 44px",height:44,border:0,background:"transparent",color:"inherit",cursor:"pointer"},
  primary:{padding:14,border:0,borderRadius:11,background:"var(--accent,#17191c)",color:"var(--accent-contrast,#fff)",fontSize:14,fontWeight:750,cursor:"pointer"},
  success:{padding:12,borderRadius:9,background:"#edf9f0",color:"#176b35",fontSize:13,lineHeight:1.5},
  error:{padding:12,borderRadius:9,background:"#fff0f0",color:"#a21b1b",fontSize:13,lineHeight:1.5},
  back:{display:"inline-block",marginTop:22,fontSize:13,color:"inherit"}
};
