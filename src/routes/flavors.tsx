import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { Badge } from "@/components/brand-badge";
import { useI18n } from "@/lib/i18n";
import { fetchFlavors, localizedName, localizedDesc, type Flavor } from "@/lib/storefront";

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

  const available = flavors.filter((f) => !f.is_out_of_stock);
  const unavailable = flavors.filter((f) => f.is_out_of_stock);

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main>
        {/* Page header */}
        <div
          className="border-b border-border/60 py-12"
          style={{ background: "var(--gradient-hero)" }}
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-foreground/60">
              {t("section.flavors")}
            </p>
            <h1 className="mt-2 font-display text-4xl sm:text-5xl">Every flavor we bake</h1>
            <p className="mt-3 max-w-md text-sm text-foreground/70">
              {available.length > 0
                ? `${available.length} flavors available now. Mix any combination when you build your box.`
                : "Mix any combination when you build your box."}
            </p>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {available.map((f) => (
              <FlavorCard key={f.id} flavor={f} locale={locale} t={t} />
            ))}
            {unavailable.map((f) => (
              <FlavorCard key={f.id} flavor={f} locale={locale} t={t} />
            ))}
          </div>

          {/* Bottom CTA */}
          <div
            className="mt-16 overflow-hidden rounded-3xl px-8 py-12 text-center sm:px-16"
            style={{ background: "var(--gradient-hero)" }}
          >
            <h2 className="font-display text-3xl sm:text-4xl">{t("section.byo")}</h2>
            <p className="mx-auto mt-3 max-w-md text-sm text-foreground/75">{t("section.byo_sub")}</p>
            <Link
              to="/boxes"
              className="group mt-7 inline-flex items-center gap-2 rounded-full bg-foreground px-7 py-3.5 text-sm font-semibold text-background transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-card)]"
            >
              {t("cta.build")}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function FlavorCard({
  flavor: f,
  locale,
  t,
}: {
  flavor: Flavor;
  locale: "en" | "ar";
  t: (key: string) => string;
}) {
  return (
    <article
      className={`group relative overflow-hidden rounded-2xl border bg-card p-4 transition-all duration-200 sm:p-5 ${
        f.is_out_of_stock
          ? "border-border/40 opacity-60"
          : "border-border/60 hover:-translate-y-1 hover:border-primary/30 hover:shadow-[var(--shadow-card)]"
      }`}
    >
      <div
        className="mb-4 aspect-square overflow-hidden rounded-xl transition-transform duration-300 group-hover:scale-[1.03]"
        style={{
          background: f.image_url
            ? `url(${f.image_url}) center/cover`
            : "var(--gradient-pink-blue)",
        }}
      />
      <h2 className="font-display text-base leading-tight sm:text-lg">
        {localizedName(f, locale)}
      </h2>
      <div className="mt-1.5 flex flex-wrap gap-1">
        {f.is_limited_edition && <Badge variant="gold">{t("box.limited")}</Badge>}
        {f.is_out_of_stock && <Badge variant="destructive">{t("box.out_of_stock")}</Badge>}
      </div>
      {f.description_en && (
        <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-muted-foreground">
          {localizedDesc(f, locale)}
        </p>
      )}
    </article>
  );
}
