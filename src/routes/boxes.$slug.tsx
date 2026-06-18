import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState, useEffect, useRef } from "react";
import { Minus, Plus, ShoppingBag, Check, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { Badge } from "@/components/brand-badge";
import { useI18n } from "@/lib/i18n";
import {
  fetchBoxBySlug,
  fetchFlavors,
  fetchFlavorPricesForBox,
  localizedName,
  localizedDesc,
} from "@/lib/storefront";
import { useCart, formatCurrency, type CartFlavor } from "@/lib/cart";
import { trackPixel, getPixelCookies } from "@/lib/meta-pixel";
import { trackCapiEvent } from "@/lib/tracking.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/boxes/$slug")({
  loader: async ({ params, context }) => {
    try {
      const box = await (context as { queryClient: { ensureQueryData: (o: { queryKey: unknown[]; queryFn: () => unknown }) => Promise<unknown> } }).queryClient.ensureQueryData({
        queryKey: ["box", params.slug],
        queryFn: () => fetchBoxBySlug(params.slug),
      });
      return { box: box as Awaited<ReturnType<typeof fetchBoxBySlug>> };
    } catch {
      return { box: null };
    }
  },
  head: ({ params, loaderData }) => {
    const box = loaderData?.box;
    const name = box?.name_en ?? params.slug.replace(/-/g, " ");
    const desc = box?.description_en ?? "Customize your Leen Bakery cookie box with any flavors.";
    const img = box?.image_url ?? "https://i.postimg.cc/CKV3Zwfg/wmremove-transformed-(8).png";
    const siteUrl = (import.meta.env.VITE_SITE_URL as string | undefined) ?? "";
    return {
      meta: [
        { title: `${name} — Leen Bakery` },
        { name: "description", content: desc },
        { property: "og:title", content: name },
        { property: "og:description", content: desc },
        { property: "og:type", content: "product" },
        { property: "og:url", content: siteUrl ? `${siteUrl}/boxes/${params.slug}` : "" },
        { property: "og:image", content: img },
        { property: "og:image:width", content: "1200" },
        { property: "og:image:height", content: "630" },
        { property: "og:image:alt", content: name },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:image", content: img },
      ],
    };
  },
  component: BoxDetail,
});

