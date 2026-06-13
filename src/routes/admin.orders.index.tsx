import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Pencil, Trash2, CheckCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/cart";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/admin/orders/")({
  component: OrdersList,
});

const STATUSES = ["pending", "confirmed", "preparing", "out_for_delivery", "delivered", "cancelled"] as const;

type OrderRow = {
  id: string;
  order_number: number;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  notes: string | null;
  total: number;
  status: string;
  created_at: string;
};

type EditState = {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  notes: string;
  status: string;
};

function OrdersList() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [editOrder, setEditOrder] = useState<EditState | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);

  const { data: orders = [] } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as OrderRow[];
    },
  });

  async function quickConfirm(id: string) {
    setConfirming(id);
    const { error } = await supabase
      .from("orders")
      .update({ status: "confirmed" })
      .eq("id", id);
    setConfirming(null);
    if (error) { toast.error(error.message); return; }
    toast.success("Order confirmed ✓");
    qc.invalidateQueries({ queryKey: ["admin-orders"] });
    qc.invalidateQueries({ queryKey: ["admin-overview"] });
  }

  async function saveEdit() {
    if (!editOrder) return;
    const { error } = await supabase
      .from("orders")
      .update({
        customer_name: editOrder.customer_name,
        customer_phone: editOrder.customer_phone,
        customer_address: editOrder.customer_address,
        notes: editOrder.notes || null,
        status: editOrder.status,
      })
      .eq("id", editOrder.id);
    if (error) return toast.error(error.message);
    toast.success(t("admin.save"));
    setEditOrder(null);
    qc.invalidateQueries({ queryKey: ["admin-orders"] });
    qc.invalidateQueries({ queryKey: ["admin-overview"] });
  }

  async function deleteOrder(id: string) {
    if (!confirm(t("admin.ord.delete_confirm"))) return;
    const { error } = await supabase.from("orders").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(t("admin.delete"));
    qc.invalidateQueries({ queryKey: ["admin-orders"] });
    qc.invalidateQueries({ queryKey: ["admin-overview"] });
  }

  return (
    <div>
      <header className="mb-6">
        <h1 className="font-display text-3xl">{t("admin.ord.title")}</h1>
      </header>
      <div className="overflow-x-auto rounded-2xl border border-border/60 bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-start">{t("admin.ord.col_hash")}</th>
              <th className="px-4 py-3 text-start">{t("admin.ord.col_customer")}</th>
              <th className="px-4 py-3 text-start">{t("admin.ord.col_phone")}</th>
              <th className="px-4 py-3 text-start">{t("admin.ord.col_total")}</th>
              <th className="px-4 py-3 text-start">{t("admin.ord.col_status")}</th>
              <th className="px-4 py-3 text-start">{t("admin.ord.col_date")}</th>
              <th className="px-4 py-3 text-end">{t("admin.ord.col_actions")}</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-t border-border/60 hover:bg-muted/30">
                <td className="px-4 py-3 font-mono text-xs">
                  <Link to="/admin/orders/$id" params={{ id: o.id }} className="hover:underline">
                    #{o.order_number}
                  </Link>
                </td>
                <td className="px-4 py-3">{o.customer_name}</td>
                <td className="px-4 py-3 text-muted-foreground">{o.customer_phone}</td>
                <td className="px-4 py-3 font-semibold">{formatCurrency(Number(o.total))}</td>
                <td className="px-4 py-3">
                  <StatusPill status={o.status as typeof STATUSES[number]} />
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {new Date(o.created_at).toLocaleString()}
                </td>
                <td className="px-4 py-3 text-end">
                  <div className="inline-flex items-center gap-1">
                    {/* Quick-confirm button — only shown for pending orders */}
                    {o.status === "pending" && (
                      <button
                        onClick={() => quickConfirm(o.id)}
                        disabled={confirming === o.id}
                        className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-1 text-[11px] font-semibold text-green-700 transition-colors hover:bg-green-200 disabled:opacity-50"
                        title="Mark as confirmed"
                      >
                        <CheckCheck className="h-3.5 w-3.5" />
                        {confirming === o.id ? "…" : "Confirm"}
                      </button>
                    )}
                    <button
                      onClick={() =>
                        setEditOrder({
                          id: o.id,
                          customer_name: o.customer_name,
                          customer_phone: o.customer_phone,
                          customer_address: o.customer_address,
                          notes: o.notes ?? "",
                          status: o.status,
                        })
                      }
                      className="inline-grid h-7 w-7 place-items-center rounded hover:bg-muted"
                      title={t("admin.edit")}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => deleteOrder(o.id)}
                      className="inline-grid h-7 w-7 place-items-center rounded text-destructive hover:bg-muted"
                      title={t("admin.delete")}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                  {t("admin.ord.no_orders")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Edit Order Modal */}
      {editOrder && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-card p-6">
            <h2 className="mb-4 font-display text-xl">{t("admin.ord.edit_title")}</h2>
            <div className="space-y-3">
              <FieldInput
                label={t("admin.ord.customer_name")}
                value={editOrder.customer_name}
                onChange={(v) => setEditOrder({ ...editOrder, customer_name: v })}
              />
              <FieldInput
                label={t("admin.ord.customer_phone")}
                value={editOrder.customer_phone}
                onChange={(v) => setEditOrder({ ...editOrder, customer_phone: v })}
              />
              <FieldTextarea
                label={t("admin.ord.customer_address")}
                value={editOrder.customer_address}
                onChange={(v) => setEditOrder({ ...editOrder, customer_address: v })}
              />
              <FieldTextarea
                label={t("admin.ord.notes")}
                value={editOrder.notes}
                onChange={(v) => setEditOrder({ ...editOrder, notes: v })}
              />
              <label className="block">
                <span className="mb-1 block text-xs font-medium">{t("admin.ord.status")}</span>
                <select
                  value={editOrder.status}
                  onChange={(e) => setEditOrder({ ...editOrder, status: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s.replace(/_/g, " ")}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setEditOrder(null)}
                className="rounded-full px-4 py-2 text-sm"
              >
                {t("admin.cancel")}
              </button>
              <button
                onClick={saveEdit}
                className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground"
              >
                {t("admin.save")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FieldInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
      />
    </label>
  );
}

function FieldTextarea({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium">{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
      />
    </label>
  );
}

function StatusPill({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending: "bg-[var(--gold)]/30 text-ink",
    confirmed: "bg-[var(--blue-soft)] text-ink",
    preparing: "bg-[var(--pink-soft)] text-ink",
    out_for_delivery: "bg-[var(--blue)] text-ink",
    delivered: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-800",
  };
  return (
    <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase ${colors[status] ?? "bg-muted"}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}
