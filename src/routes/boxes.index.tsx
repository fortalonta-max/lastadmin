import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { Badge } from "@/components/brand-badge";
import { useI18n } from "@/lib/i18n";
import { fetchBoxes, localizedName, localizedDesc } from "@/lib/storefront";
import { formatCurrency } from "@/lib/cart";

export const Route = createFileRoute("/boxes/")({
  head: () => ({
    meta: [
      { title: "Cookie Boxes — NYC Cookies" },
      { name: "description", content: "Browse all NYC Cookies boxes. Box of 4, 6, 9, 12 and chef-curated picks." },
      { property: "og:title", content: "Cookie Boxes — NYC Cookies" },
      { property: "og:description", content: "Pick your size. Mix any flavors." },
    ],
  }),
  component: BoxesPage,
});

function BoxesPage() {
  const { t, locale } = useI18n();
  const { data: boxes = [], isLoading } = useQuery({ queryKey: ["boxes"], queryFn: fetchBoxes });

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <header className="mb-10">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">
            {t("section.boxes")}
          </p>
          <h1 className="mt-2 font-display text-4xl sm:text-5xl">All boxes</h1>
        </header>
        {isLoading ? (
          <div className="text-muted-foreground">Loading…</div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {boxes.map((b) => (
              <Link
                key={b.id}
                to="/boxes/$slug"
                params={{ slug: b.slug }}
                className="group overflow-hidden rounded-3xl border border-border/60 bg-card transition-all hover:-translate-y-1 hover:shadow-[var(--shadow-card)]"
              >
                <div
                  className="relative aspect-[4/3]"
                  style={{
                    background: b.image_url
                      ? `url(${b.image_url}) center/cover`
                      : "var(--gradient-hero)",
                  }}
                >
                  <span className="absolute left-4 top-4">
                    <Badge variant={b.type === "fixed" ? "gold" : "blue"}>
                      {b.type === "fixed" ? t("box.fixed") : t("box.byo")}
                    </Badge>
                  </span>
                  {b.is_best_seller && (
                    <span className="absolute right-4 top-4">
                      <Badge variant="pink">{t("box.best_seller")}</Badge>
                    </span>
                  )}
                </div>
                <div className="p-5">
                  <h2 className="font-display text-2xl">{localizedName(b, locale)}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {b.cookie_count} {t("box.cookies")}
                  </p>
                  {b.description_en && (
                    <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                      {localizedDesc(b, locale)}
                    </p>
                  )}
                  <p className="mt-4 font-display text-2xl">{formatCurrency(b.price)}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
