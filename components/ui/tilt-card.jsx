"use client";

import { useRef } from "react";

export default function TiltCard({ href, className = "", children }) {
  const ref = useRef(null);
  function move(event) {
    if (!ref.current || event.pointerType === "touch" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const rect = ref.current.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    ref.current.style.setProperty("--card-rotate-y", `${(x - 0.5) * 5}deg`);
    ref.current.style.setProperty("--card-rotate-x", `${(0.5 - y) * 5}deg`);
    ref.current.style.setProperty("--pointer-x", `${x * 100}%`);
    ref.current.style.setProperty("--pointer-y", `${y * 100}%`);
  }
  function reset() {
    if (!ref.current) return;
    ref.current.style.setProperty("--card-rotate-y", "0deg");
    ref.current.style.setProperty("--card-rotate-x", "0deg");
  }
  return <a ref={ref} className={className} href={href} onPointerMove={move} onPointerLeave={reset}>{children}</a>;
}
