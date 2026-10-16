'use client';

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Braces, CaseSensitive, Check, Clipboard, Code2, Download, FileImage, Link2, Palette, Regex, RotateCcw, ShieldCheck, Sparkles, Type, Upload, Wrench } from "lucide-react";

const toolItems = [
  { id: "json", name: "JSON Formatter", detail: "Format, minify and validate JSON.", Icon: Braces, category: "Developer" },
  { id: "base64", name: "Base64 Encoder", detail: "Encode or decode text locally.", Icon: Code2, category: "Developer" },
  { id: "url", name: "URL Inspector", detail: "Break a URL into its components.", Icon: Link2, category: "Web" },
  { id: "text", name: "Text Case Converter", detail: "Change case and clean up text.", Icon: CaseSensitive, category: "Text" },
  { id: "regex", name: "Regex Tester", detail: "Test JavaScript regular expressions.", Icon: Regex, category: "Developer" },
  { id: "markdown", name: "Markdown Preview", detail: "Preview headings, lists and code.", Icon: Type, category: "Text" },
  { id: "color", name: "Color Converter", detail: "Convert HEX colors to RGB and HSL.", Icon: Palette, category: "Design" },
  { id: "image", name: "Image Compressor", detail: "Compress images in your browser.", Icon: FileImage, category: "Images" },
];

function titleCase(value) {
  return value.toLowerCase().replace(/\b([a-z])/g, (match) => match.toUpperCase());
}
function hexToRgb(hex) {
  let value = hex.trim().replace(/^#/, "");
  if (/^[0-9a-f]{3}$/i.test(value)) value = value.split("").map((c) => c + c).join("");
  if (!/^[0-9a-f]{6}$/i.test(value)) return null;
  const number = parseInt(value, 16);
  return { r: (number >> 16) & 255, g: (number >> 8) & 255, b: number & 255 };
}
function rgbToHsl({ r, g, b }) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      default: h = (r - g) / d + 4;
    }
    h /= 6;
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

