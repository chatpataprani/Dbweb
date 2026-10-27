"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, CircleAlert, RefreshCw, ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default function StatusPage() {
  const [state, setState] = useState("checking");
  const [checkedAt, setCheckedAt] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  async function checkStatus() {
    setRefreshing(true);
    try {
      const response = await fetch("/api/health", { cache: "no-store" });
      const data = await response.json();
      setState(response.ok && data.status === "ok" ? "operational" : "degraded");
    } catch {
      setState("unreachable");
    } finally {
      setCheckedAt(new Date().toLocaleString());
      setRefreshing(false);
    }
  }

  useEffect(() => { checkStatus(); }, []);

  const good = state === "operational";
  const label = state === "checking" ? "Checking service…" : good ? "All monitored systems operational" : state === "degraded" ? "Some services may be degraded" : "Status check unavailable";

  return (
    <main className="dbInfoPage">
      <nav className="dbInfoNav"><a href="/" className="dbInfoBrand">Dbweb</a><a href="/">Home</a><a href="/tools">Tools</a></nav>
      <section className="dbInfoCard">
        <p className="dbInfoEyebrow">SERVICE STATUS</p>
        <h1>Dbweb status</h1>
        <p className="dbInfoLead">A quick view of the services we can currently check.</p>
        <div className={"dbStatusBanner " + (good ? "isGood" : state === "checking" ? "isChecking" : "isWarn")}>
          {good ? <CheckCircle2 size={20}/> : <CircleAlert size={20}/>}
          <strong>{label}</strong>
        </div>
        <div className="dbStatusRow"><div><strong>Core API & database</strong><span>Health endpoint and database connectivity</span></div><span className={"dbStatusPill " + (good ? "isGood" : state === "checking" ? "isChecking" : "isWarn")}>{state === "checking" ? "Checking" : good ? "Operational" : state === "unreachable" ? "Unknown" : "Degraded"}</span></div>
        <button className="dbStatusRefresh" type="button" onClick={checkStatus} disabled={refreshing}><RefreshCw size={15} className={refreshing ? "dbStatusSpin" : ""}/>{refreshing ? "Checking…" : "Refresh status"}</button>
        {checkedAt && <p className="dbStatusChecked">Last checked: {checkedAt}</p>}
        <p className="dbStatusNote">This automated check covers the API health endpoint and its database check only. Other features may rely on third-party services and are not monitored here.</p>
      </section>
      <style jsx>{`
        .dbInfoPage{min-height:100svh;padding:20px clamp(16px,4vw,40px) 50px;background:var(--bg,#0d1117);color:var(--text,#e6edf3)}
        .dbInfoNav{max-width:900px;margin:0 auto 50px;display:flex;align-items:center;gap:22px}.dbInfoNav a{color:var(--muted,#8b949e);text-decoration:none;font-size:14px}.dbInfoNav .dbInfoBrand{font-size:18px;font-weight:750;color:var(--text,#e6edf3);margin-right:auto}
        .dbInfoCard{max-width:680px;margin:0 auto;padding:clamp(22px,5vw,38px);border:1px solid var(--border,#30363d);border-radius:16px;background:var(--surface,#161b22)}
        .dbInfoEyebrow{font-size:11px;letter-spacing:.14em;font-weight:750;color:var(--muted,#8b949e)}h1{font-size:clamp(28px,6vw,38px);letter-spacing:-.04em;margin:8px 0}.dbInfoLead{color:var(--muted,#8b949e);line-height:1.6;margin:0 0 24px}
        .dbStatusBanner{display:flex;align-items:center;gap:12px;padding:15px;border:1px solid;border-radius:10px;font-size:14px}.isGood{color:#3fb950;border-color:#23863655;background:#23863615}.isWarn{color:#d29922;border-color:#d2992255;background:#d2992215}.isChecking{color:#8b949e;border-color:#8b949e55;background:#8b949e10}
        .dbStatusRow{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:20px 0;border-bottom:1px solid var(--border,#30363d)}.dbStatusRow>div{display:grid;gap:5px}.dbStatusRow strong{font-size:14px}.dbStatusRow span{font-size:12px;color:var(--muted,#8b949e)}
        .dbStatusPill{white-space:nowrap;border:1px solid;border-radius:99px;padding:5px 9px;font-size:11px!important;font-weight:700}
        .dbStatusRefresh{display:inline-flex;align-items:center;gap:8px;margin-top:20px;padding:10px 13px;border:1px solid var(--border,#30363d);border-radius:8px;background:transparent;color:var(--text,#e6edf3);font:inherit;font-size:13px;cursor:pointer}.dbStatusRefresh:disabled{opacity:.65;cursor:wait}.dbStatusSpin{animation:dbStatusSpin .8s linear infinite}
        .dbStatusChecked,.dbStatusNote{font-size:12px;color:var(--muted,#8b949e);line-height:1.6}.dbStatusNote{margin-top:24px;padding-top:16px;border-top:1px solid var(--border,#30363d)}
        @keyframes dbStatusSpin{to{transform:rotate(360deg)}}@media(prefers-reduced-motion:reduce){.dbStatusSpin{animation:none}}@media(max-width:420px){.dbInfoNav{margin-bottom:30px}.dbStatusRow{align-items:flex-start;flex-direction:column}}
      `}</style>
    </main>
  );
}
