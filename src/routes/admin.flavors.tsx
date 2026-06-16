import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ImageUpload } from "@/components/admin/image-upload";

export const Route = createFileRoute("/admin/flavors")({
  component: FlavorsAdmin,
});

type Flavor = {
  id: string;
  slug: string;
  name_en: string;
  name_ar: string | null;
  description_en: string | null;
  description_ar: string | null;
  image_url: string | null;
  is_available: boolean;
  is_limited_edition: boolean;
  is_out_of_stock: boolean;
  /** Default price per cookie — the single source of truth for pricing. */
  price: number;
  sort_order: number;
};

function FlavorsAdmin() {
  const qc = useQueryClient();
  const { data: flavors = [] } = useQuery({
    queryKey: ["admin-flavors"],
    queryFn: async () => {
      const { data, error } = await supabase.from("flavors").select("*").order("sort_order");
      if (error) throw error;
      return data as Flavor[];
    },
  });
  const { data: byoBoxes = [] } = useQuery({
    queryKey: ["admin-all-boxes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("boxes")
        .select("id, name_en, cookie_count, type")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return data as { id: string; name_en: string; cookie_count: number; type: string }[];
    },
  });

  const [editing, setEditing] = useState<Partial<Flavor> | null>(null);

  async function save(f: Partial<Flavor>, boxPrices: Record<string, number>) {
    if (!f.name_en?.trim()) {
      toast.error("Name (EN) is required");
      return;
    }
    const payload = {
      slug: (f.slug ?? "").trim() || f.name_en.toLowerCase().replace(/\s+/g, "-"),
      name_en: f.name_en.trim(),
      name_ar: f.name_ar?.trim() || null,
      description_en: f.description_en?.trim() || null,
      description_ar: f.description_ar?.trim() || null,
      image_url: f.image_url ?? null,
      is_available: f.is_available ?? true,
      is_limited_edition: f.is_limited_edition ?? false,
      is_out_of_stock: f.is_out_of_stock ?? false,
      // New pricing system: save the actual default price per cookie
      price: Number(f.price ?? 0),
      sort_order: Number(f.sort_order ?? 0),
    };

    let flavorId = f.id;
    if (flavorId) {
      const { error } = await supabase.from("flavors").update(payload).eq("id", flavorId);
      if (error) { toast.error(error.message); return; }
    } else {
      const { data: newFlavor, error } = await supabase
        .from("flavors")
        .insert(payload)
        .select("id")
        .single();
      if (error || !newFlavor) { toast.error(error?.message ?? "Failed to save flavor"); return; }
      flavorId = newFlavor.id;
    }

    const priceRows = Object.entries(boxPrices).map(([box_id, price]) => ({
      flavor_id: flavorId!,
      box_id,
      price: Number(price),
    }));
    if (priceRows.length > 0) {
      const { error } = await supabase
        .from("flavor_box_prices")
        .upsert(priceRows, { onConflict: "flavor_id,box_id" });
      if (error) { toast.error(error.message); return; }
    }

    // Recompute box.price for every BYO box whose flavor_box_prices changed
    const affectedByoBoxIds = Object.keys(boxPrices).filter((id) =>
      byoBoxes.some((b) => b.id === id && b.type === "byo")
    );
    for (const boxId of affectedByoBoxIds) {
      const box = byoBoxes.find((b) => b.id === boxId)!;
      const { data: allFbp } = await supabase
        .from("flavor_box_prices")
        .select("price")
        .eq("box_id", boxId);
      const prices = (allFbp ?? []).map((r) => Number(r.price)).filter((p) => p > 0);
      const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
      await supabase.from("boxes").update({ price: minPrice * box.cookie_count }).eq("id", boxId);
    }

    toast.success("Saved");
    setEditing(null);
    qc.invalidateQueries({ queryKey: ["admin-flavors"] });
  }

  async function remove(id: string) {
    if (!confirm("Delete flavor?")) return;
    const { error } = await supabase.from("flavors").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    qc.invalidateQueries({ queryKey: ["admin-flavors"] });
  }

  async function reorder(id: string, dir: -1 | 1) {
    const f = flavors.find((x) => x.id === id);
    if (!f) return;
    await supabase.from("flavors").update({ sort_order: f.sort_order + dir }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["admin-flavors"] });
  }

  return (
    <div>
      <header className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-3xl">Flavors</h1>
        <button
          onClick={() => setEditing({ is_available: true, sort_order: flavors.length + 1 })}
          className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
        >
          <Plus className="h-4 w-4" /> New flavor
        </button>
      </header>

      <div className="grid gap-3 md:grid-cols-2">
        {flavors.map((f) => (
          <div key={f.id} className="flex gap-4 rounded-2xl border border-border/60 bg-card p-3">
            <div
              className="h-20 w-20 shrink-0 rounded-xl"
              style={{
                background: f.image_url ? `url(${f.image_url}) center/cover` : "var(--gradient-pink-blue)",
              }}
            />
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{f.name_en}</p>
              <p className="text-xs text-muted-foreground">/{f.slug}</p>
              <div className="mt-1 flex flex-wrap gap-1 text-[10px]">
                {!f.is_available && <span className="rounded bg-muted px-1.5">hidden</span>}
                {f.is_limited_edition && <span className="rounded bg-[var(--gold)] px-1.5">limited</span>}
                {f.is_out_of_stock && <span className="rounded bg-destructive px-1.5 text-destructive-foreground">OOS</span>}
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <button onClick={() => reorder(f.id, -1)} className="grid h-7 w-7 place-items-center rounded hover:bg-muted">
                <ArrowUp className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => reorder(f.id, 1)} className="grid h-7 w-7 place-items-center rounded hover:bg-muted">
                <ArrowDown className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="flex flex-col gap-1">
              <button onClick={() => setEditing(f)} className="grid h-7 w-7 place-items-center rounded hover:bg-muted">
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => remove(f.id)} className="grid h-7 w-7 place-items-center rounded text-destructive hover:bg-muted">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {editing && <FlavorEditor flavor={editing} boxes={byoBoxes} onClose={() => setEditing(null)} onSave={save} />}
    </div>
  );
}

