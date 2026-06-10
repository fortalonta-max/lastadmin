# CHANGELOG — Round 5 (Cumulative, including 5b + 5c + 5d)

All changes are **frontend only** unless a DB migration is noted.

---

## ⚠️ DB migrations required

Run these once in Supabase SQL Editor before deploying:

```sql
-- Round 5: sale_enabled on boxes
ALTER TABLE boxes ADD COLUMN IF NOT EXISTS sale_enabled boolean NOT NULL DEFAULT false;

-- Round 5c: Our Story + Announcement Bar
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

-- Round 5d: Hero carousel (jsonb array of image URLs)
ALTER TABLE site_settings
  ADD COLUMN IF NOT EXISTS hero_images jsonb NOT NULL DEFAULT '[]';
```

---

## What changed in Round 5d

### Top-of-page bars — split into two distinct bars

| Bar | Colour | Behaviour |
|---|---|---|
| **Delivery bar** | Baby pink `#FCE4EC` | Static, always visible, fixed text about free delivery |
| **Announcement bar** | Baby blue `#E3F2FD` | Scrolling ticker, admin on/off, admin-editable text EN + AR |

Previously there was a single hardcoded announcement bar. It has been replaced by:

1. **`DeliveryBar`** (`site-chrome.tsx`) — permanently visible, baby-pink background `#FCE4EC`, dark-pink text `#AD1457`. Text: "Same-day delivery until 8:00 PM · Free delivery on orders over EGP 750".

2. **`AnnouncementBar`** (`site-chrome.tsx`) — baby-blue background `#E3F2FD`, navy text `#0D47A1`. Scrolls continuously using a CSS `@keyframes announcement-ticker` animation injected via `<style>`. Reads `announcement_enabled`, `announcement_text_en`, `announcement_text_ar` from `site_settings`. Disappears entirely when `announcement_enabled = false`.

### Hero image carousel

- **`src/routes/index.tsx`** — `Hero` component now accepts a `hero_images` array from settings.
  - If `hero_images.length > 0`: shows a carousel that auto-advances every 5 s with a 1 s opacity cross-fade transition.
  - If `hero_images` is empty: falls back to the single `hero_image_url` (no carousel).
  - Manual prev / next chevron buttons visible when there are multiple slides.
  - Dot indicators at the bottom of the image; active dot widens to a pill shape.

- **`src/lib/storefront.ts`** — `SiteSettings` type gains `hero_images: string[]`. `DEFAULT_SETTINGS.hero_images = []`. `fetchSettings` SELECT string extended; merge maps `data.hero_images` through `Array.isArray` guard.

- **`src/routes/admin.settings.tsx`** — new **Hero Carousel** section with:
  - Thumbnail grid of current carousel images with numbered badges and hover-to-delete (×) button.
  - "Add image to carousel" `ImageUpload` that resets after each upload via a `key` bump.
  - Single fallback `hero_image_url` upload kept in the Hero Section with a note explaining it is used only when the carousel is empty.
  - Announcement Bar section updated with a colour preview chip and inline live preview of the EN text.

---

## Summary of All Changes (Rounds 4 → 5 → 5b → 5c → 5d)

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
| 14 | Static baby-pink delivery bar (always visible) | ✓ |
| 15 | Scrolling baby-blue announcement bar (admin on/off) | ✓ |
| 16 | Hero image carousel (multi-upload, admin-managed) | ✓ |

---

## Modified File Paths (this ZIP)

```
CHANGELOG.md
src/lib/storefront.ts
src/components/site-chrome.tsx
src/routes/index.tsx
src/routes/admin.settings.tsx
src/lib/i18n.tsx
src/routes/__root.tsx
src/routes/boxes.index.tsx
src/routes/buildbox.tsx
src/routes/admin.boxes.tsx
src/routes/cart.tsx
src/routes/checkout.tsx
```
