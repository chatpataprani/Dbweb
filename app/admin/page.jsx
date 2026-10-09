'use client';
import {useEffect,useState} from "react";
export default function AdminPage(){
 const [ready,setReady]=useState(false),[ok,setOk]=useState(false),[password,setPassword]=useState(""),[msg,setMsg]=useState(""),[payments,setPayments]=useState([]);
 async function call(url,options={}){const r=await fetch(url,{...options,headers:{"content-type":"application/json",...(options.headers||{})}});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||"Request failed");return d;}
 async function load(){try{const d=await call("/api/admin/payments");setPayments(d.payments||[]);setMsg("");}catch(e){setMsg(e.message);}}
 useEffect(()=>{call("/api/admin/session").then(async d=>{setOk(!!d.authenticated);if(d.authenticated)await load();}).catch(()=>{}).finally(()=>setReady(true));},[]);
 async function login(e){e.preventDefault();try{await call("/api/admin/session",{method:"POST",body:JSON.stringify({password})});setOk(true);setPassword("");await load();}catch(e){setMsg(e.message);}}
 async function act(id,action){try{await call("/api/admin/payments",{method:"POST",body:JSON.stringify({payment_id:id,action})});await load();}catch(e){setMsg(e.message);}}
 if(!ready)return <main><section className="card">Loading…</section></main>;
 if(!ok)return <main><section className="card auth"><h1>Admin sign in</h1><p>Use the password configured in Vercel.</p><form onSubmit={login}><input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Admin password" required/><button className="primary wide">Sign in</button></form>{msg&&<p className="hint">{msg}</p>}<p className="hint"><a href="/">Back to Dbweb</a></p></section></main>;
 return <main><header><div><h1>Admin panel</h1><p>Review UPI payments.</p></div><button className="secondary" onClick={async()=>{await fetch("/api/admin/session",{method:"DELETE"});setOk(false);}}>Log out</button></header>{msg&&<p className="hint">{msg}</p>}<section className="card"><h2>Payment reviews</h2>{payments.map(p=><div className="adminItem" key={p.id}><div><b>#{p.id} · ₹{p.amount} · {p.plan_days} day(s)</b><p>{p.device_id}</p><p>{p.status}</p></div><div className="adminActions">{p.receipt_url&&<a className="secondary" href={p.receipt_url} target="_blank" rel="noreferrer">Receipt</a>}{p.status==="pending"&&<><button className="primary" onClick={()=>act(p.id,"approve")}>Approve</button><button className="secondary" onClick={()=>act(p.id,"reject")}>Reject</button></>}</div></div>)}</section><p className="hint"><a href="/">Return to Dbweb</a></p></main>;
}
