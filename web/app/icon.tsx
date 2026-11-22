import { ImageResponse } from "next/og";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

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
          background: "#1d2421",
          borderRadius: 14,
          color: "#7ed854",
          fontSize: 46,
          fontWeight: 700,
          fontStyle: "italic",
        }}
      >
        b
      </div>
    ),
    size,
  );
}
