"use client";

import { ArrowUpRight } from "lucide-react";

/* Skiper UI CssLink-style underline reveal, used for simple navigation links. */
export default function SkiperLink({ href, children, className = "" }) {
  return (
    <a className={`skiperLink ${className}`} href={href}>
      <span>{children}</span>
      <ArrowUpRight size={14} aria-hidden="true" />
    </a>
  );
}
