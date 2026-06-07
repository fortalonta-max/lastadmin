import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input, Toggle } from "@/routes/admin.flavors";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/admin/coupons")({
  component: CouponsAdmin,
});

type Coupon = {
  id: string;
  code: string;
  type: "percent" | "fixed";
  value: number;
  min_subtotal: number;
  active: boolean;
  expires_at: string | null;
  usage_limit: number | null;
};

function CouponsAdmin() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const { data: coupons = [] } = useQuery({
    queryKey: ["admin-coupons"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coupons")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Coupon[];
    },
  });
  const [editing, setEditing] = useState<Partial<Coupon> | null>(null);

  async function save(c: Partial<Coupon>) {
    if (!c.code?.trim()) return toast.error(t("admin.coup.code_required"));
    const payload = {
      code: c.code.trim().toUpperCase(),
      type: (c.type ?? "percent") as "percent" | "fixed",
      value: Number(c.value ?? 0),
      min_subtotal: Number(c.min_subtotal ?? 0),
      active: c.active ?? true,
      expires_at: c.expires_at || null,
      usage_limit: c.usage_limit != null && String(c.usage_limit).trim() !== "" ? Number(c.usage_limit) : null,
    };
    const { error } = c.id
      ? await supabase.from("coupons").update(payload).eq("id", c.id)
      : await supabase.from("coupons").insert(payload);
    if (error) return toast.error(error.message);
    toast.success(t("admin.save"));
    setEditing(null);
    qc.invalidateQueries({ queryKey: ["admin-coupons"] });
  }

  async function remove(id: string) {
    if (!confirm(t("admin.delete") + "?")) return;
    const { error } = await supabase.from("coupons").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["admin-coupons"] });
  }

  return (
    <div>
      <header className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-3xl">{t("admin.coup.title")}</h1>
        <button
          onClick={() => setEditing({ type: "percent", value: 10, active: true, min_subtotal: 0, usage_limit: null })}
          className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
        >
          <Plus className="h-4 w-4" /> {t("admin.coup.new")}
        </button>
      </header>
      <div className="overflow-x-auto rounded-2xl border border-border/60 bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-start">{t("admin.coup.col_code")}</th>
              <th className="px-4 py-3 text-start">{t("admin.coup.col_type")}</th>
              <th className="px-4 py-3 text-start">{t("admin.coup.col_value")}</th>
              <th className="px-4 py-3 text-start">{t("admin.coup.col_min")}</th>
              <th className="px-4 py-3 text-start">{t("admin.coup.col_usage_limit")}</th>
              <th className="px-4 py-3 text-start">{t("admin.coup.col_active")}</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {coupons.map((c) => (
              <tr key={c.id} className="border-t border-border/60">
                <td className="px-4 py-3 font-mono text-xs">{c.code}</td>
                <td className="px-4 py-3">{c.type}</td>
                <td className="px-4 py-3">
                  {c.type === "percent" ? `${c.value}%` : `${c.value} EGP`}
                </td>
                <td className="px-4 py-3">{c.min_subtotal} EGP</td>
                <td className="px-4 py-3">
                  {c.usage_limit != null ? c.usage_limit : t("admin.coup.unlimited")}
                </td>
                <td className="px-4 py-3">{c.active ? t("admin.yes") : t("admin.no")}</td>
                <td className="px-4 py-3 text-end">
                  <button
                    onClick={() => setEditing(c)}
                    className="me-2 inline-grid h-7 w-7 place-items-center rounded hover:bg-muted"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => remove(c.id)}
                    className="inline-grid h-7 w-7 place-items-center rounded text-destructive hover:bg-muted"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            ))}
            {coupons.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                  {t("admin.coup.no_coupons")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {editing && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-card p-6">
            <h2 className="mb-4 font-display text-xl">
              {editing.id ? t("admin.coup.edit_title") : t("admin.coup.new_title")}
            </h2>
            <div className="space-y-3">
              <Input
                label={t("admin.coup.label_code")}
                value={editing.code ?? ""}
                onChange={(v) => setEditing({ ...editing, code: v })}
                required
              />
              <label className="block">
                <span className="mb-1 block text-xs font-medium">{t("admin.coup.label_type")}</span>
                <select
                  value={editing.type ?? "percent"}
                  onChange={(e) => setEditing({ ...editing, type: e.target.value as "percent" | "fixed" })}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                >
                  <option value="percent">{t("admin.coup.type_percent")}</option>
                  <option value="fixed">{t("admin.coup.type_fixed")}</option>
                </select>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label={t("admin.coup.label_value")}
                  type="number"
                  value={String(editing.value ?? 0)}
                  onChange={(v) => setEditing({ ...editing, value: Number(v) })}
                />
                <Input
                  label={t("admin.coup.label_min")}
                  type="number"
                  value={String(editing.min_subtotal ?? 0)}
                  onChange={(v) => setEditing({ ...editing, min_subtotal: Number(v) })}
                />
              </div>
              <Input
                label={t("admin.coup.label_usage_limit")}
                type="number"
                value={editing.usage_limit != null ? String(editing.usage_limit) : ""}
                onChange={(v) =>
                  setEditing({
                    ...editing,
                    usage_limit: v.trim() === "" ? null : Number(v),
                  })
                }
                placeholder="∞"
              />
              <Toggle
                label={t("admin.coup.label_active")}
                checked={editing.active ?? true}
                onChange={(v) => setEditing({ ...editing, active: v })}
              />
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setEditing(null)} className="rounded-full px-4 py-2 text-sm">
                {t("admin.cancel")}
              </button>
              <button
                onClick={() => save(editing)}
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
