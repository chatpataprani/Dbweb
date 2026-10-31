import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Dbweb — All-in-One Web Tools";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const logoPath = "M 616,0 L 613,3 L 592,64 L 577,101 L 563,143 L 553,167 L 534,223 L 522,252 L 506,298 L 472,380 L 452,424 L 417,491 L 393,528 L 370,554 L 355,565 L 337,571 L 308,572 L 285,569 L 249,561 L 212,549 L 162,531 L 143,522 L 88,501 L 136,529 L 183,562 L 206,582 L 227,603 L 242,621 L 253,638 L 263,658 L 271,683 L 273,699 L 272,715 L 264,743 L 290,736 L 327,735 L 346,738 L 372,746 L 371,742 L 344,697 L 319,661 L 292,630 L 263,606 L 264,605 L 303,620 L 341,631 L 379,691 L 423,627 L 460,681 L 468,690 L 505,631 L 533,624 L 581,605 L 583,606 L 558,627 L 525,664 L 507,690 L 469,752 L 429,690 L 423,683 L 380,748 L 381,750 L 404,760 L 420,772 L 422,776 L 422,782 L 414,790 L 391,798 L 360,803 L 336,804 L 312,801 L 302,797 L 296,792 L 293,785 L 293,781 L 297,771 L 302,764 L 316,751 L 312,750 L 300,752 L 283,757 L 233,783 L 192,810 L 120,863 L 0,958 L 1,959 L 42,935 L 115,897 L 160,876 L 227,850 L 263,841 L 292,840 L 301,842 L 308,846 L 318,858 L 322,868 L 325,883 L 326,917 L 322,960 L 313,1017 L 296,1101 L 294,1104 L 277,1180 L 214,1431 L 215,1433 L 218,1427 L 236,1366 L 253,1317 L 272,1255 L 354,1021 L 357,1016 L 384,942 L 404,896 L 424,858 L 440,835 L 454,821 L 470,812 L 481,809 L 498,808 L 530,813 L 563,823 L 616,845 L 675,876 L 707,896 L 711,897 L 709,894 L 618,819 L 589,793 L 567,769 L 553,749 L 548,737 L 546,729 L 546,711 L 549,698 L 559,676 L 586,640 L 619,607 L 643,586 L 677,559 L 719,529 L 762,501 L 813,470 L 827,463 L 829,460 L 737,504 L 681,527 L 679,529 L 599,556 L 567,562 L 543,561 L 530,555 L 524,549 L 518,539 L 513,522 L 511,508 L 511,466 L 517,408 L 524,365 L 539,288 L 548,251 L 550,236 L 570,154 L 588,89 Z";
const logoInnerPath = "M 472,579 L 472,583 L 461,591 L 439,600 L 420,605 L 402,608 L 382,609 L 371,607 L 368,604 L 369,600 L 377,594 L 394,586 L 420,578 L 437,575 L 455,574 L 464,575 Z";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", background: "#f4f3ef", color: "#18191c", padding: "46px 58px", fontFamily: "Arial, Helvetica, sans-serif", position: "relative" }}>
        <div style={{ position: "absolute", inset: 18, border: "2px solid #deddd7", borderRadius: 30, display: "flex" }} />
        <div style={{ width: 270, height: 390, borderRadius: 28, background: "#3d5bd9", display: "flex", alignItems: "center", justifyContent: "center", marginRight: 58, zIndex: 1 }}>
          <svg width="174" height="300" viewBox="0 0 830 1434" fill="none">
            <path d={logoPath} fill="#ffffff" fillRule="evenodd" />
            <path d={logoInnerPath} fill="#3d5bd9" />
          </svg>
        </div>
        <div style={{ display: "flex", flexDirection: "column", flex: 1, zIndex: 1, height: "100%", justifyContent: "center" }}>
          <div style={{ fontSize: 104, lineHeight: 1, fontWeight: 800, letterSpacing: -4 }}>Dbweb</div>
          <div style={{ display: "flex", width: 132, height: 7, borderRadius: 5, background: "#3d5bd9", marginTop: 20 }} />
          <div style={{ fontSize: 34, fontWeight: 700, color: "#3d5bd9", marginTop: 22 }}>All-in-One Web Tools</div>
          <div style={{ fontSize: 21, color: "#5d6068", marginTop: 20 }}>Useful tools for your everyday digital work.</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 30, maxWidth: 720 }}>
            {["50+ Web Tools", "Dbweb Mail", "Developer Tools", "File Utilities", "Photo Studio", "Gaming & More"].map((label) => (
              <div key={label} style={{ display: "flex", alignItems: "center", border: "1px solid #deddd7", background: "#ffffff", borderRadius: 12, padding: "12px 16px", fontSize: 19, fontWeight: 600, color: "#30323a" }}>{label}</div>
            ))}
          </div>
          <div style={{ fontSize: 23, fontWeight: 700, color: "#3d5bd9", marginTop: 30 }}>webdd.freeddns.org</div>
        </div>
      </div>
    ),
    { ...size }
  );
}
