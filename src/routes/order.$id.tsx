import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, MessageCircle, Home, CalendarIcon, Clock } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { fetchSettings } from "@/lib/storefront";
import { formatCurrency } from "@/lib/cart";

export const Route = createFileRoute("/order/$id")({
  head: () => ({ meta: [{ title: "Order confirmed — NYC Cookies" }] }),
  component: OrderPage,
});

interface InvoiceData {
  order_number: number;
  customer: {
    name: string;
    phone: string;
    address: string;
    notes: string | null;
  };
  items: Array<{
    box_name: string;
    cookie_count: number;
    quantity: number;
    unit_price: number;
    selected_flavors: Array<{ flavor_name: string; quantity: number }>;
  }>;
  coupon_code: string | null;
  subtotal: number;
  discount: number;
  delivery_fee: number;
  total: number;
  delivery_date?: string | null;
  delivery_time_slot?: string | null;
}

/** Format "HH:MM" to "1:00 PM" */
function formatTime(slot: string): string {
  const [h, m] = slot.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

/** Format "YYYY-MM-DD" to a readable date string */
function formatDate(dateStr: string): string {
  const [y, mo, d] = dateStr.split("-").map(Number);
  const date = new Date(y, mo - 1, d);
  return date.toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" });
}

function buildWhatsAppMessage(invoice: InvoiceData, id: string): string {
  const lines: string[] = [];

  lines.push(`🍪 *Order Confirmation*`);
  lines.push(`━━━━━━━━━━━━━━━━━━━━`);
  lines.push(`Order *#${invoice.order_number ?? id.slice(0, 8)}*`);
  lines.push(``);

  lines.push(`*👤 Customer Details*`);
  lines.push(`Name: ${invoice.customer.name}`);
  lines.push(`Phone: ${invoice.customer.phone}`);
  lines.push(`Address: ${invoice.customer.address}`);
  if (invoice.customer.notes) {
    lines.push(`Notes: ${invoice.customer.notes}`);
  }
  lines.push(``);

  if (invoice.delivery_date || invoice.delivery_time_slot) {
    lines.push(`*🗓️ Delivery Schedule*`);
    if (invoice.delivery_date) lines.push(`Date: ${formatDate(invoice.delivery_date)}`);
    if (invoice.delivery_time_slot) lines.push(`Time: ${formatTime(invoice.delivery_time_slot)}`);
    lines.push(``);
  }

  lines.push(`*📦 Order Items*`);
  for (const item of invoice.items) {
    lines.push(`• ${item.box_name} ×${item.quantity} (${item.cookie_count} cookies)`);
    for (const f of item.selected_flavors) {
      lines.push(`  - ${f.flavor_name} ×${f.quantity}`);
    }
    lines.push(`  Item total: ${formatCurrency(item.unit_price * item.quantity)}`);
  }
  lines.push(``);

  lines.push(`*💰 Invoice Summary*`);
  lines.push(`Subtotal: ${formatCurrency(invoice.subtotal)}`);
  if (invoice.discount > 0) {
    const couponLabel = invoice.coupon_code ? ` (${invoice.coupon_code})` : ``;
    lines.push(`Discount${couponLabel}: -${formatCurrency(invoice.discount)}`);
  }
  lines.push(`Delivery: ${formatCurrency(invoice.delivery_fee)}`);
  lines.push(`━━━━━━━━━━━━━━━━━━━━`);
  lines.push(`*Total: ${formatCurrency(invoice.total)}*`);
  lines.push(``);
  lines.push(`💳 Payment: Cash on Delivery`);
  lines.push(``);
  lines.push(`Thank you for your order! We will confirm it with you shortly. 🎉`);

  return lines.join(`\n`);
}

function OrderPage() {
  const { id } = Route.useParams();
  const { t } = useI18n();
  const { data: settings } = useQuery({ queryKey: ["public-settings"], queryFn: fetchSettings });

  // Read the full invoice saved by checkout.tsx into sessionStorage
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = sessionStorage.getItem(`order-invoice-${id}`);
      if (raw) setInvoice(JSON.parse(raw));
    } catch {
      /* ignore parse errors */
    }
  }, [id]);

  // Fallback: fetch minimal data from Supabase (anon RLS may limit fields)
  const { data: order } = useQuery({
    queryKey: ["order-anon", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("order_number, total")
        .eq("id", id)
        .maybeSingle();
      return data;
    },
  });

  const displayOrderNumber = invoice?.order_number ?? order?.order_number;
  const displayTotal = invoice?.total ?? (order ? Number(order.total) : null);

  const phone = settings?.whatsapp_number?.replace(/\D/g, "");

  // Build WhatsApp message: rich if invoice is available, simple fallback otherwise
  const waMsg = encodeURIComponent(
    invoice
      ? buildWhatsAppMessage(invoice, id)
      : `Hi! I just placed an order. Order ${displayOrderNumber ? `#${displayOrderNumber}` : id.slice(0, 8)}. Total: ${displayTotal !== null ? formatCurrency(displayTotal) : "—"}. Please confirm my order.`,
  );

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-20 text-center sm:px-6">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-green-50">
          <CheckCircle2 className="h-9 w-9 text-green-500" />
        </div>
        <h1 className="mt-6 font-display text-4xl sm:text-5xl">{t("order.thank_you")}</h1>
        <p className="mt-3 text-muted-foreground">
          {t("order.number")}
          <span className="font-mono font-semibold text-foreground">
            {displayOrderNumber ?? id.slice(0, 8)}
          </span>
          {displayTotal !== null && (
            <span className="ms-2">— {formatCurrency(displayTotal)}</span>
          )}
        </p>
        <p className="mt-4 rounded-2xl bg-[var(--blue-soft)] px-6 py-4 text-sm leading-relaxed text-foreground">
          {t("order.confirmed")}
        </p>

        {/* Delivery schedule pill */}
        {(invoice?.delivery_date || invoice?.delivery_time_slot) && (
          <div className="mt-4 inline-flex flex-wrap items-center justify-center gap-3 rounded-2xl border border-border/60 bg-card px-5 py-3 text-sm">
            {invoice?.delivery_date && (
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <CalendarIcon className="h-4 w-4 shrink-0" />
                {formatDate(invoice.delivery_date)}
              </span>
            )}
            {invoice?.delivery_time_slot && (
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Clock className="h-4 w-4 shrink-0" />
                {formatTime(invoice.delivery_time_slot)}
              </span>
            )}
          </div>
        )}

        {/* WhatsApp button — always shown when a phone number is configured */}
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {phone && (
            <a
              href={`https://wa.me/${phone}?text=${waMsg}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-[#25D366] px-6 py-3 text-sm font-semibold text-white shadow-md transition-opacity hover:opacity-90"
            >
              <MessageCircle className="h-4 w-4" />
              {t("order.whatsapp")}
            </a>
          )}
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-5 py-2.5 text-sm font-semibold"
          >
            <Home className="h-4 w-4" /> {t("nav.home")}
          </Link>
        </div>

        {/* Invoice preview card (visible when full data is available) */}
        {invoice && (
          <div className="mt-10 rounded-2xl border border-border/60 bg-card p-6 text-start text-sm">
            <h2 className="mb-4 font-display text-lg">
              {t("order.number")}{invoice.order_number}
            </h2>

            <div className="mb-4 space-y-0.5 text-muted-foreground">
              <p className="font-semibold text-foreground">{invoice.customer.name}</p>
              <p>{invoice.customer.phone}</p>
              <p className="whitespace-pre-line">{invoice.customer.address}</p>
              {invoice.customer.notes && (
                <p className="mt-1 rounded-lg bg-muted px-3 py-2 text-xs italic">
                  {invoice.customer.notes}
                </p>
              )}
            </div>

            {/* Delivery schedule in invoice */}
            {(invoice.delivery_date || invoice.delivery_time_slot) && (
              <div className="mb-4 rounded-xl border border-border/60 bg-muted/40 px-4 py-3 space-y-1.5">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("order.delivery_schedule")}
                </p>
                {invoice.delivery_date && (
                  <div className="flex items-center gap-2 text-sm">
                    <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span>{formatDate(invoice.delivery_date)}</span>
                  </div>
                )}
                {invoice.delivery_time_slot && (
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span>{formatTime(invoice.delivery_time_slot)}</span>
                  </div>
                )}
              </div>
            )}

            <ul className="mb-4 divide-y divide-border/60">
              {invoice.items.map((item, idx) => (
                <li key={idx} className="py-3">
                  <div className="flex justify-between gap-2">
                    <span className="font-semibold">
                      {item.box_name} ×{item.quantity}{" "}
                      <span className="text-xs font-normal text-muted-foreground">
                        ({item.cookie_count} cookies)
                      </span>
                    </span>
                    <span className="shrink-0">{formatCurrency(item.unit_price * item.quantity)}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {item.selected_flavors.map((f, i) => (
                      <span
                        key={i}
                        className="rounded-full bg-[var(--pink-soft)] px-2.5 py-0.5 text-[11px]"
                      >
                        {f.flavor_name} ×{f.quantity}
                      </span>
                    ))}
                  </div>
                </li>
              ))}
            </ul>

            <div className="space-y-1.5 border-t border-border/60 pt-4 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>{t("cart.subtotal")}</span>
                <span>{formatCurrency(invoice.subtotal)}</span>
              </div>
              {invoice.discount > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>
                    {t("cart.discount")}
                    {invoice.coupon_code && (
                      <span className="ms-1 font-mono text-xs">({invoice.coupon_code})</span>
                    )}
                  </span>
                  <span>− {formatCurrency(invoice.discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-muted-foreground">
                <span>{t("cart.delivery")}</span>
                <span>{formatCurrency(invoice.delivery_fee)}</span>
              </div>
              <div className="flex justify-between border-t border-border/60 pt-2 font-display text-base">
                <span>{t("cart.total")}</span>
                <span>{formatCurrency(invoice.total)}</span>
              </div>
            </div>
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
