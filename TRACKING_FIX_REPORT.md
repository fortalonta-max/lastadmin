# Meta Pixel / Facebook Conversion Tracking — Root Cause & Fix Report

## Context

**Observed symptom:** Meta Events Manager shows 30 Purchase events but only 1 real order was received.

| Event | Meta Count | Expected Ratio |
|---|---|---|
| PageView | 805 | — |
| ViewContent | 147 | realistic if many visitors browse |
| AddToCart | 47 | realistic |
| InitiateCheckout | 34 | suspicious — should be < AddToCart |
| Purchase | 30 | **critical — 30× real order count** |

---

## Root Cause Analysis

### Bug 1 — Purchase inflated by `meta_test_event_code` left active (CRITICAL)

**File:** `src/lib/orders.functions.ts` (line 259) + Admin Settings  
**Risk level:** 🔴 Critical

When `meta_test_event_code` is set in `site_settings`, every CAPI `Purchase` call is
sent to Meta as a **test event**. Test events are visible in Meta Events Manager and
**count toward event totals**, even when they don't correspond to real production orders.

If the admin used Meta's "Test Events" tool to verify the pixel during setup — while
`meta_test_event_code` was populated in the DB — each test checkout triggered a CAPI
`Purchase` event that Meta counted. The actual orders were likely deleted from the DB
(cleaning up test data), but Meta had already recorded the events permanently.

**Evidence in code (`orders.functions.ts`):**
```ts
await sendPurchaseToCapi({
  ...
  testCode: settings.meta_test_event_code ?? undefined,  // ← still active in prod
  ...
});
```

**How to verify:**  
Go to Admin → Settings → check whether "Meta Test Event Code" field has a value.
If it does, **clear it immediately**. Every checkout since it was set has been sending
test Purchase events that Meta counted.

**Fix:** Clear `meta_test_event_code` in the Admin Settings UI. No code change needed —
the server correctly omits `test_event_code` from the CAPI payload when the DB field is `null`.

---

### Bug 2 — Double PageView on initial load when pixel is browser-cached (HIGH)

**Files:** `src/lib/meta-pixel.ts`, `src/components/meta-pixel-loader.tsx`  
**Risk level:** 🟠 High

`initMetaPixel()` always called `fbq("track", "PageView")` at the end of initialization.
`__root.tsx` also fires `trackPixel("PageView")` via `router.subscribe("onResolved")`
on every SPA navigation — including the initial page load on repeat visits when
`fbevents.js` is already cached and `fbq` is synchronously available.

**Scenario triggering the double:**
1. Repeat visitor → browser has `fbevents.js` cached → `fbq` is defined immediately
2. `MetaPixelLoader` useEffect fires → `initMetaPixel()` → `fbq("track", "PageView")` #1
3. Router `onResolved` subscription fires (set up in the same tick) → `trackPixel("PageView")` #2

**Result:** 2 PageViews per initial load for repeat visitors.

**Fix applied:**
- Removed `fbq("track", "PageView")` from inside `initMetaPixel()`
- `MetaPixelLoader.useEffect` now calls `trackPixel("PageView")` immediately after
  `initMetaPixel()`, making it the single owner of the initial PageView
- Subsequent SPA navigations continue to be tracked by the router subscription

---

### Bug 3 — ViewContent fires on every React Query background refetch (HIGH)

**File:** `src/routes/boxes.$slug.tsx`  
**Risk level:** 🟠 High

The ViewContent `useEffect` used `[box]` as its dependency array. React Query returns
a **new object reference** on every background refetch (window focus, network reconnect,
periodic refresh), even when the data hasn't changed. Each new reference triggers
the effect → fires another ViewContent event.

**Problematic code:**
```ts
useEffect(() => {
  if (box) {
    trackPixel("ViewContent", { ... });
  }
}, [box]);  // ← new object ref on every refetch = fires every time
```

**Evidence:** The box query at line 67–70 has **no `staleTime`**, meaning React Query
considers data stale immediately and refetches on every window focus event. A user who
minimizes their browser and comes back to a product page triggers another ViewContent.

**Fix applied:**
```ts
const viewContentFiredForId = useRef<string | null>(null);
useEffect(() => {
  if (!box || viewContentFiredForId.current === box.id) return;
  viewContentFiredForId.current = box.id;
  trackPixel("ViewContent", { ... });
}, [box?.id]);  // ← primitive string dep; ref guard prevents double-firing
```

The `useRef` guard ensures ViewContent fires at most once per `box.id` per component
lifetime, regardless of how many times React Query refetches.

---

### Bug 4 — InitiateCheckout re-fires when cart subtotal re-hydrates (MEDIUM)

**File:** `src/routes/checkout.tsx`  
**Risk level:** 🟡 Medium

