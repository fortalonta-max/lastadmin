import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ImageUpload } from "@/components/admin/image-upload";
import { Input, Textarea, Toggle } from "@/routes/admin.flavors";

export const Route = createFileRoute("/admin/reviews")({
  component: ReviewsAdmin,
});

type Review = {
  id: string;
  name: string;
  rating: number;
  body: string;
  image_url: string | null;
  is_published: boolean;
  sort_order: number;
};

function ReviewsAdmin() {
  const qc = useQueryClient();
  const { data: reviews = [] } = useQuery({
    queryKey: ["admin-reviews"],
    queryFn: async () => {
      const { data, error } = await supabase.from("reviews").select("*").order("sort_order");
      if (error) throw error;
      return data as Review[];
    },
  });
  const [editing, setEditing] = useState<Partial<Review> | null>(null);

  async function save(r: Partial<Review>) {
    if (!r.name?.trim() || !r.body?.trim()) return toast.error("Name and body required");
    const payload = {
      name: r.name.trim(),
      rating: Math.min(5, Math.max(1, Number(r.rating ?? 5))),
      body: r.body.trim(),
      image_url: r.image_url ?? null,
      is_published: r.is_published ?? true,
      sort_order: Number(r.sort_order ?? 0),
    };
    const { error } = r.id
      ? await supabase.from("reviews").update(payload).eq("id", r.id)
      : await supabase.from("reviews").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Saved");
    setEditing(null);
    qc.invalidateQueries({ queryKey: ["admin-reviews"] });
  }
  async function remove(id: string) {
    if (!confirm("Delete review?")) return;
    const { error } = await supabase.from("reviews").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["admin-reviews"] });
  }

  return (
    <div>
      <header className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-3xl">Reviews</h1>
        <button
          onClick={() => setEditing({ rating: 5, is_published: true, sort_order: reviews.length + 1 })}
          className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
        >
          <Plus className="h-4 w-4" /> New review
        </button>
      </header>
      <div className="grid gap-3 md:grid-cols-2">
        {reviews.map((r) => (
          <div key={r.id} className="rounded-2xl border border-border/60 bg-card p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold">{r.name}</p>
                <div className="mt-0.5 flex">
                  {Array.from({ length: r.rating }).map((_, i) => (
                    <Star key={i} className="h-3.5 w-3.5 fill-[var(--gold)] text-[var(--gold)]" />
                  ))}
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => setEditing(r)} className="grid h-7 w-7 place-items-center rounded hover:bg-muted"><Pencil className="h-3.5 w-3.5" /></button>
                <button onClick={() => remove(r.id)} className="grid h-7 w-7 place-items-center rounded text-destructive hover:bg-muted"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            </div>
            <p className="mt-2 text-sm text-muted-foreground line-clamp-3">{r.body}</p>
            {!r.is_published && <span className="mt-2 inline-block rounded bg-muted px-1.5 text-[10px]">hidden</span>}
          </div>
        ))}
        {reviews.length === 0 && <p className="text-sm text-muted-foreground">No reviews yet.</p>}
      </div>
      {editing && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-card p-6">
            <h2 className="mb-4 font-display text-xl">{editing.id ? "Edit review" : "New review"}</h2>
            <div className="space-y-3">
              <ImageUpload value={editing.image_url ?? null} onChange={(url) => setEditing({ ...editing, image_url: url })} folder="reviews" />
              <Input label="Name" value={editing.name ?? ""} onChange={(v) => setEditing({ ...editing, name: v })} required />
              <Input label="Rating (1-5)" type="number" value={String(editing.rating ?? 5)} onChange={(v) => setEditing({ ...editing, rating: Number(v) })} />
              <Textarea label="Review body" value={editing.body ?? ""} onChange={(v) => setEditing({ ...editing, body: v })} />
              <Input label="Sort order" type="number" value={String(editing.sort_order ?? 0)} onChange={(v) => setEditing({ ...editing, sort_order: Number(v) })} />
              <Toggle label="Published" checked={editing.is_published ?? true} onChange={(v) => setEditing({ ...editing, is_published: v })} />
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setEditing(null)} className="rounded-full px-4 py-2 text-sm">Cancel</button>
              <button onClick={() => save(editing)} className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
