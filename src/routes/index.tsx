import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Star, ChevronDown, MessageCircle, Cookie, Layers, Truck } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { Badge } from "@/components/brand-badge";
import { useI18n } from "@/lib/i18n";
import {
  fetchBoxes,
  fetchFlavors,
  fetchReviews,
  fetchFaqs,
  fetchSettings,
  localizedName,
  localizedDesc,
} from "@/lib/storefront";
import { formatCurrency } from "@/lib/cart";
import { useState } from "react";
import heroImg from "@/assets/hero-cookies.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NYC Cookies — Build your own box of NYC-style cookies" },
      {
        name: "description",
        content:
          "Hand-baked New York-style cookies, delivered fresh. Build your own box from 9+ flavors. Best sellers, limited editions, and chef-curated picks.",
      },
      { property: "og:title", content: "NYC Cookies — Build your own cookie box" },
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
        <HowItWorks />
        <BestSellers />
        <BoxesGrid />
        <FlavorsGrid />
        <OurStory />
        <BYOCallout />
        <Reviews />
        <FAQ />
        <Contact />
      </main>
      <SiteFooter />
    </div>
  );
}

function Hero() {
  const { t, locale } = useI18n();
  const { data: settings } = useQuery({ queryKey: ["public-settings"], queryFn: fetchSettings });

  const eyebrow =
    (locale === "ar" ? settings?.hero_eyebrow_ar : settings?.hero_eyebrow_en) ||
    t("hero.eyebrow");
  const title =
    (locale === "ar" ? settings?.hero_title_ar : settings?.hero_title_en) ||
    t("hero.title");
  const subtitle =
    (locale === "ar" ? settings?.hero_subtitle_ar : settings?.hero_subtitle_en) ||
    t("hero.subtitle");

  const heroImageSrc = settings?.hero_image_url || heroImg;

  return (
    <section className="relative overflow-hidden">
      <div
        className="absolute inset-0 -z-10"
        style={{ background: "var(--gradient-hero)" }}
        aria-hidden
      />
      <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 md:grid-cols-2 md:py-24">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-foreground/60">
            {eyebrow}
          </p>
          <h1 className="mt-4 font-display text-5xl leading-[1.05] sm:text-6xl md:text-7xl">
            {title}
          </h1>
          <p className="mt-5 max-w-md text-base text-foreground/75 sm:text-lg">
            {subtitle}
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              to="/boxes"
              className="group inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-soft)] transition-transform hover:-translate-y-0.5"
            >
              {t("cta.shop")}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              to="/boxes/box-of-6"
              className="inline-flex items-center gap-2 rounded-full border border-foreground/10 bg-card px-6 py-3 text-sm font-semibold transition-colors hover:bg-muted"
            >
              {t("cta.build")}
            </Link>
          </div>
          <div className="mt-8 flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex -space-x-1">
              {[0, 1, 2, 3, 4].map((i) => (
                <Star key={i} className="h-4 w-4 fill-[var(--gold)] text-[var(--gold)]" />
              ))}
            </div>
            <span>4.9 from 800+ reviews</span>
          </div>
        </div>
        <div className="relative">
          <div className="aspect-[4/5] overflow-hidden rounded-3xl shadow-[var(--shadow-card)]">
            <img
              src={heroImageSrc}
              alt="Stack of New York-style chocolate chip cookies"
              width={1536}
              height={1920}
              className="h-full w-full object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const { t } = useI18n();
  const steps = [
    { icon: Cookie, num: "01", titleKey: "hiw.step1.title", descKey: "hiw.step1.desc" },
    { icon: Layers, num: "02", titleKey: "hiw.step2.title", descKey: "hiw.step2.desc" },
    { icon: Truck,  num: "03", titleKey: "hiw.step3.title", descKey: "hiw.step3.desc" },
  ];
  return (
    <section className="bg-card/60 py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionHeader eyebrow="✦" title={t("section.how_it_works")} />
        <div className="grid gap-6 sm:grid-cols-3">
          {steps.map(({ icon: Icon, num, titleKey, descKey }) => (
            <div
              key={num}
              className="relative overflow-hidden rounded-3xl border border-border/60 bg-card p-7"
            >
              <span className="absolute right-5 top-5 font-display text-5xl font-bold text-foreground/5 select-none">
                {num}
              </span>
              <span className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--pink)]/20 text-primary">
                <Icon className="h-5 w-5" />
              </span>
              <h3 className="font-display text-xl">{t(titleKey)}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t(descKey)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function BestSellers() {
  const { t, locale } = useI18n();
  const { data: boxes = [] } = useQuery({ queryKey: ["boxes"], queryFn: fetchBoxes });
  const best = boxes.filter((b) => b.is_best_seller);
  if (best.length === 0) return null;
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
      <SectionHeader eyebrow="★" title={t("section.best_sellers")} />
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {best.map((b) => (
          <BoxCard
            key={b.id}
            slug={b.slug}
            title={localizedName(b, locale)}
            desc={localizedDesc(b, locale)}
            price={b.price}
            image={b.image_url}
            cookieCount={b.cookie_count}
            badge={t("box.best_seller")}
            badgeVariant="pink"
          />
        ))}
      </div>
    </section>
  );
}

function BoxesGrid() {
  const { t, locale } = useI18n();
  const { data: boxes = [] } = useQuery({ queryKey: ["boxes"], queryFn: fetchBoxes });
  return (
    <section className="py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionHeader eyebrow="01" title={t("section.boxes")} />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {boxes.map((b) => (
            <BoxCard
              key={b.id}
              slug={b.slug}
              title={localizedName(b, locale)}
              desc={localizedDesc(b, locale)}
              price={b.price}
              image={b.image_url}
              cookieCount={b.cookie_count}
              badge={b.type === "fixed" ? t("box.fixed") : t("box.byo")}
              badgeVariant={b.type === "fixed" ? "gold" : "blue"}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function FlavorsGrid() {
  const { t, locale } = useI18n();
  const { data: flavors = [] } = useQuery({ queryKey: ["flavors"], queryFn: fetchFlavors });
  return (
    <section className="bg-card/60 py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionHeader eyebrow="02" title={t("section.flavors")} />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {flavors.map((f) => (
            <article
              key={f.id}
              className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card p-5 transition-all hover:-translate-y-1 hover:shadow-[var(--shadow-card)]"
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
                <h3 className="font-display text-lg leading-tight">{localizedName(f, locale)}</h3>
                {f.is_limited_edition && <Badge variant="gold">{t("box.limited")}</Badge>}
                {f.is_out_of_stock && <Badge variant="destructive">{t("box.out_of_stock")}</Badge>}
              </div>
              {f.description_en && (
                <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
                  {localizedDesc(f, locale)}
                </p>
              )}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function OurStory() {
  const { t } = useI18n();
  const pillars = [
    t("story.pillar1"),
    t("story.pillar2"),
    t("story.pillar3"),
  ];
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
      <div className="overflow-hidden rounded-3xl border border-border/60 bg-card">
        <div className="grid md:grid-cols-2">
          {/* Left: colour panel */}
          <div
            className="flex flex-col justify-between p-10 md:p-14"
            style={{ background: "var(--gradient-pink-blue)" }}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-ink/60">
              {t("section.our_story")}
            </p>
            <div>
              <h2 className="mt-6 font-display text-3xl leading-snug text-ink sm:text-4xl">
                {t("story.heading")}
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
          {/* Right: body text */}
          <div className="flex flex-col justify-center px-10 py-14 md:px-14">
            <p className="text-base leading-relaxed text-foreground/80">
              {t("story.body")}
            </p>
            <Link
              to="/boxes"
              className="group mt-8 inline-flex w-max items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-semibold text-background transition-transform hover:-translate-y-0.5"
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

function BYOCallout() {
  const { t } = useI18n();
  return (
    <section
      className="mx-auto my-12 max-w-7xl overflow-hidden rounded-3xl px-6 py-16 text-center sm:px-12"
      style={{ background: "var(--gradient-hero)" }}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-foreground/60">03</p>
      <h2 className="mx-auto mt-3 max-w-2xl font-display text-4xl sm:text-5xl">
        {t("section.byo")}
      </h2>
      <p className="mx-auto mt-3 max-w-lg text-foreground/80">{t("section.byo_sub")}</p>
      <Link
        to="/boxes/box-of-6"
        className="mt-7 inline-flex items-center gap-2 rounded-full bg-foreground px-6 py-3 text-sm font-semibold text-background transition-transform hover:-translate-y-0.5"
      >
        {t("cta.build")}
        <ArrowRight className="h-4 w-4" />
      </Link>
    </section>
  );
}

function Reviews() {
  const { t } = useI18n();
  const { data: reviews = [] } = useQuery({ queryKey: ["reviews"], queryFn: fetchReviews });
  if (reviews.length === 0) return null;
  return (
    <section id="reviews" className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
      <SectionHeader eyebrow="04" title={t("section.reviews")} />
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        {reviews.map((r) => (
          <figure
            key={r.id}
            className="rounded-2xl border border-border/60 bg-card p-6"
          >
            <div className="mb-3 flex gap-0.5">
              {Array.from({ length: r.rating }).map((_, i) => (
                <Star key={i} className="h-4 w-4 fill-[var(--gold)] text-[var(--gold)]" />
              ))}
            </div>
            <blockquote className="text-sm leading-relaxed text-foreground/80">"{r.body}"</blockquote>
            <figcaption className="mt-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              — {r.name}
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

function FAQ() {
  const { t, locale } = useI18n();
  const { data: faqs = [] } = useQuery({ queryKey: ["faqs"], queryFn: fetchFaqs });
  const [open, setOpen] = useState<string | null>(null);
  if (faqs.length === 0) return null;
  return (
    <section id="faq" className="bg-card/60 py-16">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <SectionHeader eyebrow="05" title={t("section.faq")} />
        <div className="space-y-3">
          {faqs.map((f) => {
            const isOpen = open === f.id;
            const q = locale === "ar" && f.question_ar ? f.question_ar : f.question_en;
            const a = locale === "ar" && f.answer_ar ? f.answer_ar : f.answer_en;
            return (
              <div key={f.id} className="overflow-hidden rounded-2xl border border-border/60 bg-card">
                <button
                  onClick={() => setOpen(isOpen ? null : f.id)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-start"
                >
                  <span className="font-medium">{q}</span>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}
                  />
                </button>
                {isOpen && <p className="px-5 pb-5 text-sm text-muted-foreground">{a}</p>}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Contact() {
  const { t } = useI18n();
  const { data: settings } = useQuery({ queryKey: ["public-settings"], queryFn: fetchSettings });
  return (
    <section id="contact" className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
      <SectionHeader eyebrow="06" title={t("section.contact")} />
      <div className="grid gap-4 md:grid-cols-3">
        <ContactCard label="Email" value={settings?.contact_email ?? "hello@nyccookies.com"} />
        <ContactCard label="Phone" value={settings?.contact_phone ?? "+1 (555) 555-5555"} />
        <ContactCard label="Address" value={settings?.contact_address ?? "New York, NY"} />
      </div>
      {settings?.whatsapp_number && (
        <a
          href={`https://wa.me/${settings.whatsapp_number.replace(/\D/g, "")}`}
          target="_blank"
          rel="noreferrer"
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#25D366] px-5 py-2.5 text-sm font-semibold text-white"
        >
          <MessageCircle className="h-4 w-4" /> WhatsApp us
        </a>
      )}
    </section>
  );
}

function ContactCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-2 font-medium">{value}</p>
    </div>
  );
}

function SectionHeader({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="mb-8 flex items-end justify-between gap-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">
          {eyebrow}
        </p>
        <h2 className="mt-2 font-display text-3xl sm:text-4xl">{title}</h2>
      </div>
    </div>
  );
}

function BoxCard({
  slug,
  title,
  desc,
  price,
  image,
  cookieCount,
  badge,
  badgeVariant,
}: {
  slug: string;
  title: string;
  desc: string;
  price: number;
  image?: string | null;
  cookieCount: number;
  badge?: string;
  badgeVariant?: "pink" | "blue" | "gold";
}) {
  const { t } = useI18n();
  return (
    <Link
      to="/boxes/$slug"
      params={{ slug }}
      className="group relative flex flex-col overflow-hidden rounded-3xl border border-border/60 bg-card transition-all hover:-translate-y-1 hover:shadow-[var(--shadow-card)]"
    >
      <div
        className="relative aspect-[4/3] w-full overflow-hidden"
        style={{
          background: image
            ? `url(${image}) center/cover`
            : "var(--gradient-hero)",
        }}
      >
        {badge && (
          <span className="absolute left-4 top-4">
            <Badge variant={badgeVariant ?? "pink"}>{badge}</Badge>
          </span>
        )}
        <span className="absolute right-4 top-4 rounded-full bg-card/90 px-3 py-1 text-xs font-semibold backdrop-blur">
          {cookieCount} {t("box.cookies")}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-display text-2xl leading-tight">{title}</h3>
        {desc && <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{desc}</p>}
        <div className="mt-4 flex items-end justify-between">
          <p className="font-display text-2xl">{formatCurrency(price)}</p>
          <span className="rounded-full bg-foreground px-4 py-2 text-xs font-semibold text-background transition-transform group-hover:translate-x-0.5">
            {t("cta.view")} →
          </span>
        </div>
      </div>
    </Link>
  );
}
