# Changelog — Box Cards Side by Side + Full Image + Price Fix

## Modified Files

---

### 1. `src/routes/boxes.index.tsx`

**Image:**
- Replaced `aspect-[3/2] sm:aspect-[4/3]` + `background: url() center/cover` with a fixed `aspect-[4/3]` container holding `<img className="h-full w-full object-contain">`.
- `object-contain` shows the full image with no cropping. The container is a uniform ratio so all cards are the same height.
- Neutral `bg-muted/40` fills any empty space around the image.

**Side by side:**
- Kept `grid-cols-2 sm:grid-cols-2 lg:grid-cols-3` — two columns on mobile, three on desktop. Cards are always side by side.

**Description removed:**
- Removed the description paragraph (`hidden line-clamp-2`) from the card entirely. Cards are compact and uniform.

**Price on all screen sizes:**
- Removed `hidden sm:inline` from the "Starting from" label — now rendered as a `block` line above the price, visible on every screen size including mobile.
- BYO box price computed as `lowestFlavorPrice × cookie_count` from `flavor_box_prices` (no change from previous task).

---

### 2. `src/routes/buildbox.tsx`

Identical set of fixes as `boxes.index.tsx`:
- `aspect-[4/3]` + `object-contain` image — full image, uniform card size.
- `grid-cols-2 lg:grid-cols-3` — always side by side.
- Description removed.
- "Starting from" label always visible.

---

### 3. `src/routes/index.tsx` (Home page)

**This file was not touched in any previous task — all changes are new.**

**Image (BoxCard):**
- Replaced `aspect-[3/2] sm:aspect-[4/3]` + `background-size: cover` with `aspect-[4/3]` + `<img object-contain>` — same fix as boxes pages.

**Description removed:**
- Removed `hidden line-clamp-2` description from the home page BoxCard.

**Price on all screen sizes:**
- Removed `hidden sm:inline` from "Starting from" label — always visible.

**BYO starting price computed correctly:**
- Added `fetchByoPriceRangePerBox` import.
- Added `useQuery(["byo-price-ranges"])` in both `BestSellers` and `OurProducts` sections (shared React Query cache — single network request).
- `BoxCard` now accepts a `priceRanges` prop and computes `displayPrice = lowestFlavorPrice × cookie_count` for BYO boxes, matching the logic in `boxes.index.tsx` and `buildbox.tsx`.
- Fixed boxes continue to show their stored `b.price`.

---

## Summary table

| Issue | Before | After |
|---|---|---|
| Image cropping | `background-size: cover` on fixed ratio | `object-contain` in same ratio — full image |
| Cards side by side | `grid-cols-1` (stacked, from previous fix) | `grid-cols-2 lg:grid-cols-3` (side by side) |
| Card size consistency | Variable height (natural image size) | Uniform `aspect-[4/3]` image area |
| Description | Truncated / hidden on mobile | Removed from card (keeps cards compact) |
| "Starting from" on mobile | `hidden sm:inline` (invisible) | `block` — always visible |
| Home page BYO price | Static `b.price` from box record | Computed `lowestFlavorPrice × cookie_count` |
| Home page image | `background-size: cover` (cropped) | `object-contain` (full image) |
