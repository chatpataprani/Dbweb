"use client";

import { useEffect } from "react";

// Lightweight pointer spotlight inspired by Aceternity UI's Card Spotlight,
// Animata's interactive cards, and Skiper UI's CSS-first hover interactions.
// It uses native browser events so Dbweb does not need another animation package.
const SURFACES = [
  ".toolHubCard",
  ".toolHubFilters button",
  ".app .primary",
  ".app .secondary",
  ".adminDashboard .adminTabs > *",
  ".bgRemovePage .bgPrimary",
  ".bgRemovePage .bgSecondary",
  ".steamPage .steamBuyButton",
  ".igPage .igSearch",
  ".quickToolsPage .qtPrimary",
  ".quickToolsPage .qtSecondary",
  ".app .card",
  ".app .plan",
  ".app .historyRow",
  ".adminDashboard .adminStats > *",
  ".adminDashboard .adminItem",
  ".adminDashboard .adminDevice",
  ".adminDashboard .adminPaymentInfo",
  ".bgRemovePage .bgWorkspace",
  ".bgRemovePage .bgInfoGrid > *",
  ".streamPage .streamCard",
  ".steamPage .steamCard",
  ".steamPage .steamPremiumGate",
  ".steamPage .steamPromo",
  ".igPage .igResult",
  ".igPage .igStats > *",
  ".quickToolsPage .qtWorkspace",
  ".quickToolsPage .qtSuggestion",
  ".quickToolsPage .qtSidebar",
].join(",");

export default function SpotlightSurfaces() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const getSurface = (target) =>
      target instanceof Element ? target.closest(SURFACES) : null;

    const onPointerMove = (event) => {
      if (event.pointerType === "touch") return;
      const surface = getSurface(event.target);
      if (!surface) return;

      const rect = surface.getBoundingClientRect();
      surface.style.setProperty("--ui-spotlight-x", `${event.clientX - rect.left}px`);
      surface.style.setProperty("--ui-spotlight-y", `${event.clientY - rect.top}px`);
      surface.classList.add("ui-spotlight-surface", "ui-spotlight-active");
    };

    const onPointerOut = (event) => {
      const surface = getSurface(event.target);
      if (!surface || surface.contains(event.relatedTarget)) return;
      surface.classList.remove("ui-spotlight-active");
    };

    document.addEventListener("pointermove", onPointerMove, { passive: true });
    document.addEventListener("pointerout", onPointerOut, { passive: true });

    return () => {
      document.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerout", onPointerOut);
    };
  }, []);

  return null;
}
