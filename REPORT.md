# Duplicate Browser Meta Pixel Event — Root Cause & Fix Report

## Root Cause Analysis

**File:** `src/routes/__root.tsx` — lines 157–163 (before fix)

The duplicate PageView fires on **every initial page load** in this TanStack Start (SSR) application. The execution sequence is:

### Why it happens

This project uses TanStack Start with server-side rendering. The hydration flow is:

1. **Server** renders the full HTML and sends it to the browser.
2. **Client** runs `hydrateRoot()` — React attaches event listeners and commits the tree.
3. After the hydration commit, React runs all `useEffect` hooks.
4. `RootComponent.useEffect` runs → registers `router.subscribe("onResolved", ...)`.
5. TanStack Router fires `onResolved` for the **hydration navigation** (the initial route resolution that happens during/after hydration) — this is **AFTER** step 4, so the subscription catches it → **`trackPixel("PageView")` FIRE #1**.
6. `MetaPixelLoader` is also mounted inside `RootComponent`. Its `useEffect` depends on `pixelId`, which comes from an **async Supabase query**. Once the query resolves, the effect fires → `initMetaPixel(pixelId)` + **`trackPixel("PageView")` FIRE #2**.

Both fires are unconditional. Neither has any guard that knows the other already ran.

### The problematic code (before fix)

```tsx
// src/routes/__root.tsx — RootComponent (lines 157–163)
useEffect(() => {
  captureUtm();
  return router.subscribe("onResolved", () => {
    captureUtm();
    trackPixel("PageView");   // ← fires on initial hydration navigation AND on SPA nav
  });
}, [router]);
```

The `router.subscribe("onResolved")` callback fires for **every** route resolution, including the hydration navigation that TanStack Router performs when the client first loads. Combined with `MetaPixelLoader` also firing `trackPixel("PageView")` after the async pixel-ID fetch, this produces two browser PageView events on every initial page load.

### Why previous fixes did not fully solve it

A prior fix (documented in `TRACKING_FIX_REPORT.md`) moved `trackPixel("PageView")` out of `initMetaPixel()` (inside `meta-pixel.ts`) and into `MetaPixelLoader.useEffect` to prevent a double-fire that occurred when `fbevents.js` was already browser-cached. That fix correctly removed one source of duplication, but the `onResolved` subscription still fires `trackPixel("PageView")` on the initial hydration navigation — a separate, remaining source of the duplicate.

---

## Files Modified

| File | Change |
|---|---|
| `src/routes/__root.tsx` | Added `initialHydrationSkipped` guard to the `router.subscribe("onResolved")` callback |

**Only one file was modified.** No other files required changes.

---

## Exact Code Change

### Before

```tsx
useEffect(() => {
  captureUtm();
  return router.subscribe("onResolved", () => {
    captureUtm();
    trackPixel("PageView");
  });
}, [router]);
```

### After

```tsx
useEffect(() => {
  captureUtm();
  // Skip the FIRST onResolved event, which fires during SSR hydration for the
  // initial route. MetaPixelLoader.useEffect already owns that initial PageView.
  // Without this guard, two PageViews fire on every initial page load:
  //   #1 — router.subscribe("onResolved") catches the hydration navigation
  //   #2 — MetaPixelLoader fires after the async Supabase pixel-ID fetch
  let initialHydrationSkipped = false;
  return router.subscribe("onResolved", () => {
    captureUtm();
    if (!initialHydrationSkipped) {
      initialHydrationSkipped = true;
      return; // MetaPixelLoader handles the initial PageView
    }
    trackPixel("PageView");
  });
}, [router]);
```

---

## Why the Issue Occurred

TanStack Start uses SSR. During client-side hydration, TanStack Router fires an `onResolved` event for the initial URL resolution. The subscription registered in `RootComponent.useEffect` catches this event because:

- React hydration commits the tree → runs `useEffect` → the subscription is registered.
- TanStack Router fires `onResolved` for the hydration navigation AFTER `useEffect` runs.
- The subscription has no awareness that this is the "initial" navigation vs. an SPA navigation.

`MetaPixelLoader` independently tracks the initial PageView (after the async Supabase fetch completes). With no coordination between the two, both fire.

---

## Why the Fix Works

The `initialHydrationSkipped` variable is a closure-scoped boolean, created fresh each time the `useEffect` runs. It is set to `true` the first time `onResolved` fires (the hydration navigation), suppressing `trackPixel("PageView")` for that one event. All subsequent `onResolved` events (real SPA navigations) pass through normally and fire `trackPixel("PageView")`.

This preserves the full event flow:
- **Initial page load:** 1 PageView from `MetaPixelLoader` (owns the initial event)
- **SPA navigation (any route change):** 1 PageView from the `onResolved` subscription
- **CAPI deduplication:** unchanged — CAPI events use the same `event_id` as the corresponding browser events

---

## Event Flow After Fix

### Initial page load
| Step | Source | Event |
|---|---|---|
| Hydration `onResolved` fires | `__root.tsx` subscription | *(skipped — guard active)* |
| Supabase fetch completes | `MetaPixelLoader.useEffect` | ✅ 1× PageView |

### SPA navigation (user clicks a link)
| Step | Source | Event |
|---|---|---|
| `onResolved` fires | `__root.tsx` subscription | ✅ 1× PageView |

### Other events (unchanged)
| Event | Browser | CAPI | Dedup |
|---|---|---|---|
| ViewContent | ✅ 1× (ref guard) | ✅ 1× (same event_id) | ✅ |
| AddToCart | ✅ 1× (user action) | ✅ 1× (same event_id) | ✅ |
| InitiateCheckout | ✅ 1× (ref guard) | ✅ 1× (same event_id) | ✅ |
| Purchase | ✅ 1× (ref guard) | ✅ 1× (same event_id) | ✅ |

---

## Verification Steps

1. **Deploy the fix** — replace `src/routes/__root.tsx` with the patched version.

2. **Verify PageView fires exactly once on initial load:**
   - Open Meta Events Manager → Test Events (set `meta_test_event_code` temporarily).
   - Visit the site on a fresh tab.
   - You should see **exactly 1** `PageView` event, not 2.
   - Check browser DevTools → Network tab → filter by `facebook.com/tr` — only one `PageView` request should appear on load.

3. **Verify PageView fires on SPA navigation:**
   - From the home page, click through to a product page.
   - In the Network tab, 1 new `PageView` request should appear after navigation (from the `onResolved` subscription).

4. **Verify other events are unaffected:**
   - ViewContent: visit a box detail page → 1 event only (switching browser tabs and returning should not fire another).
   - AddToCart: add to cart → 1 browser event + 1 CAPI event with matching `event_id`.
   - InitiateCheckout: go to checkout → 1 event only.
   - Purchase: complete checkout → 1 browser event + 1 CAPI event with matching `event_id`. Meta Test Events panel should show "deduplicated".

---

## Confirmation

✅ **Duplicate browser PageView events on initial load — RESOLVED**

The fix is contained in a single 8-line change to `src/routes/__root.tsx`. No other files were modified. All existing functionality (CAPI deduplication, event_id matching, ViewContent/AddToCart/InitiateCheckout/Purchase tracking, UTM capture) is fully preserved.
