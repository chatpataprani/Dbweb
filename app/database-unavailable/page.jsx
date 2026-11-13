import Link from "next/link";
import {ArrowLeft,ArrowUpRight,Database,RefreshCw,CheckCircle2,AlertTriangle} from "lucide-react";

export const metadata={title:"Database unavailable | Dbweb",description:"Current availability of Dbweb lookup services."};

export default function DatabaseUnavailable(){
 return <main className="dbUnavailablePage">
  <header className="dbUnavailableTop"><a href="/" className="dbUnavailableBrand"><img src="/dbweb-logo.svg" alt=""/>Dbweb</a><span>Service status</span></header>
  <section className="dbUnavailableHero">
   <div className="dbUnavailableIcon"><Database size={25}/></div>
   <div className="dbUnavailableEyebrow"><span/> PARTIAL SERVICE DISRUPTION</div>
   <h1>Some lookup services are temporarily unavailable.</h1>
   <p className="dbUnavailableLead">The upstream database used by Number and Aadhaar lookup is currently offline. We’ve paused those searches while the source is unavailable.</p>
   <div className="dbUnavailablePanel">
    <div className="dbUnavailableRow"><span className="dbUnavailableDot down"/><div><strong>Phone number lookup</strong><small>Temporarily unavailable · Upstream database offline</small></div><b className="dbUnavailableState">Unavailable</b></div>
    <div className="dbUnavailableRow"><span className="dbUnavailableDot down"/><div><strong>Aadhaar lookup</strong><small>Temporarily unavailable · Service paused</small></div><b className="dbUnavailableState">Unavailable</b></div>
    <div className="dbUnavailableRow"><span className="dbUnavailableDot up"/><div><strong>Telegram lookup</strong><small>Available · Uses a separate source</small></div><b className="dbUnavailableState good">Operational</b></div>
   </div>
   <div className="dbUnavailableInfo"><AlertTriangle size={16}/><p><strong>No action is needed on your account.</strong> This is an upstream data-source issue, not a problem with your device or credits. We’ll restore the affected tools when the source becomes accessible again.</p></div>
   <div className="dbUnavailableActions"><Link href="/" className="dbUnavailablePrimary">Back to Dbweb <ArrowUpRight size={15}/></Link><button onClick={()=>window.location.reload()} className="dbUnavailableSecondary"><RefreshCw size={14}/> Refresh status</button></div>
   <p className="dbUnavailableFoot">Status page · Updated automatically when service is restored</p>
  </section>
  <footer className="dbUnavailableFooter"><Link href="/"><ArrowLeft size={13}/> Return to Dbweb</Link><span>Dbweb service status</span></footer>
 </main>;
}