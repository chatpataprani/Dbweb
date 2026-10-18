'use client';

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Check, Download, ImagePlus, LoaderCircle, RefreshCw, Scissors, ShieldCheck, Sparkles, Upload, X } from "lucide-react";
import Link from "next/link";
import "../bg-remove/bg-remove.css";

const MODEL_ID = "onnx-community/BiRefNet-ONNX";
const FALLBACK_MODEL_ID = "onnx-community/BiRefNet_lite-ONNX";
const backgrounds = [
  { name: "Transparent", value: "transparent" },
  { name: "White", value: "#ffffff" },
  { name: "Black", value: "#111318" },
  { name: "Soft grey", value: "#e8eaf0" },
  { name: "Blue", value: "#dce9ff" },
  { name: "Mint", value: "#d9f5e9" },
];

export default function BackgroundRemoverPage() {
  const inputRef = useRef(null);
  const originalRef = useRef(null);
  const outputCanvasRef = useRef(null);
  const modelRef = useRef(null);
  const processorRef = useRef(null);
  const fallbackActiveRef = useRef(false);
  const originalUrlRef = useRef("");
  const outputUrlRef = useRef("");
  const [file, setFile] = useState(null);
  const [originalUrl, setOriginalUrl] = useState("");
  const [outputUrl, setOutputUrl] = useState("");
  const [status, setStatus] = useState("idle");
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const [background, setBackground] = useState("transparent");
  const [feather, setFeather] = useState(0.8);
  const [showOriginal, setShowOriginal] = useState(false);
  const [modelReady, setModelReady] = useState(false);

  useEffect(() => () => {
    if (originalUrlRef.current) URL.revokeObjectURL(originalUrlRef.current);
    if (outputUrlRef.current) URL.revokeObjectURL(outputUrlRef.current);
  }, []);

  const chooseFile = useCallback((nextFile) => {
    if (!nextFile) return;
    if (!nextFile.type.startsWith("image/")) {
      setError("Choose an image file such as JPG, PNG or WebP.");
      return;
    }
    if (nextFile.size > 20 * 1024 * 1024) {
      setError("This image is over 20 MB. Choose a smaller image for reliable browser processing.");
      return;
    }
    if (originalUrlRef.current) URL.revokeObjectURL(originalUrlRef.current);
    if (outputUrlRef.current) URL.revokeObjectURL(outputUrlRef.current);
    const nextUrl = URL.createObjectURL(nextFile);
    originalUrlRef.current = nextUrl;
    outputUrlRef.current = "";
    setFile(nextFile);
    setOriginalUrl(nextUrl);
    setOutputUrl("");
    setShowOriginal(false);
    setError("");
    setStatus("idle");
  }, []);

  async function loadModel() {
    if (modelRef.current && processorRef.current) return;
    if (typeof navigator === "undefined" || !navigator.gpu) {
      throw new Error("WebGPU is not available on this device.");
    }
    setProgress("Preparing on-device background removal…");
    const { AutoModel, AutoProcessor, env } = await import("@huggingface/transformers");
    env.allowLocalModels = false;
    env.useBrowserCache = true;
    const [model, processor] = await Promise.all([
      AutoModel.from_pretrained(MODEL_ID, { dtype: "fp16", device: "webgpu" }),
      AutoProcessor.from_pretrained(MODEL_ID),
    ]);
    modelRef.current = model;
    processorRef.current = processor;
    fallbackActiveRef.current = false;
    setModelReady(true);
  }

  async function removeBackground() {
    if (!file || status === "processing") return;
    setStatus("processing");
    setError("");
    setProgress("Removing the background…");

    // Try WebGPU on the user's device first. Any unsupported device, model-load
    // issue, or inference failure silently falls through to the online service.
    try {
      await loadModel();
      setProgress("Preparing image…");
      const { RawImage } = await import("@huggingface/transformers");
      const image = await RawImage.fromURL(originalUrl);
      const { pixel_values } = await processorRef.current(image);
      setProgress("Finding fine edges and foreground details…");
      const prediction = await modelRef.current({ input_image: pixel_values });
      const mask = await RawImage.fromTensor(
        prediction.output_image[0].sigmoid().mul(255).to("uint8")
      );
      const resizedMask = mask.resize(image.width, image.height);
      setProgress("Finishing transparent cutout…");
      const sourceImage = new Image();
      sourceImage.src = originalUrl;
      await new Promise((resolve, reject) => {
        sourceImage.onload = resolve;
        sourceImage.onerror = reject;
      });
      const width = sourceImage.naturalWidth;
      const height = sourceImage.naturalHeight;
      const sourceCanvas = document.createElement("canvas");
      sourceCanvas.width = width;
      sourceCanvas.height = height;
      const sourceContext = sourceCanvas.getContext("2d", { willReadFrequently: true });
      sourceContext.drawImage(sourceImage, 0, 0, width, height);
      const sourcePixels = sourceContext.getImageData(0, 0, width, height);
      const maskCanvas = document.createElement("canvas");
      maskCanvas.width = width;
      maskCanvas.height = height;
      const maskContext = maskCanvas.getContext("2d", { willReadFrequently: true });
      const maskImageData = maskContext.createImageData(width, height);
      const channels = resizedMask.channels || 1;
      for (let i = 0; i < width * height; i++) {
        const value = resizedMask.data[i * channels];
        const p = i * 4;
        maskImageData.data[p] = value;
        maskImageData.data[p + 1] = value;
        maskImageData.data[p + 2] = value;
        maskImageData.data[p + 3] = 255;
      }
      maskContext.putImageData(maskImageData, 0, 0);
      const refinedCanvas = document.createElement("canvas");
      refinedCanvas.width = width;
      refinedCanvas.height = height;
      const refinedContext = refinedCanvas.getContext("2d", { willReadFrequently: true });
      refinedContext.filter = feather > 0 ? `blur(${feather}px)` : "none";
      refinedContext.drawImage(maskCanvas, 0, 0);
      const alpha = refinedContext.getImageData(0, 0, width, height).data;
      for (let i = 0; i < width * height; i++) {
        sourcePixels.data[i * 4 + 3] = alpha[i * 4];
      }
      const outputCanvas = outputCanvasRef.current;
      outputCanvas.width = width;
      outputCanvas.height = height;
      outputCanvas.getContext("2d").putImageData(sourcePixels, 0, 0);
      const localBlob = await new Promise((resolve) => outputCanvas.toBlob(resolve, "image/png"));
      if (!localBlob) throw new Error("Could not create transparent PNG.");
      if (outputUrlRef.current) URL.revokeObjectURL(outputUrlRef.current);
      const nextOutput = URL.createObjectURL(localBlob);
      outputUrlRef.current = nextOutput;
      setOutputUrl(nextOutput);
      setStatus("done");
      setProgress("");
      return;
    } catch (localError) {
      // Do not expose WebGPU compatibility errors to the user; use the API next.
      console.info("On-device background removal unavailable; switching to online processing.");
    }

    try {
      setProgress("Finishing your cutout…");
      const form = new FormData();
      form.append("image", file, file.name || "image");
      const response = await fetch("/api/bg-remove", { method: "POST", body: form });
      if (!response.ok) {
        const details = await response.json().catch(() => ({}));
        throw new Error(details.error || "Online background removal is temporarily unavailable.");
      }
      const blob = await response.blob();
      if (!blob.type.startsWith("image/")) throw new Error("The service returned an invalid image.");
      if (outputUrlRef.current) URL.revokeObjectURL(outputUrlRef.current);
      const nextOutput = URL.createObjectURL(blob);
      outputUrlRef.current = nextOutput;
      setOutputUrl(nextOutput);
      setStatus("done");
      setProgress("");
    } catch (e) {
      console.error("Dbweb background removal failed", e);
      setError(e?.message || "Background removal is temporarily unavailable. Please try again.");
      setStatus("error");
      setProgress("");
    }
  }

  function downloadResult() {
    if (!outputUrl) return;
    const a = document.createElement("a");
    a.href = outputUrl;
    const baseName = (file?.name || "image").replace(/\.[^.]+$/, "");
    a.download = `${baseName}-dbweb-transparent.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function reset() {
    if (originalUrlRef.current) URL.revokeObjectURL(originalUrlRef.current);
    if (outputUrlRef.current) URL.revokeObjectURL(outputUrlRef.current);
    originalUrlRef.current = "";
    outputUrlRef.current = "";
    setFile(null);
    setOriginalUrl("");
    setOutputUrl("");
    setStatus("idle");
    setProgress("");
    setError("");
    setShowOriginal(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  return <div className="bgRemovePage">
    <header className="bgTopbar">
      <Link className="bgBrand" href="/"><span className="bgBrandMark"><Scissors size={18}/></span><span>Dbweb <b>Lab</b><small>IMAGE TOOLS</small></span></Link>
      <Link href="/" className="bgBack"><ArrowLeft size={16}/> Back to Dbweb</Link>
    </header>
    <main className="bgMain">
      <section className="bgHero">
        <div className="bgEyebrow"><Sparkles size={14}/> IMAGE TOOL <span>•</span> TRANSPARENT PNG</div>
        <h1>Backgrounds out.<br/><span>Details stay.</span></h1>
        <p>Remove image backgrounds with on-device processing when supported, with automatic online fallback when needed.</p>
        <div className="bgTrust"><span><ShieldCheck size={15}/> Automatic device fallback</span><span><Check size={15}/> Transparent PNG export</span></div>
      </section>
      <section className="bgWorkspace">
        <div className="bgWorkspaceHead"><div><span className="bgStep">01</span><div><h2>Choose your image</h2><p>Portraits, products, pets and more</p></div></div>{file&&<button className="bgIconButton" onClick={reset} aria-label="Start over"><RefreshCw size={16}/></button>}</div>
        {!originalUrl ? <button className="bgDropzone" onClick={()=>inputRef.current?.click()} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();chooseFile(e.dataTransfer.files?.[0]);}}>
          <div className="bgUploadHero"><span className="bgUploadIcon"><ImagePlus size={26}/></span><strong>Browse image to upload!</strong><span>Tap here to open your device files</span><small>JPG, PNG or WebP · Up to 20 MB</small></div><div className="bgUploadFooter"><Upload size={17}/><span>{file?.name || "No file selected"}</span><span aria-hidden="true">{file ? "✓" : ""}</span></div>
        </button> : <div className="bgPreviewWrap"><div className="bgPreview" style={{background:background==="transparent"?"repeating-conic-gradient(#e6e8ee 0% 25%,#fff 0% 50%) 50% / 18px 18px":background}}><img src={showOriginal?originalUrl:outputUrl||originalUrl} alt={showOriginal?"Original image":outputUrl?"Background removed preview":"Image awaiting background removal"}/></div><div className="bgPreviewFooter"><span>{showOriginal?"Original image":outputUrl?"Transparent cutout":"Original preview"}</span>{outputUrl&&<button className="bgTextButton" onClick={()=>setShowOriginal(v=>!v)}>{showOriginal?"View result":"Compare original"}</button>}</div></div>}
        <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp,image/avif" hidden onChange={e=>chooseFile(e.target.files?.[0])}/>
        {error&&<div className="bgError"><X size={16}/><span>{error}</span></div>}
        {progress&&<div className="bgProgress"><LoaderCircle className="bgSpin" size={18}/><div><strong>{progress}</strong><span>{modelReady?"On-device processing ready": "If on-device processing is unavailable, Dbweb switches automatically to online processing."}</span></div></div>}
        <div className="bgActions">{!outputUrl?<button className="bgPrimary" disabled={!file||status==="processing"} onClick={removeBackground}>{status==="processing"?<><LoaderCircle className="bgSpin" size={17}/> Working…</>:<><Sparkles size={17}/> Remove background</>}</button>:<button className="bgPrimary" onClick={downloadResult}><Download size={17}/> Download transparent PNG</button>}{outputUrl&&<button className="bgSecondary" onClick={reset}>New image</button>}</div>
        {outputUrl&&<div className="bgControls"><div className="bgControlHead"><div><h3>Preview background</h3><p>Background choice changes the preview, not your transparent PNG.</p></div></div><div className="bgSwatches">{backgrounds.map(item=><button key={item.value} className={"bgSwatch "+(background===item.value?"selected":"")} onClick={()=>setBackground(item.value)} aria-label={item.name} title={item.name}><span style={{background:item.value==="transparent"?"repeating-conic-gradient(#cfd2da 0% 25%,#fff 0% 50%) 50% / 10px 10px":item.value}}/>{item.name}</button>)}</div><label className="bgSliderLabel"><span>Edge softness</span><strong>{feather.toFixed(1)} px</strong><input type="range" min="0" max="2.5" step="0.1" value={feather} onChange={e=>setFeather(Number(e.target.value))}/><small>Edge softness applies when you process the image again.</small></label><button className="bgSecondary bgReprocess" onClick={removeBackground} disabled={status==="processing"}><RefreshCw size={15}/> Reprocess with edge setting</button></div>}
      </section>
      <section className="bgInfoGrid"><article><span>01</span><h3>On-device first</h3><p>Careful edge detection helps preserve details around hair, fur and object edges.</p></article><article><span>02</span><h3>Automatic fallback</h3><p>On-device WebGPU is tried first. If it cannot run, Dbweb automatically uses online processing.</p></article><article><span>03</span><h3>Easy export</h3><p>Export a transparent PNG without third-party logos or watermarks.</p></article></section>
    </main>
    <footer className="bgFooter">Dbweb Lab <span>·</span> Tools for your creative workflow</footer>
    <canvas ref={outputCanvasRef} hidden/>
  </div>;
}
