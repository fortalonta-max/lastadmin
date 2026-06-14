import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ImageUpload } from "@/components/admin/image-upload";
import { Input, Textarea, Toggle } from "@/routes/admin.flavors";
import { formatCurrency } from "@/lib/cart";

export const Route = createFileRoute("/admin/boxes")({
  component: BoxesAdmin,
});

type Box = {
  id: string;
  slug: string;
  name_en: string;
  name_ar: string | null;
  description_en: string | null;
  description_ar: string | null;
  image_url: string | null;
  cookie_count: number;
  price: number;
  type: "fixed" | "byo";
  is_active: boolean;
  is_best_seller: boolean;
  sale_enabled: boolean;
  sort_order: number;
};

type FixedFlavor = { flavor_id: string; quantity: number };

function BoxesAdmin() {
  const qc = useQueryClient();
  const { data: boxes = [] } = useQuery({
    queryKey: ["admin-boxes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("boxes").select("*").order("sort_order");
      if (error) throw error;
      return data as Box[];
    },
  });
  const [editing, setEditing] = useState<Partial<Box> | null>(null);

  async function remove(id: string) {
    if (!confirm("Delete box?")) return;
    const { error } = await supabase.from("boxes").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["admin-boxes"] });
  }

  return (
    <div>
      <header className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-3xl">Boxes</h1>
        <button
          onClick={() =>
            setEditing({ type: "byo", is_active: true, cookie_count: 6, price: 0, sale_enabled: false, sort_order: boxes.length + 1 })
          }
          className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
        >
          <Plus className="h-4 w-4" /> New box
        </button>
      </header>
      <div className="grid gap-3 md:grid-cols-2">
        {boxes.map((b) => (
          <div key={b.id} className="flex gap-4 rounded-2xl border border-border/60 bg-card p-3">
            <div
              className="h-20 w-20 shrink-0 rounded-xl"
              style={{ background: b.image_url ? `url(${b.image_url}) center/cover` : "var(--gradient-hero)" }}
            />
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{b.name_en}</p>
              <p className="text-xs text-muted-foreground">
                {b.cookie_count} cookies · {b.type === "byo" ? "price from flavors" : formatCurrency(Number(b.price))} · {b.type.toUpperCase()}
              </p>
              <div className="mt-1 flex gap-1 text-[10px]">
                {!b.is_active && <span className="rounded bg-muted px-1.5">hidden</span>}
                {b.is_best_seller && <span className="rounded bg-[var(--pink)] px-1.5">best</span>}
                {b.sale_enabled && <span className="rounded bg-[var(--gold)] px-1.5">sale</span>}
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <button onClick={() => setEditing(b)} className="grid h-7 w-7 place-items-center rounded hover:bg-muted">
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => remove(b.id)} className="grid h-7 w-7 place-items-center rounded text-destructive hover:bg-muted">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
      {editing && <BoxEditor box={editing} onClose={() => setEditing(null)} onSaved={() => qc.invalidateQueries({ queryKey: ["admin-boxes"] })} />}
    </div>
  );
}

function BoxEditor({
  box,
  onClose,
  onSaved,
}: {
  box: Partial<Box>;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [b, setB] = useState<Partial<Box>>(box);
  const { data: flavors = [] } = useQuery({
    queryKey: ["admin-flavors-list"],
    queryFn: async () => {
      const { data } = await supabase.from("flavors").select("id, name_en, price").order("sort_order");
      return data ?? [];
    },
  });
  const { data: existingFixed = [] } = useQuery({
    queryKey: ["admin-box-fixed", box.id],
    enabled: !!box.id,
    queryFn: async () => {
      const { data } = await supabase.from("box_fixed_flavors").select("flavor_id, quantity").eq("box_id", box.id!);
      return data ?? [];
    },
  });
  const [fixed, setFixed] = useState<FixedFlavor[]>([]);
  useEffect(() => {
    if (existingFixed.length) setFixed(existingFixed as FixedFlavor[]);
  }, [existingFixed]);

  async function save() {
    if (!b.name_en?.trim()) return toast.error("Name (EN) required");
    const boxType = (b.type ?? "byo") as "fixed" | "byo";
    const payload = {
      slug: (b.slug ?? "").trim() || b.name_en.toLowerCase().replace(/\s+/g, "-"),
      name_en: b.name_en.trim(),
      name_ar: b.name_ar?.trim() || null,
      description_en: b.description_en?.trim() || null,
      description_ar: b.description_ar?.trim() || null,
      image_url: b.image_url ?? null,
      cookie_count: Number(b.cookie_count ?? 6),
      price: 0,
      type: boxType,
      is_active: b.is_active ?? true,
      is_best_seller: b.is_best_seller ?? false,
      sale_enabled: b.sale_enabled ?? false,
      sort_order: Number(b.sort_order ?? 0),
    };
    const res = b.id
      ? await supabase.from("boxes").update(payload).eq("id", b.id).select().single()
      : await supabase.from("boxes").insert(payload).select().single();
    if (res.error) return toast.error(res.error.message);
    const boxId = res.data.id;

    if (payload.type === "fixed") {
      await supabase.from("box_fixed_flavors").delete().eq("box_id", boxId);
      const validFixed = fixed.filter((x) => x.flavor_id && x.quantity > 0);
      const rows = validFixed.map((x) => ({ box_id: boxId, flavor_id: x.flavor_id, quantity: x.quantity }));
      if (rows.length) {
        const { error } = await supabase.from("box_fixed_flavors").insert(rows);
        if (error) return toast.error(error.message);
      }
      // Recompute box.price from flavor_box_prices (single source of truth)
      if (validFixed.length > 0) {
        const { data: fbp } = await supabase
          .from("flavor_box_prices")
          .select("flavor_id, price")
          .eq("box_id", boxId)
          .in("flavor_id", validFixed.map((x) => x.flavor_id));
        const priceMap: Record<string, number> = {};
        (fbp ?? []).forEach((row) => { priceMap[row.flavor_id] = Number(row.price); });
        const computedPrice = validFixed.reduce((sum, x) => sum + (priceMap[x.flavor_id] ?? 0) * x.quantity, 0);
        if (computedPrice > 0) {
          await supabase.from("boxes").update({ price: computedPrice }).eq("id", boxId);
        }
      }
    }
    toast.success("Saved");
    onSaved();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-card p-6">
        <h2 className="mb-4 font-display text-xl">{box.id ? "Edit box" : "New box"}</h2>
        <div className="space-y-3">
          <ImageUpload value={b.image_url ?? null} onChange={(url) => setB({ ...b, image_url: url })} folder="boxes" />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Name (EN)" value={b.name_en ?? ""} onChange={(v) => setB({ ...b, name_en: v })} required />
            <Input label="Name (AR)" value={b.name_ar ?? ""} onChange={(v) => setB({ ...b, name_ar: v })} />
          </div>
          <Input label="Slug" value={b.slug ?? ""} onChange={(v) => setB({ ...b, slug: v })} placeholder="auto" />
          <Textarea label="Description (EN)" value={b.description_en ?? ""} onChange={(v) => setB({ ...b, description_en: v })} />
          <Textarea label="Description (AR)" value={b.description_ar ?? ""} onChange={(v) => setB({ ...b, description_ar: v })} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Cookies" type="number" value={String(b.cookie_count ?? 6)} onChange={(v) => setB({ ...b, cookie_count: Number(v) })} />
            <label className="block">
              <span className="mb-1 block text-xs font-medium">Type</span>
              <select
                value={b.type ?? "byo"}
                onChange={(e) => setB({ ...b, type: e.target.value as "fixed" | "byo" })}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              >
                <option value="byo">Build your own</option>
                <option value="fixed">Fixed (chef's pick)</option>
              </select>
            </label>
          </div>
          <Input label="Sort order" type="number" value={String(b.sort_order ?? 0)} onChange={(v) => setB({ ...b, sort_order: Number(v) })} />
          <div className="grid grid-cols-2 gap-2 text-sm">
            <Toggle label="Active" checked={b.is_active ?? true} onChange={(v) => setB({ ...b, is_active: v })} />
            <Toggle label="Best seller" checked={b.is_best_seller ?? false} onChange={(v) => setB({ ...b, is_best_seller: v })} />
          </div>
          <div className="text-sm">
            <Toggle label="Sale price" checked={b.sale_enabled ?? false} onChange={(v) => setB({ ...b, sale_enabled: v })} />
          </div>

          {b.sale_enabled && (
            <div className="rounded-xl border border-[var(--gold)]/40 bg-[var(--gold)]/5 p-3 text-xs text-muted-foreground">
              <p className="font-semibold text-foreground">Sale price active</p>
              <p className="mt-1">
                The crossed-out (original) price shown to customers is calculated as:{" "}
                <strong>highest flavor price × {b.cookie_count ?? "?"} cookies</strong>. The sale price is the
                lowest flavor price × {b.cookie_count ?? "?"} cookies.
              </p>
            </div>
          )}

          {b.type === "fixed" && (
            <div className="rounded-xl border border-border bg-muted/30 p-3">
              <p className="mb-2 text-sm font-semibold">Fixed flavors</p>
              {(fixed.length ? fixed : [{ flavor_id: "", quantity: 1 }]).map((row, idx) => (
                <div key={idx} className="mb-2 flex gap-2">
                  <select
                    value={row.flavor_id}
                    onChange={(e) => {
                      const next = [...(fixed.length ? fixed : [{ flavor_id: "", quantity: 1 }])];
                      next[idx] = { ...next[idx], flavor_id: e.target.value };
                      setFixed(next);
                    }}
                    className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  >
                    <option value="">— flavor —</option>
                    {flavors.map((f) => (
                      <option key={f.id} value={f.id}>{f.name_en}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    value={row.quantity}
                    min={1}
                    onChange={(e) => {
                      const next = [...(fixed.length ? fixed : [{ flavor_id: "", quantity: 1 }])];
                      next[idx] = { ...next[idx], quantity: Number(e.target.value) };
                      setFixed(next);
                    }}
                    className="w-20 rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  />
                </div>
              ))}
              <button
                type="button"
                onClick={() => setFixed([...fixed, { flavor_id: "", quantity: 1 }])}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                + Add flavor
              </button>
            </div>
          )}
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-full px-4 py-2 text-sm">Cancel</button>
          <button onClick={save} className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground">
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
