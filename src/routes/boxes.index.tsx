import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { Badge } from "@/components/brand-badge";
import { useI18n } from "@/lib/i18n";
import {
  fetchBoxes,
  fetchByoPriceRangePerBox,
  fetchDefaultFlavorPriceRange,
  localizedName,
  localizedDesc,
  type Box,
} from "@/lib/storefront";
import { formatCurrency } from "@/lib/cart";

export const Route = createFileRoute("/boxes/")({
  head: () => ({
    meta: [
      { title: "All Boxes — Leen Bakery" },
      { name: "description", content: "Browse all our cookie boxes — chef-curated picks and build-your-own options." },
      { property: "og:title", content: "All Boxes — Leen Bakery" },
      { property: "og:description", content: "Chef's picks and build-your-own cookie boxes." },
    ],
  }),
  component: BoxesPage,
});

function BoxesPage() {
  const { t, locale } = useI18n();
  const { data: allBoxes = [], isLoading } = useQuery({ queryKey: ["boxes"], queryFn: fetchBoxes });
  const { data: byoPrices = {} } = useQuery({
    queryKey: ["byo-price-range"],
    queryFn: fetchByoPriceRangePerBox,
  });
  const { data: defaultRange = { min: 0, max: 0 } } = useQuery({
    queryKey: ["default-flavor-range"],
    queryFn: fetchDefaultFlavorPriceRange,
  });

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main>
        <div className="border-b border-border/60 py-12" style={{ background: "var(--gradient-hero)" }}>
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-foreground/60">
              {t("section.boxes")}
            </p>
            <h1 className="mt-2 font-display text-4xl sm:text-5xl">All Boxes</h1>
            <p className="mt-3 max-w-md text-sm text-foreground/70">
              Chef-curated picks and build-your-own options — all in one place.
            </p>
            <Link
              to="/buildbox"
              className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-foreground/60 transition-colors hover:text-foreground"
            >
              {t("cta.build")} <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
          {isLoading ? (
            <div className="py-20 text-center text-sm text-muted-foreground">Loading…</div>
          ) : allBoxes.length === 0 ? (
            <div className="py-20 text-center text-sm text-muted-foreground">No boxes available yet.</div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3">
              {allBoxes.map((b) => (
                <BoxCard
                  key={b.id}
                  box={b}
                  locale={locale}
                  t={t}
                  byoPrices={byoPrices}
                  defaultRange={defaultRange}
                />
              ))}
            </div>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function BoxCard({
  box: b,
  locale,
  t,
  byoPrices,
  defaultRange,
}: {
  box: Box;
  locale: "en" | "ar";
  t: (key: string) => string;
  byoPrices: Record<string, { min: number; max: number }>;
  defaultRange: { min: number; max: number };
}) {
  const isByo = b.type === "byo";

  // Per-box price range → fallback to global default flavor range
  const priceRange = byoPrices[b.id] ?? defaultRange;
  const minFlavorPrice = priceRange.min;
  const maxFlavorPrice = priceRange.max;

  const startingPrice = isByo && minFlavorPrice > 0 ? minFlavorPrice * b.cookie_count : null;
  const comparePrice =
    isByo && b.sale_enabled && maxFlavorPrice > 0 ? maxFlavorPrice * b.cookie_count : null;

  return (
    <Link
      to="/boxes/$slug"
      params={{ slug: b.slug }}
      className="group overflow-hidden rounded-2xl border border-border/60 bg-card transition-all duration-200 hover:-translate-y-1 hover:border-primary/20 hover:shadow-[var(--shadow-card)]"
    >
      <div
        className="relative aspect-[3/2] overflow-hidden sm:aspect-[4/3]"
        style={{
          background: b.image_url ? `url(${b.image_url}) center/cover` : "var(--gradient-hero)",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
        {b.is_best_seller && (
          <span className="absolute left-2 top-2 sm:left-4 sm:top-4">
            <Badge variant="pink">{t("box.best_seller")}</Badge>
          </span>
        )}
        <span className="absolute right-2 top-2 sm:right-4 sm:top-4">
          <Badge variant={isByo ? "blue" : "gold"}>
            {isByo ? t("box.byo") : t("box.fixed")}
          </Badge>
        </span>
      </div>
      <div className="p-3 sm:p-5">
        <h2 className="font-display text-base sm:text-2xl">{localizedName(b, locale)}</h2>
        <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
          {b.cookie_count} {t("box.cookies")}
        </p>
        {b.description_en && (
          <p className="mt-1 hidden line-clamp-2 text-xs text-muted-foreground sm:mt-2 sm:block sm:text-sm">
            {localizedDesc(b, locale)}
          </p>
        )}
        <div className="mt-2 flex items-center justify-between sm:mt-4">
          <div>
            {isByo && startingPrice !== null ? (
              <>
                {comparePrice !== null && (
                  <p className="text-sm font-bold text-destructive line-through sm:text-base">
                    {formatCurrency(comparePrice)}
                  </p>
                )}
                <p className="font-display text-base sm:text-2xl">
                  <span className="hidden sm:inline text-sm font-normal text-muted-foreground">
                    {t("box.starting_from")}{" "}
                  </span>
                  {formatCurrency(startingPrice)}
                </p>
              </>
            ) : !isByo ? (
              <p className="font-display text-base sm:text-2xl">{formatCurrency(b.price)}</p>
            ) : null}
          </div>
          <span className="rounded-full bg-[var(--pink)] px-2 py-1 text-[10px] font-semibold text-ink transition-transform group-hover:translate-x-0.5 sm:px-4 sm:py-2 sm:text-xs">
            {t("cta.view")} →
          </span>
        </div>
      </div>
    </Link>
  );
}
