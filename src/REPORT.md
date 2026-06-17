# Fixed-Box Price-Not-Showing on First Load — Fix Report

## Symptom
On a fresh visit to the home page, fixed boxes show no price on their cards.
After opening a product detail page and going back, the price appears.

## Root Cause
`src/routes/index.tsx` → `BoxCard` only consumed `priceRanges[b.id]?.min`
(BYO range) and for fixed boxes fell back directly to `b.price`. The
`fixedPrice` field returned by `fetchByoPriceRangePerBox()` was IGNORED.

When a fixed box stores its real total in `flavor_box_prices + box_fixed_flavors`
(modern flow) instead of `boxes.price` (legacy column), `b.price = 0`, the
`displayPrice > 0` guard fails, and nothing renders.

The illusion of "it works after entering and leaving" came from React Query
caching `["byo-price-ranges"]` once the user visited any page that read it —
but the home BoxCard never used that field, so the visible fix on return was
actually unrelated (cached `b.price` rerender). The card logic itself was wrong.

The listing page `src/routes/boxes/index.tsx` already had the correct
formula; the home page diverged from it. Single source of truth restored.

## File Modified
- `src/routes/index.tsx` — `BoxCard` now reads `priceRanges[b.id]?.fixedPrice`
  for fixed boxes, mirroring `boxes.index.tsx`. Type widened to include
  `fixedPrice?: number`.

## Validation
- Mirrors the formula already used on `/boxes` listing.
- Falls back to `b.price` when `fixedPrice` is missing (legacy boxes still work).
- No business-logic change; pure UI read-path correction.

## How to Apply
Replace `src/routes/index.tsx` with the file in this archive.
No DB migration needed for this fix.
