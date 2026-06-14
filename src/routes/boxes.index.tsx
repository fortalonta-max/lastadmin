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
            /* Single column on mobile so each card has full width for image + all text */
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 items-start">
              {allBoxes.map((b) => {
                const lowestFlavorPrice = b.type === "byo" ? (priceRanges[b.id]?.min ?? 0) : 0;
                const startingPrice = lowestFlavorPrice > 0 ? lowestFlavorPrice * b.cookie_count : 0;
                return (
                  <BoxCard
                    key={b.id}
                    box={b}
                    locale={locale}
                    t={t}
                    startingPrice={startingPrice}
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
}: {
  box: Box;
  locale: "en" | "ar";
  t: (key: string) => string;
  startingPrice: number;
}) {
  const isByo = b.type === "byo";
  const displayPrice = isByo ? startingPrice : b.price;

  return (
    <Link
      to="/boxes/$slug"
      params={{ slug: b.slug }}
      className="group overflow-hidden rounded-2xl border border-border/60 bg-card transition-all duration-200 hover:-translate-y-1 hover:border-primary/20 hover:shadow-[var(--shadow-card)]"
    >
      {/* Image: no fixed aspect ratio — renders at exact uploaded dimensions, no cropping */}
      <div className="relative overflow-hidden">
        {b.image_url ? (
          <img
            src={b.image_url}
            alt={localizedName(b, locale)}
            className="w-full h-auto block"
          />
        ) : (
          <div
            className="aspect-[4/3] w-full"
            style={{ background: "var(--gradient-hero)" }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
        {b.is_best_seller && (
          <span className="absolute left-3 top-3">
            <Badge variant="pink">{t("box.best_seller")}</Badge>
          </span>
        )}
        <span className="absolute right-3 top-3">
          <Badge variant={isByo ? "blue" : "gold"}>
            {isByo ? t("box.byo") : t("box.fixed")}
          </Badge>
        </span>
      </div>

      {/* Card body: all details always visible, nothing hidden or truncated */}
      <div className="p-4 sm:p-5">
        <h2 className="font-display text-xl sm:text-2xl">{localizedName(b, locale)}</h2>
        <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
          {b.cookie_count} {t("box.cookies")}
        </p>
        {b.description_en && (
          <p className="mt-2 text-sm text-muted-foreground">
            {localizedDesc(b, locale)}
          </p>
        )}
        <div className="mt-4 flex items-center justify-between gap-3">
          <div>
            {displayPrice > 0 && (
              <p className="font-display text-xl sm:text-2xl">
                {isByo && (
                  <span className="block text-xs font-normal text-muted-foreground sm:text-sm">
                    {t("box.starting_from")}
                  </span>
                )}
                {formatCurrency(displayPrice)}
              </p>
            )}
          </div>
          <span className="shrink-0 rounded-full bg-[var(--pink)] px-3 py-1.5 text-xs font-semibold text-ink transition-transform group-hover:translate-x-0.5 sm:px-4 sm:py-2">
            {t("cta.view")} →
          </span>
        </div>
      </div>
    </Link>
  );
}
