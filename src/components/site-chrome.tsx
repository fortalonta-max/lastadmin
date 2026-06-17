import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Menu, ShoppingBag, X, Globe, ArrowRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useI18n } from "@/lib/i18n";
import { useCart } from "@/lib/cart";
import { fetchSettings } from "@/lib/storefront";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

// ── Social links type & fetcher ───────────────────────────────────────────────

type SocialLink = {
  id: string;
  name: string;
  url: string;
  is_active: boolean;
  sort_order: number;
};

async function fetchSocialLinks(): Promise<SocialLink[]> {
  const { data, error } = await supabase
    .from("social_links")
    .select("*")
    .eq("is_active", true)
    .order("sort_order");
  if (error) return [];
  return (data ?? []) as SocialLink[];
}

// Platform → emoji icon mapping
const PLATFORM_ICON: Record<string, string> = {
  youtube: "▶",
  whatsapp: "💬",
  instagram: "📸",
  facebook: "📘",
  tiktok: "🎵",
  threads: "🧵",
  twitter: "🐦",
  "x (twitter)": "𝕏",
  telegram: "✈️",
  linkedin: "💼",
  snapchat: "👻",
};

function platformIcon(name: string): string {
  return PLATFORM_ICON[name.toLowerCase()] ?? "🔗";
}

// ── Bar 1: Fixed baby-pink delivery bar ───────────────────────────────────────

function DeliveryBar() {
  const { locale } = useI18n();
  const { data: settings } = useQuery({ queryKey: ["public-settings"], queryFn: fetchSettings });

  const text =
    (locale === "ar" ? settings?.delivery_bar_text_ar : settings?.delivery_bar_text_en) ||
    settings?.delivery_bar_text_en ||
    "Same-day delivery until 8:00 PM  ·  Free delivery on orders over EGP 750";

  return (
    <div
      className="border-b px-4 py-1.5 text-center text-xs font-semibold"
      style={{ background: "#FCE4EC", borderColor: "#F8BBD9", color: "#AD1457" }}
    >
      {text}
    </div>
  );
}

// ── Bar 2: Baby-blue scrolling announcement bar ────────────────────────────────

function AnnouncementBar() {
  const { locale } = useI18n();
  const { data: settings } = useQuery({ queryKey: ["public-settings"], queryFn: fetchSettings });

  if (!settings?.announcement_enabled) return null;

  const text =
    (locale === "ar" ? settings.announcement_text_ar : settings.announcement_text_en) ||
    settings.announcement_text_en ||
    "";

  if (!text) return null;

  const isRtl = locale === "ar";

  const segment = Array.from({ length: 6 }, (_, i) => (
    <span key={i} className="inline-flex items-center gap-8 px-6">
      {text}
      <span style={{ color: "#90CAF9" }}>✦</span>
    </span>
  ));

  const animKeyframes = isRtl
    ? `@keyframes announcement-ticker-rtl{from{transform:translateX(0)}to{transform:translateX(50%)}}`
    : `@keyframes announcement-ticker-ltr{from{transform:translateX(0)}to{transform:translateX(-50%)}}`;

  const animName = isRtl ? "announcement-ticker-rtl" : "announcement-ticker-ltr";

  return (
    <div
      className="overflow-hidden border-b py-1.5 text-xs font-medium"
      style={{ background: "#E3F2FD", borderColor: "#BBDEFB", color: "#0D47A1" }}
    >
      <style>{animKeyframes}</style>
      <div
        className="inline-flex whitespace-nowrap"
        style={{ animation: `${animName} 30s linear infinite` }}
        aria-label={text}
      >
        {segment}{segment}
      </div>
    </div>
  );
}

// ── Logo ───────────────────────────────────────────────────────────────────────

function BrandLogo({
  logoUrl,
  storeName,
  isLoading,
}: {
  logoUrl?: string | null;
  storeName?: string | null;
  isLoading?: boolean;
}) {
  if (isLoading) {
    return <span className="block h-[68px] w-40 opacity-0" aria-hidden />;
  }
  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={storeName ?? "Store logo"}
        className="h-[68px] w-auto max-w-[340px] object-contain"
      />
    );
  }
  return (
    <span className="font-display text-5xl font-semibold tracking-tight">
      {storeName ?? ""}
    </span>
  );
}

// ── Header ─────────────────────────────────────────────────────────────────────

