import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input, Textarea, Toggle } from "@/routes/admin.flavors";

export const Route = createFileRoute("/admin/faqs")({
  component: FaqsAdmin,
});

type Faq = {
  id: string;
  question_en: string;
  question_ar: string | null;
  answer_en: string;
  answer_ar: string | null;
  is_published: boolean;
  sort_order: number;
};

function FaqsAdmin() {
  const qc = useQueryClient();
  const { data: faqs = [] } = useQuery({
    queryKey: ["admin-faqs"],
    queryFn: async () => {
      const { data, error } = await supabase.from("faqs").select("*").order("sort_order");
      if (error) throw error;
      return data as Faq[];
    },
  });
  const [editing, setEditing] = useState<Partial<Faq> | null>(null);

  async function save(f: Partial<Faq>) {
    if (!f.question_en?.trim() || !f.answer_en?.trim()) return toast.error("Question and answer (EN) required");
    const payload = {
      question_en: f.question_en.trim(),
      question_ar: f.question_ar?.trim() || null,
      answer_en: f.answer_en.trim(),
      answer_ar: f.answer_ar?.trim() || null,
      is_published: f.is_published ?? true,
      sort_order: Number(f.sort_order ?? 0),
    };
    const { error } = f.id
      ? await supabase.from("faqs").update(payload).eq("id", f.id)
      : await supabase.from("faqs").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Saved");
    setEditing(null);
    qc.invalidateQueries({ queryKey: ["admin-faqs"] });
  }

  async function remove(id: string) {
    if (!confirm("Delete FAQ?")) return;
    const { error } = await supabase.from("faqs").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["admin-faqs"] });
  }

  return (
    <div>
      <header className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-3xl">FAQs</h1>
        <button
          onClick={() => setEditing({ is_published: true, sort_order: faqs.length + 1 })}
          className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
        >
          <Plus className="h-4 w-4" /> New FAQ
        </button>
      </header>
      <ul className="space-y-3">
        {faqs.map((f) => (
          <li key={f.id} className="flex items-start justify-between gap-4 rounded-2xl border border-border/60 bg-card p-4">
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{f.question_en}</p>
              <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{f.answer_en}</p>
              {!f.is_published && <span className="mt-2 inline-block rounded bg-muted px-1.5 text-[10px]">hidden</span>}
            </div>
            <div className="flex gap-1">
              <button onClick={() => setEditing(f)} className="grid h-7 w-7 place-items-center rounded hover:bg-muted"><Pencil className="h-3.5 w-3.5" /></button>
              <button onClick={() => remove(f.id)} className="grid h-7 w-7 place-items-center rounded text-destructive hover:bg-muted"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
          </li>
        ))}
        {faqs.length === 0 && <p className="text-sm text-muted-foreground">No FAQs yet.</p>}
      </ul>
      {editing && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-card p-6">
            <h2 className="mb-4 font-display text-xl">{editing.id ? "Edit FAQ" : "New FAQ"}</h2>
            <div className="space-y-3">
              <Input label="Question (EN)" value={editing.question_en ?? ""} onChange={(v) => setEditing({ ...editing, question_en: v })} required />
              <Input label="Question (AR)" value={editing.question_ar ?? ""} onChange={(v) => setEditing({ ...editing, question_ar: v })} />
              <Textarea label="Answer (EN)" value={editing.answer_en ?? ""} onChange={(v) => setEditing({ ...editing, answer_en: v })} />
              <Textarea label="Answer (AR)" value={editing.answer_ar ?? ""} onChange={(v) => setEditing({ ...editing, answer_ar: v })} />
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
