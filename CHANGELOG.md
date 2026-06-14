# Changelog — Box Card Full Image & Full Content Display

## Modified Files

---

### 1. `src/routes/boxes.index.tsx`

**What changed:**

**Image display:**
- Removed `aspect-[3/2] sm:aspect-[4/3]` fixed ratio container and `background: url(...) center/cover` inline style, which were cropping the image.
- Replaced with `<img className="w-full h-auto block">` inside a plain `overflow-hidden` wrapper — image renders at its exact uploaded dimensions with zero cropping.
- Badge overlays (Best Seller, BYO/Fixed) remain positioned absolutely over the image.
- Fallback gradient (no image) keeps `aspect-[4/3]` only when there is no image URL.

**Content truncation:**
- Description: removed `hidden` (was hidden on mobile) and `line-clamp-2` (was capped at 2 lines). Full description is now always visible on all screen sizes.
- "Starting from" label: removed `hidden sm:inline` — now always visible as a `block` line above the price, not an inline prefix that disappeared on mobile.
- CTA button: removed tiny mobile-only padding; now consistently sized across breakpoints with `px-3 py-1.5 text-xs`.

**Grid layout:**
- Changed from `grid-cols-2` (two columns even on mobile) to `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` — single column on mobile gives cards enough width to show the full image and all text without cramping.
- Added `items-start` so cards in the same row don't stretch to match the tallest card.

---

### 2. `src/routes/buildbox.tsx`

**What changed:** Identical set of fixes as `boxes.index.tsx` — this page shows the same style of card for BYO boxes only.

- **Image:** `aspect-[3/2] sm:aspect-[4/3]` + `background-size: cover` → `<img w-full h-auto block>`.
- **Description:** Removed `hidden line-clamp-2` — full description always visible.
- **"Starting from" label:** Now a `block` line above the price, always shown.
- **Grid:** `grid-cols-2` → `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 items-start`.

---

## Summary of all changes

| Issue | Before | After |
|---|---|---|
| Image cropping | Fixed `aspect-[3/2]` + `background-size: cover` | `<img w-full h-auto block>` — natural dimensions |
| Description on mobile | `hidden` (invisible) | Always visible |
| Description length | `line-clamp-2` (2-line cap) | Full text, no cap |
| "Starting from" on mobile | `hidden sm:inline` (invisible) | Always visible (`block`) |
| Mobile grid | 2 columns (cards too narrow) | 1 column (full width) |