function BoxDetail() {
  const { slug } = Route.useParams();
  const { t, locale } = useI18n();
  const navigate = useNavigate();
  const { add } = useCart();
  const submitTrackCapiEvent = useServerFn(trackCapiEvent);

  // ── Data fetching ────────────────────────────────────────────────────────────

  const { data: box, isLoading: isBoxLoading } = useQuery({
    queryKey: ["box", slug],
    queryFn: () => fetchBoxBySlug(slug),
  });

  const { data: flavors = [], isLoading: isFlavorsLoading } = useQuery({
    queryKey: ["flavors"],
    queryFn: fetchFlavors,
  });

  // ── Flavor pricing ───────────────────────────────────────────────────────────
  //
  // SINGLE SOURCE OF TRUTH: flavor_box_prices table only.
  //
  // WHY WE USE `status` NOT `isLoading`:
  //
  //   React Query v5 defines isLoading as:
  //     status === 'pending' AND fetchStatus === 'fetching'
  //
  //   When the box query finishes and `enabled` flips to true, there is a brief
  //   render frame where the flavor-prices query has:
  //     status = 'pending'   (fetch not yet run)
  //     fetchStatus = 'idle' (scheduled, not started)
  //   → isLoading = FALSE even though no data has arrived yet.
  //
  //   During that frame, boxFlavorPrices = {} but box.price is populated.
  //   Old code fell back to box.price / cookie_count — the same number for
  //   every flavor — which is the "minimum price shown everywhere" bug.
  //
  //   Chrome V8 collapses this frame before painting (concurrent scheduler).
  //   Firefox SpiderMonkey and Safari JavaScriptCore paint it, so the wrong
  //   prices were rendered and stuck until the next update.
  //
  //   The fix: gate on `status === 'success'`. That flag is only ever true
  //   after a confirmed, completed fetch — it skips the idle window entirely.

  const {
    data: boxFlavorPrices = {},
    status: flavorPricesStatus,
  } = useQuery({
    queryKey: ["flavor-box-prices", box?.id],
    queryFn: () => fetchFlavorPricesForBox(box!.id),
    enabled: !!box?.id,
    staleTime: 30_000,
  });

  // True only after the flavor-prices fetch has fully succeeded.
  // Drives both the price map and all loading skeletons.
  const flavorPricesReady = flavorPricesStatus === "success";

  // Map of flavor_id → per-cookie price for this specific box.
  // Returns {} until flavorPricesReady — no stale or derived values substituted.
  const resolvedFlavorPrices = useMemo<Record<string, number>>(() => {
    if (!flavorPricesReady) return {};
    const map: Record<string, number> = {};
    for (const f of flavors) {
      const price = Number(boxFlavorPrices[f.id] ?? 0);
      if (price > 0) map[f.id] = price;
    }
    return map;
  }, [flavors, boxFlavorPrices, flavorPricesReady]);

  // ── Selection state ──────────────────────────────────────────────────────────

  const [selection, setSelection] = useState<Record<string, number>>({});

  useEffect(() => {
    setSelection({});
  }, [slug]);

  const totalSelected = useMemo(
    () => Object.values(selection).reduce((s, n) => s + n, 0),
    [selection],
  );

  // Total price of the current BYO selection.
  // resolvedFlavorPrices already contains effective per-box prices (flavor.price − per-flavor discount).
  const byoPrice = useMemo(
    () =>
      Object.entries(selection).reduce(
        (total, [flavor_id, qty]) => total + (resolvedFlavorPrices[flavor_id] ?? 0) * qty,
        0,
      ),
    [selection, resolvedFlavorPrices],
  );

  // Lowest per-cookie price across all flavors — used for "Starting from …" on BYO boxes.
  const minFlavorPrice = useMemo(() => {
    const prices = Object.values(resolvedFlavorPrices).filter((p) => p > 0);
    return prices.length > 0 ? Math.min(...prices) : null;
  }, [resolvedFlavorPrices]);

  // Fixed box price: sum of each preset flavor's effective price × quantity.
  // resolvedFlavorPrices already bakes in per-flavor-per-box discounts.
  // Falls back to box.price (legacy cache) if flavor prices are not configured.
  const fixedPrice = useMemo(() => {
    if (!flavorPricesReady || !box?.box_fixed_flavors?.length) return null;
    const flavorTotal = box.box_fixed_flavors.reduce(
      (sum, bf) => sum + (resolvedFlavorPrices[bf.flavor_id] ?? 0) * bf.quantity,
      0,
    );
    return flavorTotal > 0 ? flavorTotal : null;
  }, [box, resolvedFlavorPrices, flavorPricesReady]);

  // ── Pixel ────────────────────────────────────────────────────────────────────

  // Guard: fire ViewContent only once per box slug, not on every React Query
  // refetch. Without this, background refetches (e.g. on window focus) produce
  // a new `box` object reference and re-trigger the effect, inflating
  // ViewContent counts.
  const viewContentFiredForId = useRef<string | null>(null);
  useEffect(() => {
    if (!box || viewContentFiredForId.current === box.id) return;
    viewContentFiredForId.current = box.id;

    const eventId = crypto.randomUUID();
    const { fbp, fbc } = getPixelCookies();

    // Browser pixel (client-side)
    trackPixel("ViewContent", {
      content_name: box.name_en,
      content_ids: [box.id],
      content_type: "product",
      value: box.price,
      currency: "EGP",
    }, eventId);

    // Server-side CAPI — same event_id for deduplication
    submitTrackCapiEvent({
      data: {
        event_name:   "ViewContent",
        event_id:     eventId,
        value:        box.price,
        currency:     "EGP",
        content_ids:  [box.id],
        content_name: box.name_en,
        content_type: "product",
        fbp,
        fbc,
        user_agent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
      },
    }).catch((e: unknown) => console.error("[CAPI] ViewContent failed:", e));
  }, [box]);

  // ── Loading / not-found guards ───────────────────────────────────────────────

  if (isBoxLoading) {
    return (
      <Shell>
        <p className="text-muted-foreground">Loading…</p>
      </Shell>
    );
  }
  if (!box) {
    return (
      <Shell>
        <p>Box not found.</p>
      </Shell>
    );
  }

  // ── Derived state ────────────────────────────────────────────────────────────

  const isFixed = box.type === "fixed";
  const cookieCount = box.cookie_count;
  const remaining = cookieCount - totalSelected;
  const canAdd = isFixed || totalSelected === cookieCount;

  const increment = (id: string) => {
    if (totalSelected >= cookieCount) return;
    setSelection((s) => ({ ...s, [id]: (s[id] ?? 0) + 1 }));
  };
  const decrement = (id: string) => {
    setSelection((s) => {
      const next = { ...s };
      if (!next[id]) return s;
      next[id] -= 1;
      if (next[id] <= 0) delete next[id];
      return next;
    });
  };

  // ── Add to cart ──────────────────────────────────────────────────────────────

  const handleAdd = () => {
    if (!canAdd) return;

    let selectedFlavors: CartFlavor[] = [];
    if (isFixed) {
      selectedFlavors = box.box_fixed_flavors.map((bf) => ({
        flavor_id: bf.flavor_id,
        flavor_name: bf.flavors.name_en,
        quantity: bf.quantity,
      }));
    } else {
      selectedFlavors = Object.entries(selection).map(([flavor_id, quantity]) => {
        const f = flavors.find((x) => x.id === flavor_id)!;
        return { flavor_id, flavor_name: f.name_en, quantity };
      });
    }

    // Fixed box: use computed flavor-sum minus discount; fall back to legacy box.price if not configured.
    const unitPrice = isFixed ? (fixedPrice ?? box.price) : byoPrice;

    add({
      box_id: box.id,
      box_slug: box.slug,
      box_name: box.name_en,
      cookie_count: box.cookie_count,
      unit_price: unitPrice,
      quantity: 1,
      selected_flavors: selectedFlavors,
      image_url: box.image_url,
    });

    const addToCartEventId = crypto.randomUUID();
    const { fbp, fbc } = getPixelCookies();

    // Browser pixel (client-side)
    trackPixel("AddToCart", {
      content_name: box.name_en,
      content_ids: [box.id],
      value: unitPrice,
      currency: "EGP",
    }, addToCartEventId);

    // Server-side CAPI — same event_id for deduplication
    submitTrackCapiEvent({
      data: {
        event_name:   "AddToCart",
        event_id:     addToCartEventId,
        value:        unitPrice,
        currency:     "EGP",
        content_ids:  [box.id],
        content_name: box.name_en,
        fbp,
        fbc,
        user_agent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
      },
    }).catch((e: unknown) => console.error("[CAPI] AddToCart failed:", e));

    toast.success(t("cta.add_to_cart") + " ✓");
    navigate({ to: "/cart" });
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <Shell>
      <Link to="/boxes" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> {t("nav.boxes")}
      </Link>

      <div className="mt-6 grid gap-10 lg:grid-cols-[5fr_7fr]">
        {/* Left column — image + info + price summary */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <div
            className="aspect-square w-full overflow-hidden rounded-3xl shadow-[var(--shadow-card)]"
            style={{
              background: box.image_url
                ? `url(${box.image_url}) center/cover`
                : "var(--gradient-hero)",
            }}
          />
          <div className="mt-5 flex flex-wrap gap-2">
            <Badge variant={isFixed ? "gold" : "blue"}>
              {isFixed ? t("box.fixed") : t("box.byo")}
            </Badge>
            {box.is_best_seller && <Badge variant="pink">{t("box.best_seller")}</Badge>}
          </div>
          <h1 className="mt-3 font-display text-4xl">{localizedName(box, locale)}</h1>
          <p className="mt-2 text-muted-foreground">{localizedDesc(box, locale)}</p>

          {/* Price display */}
          <p className="mt-4 font-display text-3xl">
            {isFixed ? (
              // Computed: sum of preset flavors' default prices − box discount; fallback to legacy box.price
              flavorPricesReady
                ? formatCurrency(fixedPrice ?? box.price)
                : <span className="inline-block h-8 w-32 animate-pulse rounded-lg bg-muted align-middle" />
            ) : totalSelected > 0 ? (
              // Active selection — show running total
              formatCurrency(byoPrice)
            ) : !flavorPricesReady || isFlavorsLoading ? (
              // Not yet ready — skeleton, never a stale/fallback value
              <span className="inline-block h-8 w-32 animate-pulse rounded-lg bg-muted align-middle" />
            ) : minFlavorPrice !== null ? (
              // Prices confirmed — show "Starting from …"
              <>
                <span className="block text-base font-normal text-muted-foreground">
                  {t("box.starting_from")}
                </span>
                {formatCurrency(minFlavorPrice * cookieCount)}
              </>
            ) : null}
          </p>
        </div>

        {/* Right column — flavor picker or fixed contents */}
        <div>
          {isFixed ? (
            <FixedContents box={box} resolvedPrices={resolvedFlavorPrices} pricesReady={flavorPricesReady} />
          ) : (
            <BYOPicker
              flavors={flavors}
              resolvedPrices={resolvedFlavorPrices}
              pricesReady={flavorPricesReady}
              selection={selection}
              increment={increment}
              decrement={decrement}
              totalSelected={totalSelected}
              cookieCount={cookieCount}
              remaining={remaining}
            />
          )}
        </div>
      </div>

      {/* Sticky bottom bar */}
      <div className="sticky bottom-0 -mx-4 mt-10 border-t border-border/60 bg-background/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <div className="flex items-center justify-between gap-4">
          {!isFixed && (
            <div className="text-sm">
              <span className="font-semibold">
                {t("byo.selected", { n: totalSelected, total: cookieCount })}
              </span>
              {remaining === 0 && (
                <span className="ms-2 inline-flex items-center gap-1 rounded-full bg-[var(--blue-soft)] px-2 py-0.5 text-xs text-ink">
                  <Check className="h-3 w-3" /> {t("byo.full")}
                </span>
              )}
            </div>
          )}
          {isFixed && <div />}
          <button
            disabled={!canAdd}
            onClick={handleAdd}
            className={cn(
              "inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition-all",
              canAdd
                ? "bg-primary text-primary-foreground shadow-[var(--shadow-soft)] hover:-translate-y-0.5"
                : "cursor-not-allowed bg-muted text-muted-foreground",
            )}
          >
            <ShoppingBag className="h-4 w-4" />
            {t("cta.add_to_cart")}
            {(isFixed ? (fixedPrice ?? box.price) : byoPrice) > 0 && (
              <> — {formatCurrency(isFixed ? (fixedPrice ?? box.price) : byoPrice)}</>
            )}
          </button>
        </div>
      </div>
    </Shell>
  );
}

// ── Shell ──────────────────────────────────────────────────────────────────────

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">{children}</main>
      <SiteFooter />
    </div>
  );
}