function FlavorEditor({
  flavor,
  boxes,
  onClose,
  onSave,
}: {
  flavor: Partial<Flavor>;
  boxes: { id: string; name_en: string; cookie_count: number; type: string }[];
  onClose: () => void;
  onSave: (f: Partial<Flavor>, boxPrices: Record<string, number>) => Promise<void> | void;
}) {
  const [f, setF] = useState<Partial<Flavor>>(flavor);
  const [boxPrices, setBoxPrices] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!flavor.id) return;
    supabase
      .from("flavor_box_prices")
      .select("box_id, price")
      .eq("flavor_id", flavor.id)
      .then(({ data }) => {
        if (data) {
          const map: Record<string, number> = {};
          data.forEach((row) => { map[row.box_id] = Number(row.price); });
          setBoxPrices(map);
        }
      });
  }, [flavor.id]);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
      <div className="w-full max-w-lg overflow-y-auto rounded-2xl bg-card p-6" style={{ maxHeight: "90vh" }}>
        <h2 className="mb-4 font-display text-xl">{flavor.id ? "Edit flavor" : "New flavor"}</h2>
        <div className="space-y-3">
          <ImageUpload value={f.image_url ?? null} onChange={(url) => setF({ ...f, image_url: url })} folder="flavors" />
          <Input label="Name (EN)" value={f.name_en ?? ""} onChange={(v) => setF({ ...f, name_en: v })} required />
          <Input label="Name (AR)" value={f.name_ar ?? ""} onChange={(v) => setF({ ...f, name_ar: v })} />
          <Input label="Slug" value={f.slug ?? ""} onChange={(v) => setF({ ...f, slug: v })} placeholder="auto from name" />
          <Textarea label="Description (EN)" value={f.description_en ?? ""} onChange={(v) => setF({ ...f, description_en: v })} />
          <Textarea label="Description (AR)" value={f.description_ar ?? ""} onChange={(v) => setF({ ...f, description_ar: v })} />
          <Input
            label="Default price per cookie (EGP)"
            type="number"
            value={String(f.price ?? 0)}
            onChange={(v) => setF({ ...f, price: Number(v) })}
            placeholder="e.g. 25"
          />
          <div className="rounded-xl border border-[var(--gold)]/40 bg-[var(--gold)]/5 p-3 text-[11px] text-muted-foreground">
            <strong className="text-foreground">Pricing note:</strong> This default price applies across all boxes.
            Each box can have a fixed discount (set on the Box page) subtracted from the total flavor sum.
          </div>
          <Input label="Sort order" type="number" value={String(f.sort_order ?? 0)} onChange={(v) => setF({ ...f, sort_order: Number(v) })} />
          <div className="grid grid-cols-3 gap-2 text-sm">
            <Toggle label="Available" checked={f.is_available ?? true} onChange={(v) => setF({ ...f, is_available: v })} />
            <Toggle label="Limited ed." checked={f.is_limited_edition ?? false} onChange={(v) => setF({ ...f, is_limited_edition: v })} />
            <Toggle label="Out of stock" checked={f.is_out_of_stock ?? false} onChange={(v) => setF({ ...f, is_out_of_stock: v })} />
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-full px-4 py-2 text-sm">Cancel</button>
          <button
            onClick={() => onSave(f, boxPrices)}
            className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

export function Input({ label, value, onChange, type = "text", required, placeholder }: { label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean; placeholder?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium">{label}</span>
      <input type={type} required={required} placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
    </label>
  );
}
export function Textarea({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium">{label}</span>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={3} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
    </label>
  );
}
export function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-xs">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}
