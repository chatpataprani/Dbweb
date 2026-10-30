"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "../../lib/supabase-browser";

function EyeIcon({ visible }) {
  return <svg aria-hidden="true" viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>{!visible && <path d="m3 3 18 18"/>}</svg>;
}

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState("signin");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [usernameEdited, setUsernameEdited] = useState(false);
  const [usernameCheck, setUsernameCheck] = useState("");
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showNotice, setShowNotice] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const savedAccount = params.get("account");
    if (savedAccount) setIdentifier(savedAccount);
    let active = true;
    getSupabaseBrowserClient().auth.getSession().then(({ data }) => {
      if (active && data.session) router.replace(destinationPath());
    }).catch(() => {});
    return () => { active = false; };
  }, [router]);

  const destinationPath = () => {
    const next = new URLSearchParams(window.location.search).get("next") || "/account";
    return next.startsWith("/") && !next.startsWith("//") ? next : "/account";
  };
  const callbackUrl = () => `${window.location.origin}/auth/callback?next=${encodeURIComponent(destinationPath())}`;

  useEffect(() => {
    if (mode !== "signup" || !/^[a-z0-9_]{3,24}$/.test(username)) { setUsernameCheck(""); setCheckingUsername(false); return; }
    let active = true;
    const timer = setTimeout(async () => {
      setCheckingUsername(true);
      try {
        const response = await fetch(`/api/username/check?username=${encodeURIComponent(username)}`);
        const result = await response.json().catch(() => ({}));
        if (active) setUsernameCheck(response.ok ? (result.available ? "Available" : "Already taken") : "Could not check right now");
      } catch { if (active) setUsernameCheck("Could not check right now"); }
      finally { if (active) setCheckingUsername(false); }
    }, 350);
    return () => { active = false; clearTimeout(timer); };
  }, [username, mode]);

  async function submit(event) {
    event.preventDefault();
    setBusy(true); setError(""); setMessage("");
    try {
      const supabase = getSupabaseBrowserClient();
      if (mode === "signup") {
        const email = identifier.trim().toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Enter a valid email address.");
        if (password.length < 8) throw new Error("Use at least 8 characters for your password.");
        const chosenUsername = username.trim().toLowerCase();
        if (!/^[a-z0-9_]{3,24}$/.test(chosenUsername)) throw new Error("Username must be 3–24 characters using letters, numbers, or underscores.");
        const referredByCode = (new URLSearchParams(window.location.search).get("ref") || "").trim().toLowerCase();
        const { data, error: authError } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: callbackUrl(), data: {
            full_name: name.trim(), username: chosenUsername,
            referred_by_code: referredByCode || null
          }}
        });
        if (authError) throw authError;
        if (data.session) { window.location.assign(destinationPath()); return; }
        setMessage("Account created. Check your email for the verification link, then sign in with your email or username and password.");
        setMode("signin");
        setPassword("");
        return;
      }

      const value = identifier.trim();
      if (value.includes("@")) {
        const { error: authError } = await supabase.auth.signInWithPassword({ email: value.toLowerCase(), password });
        if (authError) throw authError;
      } else {
        const response = await fetch("/api/auth/username-login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: value.toLowerCase(), password })
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || "Username or password is incorrect.");
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: result.session.access_token,
          refresh_token: result.session.refresh_token
        });
        if (sessionError) throw sessionError;
      }
      window.location.assign(destinationPath());
    } catch (e) {
      const raw = e?.message || "Could not complete authentication.";
      if (/provider is not enabled|unsupported provider|provider.*disabled/i.test(raw)) {
        setError("This sign-in provider is not enabled in Supabase yet. Enable it in Authentication → Sign In / Providers.");
      } else if (/profiles_username_unique|duplicate key.*username|username.*already/i.test(raw)) {
        setError("That username is already taken. Please choose another one.");
      } else if (/invalid login credentials|username or password/i.test(raw)) {
        setError("Email/username or password is incorrect. If you previously used email codes, use “Forgot password?” to create a password first.");
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
        provider, options: { redirectTo: callbackUrl() }
      });
      if (authError) throw authError;
    } catch (e) {
      const raw = e?.message || "Could not start social login.";
      setError(/provider is not enabled|unsupported provider|provider.*disabled/i.test(raw)
        ? "Google login is not enabled in Supabase. Configure its OAuth Client ID and Client Secret in Authentication → Sign In / Providers."
        : raw);
      setBusy(false);
    }
  }

  return (
    <main style={styles.page}>
      {showNotice && <div role="dialog" aria-modal="true" aria-labelledby="legacy-title" style={styles.overlay}>
        <section style={styles.notice}>
          <h2 id="legacy-title" style={{margin:"0 0 9px",fontSize:20}}>Password sign-in is now required</h2>
          <p style={{margin:"0 0 18px",fontSize:14,lineHeight:1.6,opacity:.78}}>Email verification-code login has been removed. If you previously signed in using email codes, tap <b>Forgot password?</b> below to set a password for your existing account. Your account and data will remain the same.</p>
          <button type="button" style={styles.primary} onClick={() => setShowNotice(false)}>Continue</button>
        </section>
      </div>}
      <section style={styles.card}>
        <Link href="/" style={styles.brand}>Dbweb</Link>
        <p style={styles.eyebrow}>YOUR ACCOUNT</p>
        <h1 style={styles.heading}>{mode === "signup" ? "Create your account" : "Welcome back"}</h1>
        <p style={styles.sub}>{mode === "signup" ? "Create your Dbweb account using your email and a password." : "Sign in using your email or username."}</p>
        <div style={styles.socials}>
          <button type="button" style={styles.secondary} disabled={busy} onClick={() => social("google")}><svg aria-hidden="true" viewBox="0 0 48 48" width="19" height="19" style={{display:"inline-block",verticalAlign:"middle",marginRight:10}}><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.02 13.22l7.98 6.19C11.9 13.72 17.45 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.76 7.18l7.73 6C44.42 37.95 46.98 31.8 46.98 24.55z"/><path fill="#FBBC05" d="M10 28.59A14.4 14.4 0 0 1 9.22 24c0-1.59.27-3.13.76-4.59L2 13.22A23.9 23.9 0 0 0 0 24c0 3.86.92 7.51 2.54 10.78L10 28.59z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.91-5.8l-7.73-6c-2.14 1.44-4.88 2.3-8.18 2.3-6.55 0-12.1-4.22-14.09-10.09l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>Continue with Google</button>
        </div>
        <div style={styles.divider}><span>or use your account</span></div>
        <form onSubmit={submit} style={styles.form}>
          {mode === "signup" && <>
            <label style={styles.label}>Username<input style={styles.input} autoComplete="username" value={username} onChange={e => {setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g,"").slice(0,24));setUsernameEdited(true);setUsernameCheck("");}} required minLength={3} maxLength={24} pattern="[a-z0-9_]{3,24}" placeholder="emailname_a83f21" /></label>
            <small aria-live="polite" style={{fontSize:12,opacity:.72,marginTop:-8}}>{checkingUsername ? "Checking availability…" : usernameCheck || "Choose an email-related or random username. You can change it later in Account settings."}</small>
            <label style={styles.label}>Display name<input style={styles.input} autoComplete="name" value={name} onChange={e => setName(e.target.value)} required minLength={2} maxLength={80} /></label>
          </>}
          <label style={styles.label}>{mode === "signup" ? "Email address" : "Email or username"}<input style={styles.input} type="text" autoComplete={mode === "signup" ? "email" : "username"} value={identifier} onChange={e => {const value=e.target.value;setIdentifier(value);if(mode==="signup"&&!usernameEdited&&value.includes("@")){const prefix=(value.split("@")[0].toLowerCase().replace(/[^a-z0-9_]/g,"").replace(/^_+|_+$/g,"").slice(0,15)||"user");setUsername(`${prefix}_${crypto.randomUUID().replace(/-/g,"").slice(0,6)}`);}}} required placeholder={mode === "signup" ? "you@example.com" : "you@example.com or username"} /></label>
          <label style={styles.label}>Password
            <span style={styles.passwordWrap}>
              <input style={styles.passwordInput} type={showPassword ? "text" : "password"} autoComplete={mode === "signup" ? "new-password" : "current-password"} value={password} onChange={e => setPassword(e.target.value)} required minLength={mode === "signup" ? 8 : undefined} />
              <button type="button" style={styles.eye} aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword} onClick={() => setShowPassword(v => !v)}><EyeIcon visible={showPassword}/></button>
            </span>
          </label>
          {mode === "signin" && <div style={{textAlign:"right"}}><Link style={styles.link} href="/auth/reset">Forgot password?</Link></div>}
          <button type="submit" style={styles.primary} disabled={busy}>{busy ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}</button>
        </form>
        {error && <div role="alert" style={styles.error}>{error}</div>}
        {message && <p role="status" style={styles.success}>{message}</p>}
        <p style={styles.switchText}>{mode === "signup" ? "Already have an account? " : "New to Dbweb? "}<button type="button" style={styles.textButton} onClick={() => {setMode(mode === "signup" ? "signin" : "signup");setPassword("");setUsernameEdited(false);setUsernameCheck("");setShowPassword(false);setError("");setMessage("");}}>{mode === "signup" ? "Sign in" : "Create account"}</button></p>
        <p style={styles.footer}>By continuing, you agree to Dbweb’s <Link style={styles.link} href="/terms">Terms</Link> and <Link style={styles.link} href="/privacy">Privacy Policy</Link>.</p>
        <Link href="/" style={styles.back}>← Back to Dbweb</Link>
      </section>
    </main>
  );
}

