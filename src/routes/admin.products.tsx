import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, ArrowUp, ArrowDown, ExternalLink } from "lucide-react";
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
  link_url: string | null;
  product_type: "external" | "internal";
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
        .from("projects")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return data as Product[];
    },
  });

  const [editing, setEditing] = useState<Partial<Product> | null>(null);

  async function remove(id: string) {
    if (!confirm("Delete this product? This cannot be undone.")) return;
    const { error } = await supabase.from("projects").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["admin-products"] });
  }

  async function reorder(id: string, dir: -1 | 1) {
    const sorted = [...products].sort((a, b) => a.sort_order - b.sort_order);
    const idx = sorted.findIndex((x) => x.id === id);
    if (idx === -1) return;
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= sorted.length) return;
    const current = sorted[idx];
    const neighbor = sorted[newIdx];
    const [e1, e2] = await Promise.all([
      supabase.from("projects").update({ sort_order: neighbor.sort_order }).eq("id", current.id).then(r => r.error),
      supabase.from("projects").update({ sort_order: current.sort_order }).eq("id", neighbor.id).then(r => r.error),
    ]);
    if (e1) { toast.error(e1.message); return; }
    if (e2) { toast.error(e2.message); return; }
    qc.invalidateQueries({ queryKey: ["admin-products"] });
  }

  return (
    <div>
      <header className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-3xl">Products</h1>
        <button
          onClick={() =>
            setEditing({ is_active: true, is_best_seller: false, price: 0, product_type: "external", sort_order: products.length + 1 })
          }
          className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
        >
          <Plus className="h-4 w-4" /> New product
        </button>
      </header>

      {products.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border/60 py-16 text-center text-sm text-muted-foreground">
          No products yet. Click "New product" to add one.
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        {products.map((p) => (
          <div key={p.id} className="flex gap-4 rounded-2xl border border-border/60 bg-card p-3">
            <div
              className="h-20 w-20 shrink-0 rounded-xl bg-muted/40"
              style={
                p.image_url
                  ? { background: `url(${p.image_url}) center/cover` }
                  : { background: "var(--gradient-hero)" }
              }
            />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{p.name_en}</p>
              {p.price > 0 && (
                <p className="text-xs text-muted-foreground">{formatCurrency(Number(p.price))}</p>
              )}
              <div className="mt-1 flex flex-wrap gap-1 text-[10px]">
                <span className={`rounded px-1.5 py-0.5 ${p.product_type === "internal" ? "bg-primary/10 text-primary" : "bg-muted"}`}>
                  {p.product_type === "internal" ? "internal page" : "external link"}
                </span>
                {!p.is_active && (
                  <span className="rounded bg-muted px-1.5 py-0.5">hidden</span>
                )}
                {p.is_best_seller && (
                  <span className="rounded bg-[var(--pink)] px-1.5 py-0.5">featured</span>
                )}
                {p.product_type === "external" && p.link_url && (
                  <a
                    href={p.link_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-0.5 rounded bg-muted px-1.5 py-0.5 hover:bg-muted/80"
                  >
                    <ExternalLink className="h-2.5 w-2.5" /> link
                  </a>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <button onClick={() => reorder(p.id, -1)} className="grid h-7 w-7 place-items-center rounded hover:bg-muted" title="Move up">
                <ArrowUp className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => reorder(p.id, 1)} className="grid h-7 w-7 place-items-center rounded hover:bg-muted" title="Move down">
                <ArrowDown className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="flex flex-col gap-1">
              <button onClick={() => setEditing(p)} className="grid h-7 w-7 place-items-center rounded hover:bg-muted">
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => remove(p.id)} className="grid h-7 w-7 place-items-center rounded text-destructive hover:bg-muted">
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
  const [p, setP] = useState<Partial<Product>>({ product_type: "external", ...product });

  async function save() {
    if (!p.name_en?.trim()) return toast.error("Name (EN) is required");
    if (p.product_type === "external" && !p.link_url?.trim()) {
      return toast.error("External link URL is required for external products");
    }

    const payload = {
      slug: (p.slug ?? "").trim() || p.name_en.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
      name_en: p.name_en.trim(),
      name_ar: p.name_ar?.trim() || null,
      description_en: p.description_en?.trim() || null,
      description_ar: p.description_ar?.trim() || null,
      image_url: p.image_url ?? null,
      price: Number(p.price ?? 0),
      product_type: p.product_type ?? "external",
      link_url: p.product_type === "external" ? (p.link_url?.trim() || null) : null,
      is_active: p.is_active ?? true,
      is_best_seller: p.is_best_seller ?? false,
      sort_order: Number(p.sort_order ?? 0),
    };

    if (p.id) {
      const { error } = await supabase.from("projects").update(payload).eq("id", p.id);
      if (error) return toast.error(error.message);
    } else {
      const { error } = await supabase.from("projects").insert(payload);
      if (error) return toast.error(error.message);
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

        <div className="space-y-4">
          {/* Product type selector */}
          <div>
            <p className="mb-2 text-sm font-semibold">Product type</p>
            <div className="grid grid-cols-2 gap-2">
              {(["external", "internal"] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setP({ ...p, product_type: type })}
                  className={`rounded-xl border-2 px-4 py-3 text-left transition-colors ${
                    p.product_type === type
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border bg-background hover:bg-muted/50"
                  }`}
                >
                  <p className="text-sm font-semibold capitalize">{type === "external" ? "External link" : "Internal page"}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {type === "external" ? "Opens an external URL" : "Has its own page at /products/slug"}
                  </p>
                </button>
              ))}
            </div>
          </div>

          <ImageUpload
            value={p.image_url ?? null}
            onChange={(url) => setP({ ...p, image_url: url })}
            folder="products"
          />

          <div className="grid grid-cols-2 gap-3">
            <Input label="Name (EN)" value={p.name_en ?? ""} onChange={(v) => setP({ ...p, name_en: v })} required />
            <Input label="Name (AR)" value={p.name_ar ?? ""} onChange={(v) => setP({ ...p, name_ar: v })} />
          </div>

          <Input label="Slug" value={p.slug ?? ""} onChange={(v) => setP({ ...p, slug: v })} placeholder="auto from name" />

          <Textarea label="Description (EN)" value={p.description_en ?? ""} onChange={(v) => setP({ ...p, description_en: v })} />
          <Textarea label="Description (AR)" value={p.description_ar ?? ""} onChange={(v) => setP({ ...p, description_ar: v })} />

          <div className="grid grid-cols-2 gap-3">
            <Input label="Price (optional)" type="number" value={String(p.price ?? 0)} onChange={(v) => setP({ ...p, price: Number(v) })} />
            <Input label="Sort order" type="number" value={String(p.sort_order ?? 0)} onChange={(v) => setP({ ...p, sort_order: Number(v) })} />
          </div>

          {p.product_type === "external" && (
            <Input
              label="External link URL"
              value={p.link_url ?? ""}
              onChange={(v) => setP({ ...p, link_url: v })}
              placeholder="https://…"
              required
            />
          )}

          <div className="grid grid-cols-2 gap-2 text-sm">
            <Toggle label="Active (visible to customers)" checked={p.is_active ?? true} onChange={(v) => setP({ ...p, is_active: v })} />
            <Toggle label="Featured" checked={p.is_best_seller ?? false} onChange={(v) => setP({ ...p, is_best_seller: v })} />
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-full px-4 py-2 text-sm">Cancel</button>
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
