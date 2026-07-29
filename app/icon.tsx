import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

// Generated app icon (used as favicon + PWA/manifest icon).
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg,#7c5cff 0%,#5b8def 55%,#4cc9f0 100%)",
          color: "white",
          fontSize: 340,
          fontWeight: 800,
          letterSpacing: -10,
          fontFamily: "sans-serif",
        }}
      >
        a
      </div>
    ),
    { ...size }
  );
}
