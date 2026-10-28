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

## Spacing and typography scale (admin)

Defined in `src/config/design-tokens.ts` (`spacing`, `typography`) and applied through the shared
components (`PageHeader`, `Card`, `Toolbar`, `Field`, `FilterSelect`, `DataTable`, header, sidebar),
so individual pages do not add one-off margins.

| Use | Value | Where |
|---|---|---|
| Page gutter | 16 / 24 / 32 px (mobile / tablet / desktop) | `main` |
| Page title → content | 24 px (28 px from lg) | `PageHeader` |
| Between sections / cards | 24 px; metric cards 16 px | page grids |
| Card padding | 16 px / 20 px | `Card` |
| Filter controls | 12 px gap; label → control 6 px | `Toolbar`, `FilterSelect`, `SearchField` |
| Form fields | 16 px gap | dialogs, forms |
| Control height | 44 px (dense table buttons 36 px) | buttons, inputs, selects |
| Header | ≥ 72 px; breadcrumb 13 px → title 18 px semibold, 4 px apart | `admin-shell.tsx` |
| Sidebar brand | 24 px padding, logo 156 px wide, badge 10 px below, divider | `SidebarBrand` |
| Page title | 26 → 30 px semibold | `PageHeader` |
| Labels | 13 px medium (table headers 13 px semibold), sentence case | filters, fields, tables, detail lists |
| Helper text | 12 px; nothing below 11 px | hints, metadata, badges |

Uppercase is kept only for the "Super Admin" role badge and the matching login eyebrow.

## Scrollbars

| Surface | Treatment |
|---|---|
| Document (page) | Scrollbar hidden (`html { scrollbar-width: none }` + `::-webkit-scrollbar { display: none }`), as on the storefront. Wheel, trackpad, keyboard and touch scrolling are unchanged; overflow is never set to hidden. |
| Sidebar, drawers, dialogs, menus, tab strips | `scrollbar-subtle`: thin, thumb visible only on hover/focus |
| Wide tables (horizontal scroll) | `scrollbar-thin`: slim, always visible so extra columns stay discoverable |

## Dropdowns

Filters, the report picker and the date range use the branded Radix `Select` (`src/components/ui/select.tsx`,
ported from the storefront): white pill trigger, green focus ring and open state, portalled floating
menu (never clipped, kept inside the viewport with 12 px collision padding), `bg-soft` hover,
`bg-secondary` + check for the selected option, keyboard and typeahead support, Escape / outside-click
to close. Short in-dialog form selects remain native `<select>` styled like inputs.

## Administrative adaptations (not a separate brand)

- The storefront's glass surfaces are not used. The admin panel uses opaque cards for dense data.
- Tables, filter toolbars, drawers and metric cards are new administrative patterns built only
  from the tokens above.
- `tests/utilities.test.ts → brand design tokens` fails if the CSS variables drift from
  `src/config/design-tokens.ts`, if the primary colours change, or if a component uses a raw hex
  colour or a Tailwind palette colour.
