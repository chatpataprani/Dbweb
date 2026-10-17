"use client";

import { ArrowUpRight } from "lucide-react";

/* Skiper UI CssLink-style underline reveal, adapted from the free component.
   Source: https://skiper-ui.com/v1/skiper40 (Skiper UI attribution). */
export default function SkiperLink({ href, children, className = "" }) {
  return (
    <a className={`skiperLink ${className}`} href={href}>
      <span>{children}</span>
      <ArrowUpRight size={14} aria-hidden="true" />
    </a>
  );
}
