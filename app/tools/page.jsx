'use client';

import { useMemo, useState } from "react";
import { Search, ArrowUpRight, Wrench, FileText, Fingerprint, Image, Smartphone, Phone, GitCompare, ScanFace, FileSearch, Activity, CreditCard, QrCode, ScanText, ShieldCheck, KeyRound, Globe, Type, CarFront, CalendarDays, Landmark, FileBadge, FileImage, Sparkles } from "lucide-react";

const tools = [
  { name: "General File Tools", description: "Work with PDFs and images: convert, compress, resize, merge, split and more.", href: "/tools/general/index.html", category: "Files", Icon: FileImage },
  { name: "Hash Generator", description: "Create file and text hashes using common cryptographic algorithms.", href: "/tools/hash/", category: "Security", Icon: Fingerprint },
  { name: "Image Analysis", description: "Inspect image metadata and look for signs of editing.", href: "/tools/image-forensics/", category: "Files", Icon: Image },
  { name: "IMEI Validator", description: "Check an IMEI format and its checksum.", href: "/tools/imei/", category: "Validation", Icon: Smartphone },
  { name: "MAC Address Lookup", description: "Validate a MAC address and identify its registered vendor when available.", href: "/tools/mac/", category: "Network", Icon: Globe },
  { name: "Phone Number Tools", description: "Validate phone number formats and inspect general numbering information.", href: "/tools/phone/", category: "Validation", Icon: Phone },
  { name: "File Comparison", description: "Compare files to check whether their contents match.", href: "/tools/compare/", category: "Files", Icon: GitCompare },
  { name: "Fingerprint Comparison", description: "Compare two fingerprint images with the available matching utility.", href: "/tools/fingerprint/", category: "Image", Icon: ScanFace },
  { name: "Metadata Viewer", description: "Inspect supported documents and files for embedded metadata.", href: "/tools/metadata/", category: "Files", Icon: FileSearch },
  { name: "Call Record Analysis", description: "Explore call-record files and summarize patterns in supplied data.", href: "/tools/cdr/", category: "Analysis", Icon: Activity },
  { name: "IP Record Analysis", description: "Inspect supported IP data records and session details.", href: "/tools/ipdr/", category: "Analysis", Icon: Activity },
  { name: "Aadhaar Validator", description: "Check the format and checksum of an Aadhaar number. This does not verify identity.", href: "/tools/aadhaar/", category: "Validation", Icon: ShieldCheck },
  { name: "QR Code Tools", description: "Generate QR codes and scan supported QR images.", href: "/tools/qrcode/", category: "Utilities", Icon: QrCode },
  { name: "OCR Text Extractor", description: "Extract text from images with the supported OCR engine.", href: "/tools/ocr/", category: "Image", Icon: ScanText },
  { name: "Steganography Utility", description: "Encode or inspect supported image-based hidden text.", href: "/tools/steganography/", category: "Security", Icon: ShieldCheck },
  { name: "Signature Checksum", description: "Generate and verify checksum-based signatures.", href: "/tools/signature/", category: "Security", Icon: FileBadge },
  { name: "Password Generator", description: "Generate strong random passwords in your browser.", href: "/tools/password/", category: "Security", Icon: KeyRound },
  { name: "IP Address Tools", description: "Inspect IP address details with the available lookup utility.", href: "/tools/ip/", category: "Network", Icon: Globe },
  { name: "Text Transliterator", description: "Convert supported text between Latin input and another script.", href: "/tools/transliterate/", category: "Text", Icon: Type },
  { name: "Font Converter", description: "Convert text between supported legacy and Unicode font formats.", href: "/tools/font-converter/", category: "Text", Icon: Type },
  { name: "Vehicle Number Decoder", description: "Parse a vehicle registration number and its code structure.", href: "/tools/vehicle/", category: "Validation", Icon: CarFront },
  { name: "GST Number Validator", description: "Check GSTIN structure and checksum.", href: "/tools/gst/", category: "Validation", Icon: Landmark },
  { name: "PAN Validator", description: "Check the structure of a PAN identifier.", href: "/tools/pan/", category: "Validation", Icon: FileBadge },
  { name: "IFSC Lookup", description: "Look up bank-branch details from an IFSC code.", href: "/tools/ifsc/", category: "Utilities", Icon: Landmark },
  { name: "Age & Date Calculator", description: "Calculate age, date differences and day-of-week values.", href: "/tools/age-calculator/", category: "Utilities", Icon: CalendarDays },
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
    <div className="toolHubHero">
      <div className="toolHubEyebrow"><Sparkles size={14}/> YOUR WORKSPACE</div>
      <h1>Tools, all in one place.</h1>
      <p>A clean workspace for everyday file utilities, validators and analysis tools.</p>
      <label className="toolHubSearch"><Search size={19}/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search tools..." aria-label="Search tools"/></label>
    </div>
    <div className="toolHubFilters" aria-label="Filter tools by category">
      {categories.map((item) => <button key={item} className={category === item ? "active" : ""} onClick={() => setCategory(item)}>{item}</button>)}
    </div>
    <div className="toolHubCount">{filtered.length} {filtered.length === 1 ? "tool" : "tools"}</div>
    {filtered.length ? <div className="toolHubGrid">{filtered.map(({name, description, href, Icon, category: group}) => <a className="toolHubCard" href={href} key={name}>
      <span className="toolHubIcon"><Icon size={20}/></span>
      <span className="toolHubCardText"><small>{group}</small><strong>{name}</strong><span>{description}</span></span>
      <ArrowUpRight className="toolHubArrow" size={17}/>
    </a>)}</div> : <div className="card toolHubEmpty"><Wrench size={24}/><strong>No matching tools</strong><span>Try another search or category.</span></div>}
    <p className="toolHubNote">Use tools only with files and information you are authorized to access. Always verify important results independently.</p>
  </div>;
}
