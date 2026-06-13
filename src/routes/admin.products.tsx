import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ImageUpload } from "@/components/admin/image-upload";
import { Input, Textarea, Toggle } from "@/routes/admin.flavors";
import { formatCurrency } from "@/lib/cart";

export const Route = createFileRoute("/admin/products")({
  component: ProductsAdmin,
});

type Product = {
  id: string;
  slug: string;
  name_en: string;
  name_ar: string | null;
  description_en: string | null;
  description_ar: string | null;
  image_url: string | null;
  price: number;
  is_active: boolean;
  is_best_seller: boolean;
  sort_order: number;
};

function ProductsAdmin() {
  const qc = useQueryClient();
  const { data: products = [] } = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return data as Product[];
    },
  });

  const [editing, setEditing] = useState<Partial<Product> | null>(null);

  async function remove(id: string) {
    if (!confirm("Delete product? This cannot be undone.")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    qc.invalidateQueries({ queryKey: ["admin-products"] });
  }

  async function reorder(id: string, dir: -1 | 1) {
    // Sort by current sort_order to find adjacent item
    const sorted = [...products].sort((a, b) => a.sort_order - b.sort_order);
    const idx = sorted.findIndex((x) => x.id === id);
    if (idx === -1) return;
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= sorted.length) return;

    const current = sorted[idx];
    const neighbor = sorted[newIdx];

    // Swap sort_orders between the two items
    const [err1, err2] = await Promise.all([
      supabase.from("products").update({ sort_order: neighbor.sort_order }).eq("id", current.id).then(r => r.error),
      supabase.from("products").update({ sort_order: current.sort_order }).eq("id", neighbor.id).then(r => r.error),
    ]);

    if (err1) { toast.error(err1.message); return; }
    if (err2) { toast.error(err2.message); return; }

    qc.invalidateQueries({ queryKey: ["admin-products"] });
  }

  return (
    <div>
      <header className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-3xl">Products</h1>
        <button
          onClick={() =>
            setEditing({ is_active: true, price: 0, sort_order: products.length + 1 })
          }
          className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
        >
          <Plus className="h-4 w-4" /> New product
        </button>
      </header>

      {products.length === 0 && (
        <p className="text-muted-foreground">No products yet. Click "New product" to add one.</p>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        {products.map((p) => (
          <div key={p.id} className="flex gap-4 rounded-2xl border border-border/60 bg-card p-3">
            <div
              className="h-20 w-20 shrink-0 rounded-xl"
              style={{
                background: p.image_url
                  ? `url(${p.image_url}) center/cover`
                  : "var(--gradient-hero)",
              }}
            />
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{p.name_en}</p>
              <p className="text-xs text-muted-foreground">{formatCurrency(Number(p.price))}</p>
              <div className="mt-1 flex gap-1 text-[10px]">
                {!p.is_active && <span className="rounded bg-muted px-1.5">hidden</span>}
                {p.is_best_seller && (
                  <span className="rounded bg-[var(--pink)] px-1.5">best seller</span>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <button
                onClick={() => reorder(p.id, -1)}
                className="grid h-7 w-7 place-items-center rounded hover:bg-muted"
                title="Move up"
              >
                <ArrowUp className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => reorder(p.id, 1)}
                className="grid h-7 w-7 place-items-center rounded hover:bg-muted"
                title="Move down"
              >
                <ArrowDown className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="flex flex-col gap-1">
              <button
                onClick={() => setEditing(p)}
                className="grid h-7 w-7 place-items-center rounded hover:bg-muted"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => remove(p.id)}
                className="grid h-7 w-7 place-items-center rounded text-destructive hover:bg-muted"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <ProductEditor
          product={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ["admin-products"] });
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function ProductEditor({
  product,
  onClose,
  onSaved,
}: {
  product: Partial<Product>;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [p, setP] = useState<Partial<Product>>(product);

  // All available flavors (for the flavor assignment checkboxes)
  const { data: allFlavors = [] } = useQuery({
    queryKey: ["admin-flavors-list"],
    queryFn: async () => {
      const { data } = await supabase
        .from("flavors")
        .select("id, name_en, image_url")
        .order("sort_order");
      return (data ?? []) as { id: string; name_en: string; image_url: string | null }[];
    },
  });

  // Which flavor IDs are currently assigned to this product
  const [assignedIds, setAssignedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!product.id) return;
    supabase
      .from("product_flavors")
      .select("flavor_id")
      .eq("product_id", product.id)
      .then(({ data }) => {
        if (data) setAssignedIds(new Set(data.map((r) => r.flavor_id)));
      });
  }, [product.id]);

  function toggleFlavor(flavorId: string) {
    setAssignedIds((prev) => {
      const next = new Set(prev);
      if (next.has(flavorId)) next.delete(flavorId);
      else next.add(flavorId);
      return next;
    });
  }

  async function save() {
    if (!p.name_en?.trim()) return toast.error("Name (EN) is required");

    const payload = {
      slug: (p.slug ?? "").trim() || p.name_en.toLowerCase().replace(/\s+/g, "-"),
      name_en: p.name_en.trim(),
      name_ar: p.name_ar?.trim() || null,
      description_en: p.description_en?.trim() || null,
      description_ar: p.description_ar?.trim() || null,
      image_url: p.image_url ?? null,
      price: Number(p.price ?? 0),
      is_active: p.is_active ?? true,
      is_best_seller: p.is_best_seller ?? false,
      sort_order: Number(p.sort_order ?? 0),
    };

    let productId = p.id;

    if (productId) {
      const { error } = await supabase.from("products").update(payload).eq("id", productId);
      if (error) return toast.error(error.message);
    } else {
      const { data: created, error } = await supabase
        .from("products")
        .insert(payload)
        .select("id")
        .single();
      if (error || !created) return toast.error(error?.message ?? "Failed to create product");
      productId = created.id;
    }

    // Sync assigned flavors: delete all existing, then re-insert the selected set
    const { error: delErr } = await supabase
      .from("product_flavors")
      .delete()
      .eq("product_id", productId!);
    if (delErr) return toast.error(delErr.message);

    const rows = [...assignedIds].map((flavor_id, idx) => ({
      product_id: productId!,
      flavor_id,
      sort_order: idx,
    }));

    if (rows.length > 0) {
      const { error: insErr } = await supabase.from("product_flavors").insert(rows);
      if (insErr) return toast.error(insErr.message);
    }

    toast.success("Saved");
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-card p-6">
        <h2 className="mb-4 font-display text-xl">
          {product.id ? "Edit product" : "New product"}
        </h2>

        <div className="space-y-3">
          <ImageUpload
            value={p.image_url ?? null}
            onChange={(url) => setP({ ...p, image_url: url })}
            folder="products"
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Name (EN)"
              value={p.name_en ?? ""}
              onChange={(v) => setP({ ...p, name_en: v })}
              required
            />
            <Input
              label="Name (AR)"
              value={p.name_ar ?? ""}
              onChange={(v) => setP({ ...p, name_ar: v })}
            />
          </div>

          <Input
            label="Slug"
            value={p.slug ?? ""}
            onChange={(v) => setP({ ...p, slug: v })}
            placeholder="auto from name"
          />

          <Textarea
            label="Description (EN)"
            value={p.description_en ?? ""}
            onChange={(v) => setP({ ...p, description_en: v })}
          />
          <Textarea
            label="Description (AR)"
            value={p.description_ar ?? ""}
            onChange={(v) => setP({ ...p, description_ar: v })}
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Price"
              type="number"
              value={String(p.price ?? 0)}
              onChange={(v) => setP({ ...p, price: Number(v) })}
            />
            <Input
              label="Sort order"
              type="number"
              value={String(p.sort_order ?? 0)}
              onChange={(v) => setP({ ...p, sort_order: Number(v) })}
            />
          </div>

          <div className="grid grid-cols-2 gap-2 text-sm">
            <Toggle
              label="Active"
              checked={p.is_active ?? true}
              onChange={(v) => setP({ ...p, is_active: v })}
            />
            <Toggle
              label="Best seller"
              checked={p.is_best_seller ?? false}
              onChange={(v) => setP({ ...p, is_best_seller: v })}
            />
          </div>

          {/* Flavor assignment */}
          <div className="rounded-xl border border-border bg-muted/30 p-3">
            <p className="mb-1 text-sm font-semibold">Assigned flavors</p>
            <p className="mb-3 text-[11px] text-muted-foreground">
              Only the checked flavors will appear on this product's page. Leave all unchecked to
              show no flavors.
            </p>
            {allFlavors.length === 0 ? (
              <p className="text-xs text-muted-foreground">No flavors found.</p>
            ) : (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {allFlavors.map((f) => (
                  <label
                    key={f.id}
                    className="flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-background px-3 py-2 text-sm hover:bg-muted/50"
                  >
                    <input
                      type="checkbox"
                      checked={assignedIds.has(f.id)}
                      onChange={() => toggleFlavor(f.id)}
                      className="h-4 w-4 accent-primary"
                    />
                    {f.image_url && (
                      <div
                        className="h-8 w-8 shrink-0 rounded-lg"
                        style={{ background: `url(${f.image_url}) center/cover` }}
                      />
                    )}
                    <span className="truncate">{f.name_en}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-full px-4 py-2 text-sm">
            Cancel
          </button>
          <button
            onClick={save}
            className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