const styles = {
  page:{minHeight:"100dvh",display:"grid",placeItems:"center",padding:20,background:"var(--bg,#f4f5f7)",color:"var(--text,#15171a)",fontFamily:"Arial,Helvetica,sans-serif"},
  overlay:{position:"fixed",inset:0,zIndex:1000,display:"grid",placeItems:"center",padding:20,background:"rgba(0,0,0,.58)",backdropFilter:"blur(5px)"},
  notice:{width:"100%",maxWidth:390,boxSizing:"border-box",padding:24,border:"1px solid var(--border,#e3e5e8)",borderRadius:18,background:"var(--surface,#fff)",color:"var(--text,#15171a)",boxShadow:"0 20px 70px rgba(0,0,0,.25)"},
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
  passwordWrap:{display:"flex",alignItems:"center",border:"1px solid var(--border,#dfe2e6)",borderRadius:10,background:"var(--input-bg,#fff)"},
  passwordInput:{width:"100%",minWidth:0,boxSizing:"border-box",padding:"13px 12px",border:0,borderRadius:10,background:"transparent",color:"inherit",fontSize:15,outline:"none"},
  eye:{display:"grid",placeItems:"center",flex:"0 0 44px",height:44,border:0,background:"transparent",color:"inherit",cursor:"pointer"},
  primary:{width:"100%",padding:14,border:0,borderRadius:11,background:"var(--accent,#17191c)",color:"var(--accent-contrast,#fff)",fontSize:14,fontWeight:750,cursor:"pointer"},
  link:{color:"var(--accent,#17191c)",fontWeight:650},
  error:{padding:12,borderRadius:9,background:"#fff0f0",color:"#a21b1b",fontSize:13,lineHeight:1.5},
  success:{padding:12,borderRadius:9,background:"#edf9f0",color:"#176b35",fontSize:13,lineHeight:1.5},
  switchText:{margin:"22px 0 0",textAlign:"center",fontSize:13,opacity:.8},
  textButton:{display:"inline-block",border:0,background:"transparent",padding:0,fontWeight:750,color:"var(--accent,#17191c)",cursor:"pointer",textDecoration:"underline"},
  footer:{margin:"22px 0 0",fontSize:11,lineHeight:1.7,opacity:.62},
  back:{display:"inline-block",marginTop:20,fontSize:13,color:"inherit",textDecoration:"none",opacity:.75}
};
