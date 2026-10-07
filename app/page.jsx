'use client';

import { useState } from "react";
import { Search, CreditCard, ShieldCheck, History, Settings, LogIn, UserPlus, Upload, Copy, Check, X } from "lucide-react";

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

  async function lookup(e) {
    e.preventDefault();
    if (!query.trim()) return setError("Enter a value to search.");
    if (credits <= 0) return setError("No credits left. Buy a plan to continue.");
    setLoading(true); setError(""); setResult(null);
    try {
      const res = await fetch("/api/lookup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type, query: query.trim() })
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
        <Nav active={page} onClick={setPage} icon={Search} label="Lookup" id="lookup"/>
        <Nav active={page} onClick={setPage} icon={History} label="History" id="history"/>
        <Nav active={page} onClick={setPage} icon={CreditCard} label="Plans" id="plans"/>
        <Nav active={page} onClick={setPage} icon={Settings} label="Settings" id="settings"/>
        <div className="navGroup">Account</div>
        <Nav active={page} onClick={setPage} icon={LogIn} label="Sign in" id="signin"/>
        <Nav active={page} onClick={setPage} icon={UserPlus} label="Register" id="register"/>
      </aside>

      <main>
        <header>
          <div><h1>{pageTitle(page)}</h1><p>{pageSubtitle(page)}</p></div>
          <div className="creditPill"><CreditCard size={15}/> {credits} credits</div>
        </header>

        {page === "lookup" && <Lookup type={type} setType={setType} query={query} setQuery={setQuery} lookup={lookup} loading={loading} error={error} result={result}/>}
        {page === "plans" && <Plans onBuy={(p) => { setPage("payment"); setReceipt(p); }}/>}
        {page === "payment" && <Payment plan={receipt || plans[0]}/>}
        {page === "history" && <Empty icon={History} title="No searches yet" text="Your completed searches will appear here."/>}
        {page === "settings" && <SettingsPage/>}
        {(page === "signin" || page === "register") && <Auth register={page === "register"}/>}
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

function Payment({plan}) {
  const [status,setStatus]=useState("");
  const [file,setFile]=useState(null);
  async function submit(e){
    e.preventDefault(); if(!file) return setStatus("Select your payment receipt first.");
    setStatus("Receipt submitted for admin review.");
  }
  return <div className="paymentGrid"><section className="card">
    <h2>{plan.name} plan</h2><div className="price">₹{plan.price}</div><p>Pay exactly this amount through your UPI app.</p>
    <div className="kv"><span>UPI ID</span><strong>{process.env.NEXT_PUBLIC_UPI_ID || "Configure UPI_ID in .env"}</strong></div>
    <div className="kv"><span>Duration</span><strong>{plan.days} day{plan.days>1?"s":""}</strong></div>
  </section><section className="card">
    <h2>Submit receipt</h2><form onSubmit={submit}>
      <label className="drop"><Upload size={22}/><span>{file ? file.name : "Choose screenshot or PDF"}</span><input type="file" accept="image/*,.pdf" onChange={e=>setFile(e.target.files?.[0]||null)} hidden/></label>
      <button className="primary wide">Submit for approval</button>
    </form>{status&&<div className="success"><Check size={16}/>{status}</div>}
  </section></div>
}

function Auth({register}) {
  return <section className="card auth"><div className="brand large"><span className="brandIcon"><ShieldCheck size={16}/></span>Lookup Console</div><h2>{register?"Create account":"Sign in"}</h2><p>{register?"You receive 10 credits once.":"Use your email and password, or request an OTP."}</p><input placeholder="Email" type="email"/><input placeholder="Password" type="password"/><button className="primary wide">{register?"Create account":"Sign in"}</button><button className="secondary wide">Send OTP</button></section>
}
function SettingsPage(){ return <section className="card"><h2>Settings</h2><div className="row"><ShieldCheck size={17}/><div><b>Privacy</b><p>Use lookup services only for records you are authorized to access.</p></div></div><div className="row"><Settings size={17}/><div><b>Admin</b><p>Admin contact: lumenomore@hotmail.com</p></div></div></section> }
function Empty({icon:Icon,title,text}){return <section className="card empty"><Icon size={30}/><h2>{title}</h2><p>{text}</p></section>}
