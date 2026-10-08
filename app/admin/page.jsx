'use client';
import {useEffect,useState} from "react";
import {Check,X,ExternalLink,RefreshCw} from "lucide-react";
import {createClient} from "@supabase/supabase-js";
const sb=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
export default function AdminPage(){
 const [payments,setPayments]=useState([]),[msg,setMsg]=useState(""),[loading,setLoading]=useState(true),[busy,setBusy]=useState(null);
 async function token(){return (await sb.auth.getSession()).data.session?.access_token||"";}
 async function load(){setLoading(true);const r=await fetch("/api/admin/payments",{headers:{Authorization:"Bearer "+await token()}});const d=await r.json();setPayments(d.payments||[]);setMsg(r.ok?"":(d.error||"Unable to load payments."));setLoading(false);}
 async function act(id,action){setBusy(id);const r=await fetch("/api/admin/payments",{method:"POST",headers:{"content-type":"application/json",Authorization:"Bearer "+await token()},body:JSON.stringify({payment_id:id,action})});const d=await r.json();setMsg(r.ok?"Payment #"+id+" "+action+"d.":(d.error||"Action failed."));setBusy(null);if(r.ok)load();}
 useEffect(()=>{load();},[]);
 return <section className="card adminPanel"><div className="resultHead"><div><h2>Admin payments</h2><p>Review UPI receipts and approve or reject payments.</p></div><button className="iconBtn" onClick={load} disabled={loading}><RefreshCw size={16}/></button></div>{msg&&<div className="hint">{msg}</div>}{loading?<p>Loading…</p>:payments.length===0?<p>No payments yet.</p>:<div className="adminList">{payments.map(p=><div className="adminItem" key={p.id}><div><b>#{p.id} · ₹{p.amount} · {p.plan_days} day{p.plan_days>1?"s":""}</b><p>{p.profiles?.email||p.user_id}</p><p>{new Date(p.created_at).toLocaleString()} · {p.status}</p></div><div className="adminActions">{p.receipt_url&&<a className="secondary" href={p.receipt_url} target="_blank" rel="noreferrer"><ExternalLink size={15}/>Receipt</a>}{p.status==="pending"&&<><button className="primary" onClick={()=>act(p.id,"approve")} disabled={busy===p.id}><Check size={15}/>Approve</button><button className="secondary" onClick={()=>act(p.id,"reject")} disabled={busy===p.id}><X size={15}/>Reject</button></>}</div></div>)}</div>}</section>;
}