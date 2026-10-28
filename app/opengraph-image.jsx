import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Dbweb — All-in-One Web Tools";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div style={{
        width: "100%",
        height: "100%",
        display: "flex",
        position: "relative",
        overflow: "hidden",
        background: "linear-gradient(125deg, #050914 0%, #0b1730 58%, #18243b 100%)",
        color: "#f8fafc",
        fontFamily: "Arial, Helvetica, sans-serif",
        padding: "52px 58px",
      }}>
        <div style={{
          position: "absolute", right: "-70px", top: "-110px", width: "520px", height: "520px",
          borderRadius: "50%", background: "radial-gradient(circle, rgba(52,105,180,.32) 0%, rgba(8,18,38,0) 70%)",
          display: "flex"
        }} />
        <div style={{ display: "flex", flexDirection: "column", width: "100%", zIndex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
            <img src="https://webdd.freeddns.org/dbweb-logo.svg" width="78" height="112" />
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 74, fontWeight: 800, letterSpacing: "-3px", lineHeight: 1.05 }}>Dbweb</div>
              <div style={{ color: "#b8c9e8", fontSize: 27, marginTop: 10 }}>All-in-One Web Tools</div>
            </div>
          </div>
          <div style={{ display: "flex", marginTop: 34, fontSize: 23, color: "#a9bce0" }}>
            Simple <span style={{ color: "#5e9cff", margin: "0 15px" }}>•</span> Fast <span style={{ color: "#5e9cff", margin: "0 15px" }}>•</span> Free
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "13px", marginTop: 28, maxWidth: 770 }}>
            {["50+ Web Tools", "Dbweb Mail", "Developer Tools", "File Utilities", "Photo Studio", "Gaming & More"].map((item) => (
              <div key={item} style={{
                display: "flex", border: "1px solid #344663", background: "rgba(18,33,58,.86)",
                color: "#e2ebfb", borderRadius: 13, padding: "12px 17px", fontSize: 19
              }}>{item}</div>
            ))}
          </div>
          <div style={{ display: "flex", flexDirection: "column", marginTop: "auto" }}>
            <div style={{ fontSize: 24, fontWeight: 700 }}>Everything you need, in one place.</div>
            <div style={{ fontSize: 19, color: "#9fb0ce", marginTop: 8 }}>Fast, practical tools for everyday work on the web.</div>
            <div style={{ fontSize: 20, color: "#78a9ff", marginTop: 18 }}>webdd.freeddns.org</div>
          </div>
        </div>
        <div style={{
          position: "absolute", right: "-18px", bottom: "-50px", width: "360px", height: "360px",
          borderRadius: "50%", border: "1px solid rgba(109,153,220,.18)", display: "flex"
        }} />
      </div>
    ),
    { ...size }
  );
}
