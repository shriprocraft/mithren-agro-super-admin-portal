# Design tokens and brand mapping

The Super Admin panel reuses the brand identity of the existing Mithren Agro customer storefront.
I inspected a local copy of the storefront at `../mithren-agro-customer` (read-only, nothing
modified), mainly `src/config/design-tokens.ts`, `src/app/globals.css`,
`docs/DESIGN_SYSTEM.md`, `src/components/ui/*` and `src/components/layout/BrandMark.tsx`.

Values below are **copied, not provisional**, unless marked otherwise.

## Assets

| Asset | Source | Admin location | Notes |
|---|---|---|---|
| Logo | `mithren-agro-customer/public/images/mithren-agro-logo.png` (1254×1254, owner-supplied) | `public/images/mithren-agro-logo.png` | Copied unmodified. `BrandLogo` crops to the artwork bounding box with the same coordinates as the storefront's `BrandMark` (x 59–1194, y 289–879) and keeps the original proportions. It is used on the login page, in the sidebar, on the not-found page and in Settings. |
| Favicon | `mithren-agro-customer/src/app/favicon.ico` | `src/app/favicon.ico` | Copied unmodified. |
| Product images | `mithren-agro-customer/public/images/studio/products/*` | `public/images/products/*` | 10 fruit and vegetable studio images reused for demo listings. See `docs/IMAGE_CREDITS.md`. |
| Light/dark logo variants | None exist in the storefront | — | Not created. The logo is only placed on white surfaces. |

## Colour tokens

| Role | Storefront token | Value | Admin CSS variable / utility | Admin use |
|---|---|---|---|---|
| Primary brand | `primary` | `#2E7D32` | `--primary` / `bg-primary` | Primary buttons, active nav indicator, links, focus ring |
| Primary hover | `primaryHover` | `#1B5E20` | `--primary-hover` | Button hover, text on tinted surfaces |
| Primary pressed | `primaryActive` | `#154A19` | `--primary-active` | Pressed state |
| Accent green | `accentGreen` | `#A7D96C` | `--accent-green` | Decorative only (not used as text) |
| Warm highlight | `highlight` | `#FFD88A` | `--highlight` | Star rating fill |
| Logo gold | `gold` | `#F5A51C` | — | Not used for actions: the storefront reserves it for "Buy now" |
| Canvas | `background` | `#FFFFFF` | `--background`, `--card` | Cards, sidebar, header, dialogs |
| Soft background | `softBackground` | `#F5FDF7` | `--soft` / `bg-soft` | Admin content canvas, hover rows |
| Card tint | `secondary` | `#F0F9F4` | `--secondary` | Table header band, selected nav, chips |
| Border | `border` | `#E8F1EA` | `--border` | Card hairlines, dividers |
| Input border | `inputBorder` | `#7A8C7D` | `--input` | Form-control outlines (3.57:1) |
| Main text | `textPrimary` | `#1F2D21` | `--foreground` | Headings, body |
| Secondary text | `textMuted` | `#667085` | `--muted-foreground` | Helper text, metadata |
| Success | `success` | `#2E7D32` | `--success` | Status badges (always with icon and text) |
| Warning | `warning` | `#B54708` | `--warning` | Pending states, "Needs clarification" |
| Error | `error` | `#B42318` | `--destructive` | Destructive actions, failures |
| Information | `info` | `#175CD3` | `--info` | Demo notices, info badges |

No new brand colours were added. Status badges use the storefront's semantic colours at 10% opacity
for their fills.

## Typography, shape, elevation, focus

| Token | Storefront | Admin |
|---|---|---|
| Typeface | Poppins 400/500/600 (`next/font/google`) | Same |
| Page title | 26px mobile → 30px+ | 26px → 28px (`text-[1.625rem] sm:text-[1.75rem]`) |
| Radii | cards `rounded-2xl`, panels `rounded-3xl`, controls pill | Same |
| Card surface | `surface-card` utility (hairline + one soft green-tinted shadow) | Same utility, copied |
| Primary surface | `surface-primary` utility | Same utility, copied |
| Shadow tint | `31 45 33` (Deep Heading Green) | Same |
| Focus | Solid 2px `#2E7D32` ring with offset | Same (`focus-visible:ring-2 ring-ring`) |
| Buttons | Pill, ≥ 44px, variants default/outline/secondary/ghost/destructive/link | Same variants, plus `sm` (36px) for dense table rows and `destructive-solid` for final destructive confirmations |
| Icons | Lucide | Lucide |

## Administrative adaptations (not a separate brand)

- The storefront's glass surfaces are not used. The admin panel uses opaque cards for dense data.
- Tables, filter toolbars, drawers and metric cards are new administrative patterns built only
  from the tokens above.
- `tests/utilities.test.ts → brand design tokens` fails if the CSS variables drift from
  `src/config/design-tokens.ts`, if the primary colours change, or if a component uses a raw hex
  colour or a Tailwind palette colour.
