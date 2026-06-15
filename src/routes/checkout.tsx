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
import { trackPixel, getPixelCookies } from "@/lib/meta-pixel";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/checkout")({
  head: () => ({ meta: [{ title: "Checkout — Leen Bakery" }] }),
  component: CheckoutPage,
});

// Delivery is allowed between 13:00 and 21:00 (1 PM – 9 PM)
const DELIVERY_START_HOUR = 13;
const DELIVERY_END_HOUR = 21;
const MIN_ADVANCE_HOURS = 3;

/** Build all possible time slots (every 30 min) between 13:00 and 21:00 */
function buildAllSlots(): string[] {
  const slots: string[] = [];
  for (let h = DELIVERY_START_HOUR; h <= DELIVERY_END_HOUR; h++) {
    for (const m of [0, 30]) {
      if (h === DELIVERY_END_HOUR && m > 0) break;
      slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
  }
  return slots;
}

const ALL_SLOTS = buildAllSlots();

/** Format a "HH:MM" string to "1:00 PM" style */
function formatTime(slot: string): string {
  const [h, m] = slot.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

/** Format a Date as YYYY-MM-DD (local) */
function toISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Returns the available delivery slots.
 *
 * @param isToday - Pass `true` when the selected date IS today (derived from
 *   `dateOption === "today"` at the call site). Passing an explicit boolean
 *   avoids comparing two Date objects, which is unreliable on mobile browsers
 *   (iOS Safari and Android Chrome can yield inconsistent getDate() results
 *   when SSR-hydrated dates are involved).
 *
 * When isToday is true, only slots at least MIN_ADVANCE_HOURS ahead of now
 * are returned. Cutoff uses minutes-of-day arithmetic to prevent midnight
 * rollover: after 21:00 local time, now + 3h > 24:00, so cutoffMinutes would
 * wrap back to 0–120 and incorrectly pass all slots — the >= 1440 guard
 * prevents that.
 *
 * When isToday is false (future date), all slots are returned.
 */
function availableSlotsForDate(isToday: boolean): string[] {
  if (!isToday) return [...ALL_SLOTS];

  const now = new Date();

  // Minutes-of-day arithmetic — no Date object wrapping required.
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const cutoffMinutes = nowMinutes + MIN_ADVANCE_HOURS * 60;

  // Cutoff crossed midnight: all delivery slots (13:00–21:00) are in the past.
  if (cutoffMinutes >= 24 * 60) return [];

  return ALL_SLOTS.filter((slot) => {
    const [h, m] = slot.split(":").map(Number);
    return h * 60 + m >= cutoffMinutes;
  });
}

function CheckoutPage() {
  const { t } = useI18n();
  const { items, isLoaded, subtotal, clear } = useCart();
  const navigate = useNavigate();
  const submit = useServerFn(placeOrder);

  const { data: settings } = useQuery({ queryKey: ["public-settings"], queryFn: fetchSettings });
  const baseDeliveryFee = Number(settings?.delivery_fee ?? 90);
  const freeShippingThreshold = settings?.free_shipping_threshold ?? 750;

  const [form, setForm] = useState({ name: "", phone: "", address: "", notes: "", coupon: "" });
  const [discount, setDiscount] = useState(0);
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const orderSubmittedRef = useRef(false);

  // Delivery scheduling state
  type DateOption = "today" | "tomorrow" | "other";
  const [dateOption, setDateOption] = useState<DateOption | null>(null);
  const [customDate, setCustomDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [calendarOpen, setCalendarOpen] = useState(false);

  const todayMidnight = new Date();
  todayMidnight.setHours(0, 0, 0, 0);

  const tomorrowMidnight = new Date(todayMidnight);
  tomorrowMidnight.setDate(tomorrowMidnight.getDate() + 1);

  // Resolve the actual Date from the chosen option.
  // For "today" we pass new Date() (actual current time) — NOT todayMidnight — so that
  // availableSlotsForDate's isToday check reliably matches the current moment on all
  // mobile browsers. toISODate strips the time part for DB queries anyway.
  const selectedDate: Date | undefined = (() => {
    if (dateOption === "today") return new Date();
    if (dateOption === "tomorrow") return tomorrowMidnight;
    if (dateOption === "other") return customDate;
    return undefined;
  })();

  const dateStr = selectedDate ? toISODate(selectedDate) : null;
  const todayStr = toISODate(new Date());

  // Fetch blocked slots for the selected date (so checkout hides admin-blocked slots)
  const { data: blockedForSelected = [] } = useQuery({
    queryKey: ["blocked-slots", dateStr],
    queryFn: async () => {
      if (!dateStr) return [];
      const { data } = await supabase
        .from("blocked_delivery_slots")
        .select("slot_time")
        .eq("slot_date", dateStr);
      return (data ?? []).map((r: any) => r.slot_time as string);
    },
    enabled: !!dateStr,
  });

  // Also fetch blocked slots for today to update the "no slots today" warning
  const { data: blockedToday = [] } = useQuery({
    queryKey: ["blocked-slots", todayStr],
    queryFn: async () => {
      const { data } = await supabase
        .from("blocked_delivery_slots")
        .select("slot_time")
        .eq("slot_date", todayStr);
      return (data ?? []).map((r: any) => r.slot_time as string);
    },
  });

  const blockedForSelectedSet = new Set(blockedForSelected);
  const blockedTodaySet = new Set(blockedToday);

  const noSlotsToday =
    availableSlotsForDate(true).filter((s) => !blockedTodaySet.has(s)).length === 0;
  const availableSlots = selectedDate
    ? availableSlotsForDate(dateOption === "today").filter((s) => !blockedForSelectedSet.has(s))
    : [];

  // When date changes (or blocked slots load), reset time if it's no longer valid
  useEffect(() => {
    if (!selectedDate) { setSelectedTime(""); return; }
    const slots = availableSlotsForDate(dateOption === "today").filter((s) => !blockedForSelectedSet.has(s));
    if (selectedTime && !slots.includes(selectedTime)) setSelectedTime("");
  }, [dateOption, selectedDate, blockedForSelected]);

  function handleDateOption(opt: DateOption) {
    setDateOption(opt);
    setSelectedTime("");
    if (opt !== "other") setCustomDate(undefined);
    if (opt === "other") setCalendarOpen(true);
  }

  const isFreeShipping = subtotal - discount >= freeShippingThreshold;
  const deliveryFee = isFreeShipping ? 0 : baseDeliveryFee;
  const total = Math.max(0, subtotal - discount + deliveryFee);

  useEffect(() => {
    if (items.length === 0) return;
    trackPixel("InitiateCheckout", { value: subtotal, currency: "EGP", num_items: items.length });
  }, [items.length, subtotal]);

  useEffect(() => {
    if (!isLoaded) return;
    if (items.length === 0 && !orderSubmittedRef.current) {
      navigate({ to: "/cart" });
    }
  }, [isLoaded, items.length, navigate]);

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
    if (!selectedDate) {
      toast.error("Please select a delivery date");
      return;
    }
    if (!selectedTime) {
      toast.error("Please select a delivery time");
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
          delivery_date: toISODate(selectedDate),
          delivery_time_slot: selectedTime,
          meta: {
            event_id: eventId,
            user_agent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
            ...getPixelCookies(),
          },
        },
      });
      trackPixel(
        "Purchase",
        { value: Number(res.total), currency: "EGP", num_items: items.length },
        eventId,
      );

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
          delivery_date: toISODate(selectedDate),
          delivery_time_slot: selectedTime,
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

  if (!isLoaded) {
    return (
      <div className="min-h-screen">
        <SiteHeader />
        <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
          <p className="text-muted-foreground">Loading…</p>
        </main>
        <SiteFooter />
      </div>
    );
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

            {/* Delivery Schedule Section */}
            <div className="rounded-2xl border border-border/60 bg-card p-4 space-y-4">
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-medium text-sm">{t("checkout.delivery_schedule")}</h3>
              </div>
              <p className="text-xs text-muted-foreground">{t("checkout.delivery_window")}</p>

              {/* Date Picker — 3 quick options */}
              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  {t("checkout.delivery_date")}<span className="text-destructive"> *</span>
                </label>
                <div className="flex gap-2 flex-wrap">
                  {/* Today */}
                  <button
                    type="button"
                    disabled={noSlotsToday}
                    onClick={() => handleDateOption("today")}
                    className={`flex-1 min-w-[80px] rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                      dateOption === "today"
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background hover:bg-muted"
                    }`}
                  >
                    Today
                  </button>
                  {/* Tomorrow */}
                  <button
                    type="button"
                    onClick={() => handleDateOption("tomorrow")}
                    className={`flex-1 min-w-[80px] rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${
                      dateOption === "tomorrow"
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background hover:bg-muted"
                    }`}
                  >
                    Tomorrow
                  </button>
                  {/* Another day */}
                  <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        onClick={() => handleDateOption("other")}
                        className={`flex-1 min-w-[110px] inline-flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${
                          dateOption === "other"
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-background hover:bg-muted"
                        }`}
                      >
                        <CalendarIcon className="h-3.5 w-3.5 shrink-0" />
                        {dateOption === "other" && customDate
                          ? customDate.toLocaleDateString(undefined, { month: "short", day: "numeric" })
                          : "Another day"}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={customDate}
                        onSelect={(d) => {
                          setCustomDate(d);
                          setCalendarOpen(false);
                        }}
                        disabled={(date) => {
                          const d = new Date(date);
                          d.setHours(0, 0, 0, 0);
                          // Disable past, today, and tomorrow (those have dedicated buttons)
                          return d <= tomorrowMidnight;
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                {noSlotsToday && (
                  <p className="mt-1.5 text-xs text-amber-600">{t("checkout.no_slots_today")}</p>
                )}
              </div>

              {/* Time Slot Picker */}
              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  {t("checkout.delivery_time")}<span className="text-destructive"> *</span>
                </label>
                {!selectedDate ? (
                  <p className="text-xs text-muted-foreground">{t("checkout.select_date_first")}</p>
                ) : availableSlots.length === 0 ? (
                  <p className="text-xs text-amber-600">{t("checkout.no_slots_today")}</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {availableSlots.map((slot) => (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => setSelectedTime(slot)}
                        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                          selectedTime === slot
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-background hover:bg-muted"
                        }`}
                      >
                        <Clock className="h-3 w-3" />
                        {formatTime(slot)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

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

            {/* Delivery schedule summary */}
            {(selectedDate || selectedTime) && (
              <div className="mt-4 rounded-xl border border-border/60 bg-muted/40 px-4 py-3 text-xs space-y-1">
                {selectedDate && (
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <CalendarIcon className="h-3 w-3 shrink-0" />
                    <span>{selectedDate.toLocaleDateString(undefined, { weekday: "short", year: "numeric", month: "short", day: "numeric" })}</span>
                  </div>
                )}
                {selectedTime && (
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Clock className="h-3 w-3 shrink-0" />
                    <span>{formatTime(selectedTime)}</span>
                  </div>
                )}
              </div>
            )}

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
              <Row
                label={t("cart.delivery")}
                value={isFreeShipping ? t("cart.free_shipping") : formatCurrency(deliveryFee)}
                highlight={isFreeShipping}
              />
              <Row label={t("cart.total")} value={formatCurrency(total)} bold />
            </dl>
            {isFreeShipping && (
              <p className="mt-3 rounded-lg bg-green-50 px-3 py-2 text-xs font-medium text-green-700 dark:bg-green-900/20 dark:text-green-400">
                🎉 You qualify for free delivery!
              </p>
            )}
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
  label, value, onChange, type = "text", required, textarea,
}: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; required?: boolean; textarea?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">
        {label}{required && <span className="text-destructive"> *</span>}
      </span>
      {textarea ? (
        <textarea required={required} value={value} onChange={(e) => onChange(e.target.value)} rows={3}
          className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm outline-none ring-ring/20 focus:ring-2" />
      ) : (
        <input required={required} type={type} value={value} onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm outline-none ring-ring/20 focus:ring-2" />
      )}
    </label>
  );
}

function Row({ label, value, bold, highlight }: { label: string; value: string; bold?: boolean; highlight?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? "border-t border-border/60 pt-2 font-display text-base" : "text-muted-foreground"}`}>
      <span>{label}</span>
      <span className={bold ? "text-foreground" : highlight ? "font-semibold text-green-600" : ""}>{value}</span>
    </div>
  );
}
