import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Menu, ShoppingBag, X, Globe, ArrowRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useI18n } from "@/lib/i18n";
import { useCart } from "@/lib/cart";
import { fetchSettings } from "@/lib/storefront";
import { cn } from "@/lib/utils";

function BrandLogo({ logoUrl, storeName }: { logoUrl?: string | null; storeName?: string | null }) {
  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={storeName ?? "Store logo"}
        className="h-12 w-auto max-w-[180px] object-contain"
      />
    );
  }
  return (
    <>
      <span className="grid h-11 w-11 place-items-center rounded-full bg-[var(--pink)] text-ink">
        <span className="text-xl">🍪</span>
      </span>
      <span className="font-display text-2xl font-semibold tracking-tight">
        {storeName ?? "NYC Cookies"}
      </span>
    </>
  );
}

export function SiteHeader() {
  const { t, locale, setLocale } = useI18n();
  const { count } = useCart();
  const [open, setOpen] = useState(false);
  const { data: settings } = useQuery({ queryKey: ["public-settings"], queryFn: fetchSettings });

  const links = [
    { to: "/", label: t("nav.home") },
    { to: "/boxes", label: t("nav.boxes") },
    { to: "/flavors", label: t("nav.flavors") },
    { to: "/#reviews", label: t("nav.reviews") },
    { to: "/#faq", label: t("nav.faq") },
    { to: "/#contact", label: t("nav.contact") },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/90 backdrop-blur-xl">
      {/* Announcement bar */}
      <div className="border-b border-border/40 bg-primary/10 px-4 py-2 text-center text-xs font-medium text-foreground/80">
        Same-day delivery until 8:00 PM. Free delivery on orders over EGP 750.
      </div>

      {/* Main nav — approximately twice original h-16, logo centered */}
      <div className="relative mx-auto flex h-32 max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Left: desktop nav links */}
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
        {/* Mobile left spacer so logo stays centered */}
        <div className="w-11 md:hidden" aria-hidden />

        {/* Logo — absolutely centered horizontally */}
        <Link
          to="/"
          className="absolute left-1/2 flex -translate-x-1/2 items-center gap-2.5"
        >
          <BrandLogo logoUrl={settings?.logo_url} storeName={settings?.store_name} />
        </Link>

        {/* Right: action buttons */}
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

export function SiteFooter() {
  const { t } = useI18n();
  const { data: settings } = useQuery({ queryKey: ["public-settings"], queryFn: fetchSettings });

  const tagline = settings?.store_tagline_en ?? t("footer.tagline");

  return (
    <footer className="mt-16 border-t border-border/60 bg-card">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 md:grid-cols-4">
          {/* Brand column */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2.5">
              <BrandLogo logoUrl={settings?.logo_url} storeName={settings?.store_name} />
            </div>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground">{tagline}</p>
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
          </div>

          {/* Shop column */}
          <div className="text-sm">
            <p className="mb-4 font-semibold text-foreground">{t("nav.boxes")}</p>
            <ul className="space-y-2.5 text-muted-foreground">
              <li>
                <Link to="/boxes" className="transition-colors hover:text-foreground">{t("nav.boxes")}</Link>
              </li>
              <li>
                <Link to="/buildbox" className="transition-colors hover:text-foreground">{t("cta.build")}</Link>
              </li>
              <li>
                <Link to="/flavors" className="transition-colors hover:text-foreground">{t("nav.flavors")}</Link>
              </li>
              <li>
                <Link to="/cart" className="transition-colors hover:text-foreground">{t("nav.cart")}</Link>
              </li>
            </ul>
          </div>

          {/* Contact column */}
          <div className="text-sm">
            <p className="mb-4 font-semibold text-foreground">{t("nav.contact")}</p>
            <ul className="space-y-2.5 text-muted-foreground">
              {settings?.contact_email ? (
                <li>
                  <a href={`mailto:${settings.contact_email}`} className="transition-colors hover:text-foreground">
                    {settings.contact_email}
                  </a>
                </li>
              ) : (
                <li>hello@nyccookies.com</li>
              )}
              <li>{settings?.contact_phone ?? "+1 (555) 555-5555"}</li>
              {settings?.contact_address && <li>{settings.contact_address}</li>}
            </ul>
          </div>
        </div>
      </div>

      <div className="border-t border-border/60 px-4 py-5">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} {settings?.store_name ?? "NYC Cookies"}. {t("footer.rights")}</span>
          <Link to="/#contact" className="hover:text-foreground">{t("nav.contact")}</Link>
        </div>
      </div>
    </footer>
  );
}
