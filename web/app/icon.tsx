import { ImageResponse } from "next/og";
import { MARK_SVG, svgDataUri } from "@/lib/brand";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  const src = svgDataUri(MARK_SVG);
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} width={64} height={64} alt="" />
      </div>
    ),
    size,
  );
}
