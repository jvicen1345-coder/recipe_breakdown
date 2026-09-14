import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

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
          background: "linear-gradient(135deg, #ff9a76 0%, #b0596f 100%)",
          color: "white",
          fontFamily: 'Georgia, "Times New Roman", serif',
          fontSize: 92,
          fontWeight: 700,
          letterSpacing: -3,
        }}
      >
        CE
      </div>
    ),
    { ...size },
  );
}
