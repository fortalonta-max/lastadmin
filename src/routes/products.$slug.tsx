import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { Badge } from "@/components/brand-badge";
import { useI18n } from "@/lib/i18n";
import { fetchProjectBySlug, localizedName, localizedDesc } from "@/lib/storefront";
import { formatCurrency } from "@/lib/cart";

export const Route = createFileRoute("/products/$slug")({
  loader: async ({ params, context }) => {
    try {
      const product = await (context as { queryClient: { ensureQueryData: (o: { queryKey: unknown[]; queryFn: () => unknown }) => Promise<unknown> } }).queryClient.ensureQueryData({
        queryKey: ["project", params.slug],
        queryFn: () => fetchProjectBySlug(params.slug),
      });
      return { product: product as Awaited<ReturnType<typeof fetchProjectBySlug>> };
    } catch {
      return { product: null };
    }
  },
  head: ({ params, loaderData }) => {
    const product = loaderData?.product;
    const name = product?.name_en ?? params.slug.replace(/-/g, " ");
    const desc = product?.description_en ?? "Leen Bakery product.";
    const img = product?.image_url ?? (import.meta.env.VITE_OG_IMAGE_URL as string | undefined) ?? "";
    return {
      meta: [
        { title: `${name} — Leen Bakery` },
        { name: "description", content: desc },
        { property: "og:title", content: name },
        { property: "og:description", content: desc },
        { property: "og:type", content: "product" },
        ...(img ? [
          { property: "og:image", content: img },
          { property: "og:image:width", content: "1200" },
          { property: "og:image:height", content: "630" },
          { property: "og:image:alt", content: name },
          { name: "twitter:card", content: "summary_large_image" },
          { name: "twitter:image", content: img },
        ] : []),
      ],
    };
  },
  component: ProductDetail,
});

function ProductDetail() {
  const { slug } = Route.useParams();
  const { t, locale } = useI18n();

  const { data: product, isLoading } = useQuery({
    queryKey: ["project", slug],
    queryFn: () => fetchProjectBySlug(slug),
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

  return (
    <Shell>
      <Link
        to="/products"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> {t("section.products")}
      </Link>

      <div className="mt-6 grid gap-10 lg:grid-cols-[5fr_7fr]">
        {/* Left: image */}
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
        </div>

        {/* Right: details */}
        <div className="flex flex-col gap-5">
          <div>
            <h1 className="font-display text-4xl">{localizedName(product, locale)}</h1>
            {product.description_en && (
              <p className="mt-3 text-muted-foreground leading-relaxed">
                {localizedDesc(product, locale)}
              </p>
            )}
          </div>

          {product.price > 0 && (
            <p className="font-display text-3xl">{formatCurrency(product.price)}</p>
          )}

          {product.link_url && (
            <a
              href={product.link_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex w-fit items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              View product <ExternalLink className="h-4 w-4" />
            </a>
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
