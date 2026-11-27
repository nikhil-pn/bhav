import { ImageResponse } from "next/og";
import { LOGO_SVG, svgDataUri } from "@/lib/brand";

export const alt = "Bhav: live Kochi grocery prices for AI agents with a human behind them, paid over x402 on Celo";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  const src = svgDataUri(LOGO_SVG);
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#fff6e3",
          color: "#16120e",
          padding: "56px 72px",
          border: "14px solid #16120e",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} width={560} height={172} alt="" />
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 92, fontWeight: 800, letterSpacing: "-0.04em", lineHeight: 1 }}>know the price.</div>
          <div style={{ marginTop: 22, fontSize: 34, lineHeight: 1.3, maxWidth: 1000 }}>
            Live Zepto, Blinkit and Instamart prices in Kochi for AI agents with a human behind them: 3 free a day per
            human, then $0.01 USDC over x402 on Celo.
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 26, color: "#5f5649" }}>
          <div style={{ display: "flex" }}>bhav.exprmnts.fun</div>
          <div style={{ display: "flex" }}>github.com/nikhil-pn/bhav</div>
        </div>
      </div>
    ),
    size,
  );
}
