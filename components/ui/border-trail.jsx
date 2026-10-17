"use client";

export default function BorderTrail({ children, className = "" }) {
  return (
    <div className={`dbwBorderTrail ${className}`}>
      <span className="dbwBorderTrail__beam" aria-hidden="true" />
      <div className="dbwBorderTrail__inner">{children}</div>
    </div>
  );
}
