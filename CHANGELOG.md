# Changelog — Price Always Visible Fix

## Problem

BYO box prices showed as zero / hidden on all card views (mobile and desktop).

Root cause: price was computed from `flavor_box_prices` table. When that table
has no entry for a box, `startingPrice = 0` and the `displayPrice > 0` guard
hid the price block entirely.

## Fix (3 files, 1 line each)

### Priority order for BYO price (new):
1. flavor_box_prices min × cookie_count  (if set in DB)
2. b.price  (box's own stored price — fallback)
3. Nothing shown (only if both are 0)

### src/routes/boxes.index.tsx
Before: const displayPrice = isByo ? startingPrice : b.price;
After:  const displayPrice = isByo ? (startingPrice > 0 ? startingPrice : b.price) : b.price;

### src/routes/buildbox.tsx
Before: {startingPrice > 0 && <p>{formatCurrency(startingPrice)}</p>}
After:  displayPrice = startingPrice > 0 ? startingPrice : b.price; then show if > 0

### src/routes/index.tsx
Before: lowestFlavorPrice > 0 ? lowestFlavorPrice * cookie_count : 0
After:  lowestFlavorPrice > 0 ? lowestFlavorPrice * cookie_count : b.price

No other files changed.
