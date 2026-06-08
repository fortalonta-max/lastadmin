# CHANGELOG — Round 5 (Cumulative)

All changes are **frontend only**. No backend, API, auth, or order-processing logic was modified.

> **DB migration required for Sale Price feature:** Add column `sale_enabled boolean default false` to the `boxes` table in Supabase before using the sale price toggle in the Admin → Boxes editor.

---

## Summary of All Changes (Rounds 4 + 5 + 5b)

| # | Requirement | Status |
|---|---|---|
| 1 | Logo size increased (~2×) | Done |
| 2 | Nav: removed "Reviews", replaced "FAQ"+"Flavors" with single "Build Box" link | Done |
| 3 | Product navigation: BYO boxes open their own detail page | Done |
| 4 | Product visibility: all boxes appear in /boxes | Done |
| 5 | Admin Products section | Already present — no change needed |
| 6 | Floating WhatsApp button | Done |
| 7 | Nav "Flavors" → "Build Box" | Done |
| 8 | BYO boxes show "Starting from [price]" | Done |
| 9 | Admin: enable/disable Sale Price per box | Done (requires DB migration) |
| 10 | Sale price display: crossed-out + current price | Done |
| 11 | Free shipping at 750 EGP | Done |

---

## Modified Files

### `src/components/site-chrome.tsx`

**Logo (~2× larger):**
- Image variant: `h-12 w-auto max-w-[180px]` → `h-20 w-auto max-w-[240px]`
- Text-fallback icon: `h-11 w-11 text-xl` → `h-16 w-16 text-3xl`
- Text-fallback store name: `text-2xl` → `text-3xl`
- Logo gap: `gap-2.5` → `gap-3`

**Navigation links (final state):**
The original 6-item nav `[Home, Boxes, Flavors, Reviews, FAQ, Contact]` is now:
`[Home, Boxes, Build Box (/buildbox), Contact]`
- Removed "Reviews" and "FAQ"
- Replaced "Flavors" with "Build Box" → `/buildbox`
- Both desktop nav and mobile drawer draw from the same `links` array

**Floating WhatsApp button (`WhatsAppFloatingButton`):**
- New exported component using inline WhatsApp SVG
- Reads `settings.whatsapp_number` from the cached `public-settings` query
- Returns `null` when `whatsapp_number` is not set (opt-in)
- Fixed position `bottom-6 right-6` / `sm:bottom-8 sm:right-8`, `z-50`
- Accessible `aria-label`, focus ring, hover scale animation
- Official WhatsApp green `#25D366`

---

### `src/lib/i18n.tsx`

**New translation keys added:**
- `"nav.buildbox"` → EN: `"Build Box"` / AR: `"بناء الصندوق"`
- `"box.starting_from"` → EN: `"Starting from"` / AR: `"يبدأ من"`
- `"cart.free_shipping"` → EN: `"Free shipping"` / AR: `"شحن مجاني"`

---

### `src/routes/__root.tsx`

**WhatsApp floating button wired globally:**
- Imported `WhatsAppFloatingButton` from `@/components/site-chrome`
- Rendered after `<Toaster />` inside `RootComponent` so it appears on every page

---

### `src/lib/storefront.ts`

**Box type extended:**
- Added `sale_enabled?: boolean | null` to the `Box` type
- `fetchBoxes()` uses `select("*")` so the new column is returned automatically once it exists in the DB
- All existing queries remain unchanged

---

### `src/routes/index.tsx`

**BYO box routing fixed:**
- `BoxCard` no longer checks `isByo` to pick a route — always navigates to `/boxes/$slug`

**Flavors fetched for pricing:**
- `BestSellers` and `OurProducts` now also call `useQuery({ queryKey: ["flavors"], queryFn: fetchFlavors })`
- `minFlavorPrice` and `maxFlavorPrice` are derived and passed down to `BoxCard`

