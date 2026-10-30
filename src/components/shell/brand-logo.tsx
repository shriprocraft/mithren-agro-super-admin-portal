import Image from "next/image";
import { cn } from "cn";
import { brandAssets } from "@/config/brand";
import { siteConfig } from "@/config/site";

// The finalized Mithren Agro logo (public/Mithren_Agro_Logos/Mithren_Agro_Pvt_Ltd_PNG.png), used
// unmodified. The file has a transparent background with a wide empty margin around the artwork, so
// the frame shows only the artwork's bounding box: proportions, colours and transparency are kept and
// the logo sits flush with surrounding layout. No container shape is added.
const { src, width, height, art } = brandAssets.logo;

export function BrandLogo({ className, preload = false, sizes = "420px" }: { className?: string; preload?: boolean; sizes?: string }) {
  return (
    <span className={cn("relative inline-block shrink-0 overflow-hidden", className)} style={{ aspectRatio: `${art.width} / ${art.height}` }}>
      <Image
        src={src}
        alt={siteConfig.legalName}
        width={width}
        height={height}
        sizes={sizes}
        preload={preload}
        className="absolute max-w-none"
        style={{
          width: `${(width / art.width) * 100}%`,
          height: "auto",
          left: `${(-art.x / art.width) * 100}%`,
          top: `${(-art.y / art.height) * 100}%`,
        }}
      />
    </span>
  );
}