export default function QuickToolsPage() {
  const [active, setActive] = useState("json");
  const [notice, setNotice] = useState("");
  const [input, setInput] = useState('{"name":"Dbweb","tools":["JSON","Text","Images"]}');
  const [output, setOutput] = useState("");
  const [urlInput, setUrlInput] = useState("https://example.com/path?source=dbweb&mode=tools");
  const [regexPattern, setRegexPattern] = useState("\\b\\w+\\b");
  const [regexFlags, setRegexFlags] = useState("g");
  const [regexText, setRegexText] = useState("Test your regular expression with Dbweb tools.");
  const [markdown, setMarkdown] = useState("# Hello Dbweb\n\nWrite **Markdown** here.\n\n- First item\n- Second item");
  const [color, setColor] = useState("#3D5BD9");
  const [imageFile, setImageFile] = useState(null);
  const [imageQuality, setImageQuality] = useState(0.82);
  const [imageFormat, setImageFormat] = useState("image/webp");
  const [imageResult, setImageResult] = useState(null);
  const [imageBusy, setImageBusy] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    const selected = new URLSearchParams(window.location.search).get("tool");
    if (toolItems.some((item) => item.id === selected)) setActive(selected);
  }, []);

  const current = toolItems.find((item) => item.id === active) || toolItems[0];
  const colorRgb = useMemo(() => hexToRgb(color), [color]);
  const colorHsl = useMemo(() => colorRgb && rgbToHsl(colorRgb), [colorRgb]);

  function runJson(mode) {
    try {
      const parsed = JSON.parse(input);
      setOutput(mode === "minify" ? JSON.stringify(parsed) : JSON.stringify(parsed, null, 2));
      setNotice("Valid JSON — processed locally.");
    } catch (error) { setOutput(""); setNotice("Invalid JSON: " + error.message); }
  }
  async function copyText(value) {
    if (!value) return;
    try { await navigator.clipboard.writeText(value); setNotice("Copied to clipboard."); }
    catch { setNotice("Clipboard access is unavailable. Select the output and copy it."); }
  }
  function runBase64(mode) {
    try {
      const result = mode === "encode" ? btoa(unescape(encodeURIComponent(input))) : decodeURIComponent(escape(atob(input.trim())));
      setOutput(result); setNotice(mode === "encode" ? "Text encoded." : "Base64 decoded.");
    } catch { setOutput(""); setNotice("Could not process this input. Check the text or Base64 value."); }
  }
  function runText(mode) {
    const actions = {
      upper: input.toUpperCase(), lower: input.toLowerCase(), title: titleCase(input),
      sentence: input.toLowerCase().replace(/(^\s*|[.!?]\s+)([a-z])/g, (m, p, c) => p + c.toUpperCase()),
      trim: input.split("\n").map((line) => line.trim()).join("\n").replace(/[ \t]+/g, " ").trim(),
      reverse: [...input].reverse().join(""),
    };
    setOutput(actions[mode] || input); setNotice("Text converted locally.");
  }
  function runRegex() {
    try {
      const regex = new RegExp(regexPattern, regexFlags);
      const matches = [...regexText.matchAll(new RegExp(regex.source, regex.flags.includes("g") ? regex.flags : regex.flags + "g"))];
      setOutput(matches.length ? matches.map((m, i) => (i + 1) + ". " + m[0] + " — index " + m.index).join("\n") : "No matches found.");
      setNotice(matches.length + " match" + (matches.length === 1 ? "" : "es") + " found.");
    } catch (error) { setOutput(""); setNotice("Regex error: " + error.message); }
  }
  function inspectUrl() {
    try {
      const parsed = new URL(urlInput.includes("://") ? urlInput : "https://" + urlInput);
      setOutput(JSON.stringify({
        href: parsed.href, origin: parsed.origin, protocol: parsed.protocol,
        hostname: parsed.hostname, port: parsed.port || "(default)", pathname: parsed.pathname,
        queryParameters: Object.fromEntries(parsed.searchParams.entries()), fragment: parsed.hash || "(none)",
      }, null, 2));
      setNotice("URL parsed in your browser. No request was sent to the website.");
    } catch { setOutput(""); setNotice("Enter a valid URL, such as https://example.com/path?x=1"); }
  }
  function compressImage() {
    if (!imageFile) { setNotice("Choose an image first."); return; }
    setImageBusy(true); setImageResult(null); setNotice("");
    const url = URL.createObjectURL(imageFile);
    const image = new window.Image();
    image.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Canvas is not supported in this browser.");
        ctx.drawImage(image, 0, 0);
        canvas.toBlob((blob) => {
          URL.revokeObjectURL(url); setImageBusy(false);
          if (!blob) { setNotice("Compression failed. Try another image or format."); return; }
          setImageResult({ blob, url: URL.createObjectURL(blob), size: blob.size, width: canvas.width, height: canvas.height, type: blob.type });
          const saved = Math.round((1 - blob.size / imageFile.size) * 100);
          setNotice(blob.size <= imageFile.size ? "Ready — " + Math.max(0, saved) + "% smaller." : "Ready — this format produced a larger file. Try lower quality or JPEG.");
        }, imageFormat, Number(imageQuality));
      } catch (error) { URL.revokeObjectURL(url); setImageBusy(false); setNotice(error.message || "Could not compress this image."); }
    };
    image.onerror = () => { URL.revokeObjectURL(url); setImageBusy(false); setNotice("Could not open this image file."); };
    image.src = url;
  }
  function downloadImage() {
    if (!imageResult) return;
    const ext = imageResult.type === "image/jpeg" ? "jpg" : imageResult.type === "image/png" ? "png" : "webp";
    const a = document.createElement("a"); a.href = imageResult.url; a.download = "dbweb-compressed." + ext; a.click();
  }
  function renderMarkdownLine(line, index) {
    if (line.startsWith("### ")) return <h4 key={index}>{line.slice(4)}</h4>;
    if (line.startsWith("## ")) return <h3 key={index}>{line.slice(3)}</h3>;
    if (line.startsWith("# ")) return <h2 key={index}>{line.slice(2)}</h2>;
    if (line.startsWith("- ") || line.startsWith("* ")) return <div key={index} className="qtMarkdownList">• {line.slice(2).replace(/\*\*(.*?)\*\*/g, "$1")}</div>;
    if (!line.trim()) return <div key={index} className="qtMarkdownGap" />;
    return <p key={index}>{line.replace(/\*\*(.*?)\*\*/g, "$1").replace(/\*(.*?)\*/g, "$1").replace(/`([^`]+)`/g, "$1")}</p>;
  }

  return <main className="quickToolsPage">
    <a className="qtBack" href="/tools"><ArrowLeft size={16}/> All tools</a>
    <div className="qtHero">
      <div className="qtEyebrow"><Sparkles size={14}/> DBWEB UTILITIES</div>
      <h1>Quick Tools Studio</h1>
      <p>Small, useful tools that run right in your browser. Your input stays on your device.</p>
      <div className="qtPrivacy"><ShieldCheck size={15}/> Local processing · No account needed · Mobile friendly</div>
    </div>
    <div className="qtLayout">
      <aside className="qtSidebar" aria-label="Quick tools">
        <span className="qtSideLabel">TOOLS</span>
        {toolItems.map(({ id, name, Icon, category }) => <button key={id} className={active === id ? "qtNav active" : "qtNav"} onClick={() => { setActive(id); setNotice(""); setOutput(""); window.history.replaceState({}, "", "?tool=" + id); }}>
          <Icon size={17}/><span>{name}</span><small>{category}</small>
        </button>)}
      </aside>
      <section className="qtWorkspace">
        <div className="qtWorkspaceHead">
          <span className="qtToolIcon"><current.Icon size={21}/></span>
          <div><span className="qtCategory">{current.category}</span><h2>{current.name}</h2><p>{current.detail}</p></div>
        </div>
        {active === "json" && <>
          <label className="qtLabel">JSON INPUT<textarea className="qtTextarea qtCode" value={input} onChange={(e) => setInput(e.target.value)} spellCheck="false" placeholder='{"hello":"world"}'/></label>
          <div className="qtActions"><button className="qtPrimary" onClick={() => runJson("format")}>Format JSON</button><button className="qtSecondary" onClick={() => runJson("minify")}>Minify</button><button className="qtSecondary" onClick={() => { try { JSON.parse(input); setNotice("Valid JSON."); setOutput("Your JSON is valid."); } catch (e) { setNotice("Invalid JSON: " + e.message); setOutput(""); } }}>Validate</button><button className="qtSecondary" onClick={() => copyText(output)} disabled={!output}><Clipboard size={15}/> Copy output</button></div>
        </>}
        {active === "base64" && <>
          <label className="qtLabel">TEXT OR BASE64<textarea className="qtTextarea qtCode" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Enter text to encode, or Base64 to decode."/></label>
          <div className="qtActions"><button className="qtPrimary" onClick={() => runBase64("encode")}>Encode</button><button className="qtSecondary" onClick={() => runBase64("decode")}>Decode</button><button className="qtSecondary" onClick={() => copyText(output)} disabled={!output}><Clipboard size={15}/> Copy output</button></div>
        </>}
        {active === "url" && <>
          <label className="qtLabel">URL TO INSPECT<input className="qtInput" value={urlInput} onChange={(e) => setUrlInput(e.target.value)} placeholder="https://example.com/path?key=value"/></label>
          <div className="qtActions"><button className="qtPrimary" onClick={inspectUrl}>Inspect URL</button><button className="qtSecondary" onClick={() => copyText(output)} disabled={!output}><Clipboard size={15}/> Copy details</button></div>
        </>}
        {active === "text" && <>
          <label className="qtLabel">YOUR TEXT<textarea className="qtTextarea" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Type or paste text here."/></label>
          <div className="qtActions qtWrap">{[["upper","UPPERCASE"],["lower","lowercase"],["title","Title Case"],["sentence","Sentence case"],["trim","Clean spaces"],["reverse","Reverse"]].map(([mode, label]) => <button key={mode} className="qtSecondary" onClick={() => runText(mode)}>{label}</button>)}</div>
          <button className="qtSecondary" onClick={() => copyText(output)} disabled={!output}><Clipboard size={15}/> Copy output</button>
        </>}
        {active === "regex" && <>
          <div className="qtInputRow"><label className="qtLabel">PATTERN<input className="qtInput qtCode" value={regexPattern} onChange={(e) => setRegexPattern(e.target.value)} placeholder="\\b\\w+\\b"/></label><label className="qtLabel qtFlags">FLAGS<input className="qtInput qtCode" value={regexFlags} onChange={(e) => setRegexFlags(e.target.value)} placeholder="gim"/></label></div>
          <label className="qtLabel">TEST TEXT<textarea className="qtTextarea" value={regexText} onChange={(e) => setRegexText(e.target.value)}/></label>
          <div className="qtActions"><button className="qtPrimary" onClick={runRegex}>Test expression</button><button className="qtSecondary" onClick={() => copyText(output)} disabled={!output}><Clipboard size={15}/> Copy matches</button></div>
        </>}
        {active === "markdown" && <>
          <label className="qtLabel">MARKDOWN<textarea className="qtTextarea qtCode" value={markdown} onChange={(e) => setMarkdown(e.target.value)} spellCheck="false"/></label>
          <div className="qtPreview"><span className="qtLabelText">PREVIEW</span>{markdown.split("\n").map(renderMarkdownLine)}</div>
        </>}
        {active === "color" && <>
          <label className="qtLabel">HEX COLOR<div className="qtColorInput"><input type="color" value={colorRgb ? (color.startsWith("#") ? color : "#" + color) : "#3d5bd9"} onChange={(e) => setColor(e.target.value.toUpperCase())}/><input className="qtInput qtCode" value={color} onChange={(e) => setColor(e.target.value)} placeholder="#3D5BD9"/></div></label>
          {colorRgb && colorHsl ? <><div className="qtColorSwatch" style={{ background: color.startsWith("#") ? color : "#" + color }}><span>{color.toUpperCase()}</span></div><div className="qtColorResults">{[["RGB", "rgb(" + colorRgb.r + ", " + colorRgb.g + ", " + colorRgb.b + ")"],["HSL", "hsl(" + colorHsl.h + ", " + colorHsl.s + "%, " + colorHsl.l + "%)"],["HEX", "#" + color.replace(/^#/, "").toUpperCase()]].map(([label, value]) => <button key={label} className="qtColorValue" onClick={() => copyText(value)}><span>{label}</span><strong>{value}</strong><Clipboard size={15}/></button>)}</div></> : <p className="qtNotice">Enter a valid 3- or 6-digit HEX color.</p>}
        </>}
        {active === "image" && <>
          <div className="qtDrop" onClick={() => fileRef.current?.click()} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") fileRef.current?.click(); }}>
            <Upload size={24}/><strong>{imageFile ? imageFile.name : "Choose an image"}</strong><span>{imageFile ? (imageFile.size / 1024).toFixed(1) + " KB · selected" : "JPG, PNG, WebP or another browser-supported image"}</span>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { setImageFile(e.target.files?.[0] || null); setImageResult(null); setNotice(""); }}/>
          </div>
          <div className="qtInputRow"><label className="qtLabel">OUTPUT FORMAT<select className="qtInput" value={imageFormat} onChange={(e) => setImageFormat(e.target.value)}><option value="image/webp">WebP — smaller files</option><option value="image/jpeg">JPEG — compatible</option><option value="image/png">PNG — may be larger</option></select></label><label className="qtLabel">QUALITY · {Math.round(imageQuality * 100)}%<input className="qtRange" type="range" min="0.25" max="1" step="0.05" value={imageQuality} onChange={(e) => setImageQuality(Number(e.target.value))}/></label></div>
          <div className="qtActions"><button className="qtPrimary" onClick={compressImage} disabled={!imageFile || imageBusy}>{imageBusy ? "Compressing…" : "Compress image"}</button><button className="qtSecondary" onClick={downloadImage} disabled={!imageResult}><Download size={15}/> Download</button><button className="qtSecondary" onClick={() => { setImageFile(null); setImageResult(null); setNotice(""); if(fileRef.current) fileRef.current.value = ""; }}><RotateCcw size={15}/> Reset</button></div>
          {imageResult && <div className="qtImageResult"><img src={imageResult.url} alt="Compressed preview"/><div><strong>{imageResult.width} × {imageResult.height}</strong><span>{(imageResult.size / 1024).toFixed(1)} KB output</span>{imageFile && <span>{(imageFile.size / 1024).toFixed(1)} KB original</span>}</div></div>}
          <p className="qtHint">Image processing happens on your device. Large images may take longer on mobile.</p>
        </>}
        {output && active !== "markdown" && active !== "image" && active !== "color" && <label className="qtLabel qtOutputLabel">OUTPUT<textarea className="qtTextarea qtCode" value={output} onChange={(e) => setOutput(e.target.value)} readOnly={active !== "text"}/></label>}
        {notice && <div className={notice.toLowerCase().includes("invalid") || notice.toLowerCase().includes("error") || notice.toLowerCase().includes("could not") ? "qtNotice error" : "qtNotice"}><Check size={15}/>{notice}</div>}
        <div className="qtFootnote"><Wrench size={14}/> Built into Dbweb · Processed locally where possible</div>
      </section>
    </div>
    <div className="qtBottomGrid">{toolItems.filter((item) => item.id !== active).slice(0, 3).map(({id, name, detail, Icon}) => <button key={id} className="qtSuggestion" onClick={() => { setActive(id); setNotice(""); setOutput(""); window.history.replaceState({}, "", "?tool=" + id); }}><Icon size={18}/><span><strong>{name}</strong><small>{detail}</small></span><ArrowLeft size={15} className="qtSuggestionArrow"/></button>)}</div>
  </main>;
}
