import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Star } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { Badge } from "@/components/brand-badge";
import { useI18n } from "@/lib/i18n";
import {
  fetchBoxes,
  fetchFlavors,
  fetchSettings,
  localizedName,
  localizedDesc,
  type Box,
} from "@/lib/storefront";
import { formatCurrency } from "@/lib/cart";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Leen Bakery — Build your own box of NYC-style cookies" },
      {
        name: "description",
        content:
          "Hand-baked New York-style cookies by Leen Bakery, delivered fresh. Build your own box from 9+ flavors.",
      },
      { property: "og:title", content: "Leen Bakery — Build your own cookie box" },
      {
        property: "og:description",
        content: "Thick, gooey, NYC-style. Pick your size, mix any flavors.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main>
        <Hero />
        <BestSellers />
        <OurProducts />
        <OurStory />
        <Contact />
      </main>
      <SiteFooter />
    </div>
  );
}

// ── Hero ──────────────────────────────────────────────────────────────────────

function Hero() {
  const { t, locale } = useI18n();
  const { data: settings, isLoading } = useQuery({
    queryKey: ["public-settings"],
    queryFn: fetchSettings,
  });

  const eyebrow =
    (locale === "ar" ? settings?.hero_eyebrow_ar : settings?.hero_eyebrow_en) ||
    t("hero.eyebrow");
  const title =
    (locale === "ar" ? settings?.hero_title_ar : settings?.hero_title_en) ||
    t("hero.title");
  const subtitle =
    (locale === "ar" ? settings?.hero_subtitle_ar : settings?.hero_subtitle_en) ||
    t("hero.subtitle");

  // Only use the URL from settings — no local asset fallback
  const heroImageUrl = settings?.hero_image_url ?? null;

  return (
    <section className="relative overflow-hidden">
      <div
        className="absolute inset-0 -z-10"
        style={{ background: "var(--gradient-hero)" }}
        aria-hidden
      />
      <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-20 sm:px-6 md:grid-cols-2 md:py-28 lg:py-32">
        <div className="flex flex-col">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-foreground/60">
            {eyebrow}
          </p>
          <h1 className="mt-4 font-display text-5xl leading-[1.05] sm:text-6xl md:text-7xl">
            {title}
          </h1>
          <p className="mt-5 max-w-md text-base text-foreground/75 sm:text-lg">
            {subtitle}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/boxes"
              className="group inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3.5 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-soft)] transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-card)]"
            >
              {t("cta.shop")}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              to="/buildbox"
              className="inline-flex items-center gap-2 rounded-full border border-foreground/10 bg-card px-7 py-3.5 text-sm font-semibold transition-colors hover:bg-muted"
            >
              {t("cta.build")}
            </Link>
          </div>
          <div className="mt-8 flex items-center gap-3 text-xs text-muted-foreground">
            <div className="flex -space-x-0.5">
              {[0, 1, 2, 3, 4].map((i) => (
                <Star key={i} className="h-4 w-4 fill-[var(--gold)] text-[var(--gold)]" />
              ))}
            </div>
            <span className="font-medium text-foreground/70">4.9 from 800+ reviews</span>
          </div>
        </div>

        {/* Hero image: render only after settings have loaded */}
        <div className="relative">
          <div className="aspect-[4/5] overflow-hidden rounded-3xl shadow-[var(--shadow-card)]">
            {isLoading || !heroImageUrl ? (
              <div className="h-full w-full bg-transparent" aria-hidden />
            ) : (
              <img
                src={heroImageUrl}
                alt="Stack of New York-style chocolate chip cookies"
                width={1536}
                height={1920}
                className="h-full w-full object-cover transition-transform duration-700 hover:scale-105"
              />
            )}
          </div>
          <div className="absolute -bottom-4 -left-4 rounded-2xl border border-border/60 bg-card px-5 py-3 shadow-[var(--shadow-card)]">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Fresh today</p>
            <p className="mt-0.5 font-display text-lg">Baked to order</p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Best Sellers ──────────────────────────────────────────────────────────────

function BestSellers() {
  const { t, locale } = useI18n();
  const { data: boxes = [] } = useQuery({ queryKey: ["boxes"], queryFn: fetchBoxes });
  const { data: flavors = [] } = useQuery({ queryKey: ["flavors"], queryFn: fetchFlavors });

  const best = boxes.filter((b) => b.is_best_seller);
  if (best.length === 0) return null;

  const flavorPrices = flavors.map((f) => f.price).filter((p) => p > 0);
  const minFlavorPrice = flavorPrices.length > 0 ? Math.min(...flavorPrices) : 0;
  const maxFlavorPrice = flavorPrices.length > 0 ? Math.max(...flavorPrices) : 0;

  return (
    <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
      <SectionHeader eyebrow="★" title={t("section.best_sellers")} />
      <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3">
        {best.map((b) => (
          <BoxCard
            key={b.id}
            box={b}
            locale={locale}
            t={t}
            badge={t("box.best_seller")}
            badgeVariant="pink"
            minFlavorPrice={minFlavorPrice}
            maxFlavorPrice={maxFlavorPrice}
          />
        ))}
      </div>
    </section>
  );
}

// ── Our Products ──────────────────────────────────────────────────────────────

function OurProducts() {
  const { t, locale } = useI18n();
  const { data: boxes = [] } = useQuery({ queryKey: ["boxes"], queryFn: fetchBoxes });
  const { data: flavors = [] } = useQuery({ queryKey: ["flavors"], queryFn: fetchFlavors });

  if (boxes.length === 0) return null;

  const flavorPrices = flavors.map((f) => f.price).filter((p) => p > 0);
  const minFlavorPrice = flavorPrices.length > 0 ? Math.min(...flavorPrices) : 0;
  const maxFlavorPrice = flavorPrices.length > 0 ? Math.max(...flavorPrices) : 0;

  return (
    <section className="bg-card/60 py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionHeader eyebrow="★★" title={t("section.products")} />
        <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3">
          {boxes.map((b) => (
            <BoxCard
              key={b.id}
              box={b}
              locale={locale}
              t={t}
              badge={
                b.is_best_seller
                  ? t("box.best_seller")
                  : b.type === "fixed"
                  ? t("box.fixed")
                  : t("box.byo")
              }
              badgeVariant={b.is_best_seller ? "pink" : b.type === "fixed" ? "gold" : "blue"}
              minFlavorPrice={minFlavorPrice}
              maxFlavorPrice={maxFlavorPrice}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Our Story ─────────────────────────────────────────────────────────────────

function OurStory() {
  const { t, locale } = useI18n();
  const { data: settings } = useQuery({ queryKey: ["public-settings"], queryFn: fetchSettings });

  // Use settings values; fall back to i18n strings only if settings haven't loaded yet
  const heading =
    (locale === "ar" ? settings?.story_heading_ar : settings?.story_heading_en) ||
    t("story.heading");
  const body =
    (locale === "ar" ? settings?.story_body_ar : settings?.story_body_en) ||
    t("story.body");

  const pillars = [
    (locale === "ar" ? settings?.story_pillar1_ar : settings?.story_pillar1_en) || t("story.pillar1"),
    (locale === "ar" ? settings?.story_pillar2_ar : settings?.story_pillar2_en) || t("story.pillar2"),
    (locale === "ar" ? settings?.story_pillar3_ar : settings?.story_pillar3_en) || t("story.pillar3"),
  ].filter(Boolean);

  return (
    <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
      <div className="overflow-hidden rounded-3xl border border-border/60 bg-card">
        <div className="grid md:grid-cols-2">
          <div
            className="flex flex-col justify-between p-10 md:p-14"
            style={{ background: "var(--gradient-pink-blue)" }}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-ink/60">
              {t("section.our_story")}
            </p>
            <div>
              <h2 className="mt-6 font-display text-3xl leading-snug text-ink sm:text-4xl">
                {heading}
              </h2>
              <ul className="mt-8 space-y-3">
                {pillars.map((p) => (
                  <li key={p} className="flex items-center gap-3 text-sm font-medium text-ink/80">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-ink/40" />
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="flex flex-col justify-center px-10 py-14 md:px-14">
            <p className="text-base leading-relaxed text-foreground/80">{body}</p>
            <Link
              to="/boxes"
              className="group mt-8 inline-flex w-max items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-semibold text-background transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-soft)]"
            >
              {t("cta.shop")}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Contact ───────────────────────────────────────────────────────────────────

function Contact() {
  const { t } = useI18n();
  const { data: settings } = useQuery({ queryKey: ["public-settings"], queryFn: fetchSettings });
  return (
    <section id="contact" className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
      <SectionHeader eyebrow="04" title={t("section.contact")} />
      <div className="grid gap-4 md:grid-cols-3">
        <ContactCard label="Email" value={settings?.contact_email ?? "leendahban@gmail.com"} />
        <ContactCard label="Phone" value={settings?.contact_phone ?? "01070487228"} />
        <ContactCard label="Address" value={settings?.contact_address ?? "Egypt – Cairo – New Cairo – Fifth Settlement"} />
      </div>
    </section>
  );
}

function ContactCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-6 transition-colors hover:border-border">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-2 font-medium">{value}</p>
    </div>
  );
}

// ── Shared helpers ────────────────────────────────────────────────────────────

function SectionHeader({
  eyebrow,
  title,
  cta,
}: {
  eyebrow: string;
  title: string;
  cta?: { label: string; to: string };
}) {
  return (
    <div className="mb-10 flex items-end justify-between gap-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">
          {eyebrow}
        </p>
        <h2 className="mt-2 font-display text-3xl sm:text-4xl">{title}</h2>
      </div>
      {cta && (
        <Link
          to={cta.to}
          className="group hidden shrink-0 items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:flex"
        >
          {cta.label}
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      )}
    </div>
  );
}

function BoxCard({
  box: b,
  locale,
  t,
  badge,
  badgeVariant,
  minFlavorPrice,
  maxFlavorPrice,
}: {
  box: Box;
  locale: "en" | "ar";
  t: (key: string) => string;
  badge?: string;
  badgeVariant?: "pink" | "blue" | "gold";
  minFlavorPrice: number;
  maxFlavorPrice: number;
}) {
  const isByo = b.type === "byo";
  const startingPrice = isByo && minFlavorPrice > 0 ? minFlavorPrice * b.cookie_count : null;
  const comparePrice =
    isByo && b.sale_enabled && maxFlavorPrice > 0 ? maxFlavorPrice * b.cookie_count : null;

  return (
    <Link
      to="/boxes/$slug"
      params={{ slug: b.slug }}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-card transition-all duration-200 hover:-translate-y-1 hover:border-primary/20 hover:shadow-[var(--shadow-card)]"
    >
      <div
        className="relative aspect-[3/2] w-full overflow-hidden sm:aspect-[4/3]"
        style={{
          background: b.image_url
            ? `url(${b.image_url}) center/cover`
            : "var(--gradient-hero)",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
        {badge && (
          <span className="absolute left-2 top-2 sm:left-4 sm:top-4">
            <Badge variant={badgeVariant ?? "pink"}>{badge}</Badge>
          </span>
        )}
        <span className="absolute right-2 top-2 rounded-full bg-card/90 px-2 py-0.5 text-[10px] font-semibold backdrop-blur sm:right-4 sm:top-4 sm:px-3 sm:py-1 sm:text-xs">
          {b.cookie_count} {t("box.cookies")}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-3 sm:p-5">
        <h3 className="font-display text-base leading-tight sm:text-2xl">
          {localizedName(b, locale)}
        </h3>
        {b.description_en && (
          <p className="mt-1 hidden line-clamp-2 text-xs text-muted-foreground sm:mt-2 sm:block sm:text-sm">
            {localizedDesc(b, locale)}
          </p>
        )}
        <div className="mt-auto flex items-end justify-between pt-2 sm:pt-4">
          <div>
            {isByo && startingPrice !== null ? (
              <>
                {comparePrice !== null && (
                  <p className="text-sm font-bold text-destructive line-through sm:text-base">
                    {formatCurrency(comparePrice)}
                  </p>
                )}
                <p className="font-display text-base sm:text-2xl">
                  <span className="text-xs font-normal text-muted-foreground sm:text-sm">
                    {t("box.starting_from")}{" "}
                  </span>
                  {formatCurrency(startingPrice)}
                </p>
              </>
            ) : (
              <p className="font-display text-base sm:text-2xl">{formatCurrency(b.price)}</p>
            )}
          </div>
          <span className="rounded-full bg-foreground px-2 py-1 text-[10px] font-semibold text-background transition-transform group-hover:translate-x-0.5 sm:px-4 sm:py-2 sm:text-xs">
            {t("cta.view")} →
          </span>
        </div>
      </div>
    </Link>
  );
}
