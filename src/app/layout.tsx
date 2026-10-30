import type { Metadata, Viewport } from "next";
import { Montserrat, Playfair_Display } from "next/font/google";
import { brandAssets } from "@/config/brand";
import { siteConfig } from "@/config/site";
import "./globals.css";

// Same typefaces and loading options as the Mithren Agro customer app (next/font/google, self-hosted
// at build time). Both are variable fonts, so one file per family covers every weight.
// Montserrat: body and every interface element. Playfair Display: page, section and dialog headings.
const montserrat = Montserrat({ variable: "--font-montserrat", subsets: ["latin"] });
const playfairDisplay = Playfair_Display({ variable: "--font-playfair-display", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: siteConfig.productName, template: `%s | ${siteConfig.productName}` },
  description: "Frontend-only Super Admin demo for the Mithren Agro organic fruits and vegetables marketplace. Mock data only.",
  robots: { index: false, follow: false },
  // Finalized compact square logo, served unmodified from public/Mithren_Agro_Logos.
  icons: { icon: [{ url: brandAssets.squareIcon, type: "image/png" }], apple: [{ url: brandAssets.squareIcon, type: "image/png" }] },
};

export const viewport: Viewport = { themeColor: "#2E7D32" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN" className={`${montserrat.variable} ${playfairDisplay.variable} h-full`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
