import { ImageResponse } from "next/og";

export const alt = "Bhav: grocery prices for agents, one fair quota per human, on Celo (work in progress)";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#1d2421",
          color: "#f2f0e8",
          padding: "72px 80px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 30, color: "#a3aca7" }}>
          <div style={{ width: 16, height: 16, borderRadius: 999, background: "#e3a63b" }} />
          work in progress · Celo · Agents Open for Business
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 140, fontWeight: 600, letterSpacing: "-0.05em", color: "#7ed854", lineHeight: 0.95 }}>
            know the bhav.
          </div>
          <div style={{ marginTop: 24, fontSize: 34, lineHeight: 1.3, maxWidth: 980 }}>
            A grocery agent for Indian households: Zepto, Blinkit and Instamart prices in Kochi, one fair quota per
            human, paid in USDC on Celo.
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 26, color: "#a3aca7" }}>
          <div style={{ display: "flex" }}>ERC-8004 agent #10088 · Self Agent ID #211</div>
          <div style={{ display: "flex" }}>github.com/nikhil-pn/bhav</div>
        </div>
      </div>
    ),
    size,
  );
}
