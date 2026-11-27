import type { Metadata, Viewport } from "next";
import { Baloo_2, Bricolage_Grotesque, Inter_Tight, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { SITE_URL } from "@/lib/bhav";

const body = Inter_Tight({ variable: "--font-body", subsets: ["latin"] });
const disp = Bricolage_Grotesque({ variable: "--font-disp", subsets: ["latin"], weight: ["600", "700", "800"] });
const hindi = Baloo_2({ variable: "--font-hindi", subsets: ["devanagari"], weight: ["700", "800"] });
const code = JetBrains_Mono({ variable: "--font-code", subsets: ["latin"] });

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
  themeColor: "#fff6e3",
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${body.variable} ${disp.variable} ${hindi.variable} ${code.variable} antialiased`}
    >
      <body className="min-h-dvh font-sans">
        <a href="#main" className="skip pill tap bg-turmeric px-4 py-2 text-ink">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
