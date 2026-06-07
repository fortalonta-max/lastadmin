import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { useI18n } from "@/lib/i18n";
import { useCart, formatCurrency } from "@/lib/cart";
import { fetchSettings } from "@/lib/storefront";
import { placeOrder } from "@/lib/orders.functions";
import { trackPixel } from "@/lib/meta-pixel";

export const Route = createFileRoute("/checkout")({
  head: () => ({ meta: [{ title: "Checkout — NYC Cookies" }] }),
  component: CheckoutPage,
});

function CheckoutPage() {
  const { t } = useI18n();
  const { items, subtotal, clear } = useCart();
  const navigate = useNavigate();
  const submit = useServerFn(placeOrder);

  const { data: settings } = useQuery({ queryKey: ["public-settings"], queryFn: fetchSettings });
  const deliveryFee = Number(settings?.delivery_fee ?? 0);

  const [form, setForm] = useState({ name: "", phone: "", address: "", notes: "", coupon: "" });
  const [discount, setDiscount] = useState(0);
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const orderSubmittedRef = useRef(false);

  const total = Math.max(0, subtotal - discount + deliveryFee);

  useEffect(() => {
    if (items.length === 0) return;
    trackPixel("InitiateCheckout", { value: subtotal, currency: "USD", num_items: items.length });
  }, [items.length, subtotal]);

  useEffect(() => {
    if (items.length === 0 && !orderSubmittedRef.current) navigate({ to: "/cart" });
  }, [items.length, navigate]);

  async function applyCoupon() {
    if (!form.coupon) return;
    const { supabase } = await import("@/integrations/supabase/client");
    const { data, error } = await supabase.rpc("validate_coupon", {
      _code: form.coupon.trim(),
      _subtotal: subtotal,
    });
    if (error || !data?.valid) {
      if (!error && data?.reason === "min_subtotal") {
        toast.error(`Min subtotal ${formatCurrency(Number(data.min_subtotal))}`);
      } else {
        toast.error("Invalid coupon");
      }
      setDiscount(0);
      setAppliedCoupon(null);
      return;
    }
    setDiscount(Number(data.discount));
    setAppliedCoupon(form.coupon.trim().toUpperCase());
    toast.success("Coupon applied");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || form.phone.trim().length < 4 || form.address.trim().length < 3) {
      toast.error("Please complete required fields");
      return;
    }
    setSubmitting(true);
    try {
      const eventId = crypto.randomUUID();
      const res = await submit({
        data: {
          customer: {
            name: form.name.trim(),
            phone: form.phone.trim(),
            address: form.address.trim(),
            notes: form.notes.trim() || undefined,
          },
          items: items.map((i) => ({
            box_id: i.box_id,
            box_name: i.box_name,
            cookie_count: i.cookie_count,
            quantity: i.quantity,
            selected_flavors: i.selected_flavors,
          })),
          coupon_code: appliedCoupon ?? undefined,
          meta: {
            event_id: eventId,
            user_agent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
          },
        },
      });
      trackPixel(
        "Purchase",
        { value: Number(res.total), currency: "USD", num_items: items.length },
        eventId,
      );

      // Save the full invoice to sessionStorage so the confirmation page
      // can build a rich WhatsApp message even before the DB query resolves.
      if (typeof window !== "undefined") {
        const invoice = {
          order_number: res.order_number,
          customer: {
            name: form.name.trim(),
            phone: form.phone.trim(),
            address: form.address.trim(),
            notes: form.notes.trim() || null,
          },
          items: items.map((i) => ({
            box_name: i.box_name,
            cookie_count: i.cookie_count,
            quantity: i.quantity,
            unit_price: i.unit_price,
            selected_flavors: i.selected_flavors,
          })),
          coupon_code: appliedCoupon,
          subtotal,
          discount,
          delivery_fee: deliveryFee,
          total: Number(res.total),
        };
        sessionStorage.setItem(`order-invoice-${res.id}`, JSON.stringify(invoice));
      }

      orderSubmittedRef.current = true;
      clear();
      navigate({ to: "/order/$id", params: { id: res.id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Order failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <h1 className="font-display text-4xl sm:text-5xl">{t("checkout.title")}</h1>
        <form onSubmit={handleSubmit} className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
          <div className="space-y-4">
            <Field label={t("checkout.name")} value={form.name} onChange={(v) => setForm({ ...form, name: v })} required />
            <Field label={t("checkout.phone")} value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} required type="tel" />
            <Field label={t("checkout.address")} value={form.address} onChange={(v) => setForm({ ...form, address: v })} required textarea />
            <Field label={t("checkout.notes")} value={form.notes} onChange={(v) => setForm({ ...form, notes: v })} textarea />
            <div className="rounded-2xl border border-border/60 bg-[var(--blue-soft)] p-4 text-sm">
              💵 {t("checkout.cod")}
            </div>
          </div>

          <aside className="h-fit rounded-3xl border border-border/60 bg-card p-6 lg:sticky lg:top-24">
            <h2 className="font-display text-xl">{t("checkout.summary")}</h2>
            <ul className="mt-4 space-y-3 text-sm">
              {items.map((i) => (
                <li key={i.id} className="flex justify-between gap-3">
                  <span className="truncate">
                    {i.box_name} <span className="text-muted-foreground">×{i.quantity}</span>
                  </span>
                  <span>{formatCurrency(i.unit_price * i.quantity)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-4 border-t border-border/60 pt-4">
              <div className="flex gap-2">
                <input
                  value={form.coupon}
                  onChange={(e) => setForm({ ...form, coupon: e.target.value })}
                  placeholder={t("cart.coupon")}
                  className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  onClick={applyCoupon}
                  className="rounded-lg bg-foreground px-3 py-2 text-xs font-semibold text-background"
                >
                  {t("cart.apply")}
                </button>
              </div>
            </div>
            <dl className="mt-4 space-y-2 text-sm">
              <Row label={t("cart.subtotal")} value={formatCurrency(subtotal)} />
              {discount > 0 && (
                <Row label={t("cart.discount")} value={`− ${formatCurrency(discount)}`} />
              )}
              <Row label={t("cart.delivery")} value={formatCurrency(deliveryFee)} />
              <Row label={t("cart.total")} value={formatCurrency(total)} bold />
            </dl>
            <button
              type="submit"
              disabled={submitting}
              className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            >
              {submitting ? "Placing order…" : t("cta.place_order")}
            </button>
          </aside>
        </form>
      </main>
      <SiteFooter />
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required,
  textarea,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  textarea?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">
        {label}
        {required && <span className="text-destructive"> *</span>}
      </span>
      {textarea ? (
        <textarea
          required={required}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm outline-none ring-ring/20 focus:ring-2"
        />
      ) : (
        <input
          required={required}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm outline-none ring-ring/20 focus:ring-2"
        />
      )}
    </label>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? "border-t border-border/60 pt-2 font-display text-base" : "text-muted-foreground"}`}>
      <span>{label}</span>
      <span className={bold ? "text-foreground" : ""}>{value}</span>
    </div>
  );
}
