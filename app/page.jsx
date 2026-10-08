'use client';

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { Search, CreditCard, ShieldCheck, History, Settings, LogIn, UserPlus, Upload, Copy, Check, X } from "lucide-react";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder");

const plans = [
  { name: "1 Day", price: 30, days: 1 },
  { name: "7 Days", price: 100, days: 7 },
  { name: "30 Days", price: 300, days: 30 }
];

export default function Home() {
  const [type, setType] = useState("number");
  const [query, setQuery] = useState("");
  const [credits, setCredits] = useState(10);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState("lookup");
  const [receipt, setReceipt] = useState(null);
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);\n  const [mobileNav, setMobileNav] = useState(false);

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) { setAuthReady(true); return; }
    supabase.auth.getSession().then(async ({data}) => {\n      setUser(data.session?.user || null);\n      if (data.session?.user) await loadCredits(data.session.user.id);\n      setAuthReady(true);\n    });
    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {\n      setUser(session?.user || null);\n      if (session?.user) await loadCredits(session.user.id);\n      else setCredits(0);\n    });
    return () => listener.subscription.unsubscribe();
  }, []);

  async function loadCredits(userId) {\n    const { data } = await supabase.from("profiles").select("credits").eq("id", userId).single();\n    if (data) setCredits(data.credits);\n  }\n\n  function protectedPage(next) {\n    if (!user && ["lookup", "history", "settings", "payment"].includes(next)) {\n      setPage("signin");\n      return;\n    }\n    setPage(next);\n    setMobileNav(false);\n  }\n\n  async function lookup(e) {
    e.preventDefault();
    if (!query.trim()) return setError("Enter a value to search.");
    if (credits <= 0) return setError("No credits left. Buy a plan to continue.");
    setLoading(true); setError(""); setResult(null);
    try {
      const res = await fetch("/api/lookup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        headers: { "content-type": "application/json", "Authorization": `Bearer ${(await supabase.auth.getSession()).data.session?.access_token || ""}` },\n        body: JSON.stringify({ type, query: query.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lookup failed");
      setResult(data);
      setCredits(c => Math.max(0, c - 1));
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  return (
    <div className="app">
      <aside>
        <div className="brand"><span className="brandIcon"><Search size={16}/></span>Lookup Console</div>
        <Nav active={page} onClick={protectedPage} icon={Search} label="Lookup" id="lookup"/>
        <Nav active={page} onClick={protectedPage} icon={History} label="History" id="history"/>
        <Nav active={page} onClick={setPage} icon={CreditCard} label="Plans" id="plans"/>
        <Nav active={page} onClick={protectedPage} icon={Settings} label="Settings" id="settings"/>
        <div className="navGroup">Account</div>
        <Nav active={page} onClick={(id)=>{setPage(id);setMobileNav(false)}} icon={LogIn} label="Sign in" id="signin"/>
        <Nav active={page} onClick={(id)=>{setPage(id);setMobileNav(false)}} icon={UserPlus} label="Register" id="register"/>
      </aside>

      <main>
        <header>
          <div><h1>{pageTitle(page)}</h1><p>{pageSubtitle(page)}</p></div>
          <div className="creditPill"><CreditCard size={15}/> {credits} credits {user ? "· " + user.email : ""}</div>
        </header>

        {!authReady ? <section className="card"><p>Loading…</p></section> : page === "lookup" && <Lookup type={type} setType={setType} query={query} setQuery={setQuery} lookup={lookup} loading={loading} error={error} result={result}/>}
        {page === "plans" && <Plans onBuy={(p) => { if (!user) { setPage("signin"); return; } setPage("payment"); setReceipt(p); }}/>} 
        {page === "payment" && <Payment plan={receipt || plans[0]}/>}
        {page === "history" && <Empty icon={History} title="No searches yet" text="Your completed searches will appear here."/>}
        {page === "settings" && <SettingsPage/>}
        {(page === "signin" || page === "register") && <Auth register={page === "register"} onAuth={(u)=>{setUser(u);setPage("lookup")}}/>}
      </main>
    </div>
  );
}

function Nav({active,onClick,icon:Icon,label,id}) {
  return <button className={"nav " + (active===id ? "on" : "")} onClick={()=>onClick(id)}><Icon size={17}/>{label}</button>
}
function pageTitle(p){ return ({lookup:"Lookup",plans:"Plans",payment:"Payment",history:"History",settings:"Settings",signin:"Sign in",register:"Create account"}[p]||"Lookup"); }
function pageSubtitle(p){ return ({lookup:"Search an authorized number or Aadhaar record.",plans:"Simple plans with no automatic daily credit refill.",payment:"Pay by UPI and submit the receipt for admin approval.",history:"Your recent searches.",settings:"Account and privacy controls.",signin:"Sign in with email and password or OTP.",register:"Create your account and receive 10 free credits."}[p]||""); }

function Lookup({type,setType,query,setQuery,lookup,loading,error,result}) {
  return <div className="stack">
    <section className="card">
      <div className="seg">
        <button className={type==="number"?"on":""} onClick={()=>setType("number")}>Number</button>
        <button className={type==="aadhar"?"on":""} onClick={()=>setType("aadhar")}>Aadhaar</button>
      </div>
      <form onSubmit={lookup} className="lookupForm">
        <input value={query} onChange={e=>setQuery(e.target.value)} placeholder={type==="number"?"Enter phone number":"Enter Aadhaar number"} inputMode={type==="number"?"tel":"numeric"}/>
        <button className="primary" disabled={loading}><Search size={17}/>{loading?"Searching…":"Search"}</button>
      </form>
      {error && <div className="error"><X size={16}/>{error}</div>}
      <p className="hint">Each completed lookup uses 1 credit. Free allowance is 10 credits once per account.</p>
    </section>

    {result && <section className="card">
      <div className="resultHead"><div><h2>Result</h2><p>Returned by the configured API.</p></div><button className="iconBtn" onClick={()=>navigator.clipboard?.writeText(JSON.stringify(result.data,null,2))}><Copy size={16}/></button></div>
      <pre>{JSON.stringify(result.data,null,2)}</pre>
    </section>}
  </div>
}

function Plans({onBuy}) {
  return <div className="grid3">{plans.map(p=><section className="card plan" key={p.days}>
    <div className="planIcon"><CreditCard size={18}/></div><h2>{p.name}</h2><div className="price">₹{p.price}</div><p>Premium access for {p.days} day{p.days>1?"s":""}.</p>
    <button className="primary wide" onClick={()=>onBuy(p)}>Pay with UPI</button>
  </section>)}</div>
}

function Payment({plan}) {\n  function payWithUpi() {\n    const upi = process.env.NEXT_PUBLIC_UPI_ID;\n    if (!upi) return alert("UPI ID is not configured yet.");\n    const params = new URLSearchParams({ pa: upi, pn: "Lookup Console", am: String(plan.price), cu: "INR", tn: `${plan.name} plan` });\n    window.location.href = `upi://pay?${params.toString()}`;\n  }
  const [status,setStatus]=useState("");
  const [file,setFile]=useState(null);
  async function submit(e){
    e.preventDefault(); if(!file) return setStatus("Select your payment receipt first.");
    setStatus("Receipt submitted for admin review.");
  }
  return <div className="paymentGrid"><section className="card">
    <h2>{plan.name} plan</h2><div className="price">₹{plan.price}</div><p>Pay exactly this amount through your UPI app.</p>\n    <button className="primary wide upiPay" type="button" onClick={payWithUpi}>Pay ₹{plan.price} with UPI</button>
    <div className="kv"><span>UPI ID</span><strong>{process.env.NEXT_PUBLIC_UPI_ID || "Configure NEXT_PUBLIC_UPI_ID"}</strong></div>
    <div className="kv"><span>Duration</span><strong>{plan.days} day{plan.days>1?"s":""}</strong></div>
  </section><section className="card">
    <h2>Submit receipt</h2><form onSubmit={submit}>
      <label className="drop"><Upload size={22}/><span>{file ? file.name : "Choose screenshot or PDF"}</span><input type="file" accept="image/*,.pdf" onChange={e=>setFile(e.target.files?.[0]||null)} hidden/></label>
      <button className="primary wide">Submit for approval</button>
    </form>{status&&<div className="success"><Check size={16}/>{status}</div>}
  </section></div>
}

function Auth({register,onAuth}) {
  const [email,setEmail]=useState(""); const [password,setPassword]=useState(""); const [message,setMessage]=useState(""); const [busy,setBusy]=useState(false);
  async function submit(e){e.preventDefault();setBusy(true);setMessage("");
    if(!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY){setMessage("Add Supabase environment variables first.");setBusy(false);return;}
    const r=register ? await supabase.auth.signUp({email,password}) : await supabase.auth.signInWithPassword({email,password});
    if(r.error){setMessage(r.error.message);setBusy(false);return;} setMessage(register?"Check your email to confirm the account.":"Signed in."); if(r.data.user && !register) onAuth(r.data.user); setBusy(false);
  }
  async function otp(){setBusy(true);setMessage(""); if(!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY){setMessage("Add Supabase environment variables first.");setBusy(false);return;} const r=await supabase.auth.signInWithOtp({email}); setMessage(r.error?.message || "OTP sent to your email.");setBusy(false);}
  return <section className="card auth"><div className="brand large"><span className="brandIcon"><ShieldCheck size={16}/></span>Lookup Console</div><h2>{register?"Create account":"Sign in"}</h2><p>{register?"You receive 10 credits once.":"Use your email and password, or request an OTP."}</p><form onSubmit={submit}><input placeholder="Email" type="email" value={email} onChange={e=>setEmail(e.target.value)} required/><input placeholder="Password (8+ characters)" type="password" value={password} onChange={e=>setPassword(e.target.value)} minLength={8} required/><button className="primary wide" disabled={busy}>{busy?"Please wait…":register?"Create account":"Sign in"}</button></form><button className="secondary wide" onClick={otp} disabled={busy}>Send OTP</button>{message&&<div className="hint">{message}</div>}</section>
}
function SettingsPage(){ return <section className="card"><h2>Settings</h2><div className="row"><ShieldCheck size={17}/><div><b>Privacy</b><p>Use lookup services only for records you are authorized to access.</p></div></div><div className="row"><Settings size={17}/><div><b>Admin</b><p>Admin contact: lumenomore@hotmail.com</p></div></div></section> }
function Empty({icon:Icon,title,text}){return <section className="card empty"><Icon size={30}/><h2>{title}</h2><p>{text}</p></section>}
