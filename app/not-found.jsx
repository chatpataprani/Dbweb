import Link from "next/link";
import { ArrowLeft, Search } from "lucide-react";

export default function NotFound() {
  return (
    <main className="notFoundPage">
      <div className="notFoundCard">
        <span className="notFoundCode">404</span>
        <h1>This page isn’t here.</h1>
        <p>The link may be outdated, or the page may have moved.</p>
        <div className="notFoundActions">
          <Link className="primary" href="/"><ArrowLeft size={16}/> Back to Dbweb</Link>
          <Link className="secondary" href="/tools"><Search size={16}/> Explore tools</Link>
        </div>
      </div>
      <style jsx>{`
        .notFoundPage{min-height:100vh;display:grid;place-items:center;padding:24px;background:var(--bg);color:var(--tx)}
        .notFoundCard{width:min(100%,480px);padding:clamp(24px,6vw,42px);border:1px solid var(--bd);border-radius:16px;background:var(--s1);text-align:center}
        .notFoundCode{display:inline-block;color:var(--ac);font-size:clamp(48px,12vw,76px);font-weight:800;line-height:1;letter-spacing:-.06em}
        h1{margin:18px 0 8px;font-size:clamp(22px,5vw,30px)}
        p{margin:0;color:var(--mu);line-height:1.6}
        .notFoundActions{display:flex;flex-wrap:wrap;justify-content:center;gap:10px;margin-top:24px}
        .notFoundActions a{text-decoration:none}
      `}</style>
    </main>
  );
}
