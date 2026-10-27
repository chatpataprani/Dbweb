"use client";

export const metadata = {
  title: "Dbweb Docs",
  description: "A quick guide to using Dbweb tools, accounts, credits, and support."
};

const sections = [
  { title: "Using tools", body: "Open All Tools to browse the available utilities. Each tool has its own inputs and usage instructions. Read the details shown on the tool before submitting information." },
  { title: "Account and credits", body: "Account, credits, plan access, and redemption features are available from the website's account controls. Keep your device and account access secure." },
  { title: "Troubleshooting", body: "If a feature does not work, refresh the page, check your connection, and try again. If the issue continues, contact support and include the feature name and any non-sensitive error message." },
  { title: "Privacy and safe use", body: "Review the Privacy Policy before submitting information. Do not use Dbweb to access information without authorization or to violate another person's privacy." },
  { title: "Need help?", body: "Contact support by email and include the page or feature you were using, what happened, and any non-sensitive error message." }
];

export default function DocsPage() {
  return (
    <main className="dbDocsPage">
      <nav className="dbDocsNav"><a className="dbDocsBrand" href="/">Dbweb</a><a href="/tools">All tools</a><a href="/status">Status</a></nav>
      <header className="dbDocsHero"><p>HELP CENTER</p><h1>Dbweb documentation</h1><span>Quick answers for using Dbweb and troubleshooting common issues.</span></header>
      <div className="dbDocsGrid">{sections.map((section,i)=><section className="dbDocsCard" key={section.title}><span className="dbDocsNumber">{String(i+1).padStart(2,"0")}</span><h2>{section.title}</h2><p>{section.body}</p>{i===0&&<a href="/tools">Browse tools →</a>}{i===3&&<a href="/privacy">Read privacy policy →</a>}{i===4&&<a href="mailto:lumenomore@hotmail.com">Email Dbweb support →</a>}</section>)}</div>
      <footer className="dbDocsFooter"><a href="/terms">Terms</a><a href="/privacy">Privacy</a><a href="/">Back to Dbweb</a></footer>
      <style jsx>{`
        .dbDocsPage{min-height:100svh;padding:22px clamp(16px,4vw,40px) 40px;background:var(--bg,#f6f6f4);color:var(--tx,#1b1d22)}
        .dbDocsNav{max-width:1000px;margin:0 auto;display:flex;align-items:center;gap:22px}.dbDocsNav a{font-size:13px;color:var(--mu,#6b7080);text-decoration:none}.dbDocsNav .dbDocsBrand{margin-right:auto;font-size:18px;font-weight:800;color:var(--tx,#1b1d22)}
        .dbDocsHero{max-width:1000px;margin:clamp(45px,8vw,90px) auto 34px}.dbDocsHero>p{font-size:11px;font-weight:800;letter-spacing:.16em;color:var(--ac,#3d5bd9)}.dbDocsHero h1{font-size:clamp(32px,7vw,54px);letter-spacing:-.05em;line-height:1.08;margin:10px 0 14px}.dbDocsHero span{font-size:15px;line-height:1.7;color:var(--muted,#8b949e)}
        .dbDocsGrid{max-width:1000px;margin:0 auto;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.dbDocsCard{padding:22px;border:1px solid var(--bd,#dedfd9);border-radius:12px;background:var(--s1,#fff)}.dbDocsNumber{font-size:11px;color:#58a6ff;font-weight:800;letter-spacing:.1em}.dbDocsCard h2{font-size:18px;margin:13px 0 8px}.dbDocsCard p{font-size:13px;line-height:1.75;color:var(--muted,#8b949e);margin:0}.dbDocsCard a{display:inline-block;margin-top:14px;color:#58a6ff;font-size:13px;text-decoration:none}.dbDocsCard a:hover{text-decoration:underline}
        .dbDocsFooter{max-width:1000px;margin:28px auto 0;padding-top:18px;border-top:1px solid var(--border,#30363d);display:flex;flex-wrap:wrap;gap:20px}.dbDocsFooter a{color:var(--muted,#8b949e);font-size:12px;text-decoration:none}
        @media(max-width:600px){.dbDocsGrid{grid-template-columns:1fr}.dbDocsNav{gap:16px}.dbDocsCard{padding:18px}}
      `}</style>
    </main>
  );
}
