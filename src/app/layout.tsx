import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
import { siteConfig } from "@/config/site";
import "./globals.css";

// Same typeface and weights as the Mithren Agro storefront.
const poppins = Poppins({ variable: "--font-poppins", subsets: ["latin"], weight: ["400", "500", "600"] });

export const metadata: Metadata = {
  title: { default: siteConfig.productName, template: `%s | ${siteConfig.productName}` },
  description: "Frontend-only Super Admin demo for the Mithren Agro organic fruits and vegetables marketplace. Mock data only.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#2E7D32" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN" className={`${poppins.variable} h-full`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
