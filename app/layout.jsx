import "./globals.css";
import "./component-motion.css";
import SpotlightSurfaces from "../components/ui/spotlight-surfaces";

export const metadata = {
  title: "Dbweb",
  description: "Dbweb tools and lookup workspace"
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
