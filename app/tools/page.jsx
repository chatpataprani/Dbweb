'use client';

import { useMemo, useState } from "react";
import TiltCard from "../../components/ui/tilt-card";
import BorderTrail from "../../components/ui/border-trail";
import MagneticButton from "../../components/ui/magnetic-button";
import AmbientBackdrop from "../../components/ui/ambient-backdrop";
import { Search, ArrowUpRight, Wrench, FileText, Instagram, Link2, Fingerprint, Image, Smartphone, Phone, GitCompare, ScanFace, FileSearch, Activity, CreditCard, QrCode, ScanText, ShieldCheck, KeyRound, Globe, Type, CarFront, CalendarDays, Landmark, FileBadge, FileImage, Sparkles, Scissors, Braces, Code2, CaseSensitive, Regex, Palette } from "lucide-react";

const tools = [
  { name: "Instagram Profile Analyzer", description: "Analyze public profile stats, bio, profile picture and available business details without Instagram login.", href: "/tools/instagram", category: "Social", Icon: Instagram },
  { name: "Short Link Resolver", description: "Expand public shortened links and inspect their redirect path.", href: "/tools/shortlink", category: "Links", Icon: Link2 },
  { name: "Background Remover", description: "Remove image backgrounds and export transparent PNGs with automatic device-to-online fallback.", href: "/tool", category: "Images", Icon: Scissors },
  { name: "General File Tools", description: "Work with PDFs and images: convert, compress, resize, merge, split and more.", href: "/tools/general/index.html", category: "Files", Icon: FileImage },
  { name: "Image Compressor", description: "Compress images to WebP, JPEG or PNG with adjustable quality, processed in your browser.", href: "/tools/quick-tools?tool=image", category: "Images", Icon: FileImage },
  { name: "Hash Generator", description: "Create file and text hashes using common cryptographic algorithms.", href: "/tools/hash/index.html", category: "Security", Icon: Fingerprint },
  { name: "Image Analysis", description: "Inspect image metadata and look for signs of editing.", href: "/tools/image-forensics/index.html", category: "Files", Icon: Image },
  { name: "IMEI Validator", description: "Check an IMEI format and its checksum.", href: "/tools/imei/index.html", category: "Validation", Icon: Smartphone },
  { name: "MAC Address Lookup", description: "Validate a MAC address and identify its registered vendor when available.", href: "/tools/mac/index.html", category: "Network", Icon: Globe },
  { name: "Phone Number Tools", description: "Validate phone number formats and inspect general numbering information.", href: "/tools/phone/index.html", category: "Validation", Icon: Phone },
  { name: "File Comparison", description: "Compare files to check whether their contents match.", href: "/tools/compare/index.html", category: "Files", Icon: GitCompare },
  { name: "Fingerprint Comparison", description: "Compare two fingerprint images with the available matching utility.", href: "/tools/fingerprint/index.html", category: "Image", Icon: ScanFace },
  { name: "Metadata Viewer", description: "Inspect supported documents and files for embedded metadata.", href: "/tools/metadata/index.html", category: "Files", Icon: FileSearch },
  { name: "Call Record Analysis", description: "Explore call-record files and summarize patterns in supplied data.", href: "/tools/cdr/index.html", category: "Analysis", Icon: Activity },
  { name: "IP Record Analysis", description: "Inspect supported IP data records and session details.", href: "/tools/ipdr/index.html", category: "Analysis", Icon: Activity },
  { name: "Aadhaar Validator", description: "Check the format and checksum of an Aadhaar number.", href: "/tools/aadhaar/index.html", category: "Validation", Icon: ShieldCheck },
  { name: "QR Code Tools", description: "Generate QR codes and scan supported QR images.", href: "/tools/qrcode/index.html", category: "Utilities", Icon: QrCode },
  { name: "OCR Text Extractor", description: "Extract text from images with the supported OCR engine.", href: "/tools/ocr/index.html", category: "Image", Icon: ScanText },
  { name: "Steganography Utility", description: "Encode or inspect supported image-based hidden text.", href: "/tools/steganography/index.html", category: "Security", Icon: ShieldCheck },
  { name: "Signature Checksum", description: "Generate and verify checksum-based signatures.", href: "/tools/signature/index.html", category: "Security", Icon: FileBadge },
  { name: "Password Generator", description: "Generate strong random passwords in your browser.", href: "/tools/password/index.html", category: "Security", Icon: KeyRound },
  { name: "IP Address Tools", description: "Inspect IP address details with the available lookup utility.", href: "/tools/ip/index.html", category: "Network", Icon: Globe },
  { name: "Text Transliterator", description: "Convert supported text between Latin input and another script.", href: "/tools/transliterate/index.html", category: "Text", Icon: Type },
  { name: "Font Converter", description: "Convert text between supported legacy and Unicode font formats.", href: "/tools/font-converter/index.html", category: "Text", Icon: Type },
  { name: "Text Case Converter", description: "Convert text to uppercase, lowercase, title case, sentence case or reverse it.", href: "/tools/quick-tools?tool=text", category: "Text", Icon: CaseSensitive },
  { name: "Markdown Preview", description: "Write and preview simple Markdown headings, lists and formatted text.", href: "/tools/quick-tools?tool=markdown", category: "Text", Icon: Type },
  { name: "Vehicle Number Decoder", description: "Parse a vehicle registration number and its code structure.", href: "/tools/vehicle/index.html", category: "Validation", Icon: CarFront },
  { name: "GST Number Validator", description: "Check GSTIN structure and checksum.", href: "/tools/gst/index.html", category: "Validation", Icon: Landmark },
  { name: "PAN Validator", description: "Check the structure of a PAN identifier.", href: "/tools/pan/index.html", category: "Validation", Icon: FileBadge },
  { name: "IFSC Lookup", description: "Look up bank-branch details from an IFSC code.", href: "/tools/ifsc/index.html", category: "Utilities", Icon: Landmark },
  { name: "Age & Date Calculator", description: "Calculate age, date differences and day-of-week values.", href: "/tools/age-calculator/index.html", category: "Utilities", Icon: CalendarDays },
  { name: "JSON Formatter", description: "Format, minify and validate JSON with readable output.", href: "/tools/quick-tools?tool=json", category: "Developer", Icon: Braces },
  { name: "Base64 Encoder / Decoder", description: "Encode or decode text without sending it to a server.", href: "/tools/quick-tools?tool=base64", category: "Developer", Icon: Code2 },
  { name: "URL Inspector", description: "Inspect URL parts, hostname, path, protocol and query parameters.", href: "/tools/quick-tools?tool=url", category: "Web", Icon: Link2 },
  { name: "Regex Tester", description: "Test JavaScript regular expressions against your own sample text.", href: "/tools/quick-tools?tool=regex", category: "Developer", Icon: Regex },
  { name: "Color Converter", description: "Convert HEX colors to RGB and HSL with a live color preview.", href: "/tools/quick-tools?tool=color", category: "Design", Icon: Palette },
];

