import "./globals.css";

export const metadata = {
  title: "Dbweb",
  description: "Dbweb tools and lookup workspace"
};

export default function RootLayout({ children }) {
  return <html lang="en"><body>{children}</body></html>;
}