export function SiteHeader() {
  const { t, locale, setLocale } = useI18n();
  const { count } = useCart();
  const [open, setOpen] = useState(false);
  const { data: settings, isLoading } = useQuery({
    queryKey: ["public-settings"],
    queryFn: fetchSettings,
  });

  const links = [
    { to: "/", label: t("nav.home"), enabled: true },
    { to: "/boxes", label: t("nav.boxes"), enabled: settings?.page_boxes_enabled ?? true },
    { to: "/buildbox", label: t("nav.buildbox"), enabled: settings?.page_buildbox_enabled ?? true },
    { to: "/flavors", label: t("nav.flavors"), enabled: settings?.page_flavors_enabled ?? true },
    { to: "/products", label: t("nav.products"), enabled: settings?.page_products_enabled ?? true },
    { to: "/#contact", label: t("nav.contact"), enabled: settings?.page_contact_enabled ?? true },
  ].filter((l) => l.enabled);

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/90 backdrop-blur-xl">
      <DeliveryBar />
      <AnnouncementBar />

      <div className="relative mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6">
        <nav className="hidden items-center gap-7 md:flex">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="text-sm text-foreground/70 transition-colors hover:text-foreground"
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="w-11 md:hidden" aria-hidden />

        <Link
          to="/"
          className="absolute left-1/2 flex -translate-x-1/2 items-center gap-3"
        >
          <BrandLogo
            logoUrl={settings?.logo_url}
            storeName={settings?.store_name}
            isLoading={isLoading}
          />
        </Link>

        <div className="flex items-center gap-2">
          <Link
            to="/boxes"
            className="hidden items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-[var(--shadow-soft)] transition-all hover:-translate-y-0.5 md:flex"
          >
            {t("cta.shop")} <ArrowRight className="h-3 w-3" />
          </Link>

          <button
            onClick={() => setLocale(locale === "en" ? "ar" : "en")}
            className="hidden items-center gap-1 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium uppercase tracking-wide transition-colors hover:bg-muted sm:flex"
            aria-label="Toggle language"
          >
            <Globe className="h-3.5 w-3.5" />
            {locale === "en" ? "AR" : "EN"}
          </button>

          <Link
            to="/cart"
            className="relative grid h-11 w-11 place-items-center rounded-full border border-border bg-card transition-colors hover:bg-muted"
            aria-label={t("nav.cart")}
          >
            <ShoppingBag className="h-5 w-5" />
            {count > 0 && (
              <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                {count}
              </span>
            )}
          </Link>

          <button
            onClick={() => setOpen((v) => !v)}
            className="grid h-11 w-11 place-items-center rounded-full border border-border bg-card md:hidden"
            aria-label="Menu"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <div
        className={cn(
          "overflow-hidden border-t border-border/60 transition-[max-height] duration-300 md:hidden",
          open ? "max-h-96" : "max-h-0",
        )}
      >
        <nav className="flex flex-col gap-1 px-4 py-3">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              onClick={() => setOpen(false)}
              className="rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-muted"
            >
              {l.label}
            </Link>
          ))}
          <Link
            to="/boxes"
            onClick={() => setOpen(false)}
            className="mt-2 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            {t("cta.shop")} <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          <button
            onClick={() => {
              setLocale(locale === "en" ? "ar" : "en");
              setOpen(false);
            }}
            className="mt-2 self-start rounded-full border border-border bg-card px-3 py-1.5 text-xs uppercase"
          >
            {locale === "en" ? "العربية" : "English"}
          </button>
        </nav>
      </div>
    </header>
  );
}

// ── Footer ─────────────────────────────────────────────────────────────────────

