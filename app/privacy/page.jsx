export const metadata = {
  title: "Privacy Policy | Dbweb",
  description: "Learn how Dbweb handles device information, usage data, and third-party services."
};

export default function PrivacyPage() {
  return (
    <div className="legalPage">
      <nav className="legalNav"><a className="legalBrand" href="/">Dbweb</a><a href="/">Home</a><a href="/terms">Terms of Service</a></nav>
      <main className="legalContent">
        <p className="legalEyebrow">LEGAL</p>
        <h1>Privacy Policy</h1>
        <p className="legalLead">This page explains what information may be handled when you use Dbweb and its tools.</p>
        <p className="legalUpdated">Last updated: October 17, 2026</p>
        <section><h2>Information handled</h2><p>Dbweb may use a device identifier stored in your browser to associate your account, credits, plan status, and terms acceptance with that browser. If you provide a name or submit a payment receipt, that information may be processed to provide account and payment-related features.</p></section>
        <section><h2>Searches and browser storage</h2><p>Some preferences and recent-search history are stored in your browser. Clearing browser storage may remove these settings or create a new device account. Avoid entering sensitive or confidential information into tools unless you understand how that tool processes it.</p></section>
        <section><h2>Third-party services</h2><p>Some features rely on external providers or services. When you use those features, information you submit may be sent to the relevant provider and handled under its own privacy policy and terms. Dbweb does not control third-party retention or availability.</p></section>
        <section><h2>How information is used</h2><p>Information may be used to operate requested features, maintain account and credit balances, process redemption or payment-related requests, protect the service from abuse, and troubleshoot problems.</p></section>
        <section><h2>Security and retention</h2><p>Reasonable measures are used to support the service, but no website or transmission method can be guaranteed completely secure. Information may be retained for as long as needed to operate features, maintain records, resolve disputes, or meet applicable obligations.</p></section>
        <section><h2>Your choices</h2><p>You can clear local browser data to remove locally stored preferences and history. This may also reset your device identifier and affect access to account-associated features. For questions, contact <a href="mailto:lumenomore@hotmail.com">Dbweb support</a>.</p></section>
        <section><h2>Policy updates</h2><p>This policy may be updated as the website changes. The latest version will be published on this page.</p></section>
        <div className="legalActions"><a className="legalPrimary" href="/">Back to Dbweb</a><a href="/terms">Read Terms of Service →</a></div>
      </main>
      <footer className="legalFooter">© {new Date().getFullYear()} Dbweb <span>Privacy • Transparency • User choice</span></footer>
    </div>
  );
}
