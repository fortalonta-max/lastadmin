import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { CalendarIcon, Clock } from "lucide-react";
import { DayPicker } from "react-day-picker";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/admin/delivery")({
  component: DeliveryAdmin,
});

const DELIVERY_START_HOUR = 13;
const DELIVERY_END_HOUR = 21;

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

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatTime(slot: string): string {
  const [h, m] = slot.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

function formatDateLabel(d: Date): string {
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

type Tab = "today" | "tomorrow" | "other";

function DeliveryAdmin() {
  const { t } = useI18n();
  const qc = useQueryClient();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const afterTomorrow = new Date(today);
  afterTomorrow.setDate(today.getDate() + 2);

  const [tab, setTab] = useState<Tab>("today");
  const [otherDate, setOtherDate] = useState<Date | undefined>(undefined);

  const selectedDate: Date | undefined =
    tab === "today" ? today :
    tab === "tomorrow" ? tomorrow :
    otherDate;

  const dateStr = selectedDate ? toDateStr(selectedDate) : null;

  const { data: blockedSlots = [], isLoading } = useQuery({
    queryKey: ["admin-blocked-slots", dateStr],
    queryFn: async () => {
      if (!dateStr) return [];
      const { data, error } = await supabase
        .from("blocked_delivery_slots")
        .select("slot_time")
        .eq("slot_date", dateStr);
      if (error) throw error;
      return (data ?? []).map((r: any) => r.slot_time as string);
    },
    enabled: !!dateStr,
  });

  const blockedSet = new Set(blockedSlots);

  async function toggleSlot(slot: string) {
    if (!dateStr) return;
    if (blockedSet.has(slot)) {
      const { error } = await supabase
        .from("blocked_delivery_slots")
        .delete()
        .eq("slot_date", dateStr)
        .eq("slot_time", slot);
      if (error) { toast.error(error.message); return; }
    } else {
      const hour = parseInt(slot.split(":")[0], 10);
      const { error } = await supabase
        .from("blocked_delivery_slots")
        .insert({ slot_date: dateStr, slot_time: slot, slot_hour: hour });
      if (error) { toast.error(error.message); return; }
    }
    qc.invalidateQueries({ queryKey: ["admin-blocked-slots", dateStr] });
  }

  async function blockAll() {
    if (!dateStr) return;
    const unblocked = ALL_SLOTS.filter((s) => !blockedSet.has(s));
    if (unblocked.length === 0) return;
    const { error } = await supabase
      .from("blocked_delivery_slots")
      .insert(unblocked.map((s) => ({
        slot_date: dateStr,
        slot_time: s,
        slot_hour: parseInt(s.split(":")[0], 10),
      })));
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["admin-blocked-slots", dateStr] });
  }

  async function unblockAll() {
    if (!dateStr) return;
    const { error } = await supabase
      .from("blocked_delivery_slots")
      .delete()
      .eq("slot_date", dateStr);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["admin-blocked-slots", dateStr] });
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "today",    label: t("checkout.date_today") },
    { id: "tomorrow", label: t("checkout.date_tomorrow") },
    { id: "other",    label: t("checkout.date_other") },
  ];

  const blockedCount = blockedSet.size;

  return (
    <div>
      <header className="mb-6">
        <h1 className="font-display text-3xl">{t("admin.delivery.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("admin.delivery.subtitle")}
        </p>
      </header>

      {/* Date tabs */}
      <div className="mb-6 flex flex-wrap gap-2">
        {tabs.map((tb) => (
          <button
            key={tb.id}
            onClick={() => setTab(tb.id)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
              tab === tb.id
                ? "bg-primary text-primary-foreground"
                : "border border-border bg-card text-foreground hover:bg-muted"
            }`}
          >
            {tb.label}
          </button>
        ))}
      </div>

      {/* Inline calendar for "other" tab */}
      {tab === "other" && (
        <div className="mb-6 w-fit rounded-2xl border border-border bg-card p-4">
          <DayPicker
            mode="single"
            selected={otherDate}
            onSelect={setOtherDate}
            disabled={{ before: afterTomorrow }}
            fromMonth={afterTomorrow}
            showOutsideDays={false}
          />
          {!otherDate && (
            <p className="mt-1 text-center text-xs text-muted-foreground">
              {t("admin.delivery.pick_date")}
            </p>
          )}
        </div>
      )}

      {/* Slot grid */}
      {dateStr ? (
        <div className="rounded-2xl border border-border bg-card p-5">
          {/* Card header */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-semibold">
                {formatDateLabel(selectedDate!)}
              </span>
              {blockedCount > 0 && (
                <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-semibold text-destructive">
                  {blockedCount} {t("admin.delivery.blocked_badge")}
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={unblockAll}
                disabled={blockedCount === 0}
                className="rounded-full border border-border px-3 py-1 text-xs hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
              >
                {t("admin.delivery.unblock_all")}
              </button>
              <button
                onClick={blockAll}
                disabled={blockedCount === ALL_SLOTS.length}
                className="rounded-full bg-destructive/10 px-3 py-1 text-xs text-destructive hover:bg-destructive/20 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {t("admin.delivery.block_all")}
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              Loading…
            </div>
          ) : (
            <>
              <p className="mb-3 text-xs text-muted-foreground">
                {t("admin.delivery.hint")}
              </p>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                {ALL_SLOTS.map((slot) => {
                  const blocked = blockedSet.has(slot);
                  return (
                    <label
                      key={slot}
                      className={`flex cursor-pointer select-none items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm transition-colors ${
                        blocked
                          ? "border-destructive/40 bg-destructive/8 text-destructive"
                          : "border-border/60 bg-background hover:bg-muted"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={blocked}
                        onChange={() => toggleSlot(slot)}
                        className="h-4 w-4 accent-destructive"
                      />
                      <Clock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className="font-medium">{formatTime(slot)}</span>
                    </label>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-3 w-3 rounded border border-border bg-background" />
                  {t("admin.delivery.legend_available")}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-3 w-3 rounded border border-destructive/40 bg-destructive/10" />
                  {t("admin.delivery.legend_blocked")}
                </span>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border/60 py-16 text-center text-sm text-muted-foreground">
          <CalendarIcon className="mx-auto mb-3 h-8 w-8 opacity-40" />
          <p>{t("admin.delivery.pick_date")}</p>
        </div>
      )}
    </div>
  );
}
