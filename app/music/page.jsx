"use client";

export default function DbwebMusic() {
  return (
    <iframe
      title="Dbweb Music"
      src="/dbweb-music-ui.html"
      style={{
        display: "block",
        width: "100%",
        height: "calc(100dvh - 76px)",
        minHeight: "620px",
        border: 0,
        background: "transparent",
      }}
      allow="autoplay; fullscreen; picture-in-picture"
      allowFullScreen
    />
  );
}
