import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { Badge } from "@/components/brand-badge";
import { useI18n } from "@/lib/i18n";
import { fetchProjects, localizedName, localizedDesc } from "@/lib/storefront";
import { formatCurrency } from "@/lib/cart";

export const Route = createFileRoute("/products/")({
  head: () => ({
    meta: [
      { title: "All Products — NYC Cookies" },
      { name: "description", content: "Browse all NYC Cookies products." },
    ],
  }),
  component: ProductsPage,
});

function ProductsPage() {
  const { t, locale } = useI18n();
  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: fetchProjects,
  });

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <header className="mb-10">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">
            {t("section.products")}
          </p>
          <h1 className="mt-2 font-display text-4xl sm:text-5xl">{t("section.products")}</h1>
        </header>

        {isLoading ? (
          <div className="text-muted-foreground">Loading…</div>
        ) : products.length === 0 ? (
          <p className="text-muted-foreground">{t("admin.no_data")}</p>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((p) => {
              const isInternal = p.product_type === "internal";
              const card = (
                <div className="overflow-hidden rounded-3xl border border-border/60 bg-card transition-all hover:-translate-y-1 hover:shadow-[var(--shadow-card)]">
                  <div
                    className="relative aspect-[4/3]"
                    style={{
                      background: p.image_url
                        ? `url(${p.image_url}) center/cover`
                        : "var(--gradient-hero)",
                    }}
                  >
                    {p.is_best_seller && (
                      <span className="absolute right-4 top-4">
                        <Badge variant="pink">{t("box.best_seller")}</Badge>
                      </span>
                    )}
                  </div>
                  <div className="p-5">
                    <h2 className="font-display text-2xl">{localizedName(p, locale)}</h2>
                    {p.description_en && (
                      <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                        {localizedDesc(p, locale)}
                      </p>
                    )}
                    <div className="mt-4 flex items-center justify-between gap-3">
                      {p.price > 0 && (
                        <p className="font-display text-2xl">{formatCurrency(p.price)}</p>
                      )}
                      {!isInternal && p.link_url && (
                        <span className="ms-auto inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <ExternalLink className="h-3 w-3" /> External
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );

              return isInternal ? (
                <Link key={p.id} to="/products/$slug" params={{ slug: p.slug }} className="group">
                  {card}
                </Link>
              ) : (
                <a
                  key={p.id}
                  href={p.link_url ?? "#"}
                  target="_blank"
                  rel="noreferrer"
                  className="group"
                >
                  {card}
                </a>
              );
            })}
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
