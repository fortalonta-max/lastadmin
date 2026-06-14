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

export const Route = createFileRoute("/buildbox")({
  head: () => ({
    meta: [
      { title: "Build Your Box — Leen Bakery" },
      { name: "description", content: "Choose your box size and mix any flavors you like. Build your perfect cookie box." },
      { property: "og:title", content: "Build Your Box — Leen Bakery" },
      { property: "og:description", content: "Pick your size, mix any flavors. You're the chef." },
    ],
  }),
  component: BuildBoxPage,
});

function BuildBoxPage() {
  const { t, locale } = useI18n();
  const { data: allBoxes = [], isLoading } = useQuery({ queryKey: ["boxes"], queryFn: fetchBoxes });

  const { data: priceRanges = {} } = useQuery({
    queryKey: ["byo-price-ranges"],
    queryFn: fetchByoPriceRangePerBox,
  });

  const boxes = allBoxes.filter((b) => b.type === "byo");

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main>
        <div
          className="border-b border-border/60 py-12"
          style={{ background: "var(--gradient-hero)" }}
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-foreground/60">
              {t("box.byo")}
            </p>
            <h1 className="mt-2 font-display text-4xl sm:text-5xl">{t("section.byo")}</h1>
            <p className="mt-3 max-w-md text-sm text-foreground/70">{t("section.byo_sub")}</p>
            <Link
              to="/boxes"
              className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-foreground/60 transition-colors hover:text-foreground"
            >
              Prefer a chef-curated box? <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
          {isLoading ? (
            <div className="py-20 text-center text-sm text-muted-foreground">Loading…</div>
          ) : boxes.length === 0 ? (
            <div className="py-20 text-center text-sm text-muted-foreground">No build-your-own boxes available yet.</div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3">
              {boxes.map((b) => {
                const lowestFlavorPrice = priceRanges[b.id]?.min ?? 0;
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
          <div className="h-full w-full" style={{ background: "var(--gradient-pink-blue)" }} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
        {b.is_best_seller && (
          <span className="absolute left-2 top-2 sm:left-3 sm:top-3">
            <Badge variant="pink">{t("box.best_seller")}</Badge>
          </span>
        )}
        <span className="absolute right-2 top-2 sm:right-3 sm:top-3">
          <Badge variant="blue">{t("box.byo")}</Badge>
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
            {/* If flavor_box_prices has no entries, fall back to b.price */}
            {(() => {
              const displayPrice = startingPrice > 0 ? startingPrice : b.price;
              return displayPrice > 0 ? (
                <p className="font-display text-sm sm:text-xl">
                  <span className="block text-[10px] font-normal text-muted-foreground sm:text-xs">
                    {t("box.starting_from")}
                  </span>
                  {formatCurrency(displayPrice)}
                </p>
              ) : null;
            })()}
          </div>
          <span className="shrink-0 rounded-full bg-foreground px-2.5 py-1 text-[10px] font-semibold text-background transition-transform group-hover:translate-x-0.5 sm:px-3 sm:py-1.5 sm:text-xs">
            {t("cta.build")} →
          </span>
        </div>
      </div>
    </Link>
  );
}
