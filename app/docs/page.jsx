export const metadata = {
  title: "Dbweb Docs — Help Center",
  description: "Guides, account help, and troubleshooting for Dbweb."
};

const sections = [
  { number: "01", title: "Getting started", label: "TOOLS & WORKSPACE", body: "Find the utility you need, open its page, and follow the instructions shown there. Check each tool's inputs before you run it.", links: [{ text: "Explore all tools", href: "/tools" }] },
  { number: "02", title: "Account & access", label: "ACCOUNT", body: "Use your account controls to review credits, plan access, and available redemption options. Keep your sign-in details and device access private.", links: [{ text: "Account settings", href: "/settings" }, { text: "View plans", href: "/plan" }] },
  { number: "03", title: "Fix a problem", label: "TROUBLESHOOTING", body: "Refresh the page and check your connection first. If the issue remains, note the page, what you were doing, and the exact error message—without sharing passwords or private data.", links: [{ text: "Check service status", href: "/status" }] },
  { number: "04", title: "Privacy & responsible use", label: "PRIVACY", body: "Only submit information you are allowed to access. Review how information is handled and use Dbweb in a way that respects other people's privacy.", links: [{ text: "Privacy policy", href: "/privacy" }, { text: "Terms of use", href: "/terms" }] }
];

export default function DocsPage() {
  return (
    <main className="dbDocsPage">
      <nav className="dbDocsNav" aria-label="Main navigation">
        <a className="dbDocsBrand" href="/"><span className="dbDocsBrandMark">D</span><span>Dbweb<span className="dbDocsBrandDot">.</span></span></a>
        <div className="dbDocsNavLinks"><a href="/tools">Tools</a><a href="/status">Status</a><a className="dbDocsNavActive" href="/docs">Help center</a></div>
        <a className="dbDocsNavButton" href="mailto:lumenomore@hotmail.com">Contact support <span aria-hidden="true">↗</span></a>
      </nav>

      <section className="dbDocsHero">
        <div className="dbDocsHeroCopy">
          <div className="dbDocsEyebrow"><span className="dbDocsEyebrowDot" /> DBWEB HELP CENTER</div>
          <h1>Answers when<br /><span>you need them.</span></h1>
          <p>Clear guides for using Dbweb, managing your account, and sorting out common issues.</p>
          <div className="dbDocsHeroActions"><a className="dbDocsPrimary" href="/tools">Explore tools <span aria-hidden="true">→</span></a><a className="dbDocsTextLink" href="mailto:lumenomore@hotmail.com">Talk to support <span aria-hidden="true">↗</span></a></div>
        </div>
        <div className="dbDocsHeroPanel" aria-label="Help center overview">
          <div className="dbDocsPanelTop"><span className="dbDocsPanelIcon">?</span><span className="dbDocsPanelStatus"><i /> HELP, WITHOUT THE RUNAROUND</span></div>
          <div className="dbDocsPanelTitle">What can we help with?</div>
          <a className="dbDocsPanelRow" href="/tools"><span className="dbDocsPanelGlyph">01</span><span><strong>Using tools</strong><small>Find the right utility and get started</small></span><b>↗</b></a>
          <a className="dbDocsPanelRow" href="/plan"><span className="dbDocsPanelGlyph">02</span><span><strong>Plans & credits</strong><small>Understand access and account options</small></span><b>↗</b></a>
          <a className="dbDocsPanelRow" href="/status"><span className="dbDocsPanelGlyph">03</span><span><strong>Something not working?</strong><small>Check service status and troubleshoot</small></span><b>↗</b></a>
          <div className="dbDocsPanelFoot"><span>Need a person?</span><a href="mailto:lumenomore@hotmail.com">Email Dbweb support ↗</a></div>
        </div>
        <div className="dbDocsHeroGrid" aria-hidden="true" />
      </section>

      <section className="dbDocsGuideSection">
        <div className="dbDocsSectionHead"><div><span className="dbDocsSectionEyebrow">THE ESSENTIALS</span><h2>Find your way around.</h2></div><p>Start with a topic below. Each guide gets straight to the point.</p></div>
        <div className="dbDocsGrid">{sections.map((section) => (
          <article className="dbDocsCard" key={section.number}>
            <div className="dbDocsCardTop"><span className="dbDocsCardNumber">{section.number}</span><span className="dbDocsCardLabel">{section.label}</span></div>
            <h3>{section.title}</h3><p>{section.body}</p>
            <div className="dbDocsCardLinks">{section.links.map((link) => <a href={link.href} key={link.href}>{link.text}<span aria-hidden="true"> ↗</span></a>)}</div>
          </article>
        ))}</div>
      </section>

      <section className="dbDocsContact">
        <div className="dbDocsContactMark">↗</div><div><span>STILL STUCK?</span><h2>We can help you figure it out.</h2><p>Send the page name and a short description of the issue. Please leave out passwords and sensitive information.</p></div><a href="mailto:lumenomore@hotmail.com" className="dbDocsContactButton">Contact support <span aria-hidden="true">↗</span></a>
      </section>

      <footer className="dbDocsFooter"><a className="dbDocsFooterBrand" href="/">Dbweb<span>.</span></a><span>Helpful by design. Straight to the point.</span><div><a href="/terms">Terms</a><a href="/privacy">Privacy</a><a href="/status">Status</a></div><small>© {new Date().getFullYear()} Dbweb</small></footer>
    </main>
  );
}
