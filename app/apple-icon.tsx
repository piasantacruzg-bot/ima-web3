import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// Generated apple-touch-icon for "Add to Home Screen" on iOS.
export default function AppleIcon() {
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
          fontSize: 120,
          fontWeight: 800,
          letterSpacing: -4,
          fontFamily: "sans-serif",
        }}
      >
        a
      </div>
    ),
    { ...size }
  );
}
