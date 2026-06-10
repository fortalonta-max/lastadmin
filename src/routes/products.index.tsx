import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { Badge } from "@/components/brand-badge";
import { useI18n } from "@/lib/i18n";
import { fetchProducts, localizedName, localizedDesc } from "@/lib/storefront";
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
    queryFn: fetchProducts,
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
            {products.map((p) => (
              <Link
                key={p.id}
                to="/products/$slug"
                params={{ slug: p.slug }}
                className="group overflow-hidden rounded-3xl border border-border/60 bg-card transition-all hover:-translate-y-1 hover:shadow-[var(--shadow-card)]"
              >
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
                  <p className="mt-4 font-display text-2xl">{formatCurrency(p.price)}</p>
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