**BoxCard — "Starting from" price:**
- For BYO boxes: `startingPrice = minFlavorPrice × b.cookie_count` is shown instead of the flat `box.price`
- Displayed as `"Starting from [price]"` using the new `box.starting_from` i18n key

**BoxCard — sale price display:**
- For BYO boxes where `b.sale_enabled === true`: `comparePrice = maxFlavorPrice × b.cookie_count`
- Rendered as `~~comparePrice~~` (struck-through) above the starting price

---

### `src/routes/boxes.index.tsx`

**Show all boxes:**
- Removed `allBoxes.filter((b) => b.type === "fixed")` — the full list is shown
- Badge dynamically shows "Chef's pick" (gold) for `fixed` and "Build your own" (blue) for `byo`
- Page title and description updated to "All Boxes"

**Flavors fetched for pricing:**
- `fetchFlavors` is called alongside `fetchBoxes`
- `minFlavorPrice` / `maxFlavorPrice` computed and passed to `BoxCard`

**BoxCard — "Starting from" + sale price:**
- Same logic as `index.tsx` BoxCard above

---

### `src/routes/buildbox.tsx`

**Flavors fetched for pricing:**
- Added `useQuery({ queryKey: ["flavors"], queryFn: fetchFlavors })`
- `BoxCard` now receives `minFlavorPrice` and `maxFlavorPrice`

**BoxCard — "Starting from" + sale price:**
- Since all boxes on this page are BYO, starting price is always computed
- Sale price crossed-out shown when `b.sale_enabled === true`

---

### `src/routes/admin.boxes.tsx`

**`sale_enabled` field added:**
- `Box` type gains `sale_enabled: boolean`
- "New box" default initializer includes `sale_enabled: false`
- List view shows a gold "sale" badge when `sale_enabled` is true

**Sale price toggle in editor:**
- Three-column toggle row now includes `"Sale price"` alongside "Active" and "Best seller"
- When toggled on, an info panel explains the crossed-out price formula to the admin:
  _"highest flavor price × [cookie_count] cookies"_
- `sale_enabled` is included in the `payload` sent to Supabase on save

> **Reminder:** this field only works after running the migration:
> ```sql
> ALTER TABLE boxes ADD COLUMN sale_enabled boolean NOT NULL DEFAULT false;
> ```

---

### `src/routes/cart.tsx`

**Free shipping threshold:**
- Constant `FREE_SHIPPING_THRESHOLD = 750` (EGP)
- When `subtotal >= 750`: delivery row shows `"Free shipping"` in green instead of a fee
- When below threshold: a nudge banner shows how much more the user needs: _"Add X more for free delivery 🚚"_

---

### `src/routes/checkout.tsx`

**Free shipping logic:**
- Constant `FREE_SHIPPING_THRESHOLD = 750` (EGP)
- `isFreeShipping = subtotal - discount >= 750`
- `deliveryFee = isFreeShipping ? 0 : baseDeliveryFee` (base fee still comes from admin settings)
- When free shipping applies:
  - Delivery row value is `"Free shipping"` highlighted in green
  - A success banner "🎉 You qualify for free delivery!" is shown
- `deliveryFee` saved to `sessionStorage` invoice is the actual charged amount (0 when free)

---

## Files NOT Modified

- `src/routes/admin.tsx` — Admin nav already has "Products" entry
- `src/routes/admin.products.tsx` — Product CRUD already implemented
- `src/routes/boxes.$slug.tsx` — Detail page unchanged
- `src/routes/buildbox.tsx` (structure only) — Only pricing props added, no route changes
- All other source files — unchanged

---

## Modified File Paths (this ZIP)

```
src/components/site-chrome.tsx
src/lib/i18n.tsx
src/lib/storefront.ts
src/routes/__root.tsx
src/routes/index.tsx
src/routes/boxes.index.tsx
src/routes/buildbox.tsx
src/routes/admin.boxes.tsx
src/routes/cart.tsx
src/routes/checkout.tsx
CHANGELOG.md
```
