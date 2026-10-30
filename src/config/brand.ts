// Finalized Mithren Agro brand assets (public/Mithren_Agro_Logos, public/Mithren_Agro_Hero_*). They are
// referenced here once and used unmodified everywhere: no copies, crops, recolouring or re-encoding.
//
// Variants in public/Mithren_Agro_Logos (all RGBA PNG):
//   *_PNG.png        transparent background, artwork centred in a wide empty margin → light surfaces
//   *_landscape.png  opaque black 2426×1364 canvas                                    → dark surfaces only
//   *_square.png     Mithren_square / Pvt_Ltd_square: opaque black 2048×2048 tile     → icons
// The app is white, so in-app branding uses the transparent "Pvt Ltd" lockup (matches the legal name).

export const brandAssets = {
  /** Transparent "MITHREN / AGRO PVT LTD" lockup, 2048×1365. Rendered at ~1.75× the visible frame width. */
  logo: {
    src: "/Mithren_Agro_Logos/Mithren_Agro_Pvt_Ltd_PNG.png",
    width: 2048,
    height: 1365,
    /** Bounding box of the visible artwork (measured from the alpha channel). */
    art: { x: 438, y: 425, width: 1173, height: 504 },
  },
  /** Compact square tile for the favicon / touch icon. */
  squareIcon: "/Mithren_Agro_Logos/Mithren_square.png",
  hero: { src: "/Mithren_Agro_Hero_6K_6000x3375.png", width: 6000, height: 3375 },
} as const;

export const developerCredit = { label: "Shri Pro Craft", href: "https://shriprocraft.com/" } as const;
