import "./globals.css";
import "./component-motion.css";
import SpotlightSurfaces from "../components/ui/spotlight-surfaces";

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
        <SpotlightSurfaces />
        {children}
      </body>
    </html>
  );
}
