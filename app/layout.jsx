import "./globals.css";

export const metadata = {
  title: "Lookup Console",
  description: "Number and Aadhaar lookup console"
};

export default function RootLayout({ children }) {
  return <html lang="en"><body>{children}</body></html>;
}