const categories = ["All", ...new Set(tools.map((tool) => tool.category))];

export default function ToolsPage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const filtered = useMemo(() => tools.filter((tool) => {
    const matchesCategory = category === "All" || tool.category === category;
    const text = (tool.name + " " + tool.description + " " + tool.category).toLowerCase();
    return matchesCategory && text.includes(query.trim().toLowerCase());
  }), [query, category]);

  return <div className="toolHub">
    <BorderTrail className="toolHubHeroFrame">
    <div className="toolHubHero">
      <AmbientBackdrop />
      <div className="toolHubEyebrow"><Sparkles size={14}/> YOUR WORKSPACE</div>
      <h1>Tools, all in one place.</h1>
      <p>A clean workspace for everyday file utilities, validators and analysis tools.</p>
      <label className="toolHubSearch"><Search size={19}/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search tools..." aria-label="Search tools"/></label>
    </div>
    </BorderTrail>
    <div className="toolHubFilters" aria-label="Filter tools by category">
      {categories.map((item) => <MagneticButton key={item} className={category === item ? "active" : ""} active={category === item} onClick={() => setCategory(item)}>{item}</MagneticButton>)}
    </div>
    <div className="toolHubCount">{filtered.length} {filtered.length === 1 ? "tool" : "tools"}</div>
    {filtered.length ? <div className="toolHubGrid">{filtered.map(({name, description, href, Icon, category: group}) => <TiltCard className="toolHubCard" href={href} key={name}>
      <span className="toolHubIcon"><Icon size={20}/></span>
      <span className="toolHubCardText"><small>{group}</small><strong>{name}</strong><span>{description}</span></span>
      <ArrowUpRight className="toolHubArrow" size={17}/>
    </TiltCard>)}</div> : <div className="card toolHubEmpty"><Wrench size={24}/><strong>No matching tools</strong><span>Try another search or category.</span></div>}
  </div>;
}
