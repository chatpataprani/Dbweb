import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Dbweb — All-in-One Web Tools";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", overflow: "hidden", background: "#f6f6f4", color: "#1b1d22", fontFamily: "Arial, Helvetica, sans-serif", padding: "52px 60px" }}>
        <div style={{ position: "absolute", right: -100, top: -180, width: 600, height: 600, borderRadius: 300, background: "#e6eafb", display: "flex" }} />
        <div style={{ position: "absolute", right: 100, bottom: -310, width: 560, height: 560, borderRadius: 280, border: "2px solid #d8def7", display: "flex" }} />
        <div style={{ display: "flex", flexDirection: "column", width: "100%", zIndex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 25 }}>
            <div style={{ width: 124, height: 124, borderRadius: 25, background: "#3d5bd9", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 12px 28px rgba(61,91,217,.20)" }}>
              <svg width="68" height="104" viewBox="0 0 823 1423" fill="none">
                <path d="M 610,0 L 513,267 L 488,331 L 463,389 L 428,461 L 406,499 L 380,535 L 365,550 L 350,560 L 329,566 L 303,566 L 276,562 L 233,551 L 200,540 L 120,509 L 88,495 L 133,521 L 175,550 L 198,569 L 229,600 L 240,614 L 259,646 L 265,661 L 269,677 L 270,706 L 268,718 L 262,735 L 283,729 L 296,727 L 322,727 L 343,730 L 367,737 L 343,695 L 314,653 L 298,634 L 282,618 L 268,606 L 251,594 L 252,593 L 288,608 L 339,623 L 376,682 L 419,619 L 421,619 L 465,682 L 502,623 L 526,617 L 553,608 L 587,593 L 589,594 L 557,619 L 532,646 L 505,683 L 467,746 L 463,743 L 421,678 L 418,680 L 378,741 L 404,754 L 419,766 L 420,775 L 411,784 L 387,792 L 358,797 L 332,798 L 314,796 L 301,792 L 292,785 L 289,777 L 290,771 L 295,761 L 311,745 L 294,747 L 271,755 L 224,781 L 171,817 L 94,875 L 0,950 L 52,920 L 118,886 L 176,860 L 224,842 L 260,833 L 290,832 L 305,838 L 311,843 L 317,853 L 323,877 L 324,907 L 321,946 L 312,1005 L 286,1128 L 243,1297 L 213,1422 L 231,1362 L 238,1344 L 251,1300 L 281,1210 L 331,1066 L 365,974 L 397,895 L 418,854 L 436,828 L 451,813 L 470,803 L 478,801 L 495,800 L 522,804 L 566,817 L 604,833 L 650,856 L 706,889 L 599,799 L 575,776 L 561,760 L 549,742 L 542,722 L 542,703 L 545,691 L 553,673 L 572,645 L 594,620 L 634,583 L 700,532 L 772,485 L 822,456 L 760,486 L 695,515 L 635,538 L 587,552 L 562,556 L 541,555 L 527,549 L 517,538 L 513,530 L 507,502 L 507,455 L 511,415 L 520,359 L 537,271 L 566,146 L 587,72 Z M 470,572 L 470,576 L 460,584 L 439,593 L 418,599 L 391,603 L 376,603 L 368,601 L 364,598 L 364,594 L 372,587 L 391,578 L 417,570 L 441,566 L 455,566 L 465,568 Z" fill="#ffffff" fillRule="evenodd" />
              </svg>
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 76, fontWeight: 800, letterSpacing: -3, lineHeight: 1.05 }}>Dbweb</div>
              <div style={{ color: "#3d5bd9", fontSize: 28, fontWeight: 600, marginTop: 9 }}>All-in-One Web Tools</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", marginTop: 35, fontSize: 23, color: "#6b7080" }}>
            Tools for everyday work <span style={{ color: "#3d5bd9", margin: "0 12px" }}>•</span> Fast <span style={{ color: "#3d5bd9", margin: "0 12px" }}>•</span> Simple
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 13, marginTop: 27, maxWidth: 940 }}>
            {["50+ Web Tools", "Dbweb Mail", "Developer Tools", "File Utilities", "Photo Studio", "Gaming & More"].map((item) => (
              <div key={item} style={{ display: "flex", border: "1px solid #dedfd9", background: "#ffffff", color: "#30323a", borderRadius: 12, padding: "12px 17px", fontSize: 19 }}>{item}</div>
            ))}
          </div>
          <div style={{ display: "flex", flexDirection: "column", marginTop: "auto" }}>
            <div style={{ fontSize: 27, fontWeight: 700 }}>Everything you need, in one place.</div>
            <div style={{ fontSize: 20, color: "#6b7080", marginTop: 8 }}>Your practical workspace for the web.</div>
            <div style={{ display: "flex", alignItems: "center", marginTop: 17, fontSize: 20, color: "#3d5bd9", fontWeight: 700 }}>webdd.freeddns.org</div>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
