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
    </main>
  );
}
