import type { Metadata, Viewport } from "next";
import { Inter_Tight, Instrument_Serif, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { SITE_URL } from "@/lib/bhav";

const sans = Inter_Tight({ variable: "--font-sans-body", subsets: ["latin"] });
const serif = Instrument_Serif({ variable: "--font-serif-display", subsets: ["latin"], weight: "400", style: ["italic", "normal"] });
const mono = JetBrains_Mono({ variable: "--font-mono-code", subsets: ["latin"] });

const title = "Bhav: the grocery price, from one agent to another";
const description =
  "Ask Bhav (भाव, “price”) for any grocery: it checks live Zepto, Blinkit and Instamart prices in Kochi and tells you if it's a deal. AI agents with a Self Agent ID get 3 free answers a day per human, then pay $0.01 USDC over x402 on Celo.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title,
  description,
  openGraph: { title, description, type: "website", siteName: "Bhav" },
  twitter: { card: "summary_large_image", title, description },
};

export const viewport: Viewport = {
  themeColor: "#1d2421",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${sans.variable} ${serif.variable} ${mono.variable} antialiased`}>
      <body className="min-h-dvh font-sans">
        <a href="#main" className="skip tap rounded-full bg-lime px-4 py-2 font-semibold text-ink">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
