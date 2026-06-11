## Brand & Design

- **Palette:** baby pink (#FADADD) and baby blue (#BFE3FF) as primary brand colors, with cream off-white background, charcoal text, and a soft gold accent for badges/CTAs.
- **Vibe:** premium, modern, candy-soft, mobile-first. Editorial serif for headings (e.g. Fraunces), clean sans (Inter) for body. Generous whitespace, rounded shapes, soft shadows, subtle motion on hero and product cards.
- All colors as semantic tokens in `src/styles.css` (oklch). No hardcoded colors in components.

## Stack

- TanStack Start (existing template), Tailwind + shadcn.
- **Lovable Cloud** for database, auth (admin login), file storage (product/flavor images), and server functions.
- i18n: lightweight context-based EN/AR switcher with `dir="rtl"` swap. English default.
- No payment gateway — Cash on Delivery only. WhatsApp link generated per order.

## Data Model (Lovable Cloud)

- `flavors` — name, slug, description, image, is_available, is_limited_edition, sort_order, stock_status.
- `boxes` — name, slug, description, cookie_count, price, image, is_active, is_best_seller, type (`fixed` | `byo`).
- `box_fixed_flavors` — for fixed boxes: box_id, flavor_id, quantity.
- `orders` — customer name, phone, address, notes, subtotal, delivery_fee, discount, total, coupon_code, status enum (pending/confirmed/preparing/out_for_delivery/delivered/cancelled), created_at.
- `order_items` — order_id, box_id, unit_price, quantity, selected_flavors (jsonb: [{flavor_id, qty}]).
- `coupons` — code, type (percent/fixed), value, active, expires_at, min_subtotal.
- `settings` — singleton: meta_pixel_id, meta_capi_token, meta_test_event_code, whatsapp_number, delivery_fee, store info.
- `reviews` — name, rating, body, image, is_published.
- `faqs` — question, answer, sort_order.
- `user_roles` — separate roles table with `has_role()` security-definer for admin gating.
- RLS: public read for active flavors/boxes/reviews/faqs/settings (safe columns only); inserts on orders allowed for anon; everything else admin-only.

## Customer Storefront (routes)

- `/` Home: Hero, Best Sellers, Cookie Boxes, Flavors grid, Build-Your-Own CTA, Reviews, FAQ, Contact.
- `/boxes` and `/boxes/$slug`: box detail. If `type=byo`, show **flavor picker** with:
  - Grid of available flavors with image, name, +/- qty stepper.
  - Counter "X of N selected", disable + when full, allow multiple of same flavor.
  - Sticky mobile bottom bar with counter + Add to Cart (disabled until N reached).
  - If `type=fixed`, show included flavors read-only.
- `/flavors` browse.
- `/cart` slide-over + `/checkout` one-page (name, phone, address, notes, coupon, delivery fee, summary, place order → COD).
- `/order/$id` confirmation with WhatsApp button.
- Badges: Best Seller, Limited Edition, Out of Stock.

## Admin Dashboard (`/_authenticated/admin/*`)

- Email/password login via Lovable Cloud auth + `admin` role check.
- Pages: Overview, Orders (list + detail with status updates), Boxes (CRUD, image upload, type toggle, fixed-flavor editor), Flavors (CRUD, drag-to-reorder, availability), Coupons, Reviews, FAQs, Settings (Meta Pixel ID, CAPI token, WhatsApp number, delivery fee, store info).

## Marketing & Tracking

- Meta Pixel injected from settings: `PageView`, `ViewContent` (box page), `AddToCart`, `InitiateCheckout`, `Purchase`.
- Server function mirrors each event to **Conversion API** using stored access token (server-side, hashed email/phone, event_id dedupe with pixel).

## Notifications

- On order create: server function sends WhatsApp click-to-chat message URL to admin number with order summary; also writes an in-app admin notification row. (No paid WhatsApp Business API since COD-only.)

## SEO & Performance

- Per-route `head()` with unique title/description/og.
- JSON-LD: Product on box pages, Organization on home.
- `robots.txt`, `sitemap.xml`, semantic HTML, alt text, lazy images, responsive `<picture>`.

## Build Order

1. Enable Lovable Cloud + schema + RLS + storage buckets (`products`, `flavors`).
2. Design tokens (baby pink/blue palette) + base layout + i18n scaffold + header/footer.
3. Public storefront: home, boxes list, box detail with **BYO flavor picker** (core UX).
4. Cart + checkout (COD) + order confirmation + WhatsApp link.
5. Admin auth + roles + admin shell.
6. Admin CRUD: flavors → boxes → orders → coupons → reviews/FAQ → settings.
7. Meta Pixel client events + CAPI server function.
8. Reviews, FAQ, contact, SEO polish, Arabic translations + RTL QA.

## Notes / Out of Scope

- Online payments deferred (COD only as requested); Stripe/Paddle can be added later without schema changes.
- Arabic translations will use a simple JSON dictionary; product/flavor names stored bilingually (`name_en`, `name_ar`, etc.).
- Inventory is status-based (available / out of stock), not numeric stock counts, unless you want true inventory later.

Want me to proceed with this plan, or adjust anything (e.g. add stock counts, swap fonts, change badge style) first?