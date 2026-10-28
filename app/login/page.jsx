"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "../../lib/supabase-browser";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState("signin");
  const [method, setMethod] = useState("otp");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    getSupabaseBrowserClient().auth.getSession().then(({ data }) => {
      if (active && data.session) router.replace("/account");
    }).catch(() => {});
    return () => { active = false; };
  }, [router]);

  const callbackUrl = () => `${window.location.origin}/auth/callback`;

  async function submit(event) {
    event.preventDefault();
    setBusy(true); setError(""); setMessage("");
    try {
      const supabase = getSupabaseBrowserClient();
      if (mode === "signin" && method === "password") {
        const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (authError) throw authError;
        window.location.assign("/account");
        return;
      }
      if (!otpSent) {
        const referredByCode = mode === "signup" ? (new URLSearchParams(window.location.search).get("ref") || "").trim().toLowerCase() : "";
        const { error: authError } = await supabase.auth.signInWithOtp({
          email: email.trim(),
          options: {
            shouldCreateUser: mode === "signup",
            emailRedirectTo: callbackUrl(),
            data: mode === "signup" ? {
              full_name: name.trim(),
              referred_by_code: referredByCode || null
            } : undefined
          }
        });
        if (authError) throw authError;
        setOtpSent(true);
        setMessage(`We sent a verification code to ${email.trim()}. Enter the code from the email to continue.`);
      } else {
        const token = otp.replace(/\s/g, "");
        if (!/^\d{6,8}$/.test(token)) throw new Error("Enter the 6–8 digit code from your email.");
        const { error: verifyError } = await supabase.auth.verifyOtp({
          email: email.trim(),
          token,
          type: "email"
        });
        if (verifyError) throw verifyError;
        window.location.assign("/account");
      }
    } catch (e) {
      const raw = e?.message || "Could not complete authentication.";
      if (/provider is not enabled|unsupported provider|provider.*disabled/i.test(raw)) {
        setError("This sign-in provider is not enabled in Supabase yet. Enable it in Authentication → Sign In / Providers.");
      } else if (/invalid login credentials/i.test(raw)) {
        setError("Email or password is incorrect. If you never created a password for this account, switch to Email code sign-in.");
      } else {
        setError(raw);
      }
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
      const raw = e?.message || "Could not start social login.";
      setError(/provider is not enabled|unsupported provider|provider.*disabled/i.test(raw)
        ? `${provider === "github" ? "GitHub" : "Google"} login is not enabled in Supabase. Configure its OAuth Client ID and Client Secret in Authentication → Sign In / Providers.`
        : raw);
      setBusy(false);
    }
  }

  return (
    <main style={styles.page}>
      <section style={styles.card}>
        <Link href="/" style={styles.brand}>Dbweb</Link>
        <p style={styles.eyebrow}>YOUR ACCOUNT</p>
        <h1 style={styles.heading}>{mode === "signup" ? "Create your account" : "Welcome back"}</h1>
        <p style={styles.sub}>{mode === "signup" ? "Create your Dbweb account using your email." : "Sign in to continue to Dbweb."}</p>

        <div style={styles.socials}>
          <button type="button" style={styles.secondary} disabled={busy} onClick={() => social("google")}>Continue with Google</button>
          <button type="button" style={styles.secondary} disabled={busy} onClick={() => social("github")}>Continue with GitHub</button>
        </div>
        <div style={styles.divider}><span>or use email</span></div>

        <div style={styles.methodRow}>
          <button type="button" style={method === "otp" ? styles.methodActive : styles.method} onClick={() => {setMethod("otp");setOtpSent(false);setOtp("");setError("");setMessage("");}}>Email code</button>
          {mode === "signin" && <button type="button" style={method === "password" ? styles.methodActive : styles.method} onClick={() => {setMethod("password");setOtpSent(false);setError("");setMessage("");}}>Password</button>}
        </div>

        <form onSubmit={submit} style={styles.form}>
          {mode === "signup" && !otpSent && <label style={styles.label}>Display name<input style={styles.input} autoComplete="name" value={name} onChange={e => setName(e.target.value)} required minLength={2} maxLength={80} /></label>}
          <label style={styles.label}>Email address<input style={styles.input} type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} required readOnly={otpSent} /></label>
          {mode === "signin" && method === "password" && <label style={styles.label}>Password<input style={styles.input} type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} required /></label>}
          {method === "otp" && otpSent && <label style={styles.label}>Email verification code<input style={styles.input} inputMode="numeric" autoComplete="one-time-code" value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, "").slice(0,8))} required minLength={6} maxLength={8} placeholder="Enter the code from your email" /></label>}
          {mode === "signin" && method === "password" && <div style={{textAlign:"right"}}><Link style={styles.link} href="/auth/reset">Forgot password?</Link></div>}
          <button type="submit" style={styles.primary} disabled={busy}>{busy ? "Please wait…" : method === "password" ? "Sign in" : otpSent ? "Verify code" : mode === "signup" ? "Send verification code" : "Send email code"}</button>
        </form>
        {otpSent && <button type="button" style={styles.textButton} disabled={busy} onClick={() => {setOtpSent(false);setOtp("");setMessage("");setError("");}}>Use a different email</button>}
        {error && <p role="alert" style={styles.error}>{error}</p>}
        {message && <p role="status" style={styles.success}>{message}</p>}

        <p style={styles.switchText}>
          {mode === "signup" ? "Already have an account? " : "New to Dbweb? "}
          <button type="button" style={styles.textButton} onClick={() => {setMode(mode === "signup" ? "signin" : "signup");setMethod("otp");setOtpSent(false);setOtp("");setError("");setMessage("");}}>
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
  methodRow:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:16},
  method:{padding:10,border:"1px solid var(--border,#dfe2e6)",borderRadius:9,background:"transparent",color:"inherit",fontSize:13,cursor:"pointer"},
  methodActive:{padding:10,border:"1px solid var(--accent,#17191c)",borderRadius:9,background:"var(--accent,#17191c)",color:"var(--accent-contrast,#fff)",fontSize:13,fontWeight:700,cursor:"pointer"},
  form:{display:"grid",gap:15},
  label:{display:"grid",gap:7,fontSize:13,fontWeight:650},
  input:{width:"100%",boxSizing:"border-box",padding:"13px 12px",border:"1px solid var(--border,#dfe2e6)",borderRadius:10,background:"var(--input-bg,#fff)",color:"inherit",fontSize:15,outlineOffset:2},
  primary:{width:"100%",padding:14,border:0,borderRadius:11,background:"var(--accent,#17191c)",color:"var(--accent-contrast,#fff)",fontSize:14,fontWeight:750,cursor:"pointer"},
  link:{color:"var(--accent,#17191c)",fontWeight:650},
  error:{padding:12,borderRadius:9,background:"#fff0f0",color:"#a21b1b",fontSize:13,lineHeight:1.5},
  success:{padding:12,borderRadius:9,background:"#edf9f0",color:"#176b35",fontSize:13,lineHeight:1.5},
  switchText:{margin:"22px 0 0",textAlign:"center",fontSize:13,opacity:.8},
  textButton:{display:"inline-block",border:0,background:"transparent",padding:0,marginTop:10,fontWeight:750,color:"var(--accent,#17191c)",cursor:"pointer",textDecoration:"underline"},
  footer:{margin:"22px 0 0",fontSize:11,lineHeight:1.7,opacity:.62},
  back:{display:"inline-block",marginTop:20,fontSize:13,color:"inherit",textDecoration:"none",opacity:.75}
};
