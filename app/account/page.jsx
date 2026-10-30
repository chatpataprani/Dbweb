"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSupabaseBrowserClient } from "../../lib/supabase-browser";

export default function AccountPage() {
  const [user, setUser] = useState(null);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [usernameCheck, setUsernameCheck] = useState("");
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState("");
  const [profile, setProfile] = useState(null);
  const [referralCount, setReferralCount] = useState(0);
  const [overview, setOverview] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [overviewError, setOverviewError] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const supabase = getSupabaseBrowserClient();
        const [{data:authData,error:authError},{data:sessionData}] = await Promise.all([
          supabase.auth.getUser(), supabase.auth.getSession()
        ]);
        if (authError || !authData.user) {
          window.location.replace("/login");
          return;
        }
        if (!active) return;
        const currentUser = authData.user;
        const token = sessionData.session?.access_token;
        setUser(currentUser);
        setName(currentUser.user_metadata?.full_name || currentUser.user_metadata?.name || "");
        setAvatarUrl(currentUser.user_metadata?.avatar_url || "");
        if (token) {
          const headers = { authorization: "Bearer " + token };
          const [profileResponse, overviewResponse] = await Promise.all([
            fetch("/api/profile", { headers }),
            fetch("/api/account", { headers })
          ]);
          const profileData = await profileResponse.json().catch(() => ({}));
          const overviewData = await overviewResponse.json().catch(() => ({}));
          if (!active) return;
          if (profileResponse.ok) {
            setProfile(profileData.profile);
            setUsername(profileData.profile?.username || currentUser.user_metadata?.username || "");
            setAvatarUrl(profileData.profile?.avatar_url || currentUser.user_metadata?.avatar_url || "");
            setReferralCount(profileData.referral_count || 0);
          } else {
            setUsername(currentUser.user_metadata?.username || "");
            setError(profileData.error || "Could not load profile settings.");
          }
          if (overviewResponse.ok) setOverview(overviewData);
          else setOverviewError(overviewData.error || "Could not load premium information.");
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

  async function checkUsername() {
    setCheckingUsername(true); setUsernameCheck(""); setError("");
    try {
      const supabase = getSupabaseBrowserClient();
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("Please sign in again.");
      const response = await fetch(`/api/profile?check_username=${encodeURIComponent(username.trim().toLowerCase())}`, { headers: { authorization: "Bearer " + token } });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Could not check username.");
      setUsernameCheck(result.available ? "Username is available." : result.owned ? "This is your current username." : "That username is already taken.");
    } catch (e) { setError(e?.message || "Could not check username."); }
    finally { setCheckingUsername(false); }
  }

  async function saveProfile(event) {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    try {
      const supabase = getSupabaseBrowserClient();
      const { data:sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("Your session expired. Please sign in again.");
      const { data, error: updateError } = await supabase.auth.updateUser({
        data: { full_name: name.trim(), username: username.trim().toLowerCase(), avatar_url: avatarUrl }
      });
      if (updateError) throw updateError;
      const response = await fetch("/api/profile", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: "Bearer " + token },
        body: JSON.stringify({ username: username.trim().toLowerCase(), full_name: name.trim(), avatar_url: avatarUrl })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Could not save your profile.");
      setUser(data.user);
      setProfile(result.profile);
      setUsername(result.profile.username || "");
      setUsernameCheck("");
      setMessage("Profile saved successfully.");
    } catch (e) { setError(e?.message || "Could not update profile."); }
    finally { setBusy(false); }
  }

  async function uploadAvatar(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError(""); setMessage("");
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Choose a JPG, PNG, or WebP image.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("Profile pictures must be 2 MB or smaller.");
      return;
    }
    setUploading(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { data:authData, error:authError } = await supabase.auth.getUser();
      if (authError || !authData.user) throw new Error("Please sign in again.");
      const ext = file.type === "image/jpeg" ? "jpg" : file.type === "image/png" ? "png" : "webp";
      const filePath = authData.user.id + "/" + crypto.randomUUID() + "." + ext;
      const { error:uploadError } = await supabase.storage.from("profile-avatars").upload(filePath, file, { contentType:file.type, upsert:false, cacheControl:"3600" });
      if (uploadError) {
        if (/bucket not found/i.test(uploadError.message || "")) throw new Error("Profile picture storage is not ready. Run migration 202610280003_profile_referrals.sql in Supabase.");
        throw uploadError;
      }
      const { data } = supabase.storage.from("profile-avatars").getPublicUrl(filePath);
      setAvatarUrl(data.publicUrl);
      setMessage("Picture uploaded. Press Save profile to apply it.");
    } catch (e) { setError(e?.message || "Could not upload profile picture."); }
    finally { setUploading(false); }
  }

  async function copyReferral() {
    const code = profile?.referral_code;
    if (!code) { setError("Referral code is not ready. Run the latest profile migration in Supabase."); return; }
    const link = window.location.origin + "/login?ref=" + encodeURIComponent(code);
    try {
      await navigator.clipboard.writeText(link);
      setMessage("Referral link copied.");
    } catch {
      window.prompt("Copy your referral link:", link);
    }
  }

  async function signOut() {
    setBusy(true); setError("");
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
        <div style={styles.avatarRow}>
          {avatarUrl ? <img src={avatarUrl} alt="Profile picture" style={styles.avatar} /> : <div style={styles.avatarFallback}>{(name || username || user?.email || "D").slice(0,1).toUpperCase()}</div>}
          <div style={{display:"grid",gap:7}}>
            <strong style={{fontSize:14}}>Profile picture</strong>
            <label style={styles.uploadButton}>{uploading ? "Uploading…" : "Choose picture"}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadAvatar} disabled={uploading} style={styles.fileInput} /></label>
            <span style={styles.hint}>JPG, PNG or WebP · max 2 MB</span>
          </div>
        </div>
        <label style={styles.label}>Display name<input style={styles.input} value={name} onChange={e => setName(e.target.value)} minLength={2} maxLength={80} required /></label>
        <label style={styles.label}>Username<input style={styles.input} value={username} onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g,"").slice(0,24))} minLength={3} maxLength={24} pattern="[a-z0-9_]{3,24}" placeholder="your_username" required /><span style={styles.hint}>3–24 characters: letters, numbers and underscores. Use an email-related or random username.</span><button type="button" style={styles.secondary} onClick={checkUsername} disabled={checkingUsername || !/^[a-z0-9_]{3,24}$/.test(username.trim().toLowerCase())}>{checkingUsername ? "Checking…" : "Check username"}</button>{usernameCheck && <span role="status" style={styles.hint}>{usernameCheck}</span>}</label>
        <label style={styles.label}>Email address<input style={{...styles.input,opacity:.7}} value={user?.email || ""} readOnly /></label>
        <label style={styles.label}>Sign-in method<input style={{...styles.input,opacity:.7}} value={user?.app_metadata?.provider || "email"} readOnly /></label>
        <button style={styles.primary} disabled={busy || uploading}>{busy ? "Saving…" : "Save profile"}</button>
      </form>
      {message && <p role="status" style={styles.success}>{message}</p>}
      {error && <p role="alert" style={styles.error}>{error}</p>}

      <div style={styles.section}>
        <h2 style={styles.sectionHeading}>Refer a friend</h2>
        <p style={styles.note}>Share your personal link so friends can join Dbweb. Rewards count only after a referred account verifies its email.</p>
        <div style={styles.referralBox}>
          <div><span style={styles.hint}>Your referral code</span><strong style={styles.referralCode}>{profile?.referral_code || "Setting up…"}</strong></div>
          <div><span style={styles.hint}>Accounts referred</span><strong style={styles.referralCode}>{referralCount}</strong></div>
        </div>
        <button type="button" style={styles.secondary} onClick={copyReferral} disabled={!profile?.referral_code}>Copy referral link</button>
        <p style={styles.note}>Rewards: every 10 verified referrals gives +5 searches. At 50 referrals you also get 7 days unlimited; at 100 referrals you also get 30 days unlimited. The 50- and 100-referral milestones also include the +5-search reward.</p>
      </div>

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
  avatarRow:{display:"flex",alignItems:"center",gap:16,marginBottom:8},
  avatar:{width:76,height:76,borderRadius:"50%",objectFit:"cover",border:"1px solid var(--border,#dfe2e6)"},
  avatarFallback:{width:76,height:76,borderRadius:"50%",display:"grid",placeItems:"center",background:"var(--bg,#f4f5f7)",border:"1px solid var(--border,#dfe2e6)",fontSize:26,fontWeight:750},
  uploadButton:{position:"relative",display:"inline-flex",width:"fit-content",padding:"9px 12px",border:"1px solid var(--border,#dfe2e6)",borderRadius:9,fontSize:12,fontWeight:650,cursor:"pointer"},
  fileInput:{position:"absolute",inset:0,width:"100%",height:"100%",opacity:0,cursor:"pointer"},
  hint:{fontSize:11,opacity:.62,lineHeight:1.5},
  success:{padding:12,borderRadius:9,background:"#edf9f0",color:"#176b35",fontSize:13,lineHeight:1.5},
  error:{padding:12,borderRadius:9,background:"#fff0f0",color:"#a21b1b",fontSize:13,lineHeight:1.5},
  warning:{padding:12,borderRadius:9,background:"#fff7e6",color:"#805200",fontSize:13,lineHeight:1.5},
  section:{marginTop:28,paddingTop:22,borderTop:"1px solid var(--border,#e3e5e8)"},
  sectionHeading:{fontSize:17,margin:"0 0 14px"},
  stats:{display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:8},
  stat:{display:"grid",gap:8,padding:12,border:"1px solid var(--border,#e3e5e8)",borderRadius:12},
  deviceList:{display:"grid",gap:9,marginTop:12},
  device:{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,padding:13,border:"1px solid var(--border,#e3e5e8)",borderRadius:12,fontSize:13},
  deviceMeta:{margin:"5px 0 0",fontSize:11,opacity:.65,overflowWrap:"anywhere"},
  devicePlan:{fontSize:11,opacity:.75,textAlign:"right",maxWidth:120},
  payment:{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,padding:"11px 12px",border:"1px solid var(--border,#e3e5e8)",borderRadius:10,fontSize:12},
  paymentHeading:{fontSize:14,margin:"20px 0 0"},
  referralBox:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,margin:"12px 0"},
  referralCode:{display:"block",fontSize:20,marginTop:6,overflowWrap:"anywhere"},
  note:{marginTop:12,fontSize:11,lineHeight:1.7,opacity:.62}
};
