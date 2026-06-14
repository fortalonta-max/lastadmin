import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { Badge } from "@/components/brand-badge";
import { useI18n } from "@/lib/i18n";
import {
  fetchBoxes,
  fetchSettings,
  fetchByoPriceRangePerBox,
  localizedName,
  type Box,
} from "@/lib/storefront";
import { formatCurrency } from "@/lib/cart";
import { cn } from "@/lib/utils";

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

  const slides: string[] = (() => {
    if (!settings) return [];
    if (settings.hero_images.length > 0) return settings.hero_images;
    if (settings.hero_image_url) return [settings.hero_image_url];
    return [];
  })();

  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    if (slides.length <= 1) return;
    const id = setInterval(
      () => setActiveIdx((i) => (i + 1) % slides.length),
      5000,
    );
    return () => clearInterval(id);
  }, [slides.length]);

  useEffect(() => {
    if (slides.length > 0 && activeIdx >= slides.length) setActiveIdx(0);
  }, [slides.length, activeIdx]);

  function prev() {
    setActiveIdx((i) => (i - 1 + slides.length) % slides.length);
  }
  function next() {
    setActiveIdx((i) => (i + 1) % slides.length);
  }

  return (
    <section className="relative overflow-hidden">
      <div
        className="absolute inset-0 -z-10"
        style={{ background: "var(--gradient-hero)" }}
        aria-hidden
      />
      <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 md:grid-cols-2 md:py-20 lg:py-24">
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
        </div>

        <div className="relative">
          <div className="aspect-[4/5] overflow-hidden rounded-3xl shadow-[var(--shadow-card)]">
            {isLoading || slides.length === 0 ? (
              <div className="h-full w-full bg-transparent" aria-hidden />
            ) : (
              <div className="relative h-full w-full">
                {slides.map((src, i) => (
                  <img
                    key={src}
                    src={src}
                    alt={`Hero image ${i + 1}`}
                    className={cn(
                      "absolute inset-0 h-full w-full object-cover transition-opacity duration-1000",
                      i === activeIdx ? "opacity-100" : "opacity-0",
                    )}
                  />
                ))}
                {slides.length > 1 && (
                  <>
                    <button
                      onClick={prev}
                      aria-label="Previous image"
                      className="absolute left-2 top-1/2 -translate-y-1/2 grid h-8 w-8 place-items-center rounded-full bg-black/30 text-white backdrop-blur-sm transition-colors hover:bg-black/50"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      onClick={next}
                      aria-label="Next image"
                      className="absolute right-2 top-1/2 -translate-y-1/2 grid h-8 w-8 place-items-center rounded-full bg-black/30 text-white backdrop-blur-sm transition-colors hover:bg-black/50"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                    <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
                      {slides.map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setActiveIdx(i)}
                          aria-label={`Go to image ${i + 1}`}
                          className={cn(
                            "h-1.5 rounded-full transition-all",
                            i === activeIdx
                              ? "w-5 bg-white"
                              : "w-1.5 bg-white/50 hover:bg-white/75",
                          )}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
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
  const { data: priceRanges = {} } = useQuery({
    queryKey: ["byo-price-ranges"],
    queryFn: fetchByoPriceRangePerBox,
  });

  const best = boxes.filter((b) => b.is_best_seller);
  if (best.length === 0) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
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
            priceRanges={priceRanges}
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
  const { data: priceRanges = {} } = useQuery({
    queryKey: ["byo-price-ranges"],
    queryFn: fetchByoPriceRangePerBox,
  });

  if (boxes.length === 0) return null;

  return (
    <section className="bg-card/60 py-12">
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
              priceRanges={priceRanges}
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
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
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
    <section id="contact" className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
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
    <div className="mb-8 flex items-end justify-between gap-4">
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
  priceRanges = {},
}: {
  box: Box;
  locale: "en" | "ar";
  t: (key: string) => string;
  badge?: string;
  badgeVariant?: "pink" | "blue" | "gold";
  priceRanges?: Record<string, { min: number; max: number }>;
}) {
  const isByo = b.type === "byo";

  // For BYO boxes: compute starting price from lowest flavor price × cookie count
  // If flavor_box_prices has no entries (lowestFlavorPrice = 0), fall back to b.price
  const lowestFlavorPrice = isByo ? (priceRanges[b.id]?.min ?? 0) : 0;
  const displayPrice = isByo
    ? (lowestFlavorPrice > 0 ? lowestFlavorPrice * b.cookie_count : b.price)
    : b.price;

  return (
    <Link
      to="/boxes/$slug"
      params={{ slug: b.slug }}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-card transition-all duration-200 hover:-translate-y-1 hover:border-primary/20 hover:shadow-[var(--shadow-card)]"
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
          <div className="h-full w-full" style={{ background: "var(--gradient-hero)" }} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
        {badge && (
          <span className="absolute left-2 top-2 sm:left-3 sm:top-3">
            <Badge variant={badgeVariant ?? "pink"}>{badge}</Badge>
          </span>
        )}
        <span className="absolute right-2 top-2 rounded-full bg-card/90 px-2 py-0.5 text-[10px] font-semibold backdrop-blur sm:right-3 sm:top-3 sm:px-2.5 sm:py-1 sm:text-xs">
          {b.cookie_count} {t("box.cookies")}
        </span>
      </div>

      {/* Card body */}
      <div className="flex flex-1 flex-col p-3 sm:p-4">
        <h3 className="font-display text-sm leading-tight sm:text-xl">
          {localizedName(b, locale)}
        </h3>

        {/* Price — always visible on all screen sizes, no hidden classes */}
        <div className="mt-auto flex items-end justify-between gap-2 pt-3">
          <div>
            {displayPrice > 0 && (
              <p className="font-display text-sm sm:text-xl">
                {isByo && (
                  <span className="block text-[10px] font-normal text-muted-foreground sm:text-xs">
                    {t("box.starting_from")}
                  </span>
                )}
                {formatCurrency(displayPrice)}
              </p>
            )}
          </div>
          <span
            className="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold text-white transition-transform group-hover:translate-x-0.5 sm:px-3 sm:py-1.5 sm:text-xs"
            style={{ background: "linear-gradient(135deg, #f472b6, #93c5fd)" }}
          >
            {t("cta.view")} →
          </span>
        </div>
      </div>
    </Link>
  );
}
