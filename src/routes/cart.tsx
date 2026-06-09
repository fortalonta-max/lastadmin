import { createFileRoute, Link } from "@tanstack/react-router";
import { Trash2, Minus, Plus, ArrowRight } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { useCart, formatCurrency } from "@/lib/cart";
import { useI18n } from "@/lib/i18n";

const FREE_SHIPPING_THRESHOLD = 750;

export const Route = createFileRoute("/cart")({
  head: () => ({ meta: [{ title: "Cart — Leen Bakery" }] }),
  component: CartPage,
});

function CartPage() {
  const { t } = useI18n();
  const { items, remove, updateQty, subtotal } = useCart();

  const isFreeShipping = subtotal >= FREE_SHIPPING_THRESHOLD;

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <h1 className="font-display text-4xl sm:text-5xl">{t("cart.title")}</h1>

        {items.length === 0 ? (
          <div className="mt-10 rounded-3xl border border-border/60 bg-card p-10 text-center">
            <p className="text-muted-foreground">{t("cart.empty")}</p>
            <Link
              to="/boxes"
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground"
            >
              {t("cta.continue_shopping")} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
            <ul className="space-y-3">
              {items.map((i) => (
                <li
                  key={i.id}
                  className="flex gap-4 rounded-2xl border border-border/60 bg-card p-4"
                >
                  <div
                    className="h-24 w-24 shrink-0 rounded-xl"
                    style={{
                      background: i.image_url
                        ? `url(${i.image_url}) center/cover`
                        : "var(--gradient-hero)",
                    }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-display text-lg">{i.box_name}</h3>
                        <p className="text-xs text-muted-foreground">
                          {i.cookie_count} {t("box.cookies")}
                        </p>
                      </div>
                      <button
                        onClick={() => remove(i.id)}
                        className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-destructive"
                        aria-label="remove"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {i.selected_flavors.map((f, idx) => (
                        <span
                          key={`${f.flavor_id}-${idx}`}
                          className="rounded-full bg-[var(--pink-soft)] px-2.5 py-1 text-[11px] font-medium text-ink"
                        >
                          {f.flavor_name} ×{f.quantity}
                        </span>
                      ))}
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQty(i.id, i.quantity - 1)}
                          className="grid h-7 w-7 place-items-center rounded-full border border-border bg-card"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-5 text-center text-sm font-semibold">{i.quantity}</span>
                        <button
                          onClick={() => updateQty(i.id, i.quantity + 1)}
                          className="grid h-7 w-7 place-items-center rounded-full bg-primary text-primary-foreground"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                      <p className="font-display text-lg">
                        {formatCurrency(i.unit_price * i.quantity)}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <aside className="h-fit rounded-3xl border border-border/60 bg-card p-6 lg:sticky lg:top-24">
              <h2 className="font-display text-xl">{t("checkout.summary")}</h2>
              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">{t("cart.subtotal")}</dt>
                  <dd>{formatCurrency(subtotal)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">{t("cart.delivery")}</dt>
                  <dd>
                    {isFreeShipping ? (
                      <span className="font-semibold text-green-600">{t("cart.free_shipping")}</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        Free over {formatCurrency(FREE_SHIPPING_THRESHOLD)}
                      </span>
                    )}
                  </dd>
                </div>
              </dl>
              {!isFreeShipping && (
                <p className="mt-3 rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
                  Add{" "}
                  <span className="font-semibold text-foreground">
                    {formatCurrency(FREE_SHIPPING_THRESHOLD - subtotal)}
                  </span>{" "}
                  more for free delivery 🚚
                </p>
              )}
              <Link
                to="/checkout"
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground"
              >
                {t("cta.checkout")} <ArrowRight className="h-4 w-4" />
              </Link>
            </aside>
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
