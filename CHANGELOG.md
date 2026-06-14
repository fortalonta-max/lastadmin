# Changelog — BYO Box Starting Price Fix

## Modified Files

---

### 1. `src/routes/buildbox.tsx`

**What changed:**
- Imported `fetchByoPriceRangePerBox` from `@/lib/storefront`.
- Added a `useQuery` call for `["byo-price-ranges"]` that fetches the lowest (and highest) flavor price per box from the `flavor_box_prices` table.
- In the render loop, computed `startingPrice = lowestFlavorPrice × box.cookie_count` for each BYO box.
- Passed `startingPrice` as a new prop to `BoxCard` and replaced the previously displayed `b.price` with the computed `startingPrice`.
- `BoxCard` now displays "Starting from [startingPrice]" using the live computed value. If no flavor prices exist yet for a box, the price section is hidden (same as before when `price` was 0).

**Reason:**
The card was displaying `b.price` — a static field stored on the box record — instead of the dynamically computed minimum cost. The correct starting price must reflect what a customer would actually pay: the cheapest available flavor times the number of cookies in the box.

---

### 2. `src/routes/boxes.index.tsx`

**What changed:**
- Imported `fetchByoPriceRangePerBox` from `@/lib/storefront`.
- Added a `useQuery` call for `["byo-price-ranges"]` (same cache key as `buildbox.tsx`, so a single network request is shared between both pages).
- In the render loop, computed `startingPrice = lowestFlavorPrice × box.cookie_count` for BYO boxes. Fixed boxes are unaffected and continue to show `b.price`.
- Passed `startingPrice` as a new prop to `BoxCard`. Inside `BoxCard`, introduced `displayPrice`: for BYO boxes it uses `startingPrice`; for fixed boxes it uses `b.price`.
- The "Starting from" label is shown on BYO cards (unchanged), now backed by the correct computed price.

**Reason:**
The "All Boxes" listing page showed the same static `b.price` for BYO cards. Consistent with `buildbox.tsx`, it now shows the real computed starting price so customers see accurate pricing everywhere.

---

## Formula applied

```
startingPrice = lowestFlavorPrice × box.cookie_count
```

- `lowestFlavorPrice` — the minimum value from `flavor_box_prices` rows matching the box, returned by the existing `fetchByoPriceRangePerBox()` helper in `storefront.ts`.
- `box.cookie_count` — the number of cookies the box holds, already on the `Box` record.

`storefront.ts` was **not modified** — `fetchByoPriceRangePerBox()` already existed and returns exactly the data needed.

---

## Scope

Only BYO (`type === "byo"`) product cards are affected. Fixed-price boxes continue to display their stored `b.price` unchanged.
