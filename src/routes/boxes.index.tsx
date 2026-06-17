import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { Badge } from "@/components/brand-badge";
import { useI18n } from "@/lib/i18n";
import {
  fetchBoxes,
  fetchByoPriceRangePerBox,
  localizedName,
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

  const { data: priceRanges = {} } = useQuery({
    queryKey: ["byo-price-ranges"],
    queryFn: fetchByoPriceRangePerBox,
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
              {allBoxes.map((b) => {
                const lowestFlavorPrice = b.type === "byo" ? (priceRanges[b.id]?.min ?? 0) : 0;
                const startingPrice = lowestFlavorPrice > 0 ? lowestFlavorPrice * b.cookie_count : 0;
                const fixedPrice = b.type === "fixed" ? priceRanges[b.id]?.fixedPrice : undefined;
                return (
                  <BoxCard
                    key={b.id}
                    box={b}
                    locale={locale}
                    t={t}
                    startingPrice={startingPrice}
                    fixedPrice={fixedPrice}
                  />
                );
              })}
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
  startingPrice,
  fixedPrice,
}: {
  box: Box;
  locale: "en" | "ar";
  t: (key: string) => string;
  startingPrice: number;
  fixedPrice?: number;
}) {
  const isByo = b.type === "byo";
  // BYO: use computed starting price (lowest effective flavor × cookie_count); fallback to legacy box.price.
  // Fixed: use computed fixedPrice (sum of effective flavor prices); fallback to legacy box.price.
  const displayPrice = isByo
    ? (startingPrice > 0 ? startingPrice : b.price)
    : (fixedPrice && fixedPrice > 0 ? fixedPrice : b.price);

  return (
    <Link
      to="/boxes/$slug"
      params={{ slug: b.slug }}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-card transition-all duration-200 hover:-translate-y-1 hover:border-primary/20 hover:shadow-[var(--shadow-card)]"
    >
      {/* Fixed-ratio image area with object-contain: uniform card size, zero cropping */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted/40">
        {b.image_url ? (
          <img
            src={b.image_url}
            alt={localizedName(b, locale)}
            className="h-full w-full object-contain"
          />
        ) : (
          <div className="h-full w-full" style={{ background: "var(--gradient-hero)" }} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
        {b.is_best_seller && (
          <span className="absolute left-2 top-2 sm:left-3 sm:top-3">
            <Badge variant="pink">{t("box.best_seller")}</Badge>
          </span>
        )}
        <span className="absolute right-2 top-2 sm:right-3 sm:top-3">
          <Badge variant={isByo ? "blue" : "gold"}>
            {isByo ? t("box.byo") : t("box.fixed")}
          </Badge>
        </span>
      </div>

      {/* Card body */}
      <div className="flex flex-1 flex-col p-3 sm:p-4">
        <h2 className="font-display text-sm leading-snug sm:text-xl">
          {localizedName(b, locale)}
        </h2>
        <p className="mt-0.5 text-[11px] text-muted-foreground sm:text-sm">
          {b.cookie_count} {t("box.cookies")}
        </p>

        {/* Price — always visible on all screen sizes */}
        <div className="mt-auto flex items-end justify-between gap-2 pt-3">
          <div>
            {displayPrice > 0 && (
              <p className="font-display text-sm sm:text-xl">
                {isByo && (
                  <span className="block text-[10px] font-normal text-muted-foreground sm:text-xs">
                    {t("box.starting_from")}
                  </span>
                )}
                {formatCurrency(displayPrice)}
              </p>
            )}
          </div>
          <span className="shrink-0 rounded-full bg-[var(--pink)] px-2.5 py-1 text-[10px] font-semibold text-ink transition-transform group-hover:translate-x-0.5 sm:px-3 sm:py-1.5 sm:text-xs">
            {t("cta.view")} →
          </span>
        </div>
      </div>
    </Link>
  );
}
