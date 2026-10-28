"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSupabaseBrowserClient } from "../../lib/supabase-browser";

export default function AccountPage() {
  const [user, setUser] = useState(null);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getSupabaseBrowserClient().auth.getUser().then(({ data, error: authError }) => {
      if (!active) return;
      if (authError || !data.user) {
        window.location.replace("/login");
        return;
      }
      setUser(data.user);
      setName(data.user.user_metadata?.full_name || data.user.user_metadata?.name || "");
      setLoading(false);
    }).catch(e => {
      if (active) { setError(e?.message || "Could not load your account."); setLoading(false); }
    });
    return () => { active = false; };
  }, []);

  async function saveProfile(event) {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    try {
      const { data, error: updateError } = await getSupabaseBrowserClient().auth.updateUser({ data: { full_name: name.trim() } });
      if (updateError) throw updateError;
      setUser(data.user);
      setMessage("Profile updated.");
    } catch (e) { setError(e?.message || "Could not update profile."); }
    finally { setBusy(false); }
  }

  async function signOut() {
    setBusy(true);
    try {
      const { error: signOutError } = await getSupabaseBrowserClient().auth.signOut();
      if (signOutError) throw signOutError;
      window.location.replace("/login");
    } catch (e) { setError(e?.message || "Could not sign out."); setBusy(false); }
  }

  if (loading) return <main style={styles.page}><section style={styles.card}>Loading your account…</section></main>;

  return <main style={styles.page}>
    <section style={styles.card}>
      <Link href="/" style={styles.brand}>Dbweb</Link>
      <p style={styles.eyebrow}>ACCOUNT DASHBOARD</p>
      <h1 style={styles.heading}>Your account</h1>
      {user && <p style={styles.sub}>Signed in as <strong>{user.email}</strong></p>}
      <form onSubmit={saveProfile} style={styles.form}>
        <label style={styles.label}>Display name<input style={styles.input} value={name} onChange={e => setName(e.target.value)} minLength={2} maxLength={80} required /></label>
        <label style={styles.label}>Email address<input style={{...styles.input,opacity:.7}} value={user?.email || ""} readOnly /></label>
        <label style={styles.label}>Sign-in method<input style={{...styles.input,opacity:.7}} value={user?.app_metadata?.provider || "email"} readOnly /></label>
        <button style={styles.primary} disabled={busy}>{busy ? "Please wait…" : "Save profile"}</button>
      </form>
      {message && <p style={styles.success}>{message}</p>}
      {error && <p role="alert" style={styles.error}>{error}</p>}
      <div style={styles.actions}>
        <Link href="/" style={styles.secondary}>Go to Dbweb</Link>
        <button type="button" style={styles.secondary} disabled={busy} onClick={signOut}>Sign out</button>
      </div>
      <p style={styles.note}>Your existing Dbweb tools and device-based premium features remain unchanged by this account page.</p>
    </section>
  </main>;
}

const styles = {
  page:{minHeight:"100dvh",display:"grid",placeItems:"center",padding:20,background:"var(--bg,#f4f5f7)",color:"var(--text,#15171a)",fontFamily:"Arial,Helvetica,sans-serif"},
  card:{width:"100%",maxWidth:480,boxSizing:"border-box",padding:"clamp(24px,5vw,38px)",border:"1px solid var(--border,#e3e5e8)",borderRadius:22,background:"var(--surface,#fff)",boxShadow:"0 18px 55px rgba(0,0,0,.07)"},
  brand:{display:"inline-block",fontSize:25,fontWeight:800,letterSpacing:"-1px",color:"inherit",textDecoration:"none"},
  eyebrow:{margin:"28px 0 8px",fontSize:11,fontWeight:700,letterSpacing:"2px",opacity:.65},
  heading:{margin:"0 0 9px",fontSize:30,letterSpacing:"-1px"},
  sub:{margin:"0 0 24px",fontSize:14,lineHeight:1.6,opacity:.75},
  form:{display:"grid",gap:15,marginTop:22},
  label:{display:"grid",gap:7,fontSize:13,fontWeight:650},
  input:{width:"100%",boxSizing:"border-box",padding:"13px 12px",border:"1px solid var(--border,#dfe2e6)",borderRadius:10,background:"var(--input-bg,#fff)",color:"inherit",fontSize:15},
  primary:{padding:14,border:0,borderRadius:11,background:"var(--accent,#17191c)",color:"var(--accent-contrast,#fff)",fontSize:14,fontWeight:750,cursor:"pointer"},
  actions:{display:"flex",gap:10,flexWrap:"wrap",marginTop:18},
  secondary:{display:"inline-flex",alignItems:"center",justifyContent:"center",padding:"11px 14px",border:"1px solid var(--border,#dfe2e6)",borderRadius:10,background:"transparent",color:"inherit",fontSize:13,fontWeight:650,textDecoration:"none",cursor:"pointer"},
  success:{padding:12,borderRadius:9,background:"#edf9f0",color:"#176b35",fontSize:13},
  error:{padding:12,borderRadius:9,background:"#fff0f0",color:"#a21b1b",fontSize:13,lineHeight:1.5},
  note:{marginTop:24,fontSize:11,lineHeight:1.7,opacity:.6}
};
