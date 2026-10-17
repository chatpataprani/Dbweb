export const metadata = {
  title: "Terms of Service | Dbweb",
  description: "Read the terms and acceptable-use rules for Dbweb."
};

export default function TermsPage() {
  return (
    <div className="legalPage">
      <nav className="legalNav"><a className="legalBrand" href="/">Dbweb</a><a href="/">Home</a><a href="/privacy">Privacy Policy</a></nav>
      <main className="legalContent">
        <p className="legalEyebrow">LEGAL</p>
        <h1>Terms of Service</h1>
        <p className="legalLead">By accessing or using Dbweb, you agree to use the website responsibly and follow these terms.</p>
        <p className="legalUpdated">Last updated: October 17, 2026</p>
        <section><h2>Use of the website</h2><p>Dbweb provides online tools and account features. Features may change, be limited, or become unavailable without notice. You are responsible for ensuring that your use of each tool is lawful and permitted.</p></section>
        <section><h2>Acceptable use</h2><p>Do not use Dbweb to violate laws, invade another person's privacy, access information without authorization, distribute harmful content, interfere with the service, or bypass usage limits and security controls.</p></section>
        <section><h2>Accounts, credits and plans</h2><p>Some features may require credits or a paid plan. Account and plan information may be associated with a device identifier stored in your browser. Protect access to your device and do not attempt to manipulate balances, redeem codes, or payment processes.</p></section>
        <section><h2>Third-party tools and services</h2><p>Some features are provided through third-party services. Those services may have their own terms, limits, availability, and privacy practices. Dbweb cannot guarantee the accuracy, availability, or continued operation of external services.</p></section>
        <section><h2>No guarantee</h2><p>The website and its tools are provided on an “as available” basis. To the extent permitted by applicable law, Dbweb makes no guarantee that every feature will be uninterrupted, error-free, or suitable for a particular purpose.</p></section>
        <section><h2>Suspension and changes</h2><p>Access may be restricted when necessary to protect the service, enforce these terms, respond to misuse, or address security issues. These terms may be updated as features evolve; continued use after an update means you accept the revised terms where legally permitted.</p></section>
        <section><h2>Contact</h2><p>Questions about these terms can be sent to <a href="mailto:lumenomore@hotmail.com">Dbweb support</a>.</p></section>
        <div className="legalActions"><a className="legalPrimary" href="/">Back to Dbweb</a><a href="/privacy">Read Privacy Policy →</a></div>
      </main>
      <footer className="legalFooter">© {new Date().getFullYear()} Dbweb <span>Use responsibly • Respect privacy</span></footer>
    </div>
  );
}
