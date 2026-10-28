import "./globals.css";
import "./component-motion.css";
import SpotlightSurfaces from "../components/ui/spotlight-surfaces";
import OfflineServiceWorker from "../components/offline-service-worker";

export const metadata = {
  metadataBase: new URL("https://webdd.freeddns.org"),
  applicationName: "Dbweb",
  title: "Dbweb — All-in-One Web Tools",
  description: "Explore 50+ practical web tools, Dbweb Mail, developer utilities, file tools, Photo Studio, and more.",
  openGraph: {
    type: "website",
    url: "https://webdd.freeddns.org/",
    siteName: "Dbweb",
    title: "Dbweb — All-in-One Web Tools",
    description: "Explore 50+ practical web tools, Dbweb Mail, developer utilities, file tools, Photo Studio, and more.",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Dbweb — All-in-One Web Tools" }]
  },
  twitter: {
    card: "summary_large_image",
    title: "Dbweb — All-in-One Web Tools",
    description: "Explore 50+ practical web tools, Dbweb Mail, developer utilities, file tools, Photo Studio, and more.",
    images: ["/opengraph-image"]
  },
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
