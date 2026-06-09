# CHANGELOG — Round 5 (Cumulative, including 5b + 5c)

All changes are **frontend only**. No backend/API/auth logic was modified.

---

## ⚠️ DB migrations required

Run these once in Supabase SQL Editor before deploying:

```sql
-- Round 5 (sale_enabled on boxes)
ALTER TABLE boxes ADD COLUMN IF NOT EXISTS sale_enabled boolean NOT NULL DEFAULT false;

-- Round 5c (Our Story + Announcement Bar on site_settings)
ALTER TABLE site_settings
  ADD COLUMN IF NOT EXISTS story_heading_en  text,
  ADD COLUMN IF NOT EXISTS story_heading_ar  text,
  ADD COLUMN IF NOT EXISTS story_body_en     text,
  ADD COLUMN IF NOT EXISTS story_body_ar     text,
  ADD COLUMN IF NOT EXISTS story_pillar1_en  text,
  ADD COLUMN IF NOT EXISTS story_pillar1_ar  text,
  ADD COLUMN IF NOT EXISTS story_pillar2_en  text,
  ADD COLUMN IF NOT EXISTS story_pillar2_ar  text,
  ADD COLUMN IF NOT EXISTS story_pillar3_en  text,
  ADD COLUMN IF NOT EXISTS story_pillar3_ar  text,
  ADD COLUMN IF NOT EXISTS announcement_enabled  boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS announcement_text_en  text,
  ADD COLUMN IF NOT EXISTS announcement_text_ar  text;
```

---

## What changed in Round 5c

### `src/lib/storefront.ts`

- `SiteSettings` type converted from `typeof DEFAULT_SETTINGS` to an explicit interface so `announcement_enabled` is properly typed as `boolean` (not literal `false`).
- Added 13 new fields to `DEFAULT_SETTINGS` and the `fetchSettings` merge:
  - **Our Story**: `story_heading_en/ar`, `story_body_en/ar`, `story_pillar1–3_en/ar`
  - **Announcement Bar**: `announcement_enabled`, `announcement_text_en/ar`
- `fetchSettings` SELECT string extended to include all new columns.

### `src/components/site-chrome.tsx`

- **Announcement bar replaced**: the old hardcoded static bar is now a `<AnnouncementBar />` component that:
  - Reads `announcement_enabled`, `announcement_text_en/ar` from settings.
  - Renders nothing when `announcement_enabled` is `false`.
  - Displays the text as a **smooth CSS `@keyframes` scrolling ticker** (30 s loop, no external dependency).
  - Localises to Arabic when the user's language is AR.
  - Uses an inline `<style>` tag for the keyframe — no global CSS changes required.

### `src/routes/index.tsx`

- **Our Story section** now reads from settings:
  - `heading`, `body`, and all three `pillar` strings come from `settings.*` (falls back to i18n strings only until settings load).
  - No hard-coded story text in JSX anymore.

### `src/routes/admin.settings.tsx` *(new file)*

New admin page at `/admin/settings` that replaces the original and adds:

| Section | Fields |
|---|---|
| Branding | Store name, tagline EN/AR, logo upload |
| Hero | Hero image upload, eyebrow EN/AR, headline EN/AR, subtitle EN/AR |
| **Our Story** *(new)* | Heading EN/AR, body text EN/AR, Pillar 1–3 EN/AR |
| **Announcement Bar** *(new)* | Enable/disable toggle, text EN/AR with live preview |
| Contact & Delivery | Phone, WhatsApp, email, address, delivery fee |
| Advanced | Meta Pixel ID |

Uses the same `ImageUpload`, `Input`, `Textarea`, `Toggle` primitives as the rest of the admin.  
Saves via `supabase.from("site_settings").upsert({ id: 1, … })` — same pattern as before.

---

## Summary of All Changes (Rounds 4 → 5 → 5b → 5c)

| # | Feature | Status |
|---|---|---|
| 1 | Logo size increased 2× | ✓ |
| 2 | Nav: Home, Boxes, Build Box, Flavors, Contact | ✓ |
| 3 | BYO boxes route to detail page | ✓ |
| 4 | All boxes visible in /boxes | ✓ |
| 5 | Floating WhatsApp button | ✓ |
| 6 | BYO boxes show "Starting from [price]" | ✓ |
| 7 | Admin: Sale Price toggle per box | ✓ |
| 8 | Sale price: crossed-out price bold red | ✓ |
| 9 | Free shipping at 750 EGP | ✓ |
| 10 | Admin: Best Seller checkbox restored | ✓ |
| 11 | Store settings hardcoded as defaults | ✓ |
| 12 | No flash of default hero/logo on load | ✓ |
| 13 | Our Story editable from admin settings | ✓ |
| 14 | Scrolling announcement bar (admin on/off) | ✓ |

---

## Modified File Paths (this ZIP)

```
CHANGELOG.md
src/lib/storefront.ts
src/components/site-chrome.tsx
src/routes/index.tsx
src/routes/admin.settings.tsx       ← new file; replaces original
src/lib/i18n.tsx
src/routes/__root.tsx
src/routes/boxes.index.tsx
src/routes/buildbox.tsx
src/routes/admin.boxes.tsx
src/routes/cart.tsx
src/routes/checkout.tsx
```
