import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, ArrowUp, ArrowDown, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input, Toggle } from "@/routes/admin.flavors";

export const Route = createFileRoute("/admin/social")({
  component: SocialAdmin,
});

type SocialLink = {
  id: string;
  name: string;
  url: string;
  is_active: boolean;
  sort_order: number;
};

const PRESET_PLATFORMS = [
  "YouTube",
  "WhatsApp",
  "Instagram",
  "Facebook",
  "TikTok",
  "Threads",
  "X (Twitter)",
  "Telegram",
  "LinkedIn",
];

function SocialAdmin() {
  const qc = useQueryClient();
  const { data: links = [], isLoading } = useQuery({
    queryKey: ["admin-social-links"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("social_links")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return data as SocialLink[];
    },
  });

  const [editing, setEditing] = useState<Partial<SocialLink> | null>(null);

  async function remove(id: string) {
    if (!confirm("Delete this social link? This cannot be undone.")) return;
    const { error } = await supabase.from("social_links").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["admin-social-links"] });
  }

  async function toggleActive(link: SocialLink) {
    const { error } = await supabase
      .from("social_links")
      .update({ is_active: !link.is_active })
      .eq("id", link.id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["admin-social-links"] });
  }

  async function reorder(id: string, dir: -1 | 1) {
    const sorted = [...links].sort((a, b) => a.sort_order - b.sort_order);
    const idx = sorted.findIndex((x) => x.id === id);
    if (idx === -1) return;
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= sorted.length) return;
    const current = sorted[idx];
    const neighbor = sorted[newIdx];
    const [err1, err2] = await Promise.all([
      supabase.from("social_links").update({ sort_order: neighbor.sort_order }).eq("id", current.id).then(r => r.error),
      supabase.from("social_links").update({ sort_order: current.sort_order }).eq("id", neighbor.id).then(r => r.error),
    ]);
    if (err1) { toast.error(err1.message); return; }
    if (err2) { toast.error(err2.message); return; }
    qc.invalidateQueries({ queryKey: ["admin-social-links"] });
  }

  if (isLoading) {
    return <div className="py-20 text-center text-sm text-muted-foreground">Loading…</div>;
  }

  return (
    <div>
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl">Social Media</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage social platform links. Only active links appear on the frontend.
          </p>
        </div>
        <button
          onClick={() => setEditing({ is_active: true, sort_order: links.length + 1 })}
          className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
        >
          <Plus className="h-4 w-4" /> Add platform
        </button>
      </header>

      {links.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border/60 py-16 text-center text-sm text-muted-foreground">
          <p className="text-2xl mb-3">📱</p>
          <p>No social links yet. Click "Add platform" to get started.</p>
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        {links.map((link) => (
          <div
            key={link.id}
            className={`flex items-center gap-3 rounded-2xl border bg-card p-4 transition-colors ${
              link.is_active ? "border-border/60" : "border-border/30 opacity-60"
            }`}
          >
            <div className="flex flex-col gap-1">
              <button onClick={() => reorder(link.id, -1)} className="grid h-6 w-6 place-items-center rounded hover:bg-muted">
                <ArrowUp className="h-3 w-3" />
              </button>
              <button onClick={() => reorder(link.id, 1)} className="grid h-6 w-6 place-items-center rounded hover:bg-muted">
                <ArrowDown className="h-3 w-3" />
              </button>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="font-semibold">{link.name}</p>
                {link.is_active ? (
                  <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700">Active</span>
                ) : (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">Inactive</span>
                )}
              </div>
              <a
                href={link.url}
                target="_blank"
                rel="noreferrer"
                className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground hover:text-foreground"
              >
                <ExternalLink className="h-3 w-3 shrink-0" />
                {link.url}
              </a>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => toggleActive(link)}
                className={`grid h-7 w-7 place-items-center rounded hover:bg-muted ${link.is_active ? "text-green-600" : "text-muted-foreground"}`}
                title={link.is_active ? "Deactivate" : "Activate"}
              >
                <span className="text-sm">{link.is_active ? "✓" : "○"}</span>
              </button>
              <button onClick={() => setEditing(link)} className="grid h-7 w-7 place-items-center rounded hover:bg-muted">
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => remove(link.id)} className="grid h-7 w-7 place-items-center rounded text-destructive hover:bg-muted">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {editing !== null && (
        <SocialEditor
          link={editing}
          presets={PRESET_PLATFORMS}
          onClose={() => setEditing(null)}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ["admin-social-links"] });
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function SocialEditor({
  link,
  presets,
  onClose,
  onSaved,
}: {
  link: Partial<SocialLink>;
  presets: string[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<Partial<SocialLink>>(link);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!form.name?.trim()) return toast.error("Platform name is required");
    if (!form.url?.trim()) return toast.error("URL is required");

    setSaving(true);
    const payload = {
      name: form.name.trim(),
      url: form.url.trim(),
      is_active: form.is_active ?? true,
      sort_order: Number(form.sort_order ?? 0),
    };

    if (form.id) {
      const { error } = await supabase.from("social_links").update(payload).eq("id", form.id);
      if (error) { toast.error(error.message); setSaving(false); return; }
    } else {
      const { error } = await supabase.from("social_links").insert(payload);
      if (error) { toast.error(error.message); setSaving(false); return; }
    }

    toast.success("Saved");
    setSaving(false);
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-card p-6">
        <h2 className="mb-4 font-display text-xl">
          {form.id ? "Edit platform" : "Add platform"}
        </h2>

        <div className="space-y-3">
          {/* Quick-pick preset buttons */}
          {!form.id && (
            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">Quick pick:</p>
              <div className="flex flex-wrap gap-1.5">
                {presets.map((name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, name }))}
                    className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                      form.name === name
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-muted hover:bg-muted/80"
                    }`}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <Input
            label="Platform name"
            value={form.name ?? ""}
            onChange={(v) => setForm((f) => ({ ...f, name: v }))}
            placeholder="e.g. Instagram"
            required
          />
          <Input
            label="URL"
            value={form.url ?? ""}
            onChange={(v) => setForm((f) => ({ ...f, url: v }))}
            placeholder="https://instagram.com/youraccount"
          />
          <Input
            label="Sort order"
            type="number"
            value={String(form.sort_order ?? 0)}
            onChange={(v) => setForm((f) => ({ ...f, sort_order: Number(v) }))}
          />
          <Toggle
            label="Active (visible on frontend)"
            checked={form.is_active ?? true}
            onChange={(v) => setForm((f) => ({ ...f, is_active: v }))}
          />
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-full px-4 py-2 text-sm">
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