// ── BYO Picker ─────────────────────────────────────────────────────────────────

function BYOPicker({
  flavors,
  resolvedPrices,
  pricesReady,
  selection,
  increment,
  decrement,
  totalSelected,
  cookieCount,
  remaining,
}: {
  flavors: Awaited<ReturnType<typeof fetchFlavors>>;
  resolvedPrices: Record<string, number>;
  pricesReady: boolean;
  selection: Record<string, number>;
  increment: (id: string) => void;
  decrement: (id: string) => void;
  totalSelected: number;
  cookieCount: number;
  remaining: number;
}) {
  const { t, locale } = useI18n();
  const pct = Math.min(100, (totalSelected / cookieCount) * 100);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-2xl">{t("byo.choose_flavors")}</h2>
        <span className="text-sm font-semibold">
          {t("byo.selected", { n: totalSelected, total: cookieCount })}
        </span>
      </div>

      {/* Progress bar */}
      <div className="mb-6 h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full transition-[width] duration-300"
          style={{ width: `${pct}%`, background: "var(--gradient-pink-blue)" }}
        />
      </div>

      {/* Flavor grid */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {flavors.map((f) => {
          const qty = selection[f.id] ?? 0;
          const unavailable = f.is_out_of_stock;
          const isFull = remaining === 0;
          const disabledAdd = unavailable || (isFull && qty === 0);
          const flavorPrice = resolvedPrices[f.id] ?? 0;

          return (
            <div
              key={f.id}
              className={cn(
                "flex items-center gap-4 rounded-2xl border p-3 transition-colors",
                qty > 0 ? "border-primary/50 bg-[var(--pink-soft)]" : "border-border/60 bg-card",
                unavailable && "opacity-50",
              )}
            >
              {/* Flavor image */}
              <div
                className="h-16 w-16 shrink-0 rounded-xl"
                style={{
                  background: f.image_url
                    ? `url(${f.image_url}) center/cover`
                    : "var(--gradient-pink-blue)",
                }}
              />

              {/* Flavor info */}
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{localizedName(f, locale)}</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {f.is_limited_edition && <Badge variant="gold">{t("box.limited")}</Badge>}
                  {unavailable && <Badge variant="destructive">{t("box.out_of_stock")}</Badge>}
                </div>
                {f.description_en && (
                  <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                    {localizedDesc(f, locale)}
                  </p>
                )}

                {/* Per-cookie price — shows effective (discounted) price.
                    If a per-box discount is applied the original price is shown crossed out.
                    dir="ltr" fixes RTL BIDI number reordering on Arabic layout. */}
                {!pricesReady ? (
                  <span className="mt-0.5 inline-block h-3 w-16 animate-pulse rounded bg-muted" />
                ) : flavorPrice > 0 ? (
                  <p dir="ltr" className="mt-0.5 flex items-baseline gap-1.5 text-xs font-semibold text-primary">
                    {f.price > flavorPrice && (
                      <span className="font-normal text-muted-foreground line-through">
                        {formatCurrency(f.price)}
                      </span>
                    )}
                    {formatCurrency(flavorPrice)}{" "}
                    <span className="font-normal text-muted-foreground">
                      / {t("box.per_cookie")}
                    </span>
                  </p>
                ) : null}
              </div>

              {/* +/− stepper */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => decrement(f.id)}
                  disabled={qty === 0}
                  className="grid h-8 w-8 place-items-center rounded-full border border-border bg-card disabled:opacity-30"
                  aria-label="decrease"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="w-5 text-center text-sm font-semibold">{qty}</span>
                <button
                  type="button"
                  onClick={() => increment(f.id)}
                  disabled={disabledAdd}
                  className="grid h-8 w-8 place-items-center rounded-full bg-primary text-primary-foreground disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
                  aria-label="increase"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Fixed box contents ─────────────────────────────────────────────────────────

function FixedContents({
  box,
  resolvedPrices,
  pricesReady,
}: {
  box: NonNullable<Awaited<ReturnType<typeof fetchBoxBySlug>>>;
  resolvedPrices: Record<string, number>;
  pricesReady: boolean;
}) {
  const { t, locale } = useI18n();
  return (
    <div>
      <h2 className="mb-4 font-display text-2xl">{t("byo.fixed_includes")}</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {box.box_fixed_flavors.map((bf) => {
          const basePrice = Number(bf.flavors.price ?? 0);
          const effectivePrice = resolvedPrices[bf.flavor_id] ?? 0;
          const hasDiscount = pricesReady && basePrice > effectivePrice && effectivePrice > 0;

          return (
            <div
              key={bf.flavor_id}
              className="flex items-center gap-4 rounded-2xl border border-border/60 bg-card p-3"
            >
              <div
                className="h-16 w-16 shrink-0 rounded-xl"
                style={{
                  background: bf.flavors.image_url
                    ? `url(${bf.flavors.image_url}) center/cover`
                    : "var(--gradient-pink-blue)",
                }}
              />
              <div className="flex-1">
                <p className="font-semibold">{localizedName(bf.flavors, locale)}</p>
                <p className="text-xs text-muted-foreground">×{bf.quantity}</p>

                {/* Per-cookie price with discount indicator */}
                {!pricesReady ? (
                  <span className="mt-0.5 inline-block h-3 w-16 animate-pulse rounded bg-muted" />
                ) : effectivePrice > 0 ? (
                  <p dir="ltr" className="mt-0.5 flex items-baseline gap-1.5 text-xs font-semibold text-primary">
                    {hasDiscount && (
                      <span className="font-normal text-muted-foreground line-through">
                        {formatCurrency(basePrice)}
                      </span>
                    )}
                    {formatCurrency(effectivePrice)}{" "}
                    <span className="font-normal text-muted-foreground">/ {t("box.per_cookie")}</span>
                  </p>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
