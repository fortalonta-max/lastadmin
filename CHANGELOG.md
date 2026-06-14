# Changelog — Flavor Price Zero Fix (Mobile & Desktop)

## Modified File

### `src/routes/boxes.$slug.tsx`

---

## Root Cause

The bug was in this single line inside `resolvedFlavorPrices`:

```js
// BEFORE (broken)
map[f.id] = boxFlavorPrices[f.id] ?? 0;

// AFTER (fixed)
map[f.id] = boxFlavorPrices[f.id] ?? Number(f.price) ?? 0;
```

**What happened:**
- `boxFlavorPrices` is fetched from the `flavor_box_prices` table — box-specific overrides.
- If a flavor has **no entry** in `flavor_box_prices` for that box, `boxFlavorPrices[f.id]` is `undefined`.
- The old code fell back to `0` — showing zero price everywhere.
- The fix falls back to `f.price` (the flavor's own base price from the `flavors` table) before defaulting to 0.

**Priority order (new):**
1. `flavor_box_prices[flavor_id]` — box-specific override (if set by admin)
2. `flavors.price` — flavor's own base price (fallback)
3. `0` — final fallback if neither is set

---

## Other fixes in the same file

**"Starting from" price block:**
- Changed from a JSX ternary string to a proper block with a labelled line:
  ```jsx
  <span className="block text-base font-normal text-muted-foreground">
    Starting from
  </span>
  {formatCurrency(minByoPrice * cookieCount)}
  ```
- Label is always visible on all screen sizes (no `hidden sm:inline`).

**Add to Cart button price:**
- Changed `— {formatCurrency(...)}` to only render when price > 0, so the button doesn't show `— EGP 0.00` before a selection is made:
  ```jsx
  {(isFixed ? box.price : byoPrice) > 0 && (
    <> — {formatCurrency(isFixed ? box.price : byoPrice)}</>
  )}
  ```

---

## No other files were changed.
