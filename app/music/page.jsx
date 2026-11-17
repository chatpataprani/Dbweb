"use client";

export default function DbwebMusic() {
  return (
    <main style={{ width: "100%", minHeight: "100dvh", margin: 0, padding: 0, background: "#101010", overflow: "hidden" }}>
      <iframe
        title="Dbweb Music"
        src="/dbweb-music-ui.html"
        style={{
          display: "block",
          width: "100%",
          height: "100dvh",
          minHeight: "100dvh",
          border: 0,
          background: "#101010",
        }}
        allow="autoplay; fullscreen; picture-in-picture"
        allowFullScreen
      />
    </main>
  );
}
