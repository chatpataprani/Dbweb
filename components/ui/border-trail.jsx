"use client";

/* Animata Animated Border Trail — adapted from its documented copy/paste component.
   Uses a typed CSS angle property so the trail animates without extra packages. */
export default function BorderTrail({ children, className = "", duration = "8s", trailColor = "var(--ac)" }) {
  return (
    <div className={`dbwBorderTrail ${className}`}>
      <div
        className="dbwBorderTrail__beam"
        aria-hidden="true"
        style={{
          animationDuration: duration,
          background: `conic-gradient(from var(--dbw-border-angle) at 50% 50%, transparent 0 78%, ${trailColor} 91%, #55b8ad 97%, transparent 100%)`,
        }}
      />
      <div className="dbwBorderTrail__inner">{children}</div>
    </div>
  );
}
