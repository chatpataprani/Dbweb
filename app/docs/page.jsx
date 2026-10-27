import { ArrowRight, ArrowUpRight, BookOpen, CircleHelp, CreditCard, FileText, LifeBuoy, Search, ShieldCheck, Wrench, Activity, ChevronRight } from "lucide-react";

export const metadata = {
  title: "Documentation | Dbweb",
  description: "Find help with Dbweb tools, your account, plans, privacy, and troubleshooting."
};

const topics = [
  { title: "Getting started", description: "Learn how to find and use tools across Dbweb.", href: "/tools", icon: Wrench, category: "USING DBWEB" },
  { title: "Plans and credits", description: "Understand plans, access, credits, and redemption.", href: "/plan", icon: CreditCard, category: "ACCOUNT" },
  { title: "Troubleshooting", description: "Steps to take when a page or feature is not working.", href: "/status", icon: Activity, category: "SUPPORT" },
  { title: "Privacy and safety", description: "Read the policies and use Dbweb responsibly.", href: "/privacy", icon: ShieldCheck, category: "POLICIES" }
];

const guides = [
  { title: "Using Dbweb tools", description: "Open a tool, review its instructions and required fields, then submit your request.", href: "/tools" },
  { title: "Managing your plan", description: "Visit the plan page to review available access options and pricing.", href: "/plan" },
  { title: "Checking service status", description: "If something fails, check the status page before trying again.", href: "/status" },
  { title: "Contacting support", description: "Include the page name, what you were doing, and the error you saw. Never send passwords or sensitive information.", href: "mailto:lumenomore@hotmail.com" }
];

export default function DocsPage() {
  return (
    <main className="dbDocsPage">
      <header className="dbDocsTopbar">
        <a className="dbDocsBrand" href="/" aria-label="Dbweb home"><span className="dbDocsLogo">D</span><span>Dbweb</span></a>
        <div className="dbDocsBreadcrumb"><span>Help center</span><ChevronRight size={14} strokeWidth={1.8} /><strong>Documentation</strong></div>
        <a className="dbDocsTopSupport" href="mailto:lumenomore@hotmail.com"><LifeBuoy size={16} strokeWidth={1.8} /><span>Contact support</span></a>
      </header>

      <div className="dbDocsLayout">
        <aside className="dbDocsSidebar">
          <div className="dbDocsSidebarLabel">HELP CENTER</div>
          <a className="dbDocsSideLink active" href="/docs"><BookOpen size={16} strokeWidth={1.8} />Documentation</a>
          <div className="dbDocsSidebarLabel dbDocsSidebarSecond">BROWSE TOPICS</div>
          {topics.map((topic) => {
            const Icon = topic.icon;
            return <a className="dbDocsSideLink" href={topic.href} key={topic.title}><Icon size={16} strokeWidth={1.8} />{topic.title}<ArrowUpRight className="dbDocsSideArrow" size={13} /></a>;
          })}
          <div className="dbDocsSidebarHelp"><div className="dbDocsSidebarHelpIcon"><CircleHelp size={17} strokeWidth={1.8} /></div><strong>Still need help?</strong><p>Our support team can help with issues you can't resolve here.</p><a href="mailto:lumenomore@hotmail.com">Contact support <ArrowRight size={13} /></a></div>
        </aside>

        <article className="dbDocsContent">
          <div className="dbDocsBreadcrumbMobile">Help center <ChevronRight size={13} /> Documentation</div>
          <div className="dbDocsKicker">DBWEB · HELP & GUIDES</div>
          <h1>Documentation</h1>
          <p className="dbDocsIntro">Everything you need to get started with Dbweb, manage your account, and find help when something isn't working.</p>

          <div className="dbDocsNotice"><CircleHelp size={18} strokeWidth={1.8} /><p><strong>New to Dbweb?</strong> Start by browsing the available tools. Each tool provides its own instructions and input requirements.</p><a href="/tools" aria-label="Browse tools"><ArrowRight size={17} /></a></div>

          <section className="dbDocsTopicsSection">
            <div className="dbDocsSectionTitle"><h2>Browse by topic</h2><span>{topics.length} topics</span></div>
            <div className="dbDocsTopicGrid">
              {topics.map((topic) => {
                const Icon = topic.icon;
                return <a className="dbDocsTopic" href={topic.href} key={topic.title}><span className="dbDocsTopicIcon"><Icon size={19} strokeWidth={1.8} /></span><span className="dbDocsTopicCopy"><small>{topic.category}</small><strong>{topic.title}</strong><span>{topic.description}</span><em>Read guide <ArrowRight size={13} /></em></span><ArrowUpRight className="dbDocsTopicArrow" size={16} strokeWidth={1.8} /></a>;
              })}
            </div>
          </section>

          <section className="dbDocsGuidesSection">
            <div className="dbDocsSectionTitle"><h2>Popular help articles</h2><span>QUICK LINKS</span></div>
            <div className="dbDocsGuideList">
              {guides.map((guide, index) => <a className="dbDocsGuide" href={guide.href} key={guide.title}><span className="dbDocsGuideNumber">{String(index + 1).padStart(2, "0")}</span><span className="dbDocsGuideCopy"><strong>{guide.title}</strong><span>{guide.description}</span></span><ArrowUpRight size={16} className="dbDocsGuideArrow" strokeWidth={1.8} /></a>)}
            </div>
          </section>

          <footer className="dbDocsFooter"><span>Was this page helpful?</span><a href="mailto:lumenomore@hotmail.com?subject=Dbweb%20documentation%20feedback">Send feedback <ArrowUpRight size={13} /></a><div><a href="/terms">Terms</a><a href="/privacy">Privacy</a><a href="/status">System status</a></div></footer>
        </article>
      </div>
    </main>
  );
}