The `InitiateCheckout` effect depended on `[items.length, subtotal]`. On page load,
the `CartProvider` reads localStorage asynchronously — `subtotal` starts at `0` then
jumps to the real value once the cart loads. This transition triggers the effect twice:

| Render | `items.length` | `subtotal` | Effect fires? |
|---|---|---|---|
| First (cart loading) | 0 | 0 | No (`items.length === 0`) |
| Second (cart loaded) | 3 | 450 | ✅ Yes — intended |
| Window refocus (React Query) | 3 | 450 | ✅ Yes — **unintended duplicate** |

Additionally, in React 18 Strict Mode (development), effects run twice by design,
which inflated counts during testing.

**Fix applied:**
```ts
const initiateCheckoutFiredRef = useRef(false);
useEffect(() => {
  if (items.length === 0 || initiateCheckoutFiredRef.current) return;
  initiateCheckoutFiredRef.current = true;
  trackPixel("InitiateCheckout", { value: subtotal, ... });
}, [items.length, subtotal]);
```

---

### Bug 5 — Purchase event_id regenerated on retry, bypassing Meta deduplication (MEDIUM)

**File:** `src/routes/checkout.tsx`  
**Risk level:** 🟡 Medium

`event_id` was generated with `crypto.randomUUID()` **inside** `handleSubmit`. If a
user's submit fails (network timeout, server error) and they retry, a fresh UUID is
generated for the new attempt. Even though the server creates a new order (separate
row in DB), Meta receives two distinct `Purchase` events with different `event_id`s —
and cannot deduplicate them.

**Fix applied:**
```ts
// At component level — generated once per checkout session mount:
const checkoutEventIdRef = useRef(crypto.randomUUID());

// Inside handleSubmit — reuses the stable session ID:
const eventId = checkoutEventIdRef.current;  // was: crypto.randomUUID()
```

Now, even if the user retries after a failed submission, the same `event_id` is reused.
Meta's 48-hour deduplication window will collapse both the browser pixel and CAPI events
into a single counted Purchase.

**Note:** The server correctly uses the client-sent `event_id` (falling back to a fresh
UUID only if the client didn't send one — see `orders.functions.ts` line 198). This
means retry protection now works end-to-end: same `event_id` on browser, same `event_id`
sent to CAPI, Meta deduplicates to 1.

---

## Summary of Modified Files

| File | Change | Bug fixed |
|---|---|---|
| `src/lib/meta-pixel.ts` | Removed `fbq("track", "PageView")` from `initMetaPixel()` | Bug 2 |
| `src/components/meta-pixel-loader.tsx` | Added `trackPixel("PageView")` call after `initMetaPixel()` | Bug 2 |
| `src/routes/boxes.$slug.tsx` | Added `useRef` guard; changed dep from `[box]` → `[box?.id]` | Bug 3 |
| `src/routes/checkout.tsx` | Added `initiateCheckoutFiredRef` guard; moved `eventId` to stable `useRef` | Bug 4, Bug 5 |
| *(Admin UI action)* | Clear `meta_test_event_code` in Site Settings | Bug 1 |

---

## Verification Steps

After clearing `meta_test_event_code` and deploying these fixes:

1. **Purchase fires exactly once per order:**
   - Open checkout → fill form → submit
   - In Meta Events Manager → Test Events: you should see **exactly one** Purchase event
   - Check that `event_id` on the browser event matches the `event_id` in the CAPI event
   - Meta should show "1 event deduplicated" in the Test Events panel

2. **ViewContent fires once per product page visit:**
   - Navigate to a product box page
   - Switch to a different browser tab and come back (triggers React Query window-focus refetch)
   - In Meta Test Events: only **1** ViewContent should appear for that session

3. **InitiateCheckout fires once per checkout visit:**
   - Go to `/checkout`
   - In Meta Test Events: only **1** InitiateCheckout should appear

4. **PageView fires once per page/navigation:**
   - On initial load: 1 PageView from `MetaPixelLoader`
   - On SPA navigation: 1 PageView from the router subscription
   - On refresh: 1 PageView from `MetaPixelLoader` (re-initializes after Supabase fetch)

5. **Confirm `meta_test_event_code` is cleared:**
   - Admin → Settings → Meta Conversion API → "Test Event Code" field should be blank
   - In `orders.functions.ts`, the `sendPurchaseToCapi` call will omit `test_event_code`
     from the payload when the DB field is `null` (already handled by the existing `?? undefined` logic)

---

## What Was NOT Changed

- Order creation logic in `orders.functions.ts` — untouched
- CAPI `sendPurchaseToCapi` function — untouched (deduplication was already correct)
- `AddToCart` tracking in `boxes.$slug.tsx` — fires on explicit user action only (correct)
- `PageView` tracking in `__root.tsx` router subscription — untouched
- Any database schema, migrations, or admin logic — untouched
- No production build, no deployment changes

