import { ImageResponse } from "next/og";
import { MARK_SVG, svgDataUri } from "@/lib/brand";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  const src = svgDataUri(MARK_SVG);
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#fff6e3" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} width={156} height={156} alt="" />
      </div>
    ),
    size,
  );
}
