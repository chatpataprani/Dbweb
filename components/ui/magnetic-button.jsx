"use client";

import { useRef } from "react";

export default function MagneticButton({ children, className = "", onClick, type = "button", active = false, ...props }) {
  const ref = useRef(null);
  function move(event) {
    if (!ref.current || event.pointerType === "touch" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const rect = ref.current.getBoundingClientRect();
    const dx = event.clientX - rect.left - rect.width / 2;
    const dy = event.clientY - rect.top - rect.height / 2;
    ref.current.style.transform = `translate(${dx * 0.055}px, ${dy * 0.12}px)`;
  }
  function reset() {
    if (ref.current) ref.current.style.transform = "";
  }
  return <button ref={ref} type={type} onClick={onClick} onPointerMove={move} onPointerLeave={reset} className={`dbwMagneticButton ${className}`} aria-pressed={active || undefined} {...props}>{children}</button>;
}
