'use client';
import {useState} from 'react';
import {ArrowLeft,Check,Copy,Download,Hash,KeyRound,CalendarDays,Braces,FileSearch,CaseSensitive,ShieldCheck,Fingerprint,RefreshCw,Code2} from 'lucide-react';

const tools=[
 {id:'age',name:'Age & Date Calculator',desc:'Calculate exact age and days between dates.',icon:CalendarDays},
 {id:'password',name:'Password Generator',desc:'Generate strong random passwords locally.',icon:KeyRound},
 {id:'hash',name:'Hash Generator',desc:'Create SHA-1, SHA-256, SHA-384 or SHA-512 hashes.',icon:Hash},
 {id:'json',name:'JSON Formatter',desc:'Format, validate and minify JSON.',icon:Braces},
 {id:'base64',name:'Base64 Converter',desc:'Encode or decode text as Base64.',icon:Code2},
 {id:'case',name:'Text Case Converter',desc:'Convert text to upper, lower, title or sentence case.',icon:CaseSensitive},
 {id:'uuid',name:'UUID Generator',desc:'Create random UUID v4 identifiers.',icon:Fingerprint},
 {id:'format',name:'File Format Detector',desc:'Inspect a file name and identify its likely type.',icon:FileSearch},
 {id:'pan',name:'PAN Format Validator',desc:'Check the structure of an Indian PAN number.',icon:ShieldCheck},
 {id:'aadhaar',name:'Aadhaar Checksum Validator',desc:'Validate a 12-digit Aadhaar number locally.',icon:ShieldCheck},
 {id:'mac',name:'MAC Address Validator',desc:'Validate common MAC address formats.',icon:ShieldCheck},
 {id:'url',name:'URL Encoder / Decoder',desc:'Encode or decode URL components.',icon:Code2},
];
const verhoeffD=[[0,1,2,3,4,5,6,7,8,9],[1,2,3,4,0,6,7,8,9,5],[2,3,4,0,1,7,8,9,5,6],[3,4,0,1,2,8,9,5,6,7],[4,0,1,2,3,9,5,6,7,8],[5,9,8,7,6,0,4,3,2,1],[6,5,9,8,7,1,0,4,3,2],[7,6,5,9,8,2,1,0,4,3],[8,7,6,5,9,3,2,1,0,4],[9,8,7,6,5,4,3,2,1,0]];
const verhoeffP=[[0,1,2,3,4,5,6,7,8,9],[1,5,7,6,2,8,3,0,9,4],[5,8,0,3,7,9,6,1,4,2],[8,9,1,6,0,4,3,5,2,7],[9,4,5,3,1,2,6,8,7,0],[4,2,8,6,5,7,3,9,0,1],[2,7,9,3,8,0,6,4,1,5],[7,0,4,6,9,1,3,2,5,8]];
function validVerhoeff(s){let c=0;const a=s.split('').reverse().map(Number);for(let i=0;i<a.length;i++)c=verhoeffD[c][verhoeffP[i%8][a[i]]];return c===0;}
function titleCase(s){return s.toLowerCase().replace(/\b[a-z]/g,c=>c.toUpperCase());}
export default function ToolsPage(){
 const [active,setActive]=useState('age'),[input,setInput]=useState(''),[extra,setExtra]=useState(''),[output,setOutput]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),[algorithm,setAlgorithm]=useState('SHA-256'),[length,setLength]=useState(20),[symbols,setSymbols]=useState(true),[mode,setMode]=useState('encode');
 const selected=tools.find(t=>t.id===active)||tools[0];
 function choose(id){setActive(id);setInput('');setExtra('');setOutput('');setError('');}
 async function run(e){e?.preventDefault();setError('');setOutput('');setBusy(true);try{
  let out='';
  if(active==='age'){
   const d=new Date(input+'T00:00:00'), end=extra?new Date(extra+'T00:00:00'):new Date();if(!input||Number.isNaN(d.getTime())||Number.isNaN(end.getTime()))throw Error('Choose a valid start date and end date.');if(d>end)throw Error('The start date must be on or before the end date.');
   let years=end.getFullYear()-d.getFullYear(),months=end.getMonth()-d.getMonth(),days=end.getDate()-d.getDate();if(days<0){months--;days+=new Date(end.getFullYear(),end.getMonth(),0).getDate();}if(months<0){years--;months+=12;}out=years+' years, '+months+' months, '+days+' days\nTotal days: '+Math.floor((end-d)/86400000);
  }else if(active==='password'){
   const chars='ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'+(symbols?'!@#$%^&*()-_=+[]{}?':'');const bytes=crypto.getRandomValues(new Uint8Array(Number(length)));out=Array.from(bytes,b=>chars[b%chars.length]).join('');
  }else if(active==='hash'){
   const data=new TextEncoder().encode(input);const digest=await crypto.subtle.digest(algorithm,data);out=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
  }else if(active==='json'){
   const parsed=JSON.parse(input);out=extra==='minify'?JSON.stringify(parsed):JSON.stringify(parsed,null,2);
  }else if(active==='base64'){
   if(mode==='encode'){out=btoa(unescape(encodeURIComponent(input)));}else{try{out=decodeURIComponent(escape(atob(input.trim())));}catch{throw Error('This is not valid Base64 text.');}}
  }else if(active==='case'){
   const kind=extra||'upper';out=kind==='upper'?input.toUpperCase():kind==='lower'?input.toLowerCase():kind==='title'?titleCase(input):input.charAt(0).toUpperCase()+input.slice(1).toLowerCase();
  }else if(active==='uuid'){
   out=Array.from({length:Math.max(1,Math.min(20,Number(length)||1))},()=>crypto.randomUUID()).join('\n');
  }else if(active==='format'){
   const name=input.trim().split(/[\\/]/).pop(), ext=(name.includes('.')?name.split('.').pop():'').toLowerCase();const map={jpg:'JPEG image',jpeg:'JPEG image',png:'PNG image',gif:'GIF image',webp:'WebP image',svg:'SVG image',pdf:'PDF document',doc:'Word document',docx:'Word document',xls:'Excel spreadsheet',xlsx:'Excel spreadsheet',csv:'CSV spreadsheet',txt:'Plain text',json:'JSON data',html:'HTML document',css:'CSS stylesheet',js:'JavaScript file',jsx:'React JSX file',ts:'TypeScript file',tsx:'TypeScript React file',zip:'ZIP archive',rar:'RAR archive','7z':'7-Zip archive',mp3:'MP3 audio',wav:'WAV audio',mp4:'MP4 video',mkv:'MKV video',apk:'Android package',db:'Database file',sqlite:'SQLite database'};out='File name: '+(name||'Not provided')+'\nExtension: '+(ext||'None')+'\nLikely type: '+(map[ext]||'Unknown or extensionless file')+'\n\nNote: extension-based guess only; file contents are not inspected.';
  }else if(active==='pan'){
   const v=input.replace(/\s/g,'').toUpperCase();out=/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(v)?'PAN format looks valid. This checks format only, not whether the PAN is issued or active.':'Invalid PAN format. Expected 5 letters, 4 digits, then 1 letter (e.g. ABCDE1234F).';
  }else if(active==='aadhaar'){
   const v=input.replace(/[\s-]/g,'');if(!/^\d{12}$/.test(v))throw Error('Enter exactly 12 digits.');out=validVerhoeff(v)?'Checksum is valid. This does not verify identity, issuance, or whether the number belongs to a person.':'Checksum is invalid.';
  }else if(active==='mac'){
   const v=input.trim();out=/^(?:[0-9a-fA-F]{2}[:-]){5}[0-9a-fA-F]{2}$|^[0-9a-fA-F]{12}$/.test(v)?'MAC address format is valid.':'Invalid MAC format. Use 00:1A:2B:3C:4D:5E or 001A2B3C4D5E.';
  }else if(active==='url'){
   if(mode==='encode')out=encodeURIComponent(input);else{try{out=decodeURIComponent(input);}catch{throw Error('Invalid URL-encoded text.');}}
  }
  setOutput(out);
 }catch(e){setError(e.message||'Could not process this input.');}finally{setBusy(false);}}
 async function copy(){try{await navigator.clipboard.writeText(output);setError('');}catch{setError('Clipboard permission denied. Select and copy the result manually.');}}
 function download(){const a=document.createElement('a'),u=URL.createObjectURL(new Blob([output],{type:'text/plain;charset=utf-8'}));a.href=u;a.download='dbweb-tool-result.txt';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);}
 return <div className="toolsPage">
  <header className="toolsHeader"><a className="toolsBack" href="/"><ArrowLeft size={17}/> Back to Dbweb</a><div className="toolsBrand">Dbweb <span>Tools</span></div><p>Useful tools that run in your browser. Your input stays on this device unless the tool says otherwise.</p></header>
  <main className="toolsMain"><div className="toolsTitle"><div><h1>Tools</h1><p>{tools.length} available tools · Choose a tool to get started.</p></div></div>
   <div className="toolsLayout"><nav className="toolsList" aria-label="Available tools">{tools.map(t=>{const Icon=t.icon;return <button key={t.id} onClick={()=>choose(t.id)} className={'toolsCard '+(active===t.id?'selected':'')}><span className="toolsIcon"><Icon size={19}/></span><span><strong>{t.name}</strong><small>{t.desc}</small></span></button>})}</nav>
   <section className="toolWorkspace"><div className="toolHeading"><span className="toolsIcon"><selected.icon size={21}/></span><div><h2>{selected.name}</h2><p>{selected.desc}</p></div></div>
    <form onSubmit={run} className="toolForm">
     {active==='age'?<><label>Date of birth<input type="date" value={input} onChange={e=>setInput(e.target.value)} required/></label><label>Calculate up to (optional)<input type="date" value={extra} onChange={e=>setExtra(e.target.value)}/></label></>:
     active==='password'?<><label>Password length: {length}<input type="range" min="8" max="64" value={length} onChange={e=>setLength(Number(e.target.value))}/></label><label className="toolCheck"><input type="checkbox" checked={symbols} onChange={e=>setSymbols(e.target.checked)}/> Include symbols</label><p className="toolNote">Generated locally using the browser's cryptographic random generator.</p></>:
     active==='hash'?<><label>Text to hash<textarea value={input} onChange={e=>setInput(e.target.value)} rows="5" placeholder="Enter text" required/></label><label>Algorithm<select value={algorithm} onChange={e=>setAlgorithm(e.target.value)}><option>SHA-1</option><option>SHA-256</option><option>SHA-384</option><option>SHA-512</option></select></label></>:
     active==='json'?<><label>JSON input<textarea value={input} onChange={e=>setInput(e.target.value)} rows="8" placeholder='{"hello":"world"}' required/></label><label>Output mode<select value={extra} onChange={e=>setExtra(e.target.value)}><option value="pretty">Pretty print</option><option value="minify">Minify</option></select></label></>:
     active==='base64'||active==='url'?<><label>Text<input value={input} onChange={e=>setInput(e.target.value)} placeholder="Enter text" required/></label><label>Action<select value={mode} onChange={e=>setMode(e.target.value)}><option value="encode">Encode</option><option value="decode">Decode</option></select></label></>:
     active==='case'?<><label>Text<textarea value={input} onChange={e=>setInput(e.target.value)} rows="5" placeholder="Enter text" required/></label><label>Case<select value={extra} onChange={e=>setExtra(e.target.value)}><option value="upper">UPPERCASE</option><option value="lower">lowercase</option><option value="title">Title Case</option><option value="sentence">Sentence case</option></select></label></>:
     active==='uuid'?<><label>Number to generate: {length}<input type="range" min="1" max="20" value={length} onChange={e=>setLength(Number(e.target.value))}/></label></>:
     <><label>{active==='format'?'File name or path':active==='pan'?'PAN number':active==='aadhaar'?'12-digit Aadhaar number':'MAC address'}<input value={input} onChange={e=>setInput(e.target.value)} placeholder={active==='format'?'document.pdf':active==='pan'?'ABCDE1234F':active==='aadhaar'?'1234 5678 9012':'00:1A:2B:3C:4D:5E'} required/></label></>}
     <button className="toolsRun" type="submit" disabled={busy}><RefreshCw size={16}/> {busy?'Processing…':active==='password'?'Generate password':active==='uuid'?'Generate UUIDs':'Run tool'}</button>
    </form>
    {error&&<p className="toolError" role="alert">{error}</p>}
    {output&&<div className="toolOutput"><div className="toolOutputHead"><strong>Result</strong><div><button type="button" onClick={copy}><Copy size={14}/> Copy</button><button type="button" onClick={download}><Download size={14}/> Save</button></div></div><pre>{output}</pre></div>}
    <p className="toolPrivacy"><Check size={15}/> Processing happens in your browser for these tools. Results are not sent to Dbweb.</p>
   </section></div>
  </main>
  <style jsx>{`
   .toolsPage{min-height:100vh;background:var(--bg,#f5f7fb);color:var(--tx,#172033);padding:24px;}.toolsHeader{max-width:1180px;margin:0 auto 32px;padding:8px 0 20px;border-bottom:1px solid var(--bd,#e1e5ee)}.toolsBack{display:inline-flex;gap:8px;align-items:center;color:var(--mu,#657089);text-decoration:none;font-size:14px}.toolsBrand{font-size:23px;font-weight:800;margin-top:20px}.toolsBrand span{color:var(--ac,#526ce5)}.toolsHeader p,.toolsTitle p,.toolHeading p{color:var(--mu,#657089);margin:7px 0 0}.toolsMain{max-width:1180px;margin:auto}.toolsTitle{margin-bottom:18px}.toolsTitle h1{font-size:28px;margin:0}.toolsLayout{display:grid;grid-template-columns:minmax(260px,340px) minmax(0,1fr);gap:20px;align-items:start}.toolsList{display:grid;gap:9px}.toolsCard{display:flex;text-align:left;align-items:flex-start;gap:12px;padding:14px;border:1px solid var(--bd,#e1e5ee);background:var(--s1,#fff);color:var(--tx,#172033);border-radius:13px;cursor:pointer}.toolsCard.selected{border-color:var(--ac,#526ce5);box-shadow:0 0 0 2px color-mix(in srgb,var(--ac,#526ce5) 15%,transparent)}.toolsCard strong,.toolsCard small{display:block}.toolsCard strong{font-size:14px}.toolsCard small{font-size:12px;line-height:1.45;color:var(--mu,#657089);margin-top:4px}.toolsIcon{display:grid;place-items:center;flex:0 0 38px;height:38px;border-radius:11px;background:var(--acs,#eef1ff);color:var(--ac,#526ce5)}.toolWorkspace{background:var(--s1,#fff);border:1px solid var(--bd,#e1e5ee);border-radius:18px;padding:22px;min-width:0}.toolHeading{display:flex;align-items:center;gap:12px;padding-bottom:18px;border-bottom:1px solid var(--bd,#e1e5ee)}.toolHeading h2{margin:0;font-size:20px}.toolForm{display:grid;gap:16px;padding-top:18px}.toolForm label{display:grid;gap:8px;font-size:13px;font-weight:650}.toolForm input:not([type=checkbox]):not([type=range]),.toolForm textarea,.toolForm select{width:100%;padding:12px;border:1px solid var(--bd,#e1e5ee);border-radius:10px;background:var(--bg,#f5f7fb);color:var(--tx,#172033);font:inherit;box-sizing:border-box}.toolForm textarea{resize:vertical}.toolForm input[type=range]{width:100%;accent-color:var(--ac,#526ce5)}.toolCheck{display:flex!important;align-items:center;grid-template-columns:auto 1fr}.toolCheck input{width:17px;height:17px;accent-color:var(--ac,#526ce5)}.toolNote,.toolPrivacy{font-size:12px;color:var(--mu,#657089);line-height:1.5}.toolsRun{display:inline-flex;justify-content:center;align-items:center;gap:8px;padding:12px 16px;background:var(--ac,#526ce5);color:white;border:0;border-radius:10px;font-weight:700;cursor:pointer}.toolsRun:disabled{opacity:.6}.toolError{padding:11px 13px;background:#fff0ef;color:#b42318;border-radius:10px;font-size:13px}.toolOutput{margin-top:20px;border:1px solid var(--bd,#e1e5ee);border-radius:12px;overflow:hidden}.toolOutputHead{display:flex;justify-content:space-between;gap:10px;align-items:center;padding:12px 14px;background:var(--bg,#f5f7fb)}.toolOutputHead div{display:flex;gap:8px}.toolOutputHead button{display:inline-flex;align-items:center;gap:5px;background:var(--s1,#fff);color:var(--tx,#172033);border:1px solid var(--bd,#e1e5ee);border-radius:8px;padding:7px 9px}.toolOutput pre{white-space:pre-wrap;overflow-wrap:anywhere;margin:0;padding:16px;font:13px/1.6 ui-monospace,monospace}.toolPrivacy{display:flex;align-items:center;gap:6px;margin-top:18px}@media(max-width:820px){.toolsPage{padding:16px}.toolsLayout{grid-template-columns:1fr}.toolsList{grid-template-columns:repeat(2,minmax(0,1fr))}.toolsCard{padding:11px}.toolWorkspace{padding:16px}}@media(max-width:480px){.toolsList{grid-template-columns:1fr}.toolsTitle h1{font-size:24px}.toolHeading h2{font-size:17px}}
  `}</style>
 </div>;
}
