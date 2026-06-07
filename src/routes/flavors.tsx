import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { Badge } from "@/components/brand-badge";
import { useI18n } from "@/lib/i18n";
import { fetchFlavors, localizedName, localizedDesc } from "@/lib/storefront";

export const Route = createFileRoute("/flavors")({
  head: () => ({
    meta: [
      { title: "Cookie Flavors — NYC Cookies" },
      { name: "description", content: "All NYC Cookies flavors — classic chocolate chip, triple chocolate, red velvet, Lotus Biscoff, Nutella, Oreo, and more." },
    ],
  }),
  component: FlavorsPage,
});

function FlavorsPage() {
  const { t, locale } = useI18n();
  const { data: flavors = [] } = useQuery({ queryKey: ["flavors"], queryFn: fetchFlavors });
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <header className="mb-10">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">
            {t("section.flavors")}
          </p>
          <h1 className="mt-2 font-display text-4xl sm:text-5xl">Every flavor we bake</h1>
        </header>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {flavors.map((f) => (
            <article
              key={f.id}
              className="rounded-2xl border border-border/60 bg-card p-5"
            >
              <div
                className="mb-4 aspect-square rounded-xl"
                style={{
                  background: f.image_url
                    ? `url(${f.image_url}) center/cover`
                    : "var(--gradient-pink-blue)",
                }}
              />
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-display text-lg">{localizedName(f, locale)}</h2>
                {f.is_limited_edition && <Badge variant="gold">{t("box.limited")}</Badge>}
              </div>
              {f.description_en && (
                <p className="mt-2 text-xs text-muted-foreground">{localizedDesc(f, locale)}</p>
              )}
            </article>
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
