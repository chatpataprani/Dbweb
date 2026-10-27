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

    </main>
  );
}
