"use client";

import { useRef } from "react";

/* Aceternity UI Magnetic Button interaction, implemented without a new runtime dependency. */
export default function MagneticButton({ children, className = "", onClick, type = "button", active = false, strength = 0.16, maxDistance = 7, ...props }) {
  const ref = useRef(null);
  function move(event) {
    if (!ref.current || event.pointerType === "touch" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const rect = ref.current.getBoundingClientRect();
    const dx = event.clientX - rect.left - rect.width / 2;
    const dy = event.clientY - rect.top - rect.height / 2;
    const distance = Math.hypot(dx, dy) || 1;
    const scale = Math.min(1, maxDistance / distance);
    ref.current.style.transform = `translate(${dx * strength * scale}px, ${dy * strength * scale}px)`;
  }
  function reset() {
    if (ref.current) ref.current.style.transform = "";
  }
  return <button ref={ref} type={type} onClick={onClick} onPointerMove={move} onPointerLeave={reset} className={`dbwMagneticButton ${className}`} aria-pressed={active || undefined} {...props}>{children}</button>;
}
