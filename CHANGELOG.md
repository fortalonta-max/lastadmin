# CHANGELOG — Round 3

All changes are frontend layout and UX only. No backend, API, auth, database, or checkout logic was modified.

---

## Modified Files

### `src/components/site-chrome.tsx`

**Logo centered in the navigation bar:**
- The nav inner container is now `position: relative` with `justify-between` for the left (desktop nav links) and right (action buttons) groups.
- The logo `<Link>` is pulled out of the flex flow and positioned with `absolute left-1/2 -translate-x-1/2`, centering it exactly in the middle of the bar regardless of viewport width.
- On mobile (where nav links are hidden), a `w-11` invisible spacer on the left balances the action buttons on the right, keeping the logo centered.

---

### `src/routes/index.tsx`

**Sections removed:**
- `Reviews` ("04 / Loved by NYC") — removed entirely.
- `FAQ` ("05 / Frequently Asked") — removed entirely.
- Unused imports (`fetchReviews`, `fetchFaqs`, `ChevronDown`, `MessageCircle`) cleaned up.

**New homepage section order:**
`Hero → Best Sellers → Our Products → Our Story → Contact`

**`BestSellers` section — best-seller products only:**
- Filters `boxes.filter((b) => b.is_best_seller)`.
- Returns `null` if no boxes are flagged as best sellers (no empty section shown).
- Each card carries the pink "Best Seller" badge.

**New `OurProducts` section:**
- Placed immediately below Best Sellers.
- Displays every box regardless of type or best-seller status.
- Section eyebrow: `★★`, title: `Our Products`.
- Cards carry their individual type badge (Best Seller / Chef's Pick / Build Your Own).
- BYO boxes link to `/buildbox`; fixed boxes link to `/boxes/$slug`.

**Two-column mobile grid across all product grids:**
- Both `BestSellers` and `OurProducts` use `grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3`.
- Card image aspect ratio tightened on mobile (`aspect-[3/2]`); restored to `aspect-[4/3]` on `sm:`.
- Card title, price, badge, and CTA button font sizes scale down on mobile (`text-base` / `px-2 py-1 text-[10px]`) and up on `sm:` (`text-2xl` / `px-4 py-2 text-xs`).
- Card description hidden on mobile (too cramped in a 2-col layout) and shown from `sm:` upward.

---

### `src/routes/boxes.index.tsx`

**Two-column mobile grid applied:**
- Grid changed from `sm:grid-cols-2 lg:grid-cols-3` to `grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3`.
- Same responsive card sizing as homepage grids.

---

### `src/routes/buildbox.tsx`

**Two-column mobile grid applied:**
- Same grid and responsive card sizing changes as `boxes.index.tsx`.

