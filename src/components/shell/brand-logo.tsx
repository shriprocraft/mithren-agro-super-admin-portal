import Image from "next/image";
import { cn } from "cn";
import { siteConfig } from "@/config/site";

// The official Mithren Agro logo, copied unmodified from the customer storefront
// (public/images/mithren-agro-logo.png, 1254×1254 with an opaque white background and wide margins).
// As on the storefront, the frame shows only the artwork's bounding box (x 59–1194, y 289–879), so
// proportions and colours are preserved without editing the file. It is only placed on white surfaces,
// so the storefront's white-knockout filter is not needed.
const SOURCE = 1254;
const ART = { x: 59, y: 289, width: 1135, height: 590 };

export function BrandLogo({ className, preload = false }: { className?: string; preload?: boolean }) {
  return (
    <span className={cn("relative inline-block shrink-0 overflow-hidden", className)} style={{ aspectRatio: `${ART.width} / ${ART.height}` }}>
      <Image
        src="/images/mithren-agro-logo.png"
        alt={siteConfig.legalName}
        width={SOURCE}
        height={SOURCE}
        sizes="240px"
        preload={preload}
        className="absolute max-w-none"
        style={{
          width: `${(SOURCE / ART.width) * 100}%`,
          height: "auto",
          left: `${(-ART.x / ART.width) * 100}%`,
          top: `${(-ART.y / ART.height) * 100}%`,
        }}
      />
    </span>
  );
}
