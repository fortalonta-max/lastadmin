import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Menu, ShoppingBag, X, Globe } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useCart } from "@/lib/cart";
import { cn } from "@/lib/utils";

export function SiteHeader() {
  const { t, locale, setLocale } = useI18n();
  const { count } = useCart();
  const [open, setOpen] = useState(false);

  const links = [
    { to: "/", label: t("nav.home") },
    { to: "/boxes", label: t("nav.boxes") },
    { to: "/flavors", label: t("nav.flavors") },
    { to: "/#reviews", label: t("nav.reviews") },
    { to: "/#faq", label: t("nav.faq") },
    { to: "/#contact", label: t("nav.contact") },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-[var(--pink)] text-ink">
            <span className="text-lg">🍪</span>
          </span>
          <span className="font-display text-xl font-semibold tracking-tight">NYC Cookies</span>
        </Link>

        <nav className="hidden items-center gap-7 md:flex">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="text-sm text-foreground/75 transition-colors hover:text-foreground"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
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
            className="relative grid h-10 w-10 place-items-center rounded-full border border-border bg-card transition-colors hover:bg-muted"
            aria-label={t("nav.cart")}
          >
            <ShoppingBag className="h-4 w-4" />
            {count > 0 && (
              <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                {count}
              </span>
            )}
          </Link>
          <button
            onClick={() => setOpen((v) => !v)}
            className="grid h-10 w-10 place-items-center rounded-full border border-border bg-card md:hidden"
            aria-label="Menu"
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div
        className={cn(
          "overflow-hidden border-t border-border/60 transition-[max-height] md:hidden",
          open ? "max-h-96" : "max-h-0",
        )}
      >
        <nav className="flex flex-col gap-1 px-4 py-3">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-2 text-sm hover:bg-muted"
            >
              {l.label}
            </Link>
          ))}
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
  return (
    <footer className="mt-20 border-t border-border/60 bg-card">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-[var(--pink)]">🍪</span>
            <span className="font-display text-xl">NYC Cookies</span>
          </div>
          <p className="mt-3 max-w-sm text-sm text-muted-foreground">{t("footer.tagline")}</p>
        </div>
        <div className="text-sm">
          <p className="mb-3 font-semibold">{t("nav.boxes")}</p>
          <ul className="space-y-2 text-muted-foreground">
            <li><Link to="/boxes" className="hover:text-foreground">{t("nav.boxes")}</Link></li>
            <li><Link to="/flavors" className="hover:text-foreground">{t("nav.flavors")}</Link></li>
            <li><Link to="/cart" className="hover:text-foreground">{t("nav.cart")}</Link></li>
          </ul>
        </div>
        <div className="text-sm">
          <p className="mb-3 font-semibold">{t("nav.contact")}</p>
          <ul className="space-y-2 text-muted-foreground">
            <li>hello@nyccookies.com</li>
            <li>+1 (555) 555-5555</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border/60 px-4 py-5 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} NYC Cookies. {t("footer.rights")}
      </div>
    </footer>
  );
}