export function SiteFooter() {
  const { t } = useI18n();
  const { data: settings, isLoading } = useQuery({
    queryKey: ["public-settings"],
    queryFn: fetchSettings,
  });
  const { data: socialLinks = [] } = useQuery({
    queryKey: ["social-links"],
    queryFn: fetchSocialLinks,
  });

  const tagline = settings?.store_tagline_en ?? (isLoading ? "" : t("footer.tagline"));

  return (
    <footer className="mt-16 border-t border-border/60 bg-card/80 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 md:grid-cols-4">
          {/* Brand column */}
          <div className="md:col-span-2">
            <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">{tagline}</p>
            {settings?.whatsapp_number && (
              <a
                href={`https://wa.me/${settings.whatsapp_number.replace(/\D/g, "")}`}
                target="_blank"
                rel="noreferrer"
                className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#25D366]/10 px-4 py-2 text-xs font-semibold text-[#1a9e4d] transition-colors hover:bg-[#25D366]/20"
              >
                <span>💬</span> Chat on WhatsApp
              </a>
            )}

            {/* Social links */}
            {socialLinks.length > 0 && (
              <div className="mt-6">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Follow us
                </p>
                <div className="flex flex-wrap gap-2">
                  {socialLinks.map((link) => (
                    <a
                      key={link.id}
                      href={link.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium transition-colors hover:border-primary/30 hover:bg-[var(--pink-soft)]"
                      title={link.name}
                    >
                      <span>{platformIcon(link.name)}</span>
                      {link.name}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Nav column */}
          <div className="text-sm">
            <p className="mb-4 font-semibold text-foreground">{t("nav.boxes")}</p>
            <ul className="space-y-2.5 text-muted-foreground">
              <li><Link to="/boxes" className="transition-colors hover:text-foreground">{t("nav.boxes")}</Link></li>
              <li><Link to="/buildbox" className="transition-colors hover:text-foreground">{t("cta.build")}</Link></li>
              <li><Link to="/flavors" className="transition-colors hover:text-foreground">{t("nav.flavors")}</Link></li>
              <li><Link to="/cart" className="transition-colors hover:text-foreground">{t("nav.cart")}</Link></li>
            </ul>
          </div>

          {/* Contact column */}
          <div className="text-sm">
            <p className="mb-4 font-semibold text-foreground">{t("nav.contact")}</p>
            <ul className="space-y-2.5 text-muted-foreground">
              {settings?.contact_email && (
                <li>
                  <a href={`mailto:${settings.contact_email}`} className="transition-colors hover:text-foreground">
                    {settings.contact_email}
                  </a>
                </li>
              )}
              <li>{settings?.contact_phone}</li>
              {settings?.contact_address && <li>{settings.contact_address}</li>}
            </ul>
          </div>
        </div>
      </div>

      <div className="border-t border-border/60 px-4 py-5">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} {isLoading ? "" : (settings?.store_name ?? "Leen Bakery")}. {t("footer.rights")}</span>
          <Link to="/#contact" className="hover:text-foreground">{t("nav.contact")}</Link>
        </div>
      </div>
    </footer>
  );
}

// ── WhatsApp floating button ───────────────────────────────────────────────────

export function WhatsAppFloatingButton() {
  const { data: settings } = useQuery({ queryKey: ["public-settings"], queryFn: fetchSettings });
  if (!settings?.whatsapp_number) return null;
  const href = `https://wa.me/${settings.whatsapp_number.replace(/\D/g, "")}`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label="Chat with us on WhatsApp"
      className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-[var(--shadow-card)] transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25D366] sm:bottom-8 sm:right-8"
      style={{ background: "#25D366" }}
    >
      <svg viewBox="0 0 32 32" className="h-7 w-7 fill-white" aria-hidden>
        <path d="M16 2C8.268 2 2 8.268 2 16c0 2.444.658 4.733 1.806 6.708L2 30l7.522-1.773A13.94 13.94 0 0 0 16 30c7.732 0 14-6.268 14-14S23.732 2 16 2zm0 25.5a11.44 11.44 0 0 1-5.836-1.6l-.418-.248-4.464 1.052 1.082-4.344-.272-.43A11.46 11.46 0 0 1 4.5 16C4.5 9.596 9.596 4.5 16 4.5S27.5 9.596 27.5 16 22.404 27.5 16 27.5zm6.29-8.578c-.346-.173-2.042-1.006-2.358-1.12-.316-.115-.546-.173-.776.174-.23.346-.89 1.12-1.09 1.35-.2.23-.4.26-.746.087-.346-.174-1.46-.538-2.782-1.716-1.028-.917-1.722-2.049-1.923-2.395-.2-.346-.022-.533.15-.705.155-.155.346-.404.52-.605.173-.202.23-.347.346-.578.115-.23.058-.433-.03-.606-.087-.173-.776-1.872-1.063-2.563-.28-.673-.564-.582-.776-.593l-.662-.012c-.23 0-.606.087-.923.433s-1.21 1.178-1.21 2.873 1.238 3.332 1.41 3.562c.173.23 2.437 3.72 5.906 5.214.825.356 1.468.568 1.97.727.827.263 1.581.226 2.176.137.664-.1 2.042-.834 2.33-1.638.287-.804.287-1.493.2-1.638-.086-.144-.316-.23-.662-.403z" />
      </svg>
    </a>
  );
}
