import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState, useEffect } from "react";
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
import { trackPixel } from "@/lib/meta-pixel";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/boxes/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.slug.replace(/-/g, " ")} — NYC Cookies` },
      { name: "description", content: "Customize your NYC Cookies box with any flavors." },
    ],
  }),
  component: BoxDetail,
});

function BoxDetail() {
  const { slug } = Route.useParams();
  const { t, locale } = useI18n();
  const navigate = useNavigate();
  const { add } = useCart();

  const { data: box, isLoading } = useQuery({
    queryKey: ["box", slug],
    queryFn: () => fetchBoxBySlug(slug),
  });
  const { data: flavors = [], isLoading: isFlavorsLoading } = useQuery({
    queryKey: ["flavors"],
    queryFn: fetchFlavors,
  });

  // Box-specific flavor prices from flavor_box_prices table
  const { data: boxFlavorPrices = {} } = useQuery({
    queryKey: ["flavor-box-prices", box?.id],
    queryFn: () => fetchFlavorPricesForBox(box!.id),
    enabled: !!box?.id,
  });

  // Resolved price per flavor — three-level fallback:
  // 1. flavor_box_prices[flavor_id]  — box-specific per-flavor override (most precise)
  // 2. flavors.price                 — flavor's own base price (if > 0)
  // 3. box.price / cookie_count      — even split of the box total price per cookie
  //    This guarantees a non-zero price as long as the box itself has a price set,
  //    which fixes the case where flavor_box_prices and flavors.price are both empty/zero.
  const resolvedFlavorPrices = useMemo<Record<string, number>>(() => {
    const perCookieFallback =
      box && box.cookie_count > 0 && box.price > 0
        ? box.price / box.cookie_count
        : 0;
    const map: Record<string, number> = {};
    flavors.forEach((f) => {
      const boxSpecific = boxFlavorPrices[f.id];
      const flavorBase = Number(f.price) > 0 ? Number(f.price) : undefined;
      map[f.id] = boxSpecific ?? flavorBase ?? perCookieFallback;
    });
    return map;
  }, [flavors, boxFlavorPrices, box]);

  const [selection, setSelection] = useState<Record<string, number>>({});

  useEffect(() => {
    setSelection({});
  }, [slug]);

  const totalSelected = useMemo(
    () => Object.values(selection).reduce((s, n) => s + n, 0),
    [selection],
  );

  const byoPrice = useMemo(() => {
    return Object.entries(selection).reduce((total, [flavor_id, qty]) => {
      return total + (resolvedFlavorPrices[flavor_id] ?? 0) * qty;
    }, 0);
  }, [selection, resolvedFlavorPrices]);

  const minByoPrice = useMemo(() => {
    const prices = Object.values(resolvedFlavorPrices).filter((p) => p > 0);
    return prices.length > 0 ? Math.min(...prices) : null;
  }, [resolvedFlavorPrices]);

  useEffect(() => {
    if (box) {
      trackPixel("ViewContent", {
        content_name: box.name_en,
        content_ids: [box.id],
        content_type: "product",
        value: box.price,
        currency: "USD",
      });
    }
  }, [box]);

  if (isLoading) {
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

    const unitPrice = isFixed ? box.price : byoPrice;

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

    trackPixel("AddToCart", {
      content_name: box.name_en,
      content_ids: [box.id],
      value: unitPrice,
      currency: "USD",
    });

    toast.success(t("cta.add_to_cart") + " ✓");
    navigate({ to: "/cart" });
  };

  return (
    <Shell>
      <Link to="/boxes" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> {t("nav.boxes")}
      </Link>

      <div className="mt-6 grid gap-10 lg:grid-cols-[5fr_7fr]">
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

          {/* Price display — always visible */}
          <p className="mt-4 font-display text-3xl">
            {isFixed ? (
              formatCurrency(box.price)
            ) : totalSelected > 0 ? (
              formatCurrency(byoPrice)
            ) : minByoPrice !== null ? (
              <>
                <span className="block text-base font-normal text-muted-foreground">
                  {t("box.starting_from")}
                </span>
                {formatCurrency(minByoPrice * cookieCount)}
              </>
            ) : isFlavorsLoading ? (
              <span className="inline-block h-5 w-24 animate-pulse rounded bg-muted align-middle" />
            ) : null}
          </p>
        </div>

        <div>
          {isFixed ? (
            <FixedContents box={box} />
          ) : (
            <BYOPicker
              flavors={flavors}
              resolvedPrices={resolvedFlavorPrices}
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
            {(isFixed ? box.price : byoPrice) > 0 && (
              <> — {formatCurrency(isFixed ? box.price : byoPrice)}</>
            )}
          </button>
        </div>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">{children}</main>
      <SiteFooter />
    </div>
  );
}

function BYOPicker({
  flavors,
  resolvedPrices,
  selection,
  increment,
  decrement,
  totalSelected,
  cookieCount,
  remaining,
}: {
  flavors: Awaited<ReturnType<typeof fetchFlavors>>;
  resolvedPrices: Record<string, number>;
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
      <div className="mb-6 h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full transition-[width] duration-300"
          style={{ width: `${pct}%`, background: "var(--gradient-pink-blue)" }}
        />
      </div>
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
                qty > 0
                  ? "border-primary/50 bg-[var(--pink-soft)]"
                  : "border-border/60 bg-card",
                unavailable && "opacity-50",
              )}
            >
              <div
                className="h-16 w-16 shrink-0 rounded-xl"
                style={{
                  background: f.image_url
                    ? `url(${f.image_url}) center/cover`
                    : "var(--gradient-pink-blue)",
                }}
              />
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
                {/* Show price per cookie — visible on all screen sizes */}
                {flavorPrice > 0 && (
                  <p className="mt-0.5 text-xs font-semibold text-primary">
                    {formatCurrency(flavorPrice)} / cookie
                  </p>
                )}
              </div>
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

function FixedContents({
  box,
}: {
  box: NonNullable<Awaited<ReturnType<typeof fetchBoxBySlug>>>;
}) {
  const { t, locale } = useI18n();
  return (
    <div>
      <h2 className="mb-4 font-display text-2xl">{t("byo.fixed_includes")}</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {box.box_fixed_flavors.map((bf) => (
          <div
            key={bf.flavor_id}
            className="flex items-center gap-4 rounded-2xl border border-border/60 bg-card p-3"
          >
            <div
              className="h-16 w-16 rounded-xl"
              style={{
                background: bf.flavors.image_url
                  ? `url(${bf.flavors.image_url}) center/cover`
                  : "var(--gradient-pink-blue)",
              }}
            />
            <div className="flex-1">
              <p className="font-semibold">{localizedName(bf.flavors, locale)}</p>
              <p className="text-xs text-muted-foreground">×{bf.quantity}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
