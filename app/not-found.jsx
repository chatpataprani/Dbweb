"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Home, Search, Settings, CreditCard } from "lucide-react";

const helpfulLinks = [
  { label: "Home", href: "/", icon: Home },
  { label: "Tools", href: "/tools", icon: Search },
  { label: "Plans", href: "/plan", icon: CreditCard },
  { label: "Settings", href: "/settings", icon: Settings },
];

export default function NotFound() {
  const [path, setPath] = useState("");
  useEffect(() => { setPath(window.location.pathname + window.location.search); }, []);
  return (
    <main className="db404">
      <div className="db404Sky" aria-hidden="true">
        {Array.from({ length: 100 }, (_, i) => <i key={i} className={i % 5 === 0 ? "twinkle" : ""} style={{left:((i*47+13)%100)+"%",top:((i*31+7)%100)+"%",width:(i%3+1)+"px",height:(i%3+1)+"px",animationDelay:((i%9)*.37)+"s"}} />)}
        <span className="db404Shooting" />
      </div>
      <section className="db404Content">
        <div className="db404Code" aria-label="404">
          <span>4</span>
          <svg viewBox="0 0 120 120" role="img" aria-label="A lost moon">
            <defs><radialGradient id="dbwebMoon" cx="35%" cy="30%" r="80%"><stop offset="0" stopColor="#f0f6fc"/><stop offset=".55" stopColor="#b6c2d1"/><stop offset="1" stopColor="#5b6779"/></radialGradient></defs>
            <circle cx="60" cy="64" r="48" fill="url(#dbwebMoon)"/>
            <g fill="#8794a8" opacity=".55"><circle cx="42" cy="52" r="9"/><circle cx="76" cy="46" r="6"/><circle cx="70" cy="80" r="11"/><circle cx="38" cy="84" r="5"/></g>
            <path d="M60 18V-2L82 4 60 10" fill="#58a6ff" stroke="#e6edf3" strokeWidth="2" strokeLinejoin="round"/>
          </svg>
          <span>4</span>
        </div>
        <p className="db404Eyebrow"><span /> PAGE NOT FOUND</p>
        <h1>This page drifted out of orbit.</h1>
        <p className="db404Sub">The link may be broken, or the page may have moved.</p>
        {path && <p className="db404Path" title={path}>{path}</p>}
        <div className="db404Actions">
          <Link className="db404Primary" href="/"><Home size={17}/> Take me home</Link>
          <button className="db404Secondary" type="button" onClick={() => { if (window.history.length > 1) window.history.back(); else window.location.assign("/"); }}><ArrowLeft size={17}/> Go back</button>
        </div>
        <nav className="db404Links" aria-label="Helpful links">
          {helpfulLinks.map(({label,href,icon:Icon}) => <Link key={href} href={href}><Icon size={15}/>{label}</Link>)}
        </nav>
        <footer className="db404Footer">Dbweb <span>·</span> Lost in the web, not for long.</footer>
      </section>
      <style jsx>{`
        .db404{position:relative;isolation:isolate;overflow:hidden;min-height:100svh;display:flex;align-items:center;justify-content:center;padding:max(28px,env(safe-area-inset-top)) 20px max(28px,env(safe-area-inset-bottom));background:var(--bg,#f6f6f4);color:var(--tx,#1b1d22);font:15px/1.6 Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;transition:background .2s,color .2s}
        .db404:before{content:"";position:absolute;inset:0;z-index:-2;pointer-events:none;background:radial-gradient(ellipse at 50% 0%,color-mix(in srgb,var(--ac,#3d5bd9) 9%,transparent),transparent 62%)}
        .db404Sky{position:absolute;inset:0;overflow:hidden;pointer-events:none;z-index:-1}.db404Sky i{position:absolute;display:block;border-radius:50%;background:var(--ac,#3d5bd9);opacity:.22}.db404Sky i.twinkle{animation:db404Twinkle 3.5s ease-in-out infinite}
        .db404Shooting{position:absolute;top:12%;left:-130px;width:120px;height:2px;background:linear-gradient(90deg,transparent,var(--ac,#3d5bd9));transform:rotate(18deg);opacity:0;animation:db404Shoot 10s linear infinite}
        .db404Content{width:100%;max-width:640px;text-align:center;padding:clamp(22px,5vw,38px);border:1px solid var(--bd,#dedfd9);border-radius:20px;background:var(--s1,#fff);background:color-mix(in srgb,var(--s1,#fff) 94%,transparent);box-shadow:0 18px 55px #0000000a;backdrop-filter:blur(8px)}
        .db404Code{display:flex;align-items:center;justify-content:center;gap:clamp(4px,2vw,16px);font-size:clamp(88px,26vw,160px);font-weight:800;line-height:1;letter-spacing:-.055em;color:var(--ac,#3d5bd9);user-select:none}.db404Code>span{background:linear-gradient(180deg,var(--tx,#1b1d22),var(--mu,#6b7080));-webkit-background-clip:text;background-clip:text;color:transparent}
        .db404Code svg{width:.78em;height:.78em;flex:none;animation:db404Float 6s ease-in-out infinite;filter:drop-shadow(0 10px 24px var(--acs,#e6eafb))}
        .db404Eyebrow{display:flex;justify-content:center;align-items:center;gap:8px;margin:10px 0 0;color:var(--ac,#3d5bd9);font-size:11px;font-weight:750;letter-spacing:.16em}.db404Eyebrow span{width:7px;height:7px;border-radius:50%;background:var(--ac,#3d5bd9);box-shadow:0 0 12px var(--acs,#e6eafb)}
        .db404 h1{font-size:clamp(22px,5vw,30px);font-weight:700;letter-spacing:-.035em;margin:10px 0 0;color:var(--tx,#1b1d22)}.db404Sub{color:var(--mu,#6b7080);margin:10px auto 0;max-width:420px}
        .db404Path{display:inline-block;max-width:min(100%,460px);margin:14px auto 0;padding:5px 11px;font:13px/1.5 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;color:var(--ac,#3d5bd9);background:var(--acs,#e6eafb);border:1px solid var(--bd,#dedfd9);border-radius:7px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;vertical-align:bottom}
        .db404Actions{display:flex;flex-wrap:wrap;gap:10px;justify-content:center;margin-top:26px}.db404Actions a,.db404Actions button{display:inline-flex;align-items:center;justify-content:center;gap:9px;min-width:142px;min-height:46px;padding:12px 18px;border-radius:9px;border:1px solid var(--bd,#dedfd9);font-family:inherit;font-size:14px;font-weight:650;text-decoration:none;cursor:pointer;transition:background .16s,border-color .16s,transform .16s,box-shadow .16s}
        .db404Actions .db404Primary{background:var(--ac,#3d5bd9);border-color:var(--ac,#3d5bd9);color:#fff;box-shadow:0 5px 14px #3d5bd922}.db404Actions .db404Primary:hover{filter:brightness(1.07);box-shadow:0 7px 20px #3d5bd933}
        .db404Actions .db404Secondary{background:var(--s1,#fff);color:var(--tx,#1b1d22)}.db404Actions .db404Secondary:hover{background:var(--s2,#eeeeea);border-color:var(--ac,#3d5bd9)}
        .db404Actions a:focus-visible,.db404Actions button:focus-visible,.db404Links a:focus-visible{outline:3px solid var(--acs,#e6eafb);outline-offset:3px}.db404Actions a:active,.db404Actions button:active{transform:translateY(1px)}
        .db404Links{display:flex;flex-wrap:wrap;justify-content:center;gap:10px 24px;margin-top:28px;padding-top:20px;border-top:1px solid var(--bd,#dedfd9)}.db404Links a{display:inline-flex;align-items:center;gap:7px;color:var(--mu,#6b7080);font-size:13px;text-decoration:none;transition:color .15s}.db404Links a:hover{color:var(--ac,#3d5bd9);text-decoration:underline;text-underline-offset:4px}
        .db404Footer{margin-top:23px;color:var(--mu,#6b7080);font-size:12px}.db404Footer span{padding:0 5px;color:var(--ac,#3d5bd9)}
        @keyframes db404Twinkle{0%,100%{opacity:.12}50%{opacity:.38}}@keyframes db404Float{0%,100%{transform:translateY(0) rotate(-3deg)}50%{transform:translateY(-10px) rotate(3deg)}}@keyframes db404Shoot{0%,75%,100%{opacity:0;transform:translate(0,0) rotate(18deg)}78%{opacity:.55}88%{opacity:0;transform:translate(120vw,40vh) rotate(18deg)}}
        @media(prefers-reduced-motion:reduce){.db404Sky i,.db404Shooting,.db404Code svg{animation:none}}@media(max-width:480px){.db404{padding-left:14px;padding-right:14px}.db404Content{padding:24px 17px;border-radius:15px}.db404Links{gap:12px 18px;margin-top:24px}.db404Actions a,.db404Actions button{flex:1;min-width:0}}@media(max-width:340px){.db404Actions{flex-direction:column}.db404Actions a,.db404Actions button{width:100%}}
      `}</style>
    </main>
  );
}
