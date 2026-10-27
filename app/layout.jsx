import "./globals.css";
import "./component-motion.css";
import SpotlightSurfaces from "../components/ui/spotlight-surfaces";
import OfflineServiceWorker from "../components/offline-service-worker";

export const metadata = {
  applicationName: "Dbweb",
  title: "Dbweb — Tools & Lookup Workspace",
  description: "A practical workspace for online tools, validators, image utilities, and account features.",
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg"
  },
  robots: {
    index: true,
    follow: true
  }
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <OfflineServiceWorker />
        <SpotlightSurfaces />
        {children}
      </body>
    </html>
  );
}
