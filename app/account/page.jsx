"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSupabaseBrowserClient } from "../../lib/supabase-browser";

export default function AccountPage() {
  const [user, setUser] = useState(null);
  const [name, setName] = useState("");
  const [overview, setOverview] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [overviewError, setOverviewError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const supabase = getSupabaseBrowserClient();
        const [{data:authData,error:authError},{data:sessionData}] = await Promise.all([
          supabase.auth.getUser(),
          supabase.auth.getSession()
        ]);
        if (authError || !authData.user) {
          window.location.replace("/login");
          return;
        }
        if (!active) return;
        setUser(authData.user);
        setName(authData.user.user_metadata?.full_name || authData.user.user_metadata?.name || "");
        if (sessionData.session?.access_token) {
          const response = await fetch("/api/account", {headers:{authorization:"Bearer "+sessionData.session.access_token}});
          const data = await response.json().catch(()=>({}));
          if (response.ok) setOverview(data);
          else setOverviewError(data.error || "Could not load premium information.");
        }
      } catch (e) {
        if (active) setError(e?.message || "Could not load your account.");
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
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

  const date = value => value ? new Date(value).toLocaleDateString(undefined,{year:"numeric",month:"short",day:"numeric"}) : "—";
  const isPremium = device => Boolean(device.plan_expires_at && new Date(device.plan_expires_at).getTime() > Date.now() && device.plan && device.plan !== "free");

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

      <div style={styles.section}>
        <h2 style={styles.sectionHeading}>Premium &amp; credits</h2>
        {overviewError && <p role="status" style={styles.warning}>{overviewError}</p>}
        {overview && <>
          <div style={styles.stats}>
            <div style={styles.stat}><span>Linked devices</span><strong>{overview.summary?.linked_devices ?? 0}</strong></div>
            <div style={styles.stat}><span>Total credits</span><strong>{overview.summary?.total_credits ?? 0}</strong></div>
            <div style={styles.stat}><span>Premium devices</span><strong>{overview.summary?.active_premium_devices ?? 0}</strong></div>
          </div>
          {overview.devices?.length ? <div style={styles.deviceList}>
            {overview.devices.map(device=><div key={device.device_id} style={styles.device}>
              <div style={{minWidth:0}}><strong>{device.display_name || "Dbweb device"}</strong><p style={styles.deviceMeta}>ID: {device.device_id}</p><p style={styles.deviceMeta}>{device.credits ?? 0} credits · {isPremium(device) ? "Premium active" : "Free plan"}</p></div>
              <div style={styles.devicePlan}>{isPremium(device) ? "Expires "+date(device.plan_expires_at) : "No active premium"}</div>
            </div>)}
          </div> : <p style={styles.note}>No device is linked yet. Open Dbweb while signed in and accept the current Terms to link this device and show its existing premium and credits here.</p>}
          {overview.payments?.length>0&&<><h3 style={styles.paymentHeading}>Recent payments</h3><div style={styles.deviceList}>{overview.payments.slice(0,8).map(payment=><div key={payment.id} style={styles.payment}><span>{payment.plan_days} day plan · ₹{payment.amount}</span><strong>{payment.status}</strong><span style={styles.deviceMeta}>{date(payment.created_at)}</span></div>)}</div></>}
        </>}
        {!overview&&!overviewError&&<p style={styles.note}>Premium details will appear after your Dbweb device is linked.</p>}
      </div>

      <div style={styles.actions}>
        <Link href="/" style={styles.secondary}>Go to Dbweb</Link>
        <Link href="/plan" style={styles.secondary}>View plans</Link>
        <button type="button" style={styles.secondary} disabled={busy} onClick={signOut}>Sign out</button>
      </div>
      <p style={styles.note}>Your current device-based plans and credits are preserved. When you use Dbweb while signed in, this account can show the premium status for linked devices.</p>
    </section>
  </main>;
}

const styles = {
  page:{minHeight:"100dvh",display:"grid",placeItems:"center",padding:20,background:"var(--bg,#f4f5f7)",color:"var(--text,#15171a)",fontFamily:"Arial,Helvetica,sans-serif"},
  card:{width:"100%",maxWidth:560,boxSizing:"border-box",padding:"clamp(24px,5vw,38px)",border:"1px solid var(--border,#e3e5e8)",borderRadius:22,background:"var(--surface,#fff)",boxShadow:"0 18px 55px rgba(0,0,0,.07)"},
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
  warning:{padding:12,borderRadius:9,background:"#fff7e6",color:"#805200",fontSize:13,lineHeight:1.5},
  section:{marginTop:28,paddingTop:22,borderTop:"1px solid var(--border,#e3e5e8)"},
  sectionHeading:{fontSize:17,margin:"0 0 14px"},
  stats:{display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:8},
  stat:{display:"grid",gap:8,padding:12,border:"1px solid var(--border,#e3e5e8)",borderRadius:12},
  statSpan:{fontSize:11,opacity:.65},
  deviceList:{display:"grid",gap:9,marginTop:12},
  device:{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,padding:13,border:"1px solid var(--border,#e3e5e8)",borderRadius:12,fontSize:13},
  deviceMeta:{margin:"5px 0 0",fontSize:11,opacity:.65,overflowWrap:"anywhere"},
  devicePlan:{fontSize:11,opacity:.75,textAlign:"right",maxWidth:120},
  payment:{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,padding:"11px 12px",border:"1px solid var(--border,#e3e5e8)",borderRadius:10,fontSize:12},
  paymentHeading:{fontSize:14,margin:"20px 0 0"},
  note:{marginTop:18,fontSize:11,lineHeight:1.7,opacity:.62}
};
