import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { Badge } from "@/components/brand-badge";
import { useI18n } from "@/lib/i18n";
import {
  fetchProductBySlug,
  localizedName,
  localizedDesc,
} from "@/lib/storefront";
import { formatCurrency } from "@/lib/cart";

export const Route = createFileRoute("/products/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.slug.replace(/-/g, " ")} — NYC Cookies` },
      { name: "description", content: "NYC Cookies product." },
    ],
  }),
  component: ProductDetail,
});

function ProductDetail() {
  const { slug } = Route.useParams();
  const { t, locale } = useI18n();

  const { data: product, isLoading } = useQuery({
    queryKey: ["product", slug],
    queryFn: () => fetchProductBySlug(slug),
  });

  if (isLoading) {
    return (
      <Shell>
        <p className="text-muted-foreground">Loading…</p>
      </Shell>
    );
  }
  if (!product) {
    return (
      <Shell>
        <p>Product not found.</p>
      </Shell>
    );
  }

  const assignedFlavors = product.product_flavors ?? [];

  return (
    <Shell>
      <Link
        to="/products"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> {t("section.products")}
      </Link>

      <div className="mt-6 grid gap-10 lg:grid-cols-[5fr_7fr]">
        <div className="lg:sticky lg:top-24 lg:self-start">
          <div
            className="aspect-square w-full overflow-hidden rounded-3xl shadow-[var(--shadow-card)]"
            style={{
              background: product.image_url
                ? `url(${product.image_url}) center/cover`
                : "var(--gradient-hero)",
            }}
          />
          <div className="mt-5 flex flex-wrap gap-2">
            {product.is_best_seller && (
              <Badge variant="pink">{t("box.best_seller")}</Badge>
            )}
          </div>
          <h1 className="mt-3 font-display text-4xl">{localizedName(product, locale)}</h1>
          {product.description_en && (
            <p className="mt-2 text-muted-foreground">{localizedDesc(product, locale)}</p>
          )}
          <p className="mt-4 font-display text-3xl">{formatCurrency(product.price)}</p>
        </div>

        <div>
          {assignedFlavors.length > 0 ? (
            <div>
              <h2 className="mb-4 font-display text-2xl">{t("product.flavors_title")}</h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {assignedFlavors
                  .sort((a, b) => a.sort_order - b.sort_order)
                  .map((pf) => {
                    const f = pf.flavors;
                    return (
                      <div
                        key={pf.flavor_id}
                        className="flex items-center gap-4 rounded-2xl border border-border/60 bg-card p-3"
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
                          <div className="flex items-center gap-1.5">
                            <p className="truncate font-semibold">{localizedName(f, locale)}</p>
                            {f.is_limited_edition && (
                              <Badge variant="gold">{t("box.limited")}</Badge>
                            )}
                            {f.is_out_of_stock && (
                              <Badge variant="destructive">{t("box.out_of_stock")}</Badge>
                            )}
                          </div>
                          {f.description_en && (
                            <p className="line-clamp-2 text-xs text-muted-foreground">
                              {localizedDesc(f, locale)}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground">{t("product.no_flavors")}</p>
          )}
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
