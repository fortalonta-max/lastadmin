import { useState } from "react";
import { Upload, X, Link } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type Mode = "upload" | "url";

export function ImageUpload({
  value,
  onChange,
  folder = "general",
}: {
  value: string | null;
  onChange: (url: string | null) => void;
  folder?: string;
}) {
  const [uploading, setUploading] = useState(false);
  const [mode, setMode] = useState<Mode>("upload");
  const [urlInput, setUrlInput] = useState("");

  async function handleFile(file: File) {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${folder}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("products").upload(path, file, {
        cacheControl: "2592000",
        upsert: false,
      });
      if (error) throw error;
      const { data } = supabase.storage.from("products").getPublicUrl(path);
      onChange(data.publicUrl);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function handleUrlConfirm() {
    const trimmed = urlInput.trim();
    if (!trimmed) return;
    if (!/^https?:\/\/.+/.test(trimmed)) {
      toast.error("Please enter a valid URL starting with http:// or https://");
      return;
    }
    onChange(trimmed);
    setUrlInput("");
  }

  if (value) {
    return (
      <div className="relative inline-block">
        <img src={value} alt="" className="h-32 w-32 rounded-xl object-cover" />
        <button
          type="button"
          onClick={() => onChange(null)}
          className="absolute -right-2 -top-2 grid h-7 w-7 place-items-center rounded-full bg-destructive text-destructive-foreground"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Mode toggle */}
      <div className="flex gap-1 rounded-lg border border-border bg-muted p-1 w-fit">
        <button
          type="button"
          onClick={() => setMode("upload")}
          className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            mode === "upload"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Upload className="h-3 w-3" /> Upload file
        </button>
        <button
          type="button"
          onClick={() => setMode("url")}
          className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            mode === "url"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Link className="h-3 w-3" /> Paste URL
        </button>
      </div>

      {mode === "upload" ? (
        <label className="inline-flex h-32 w-32 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-border bg-muted text-xs text-muted-foreground transition-colors hover:bg-muted/70">
          {uploading ? "Uploading…" : <><Upload className="h-5 w-5" /> Upload</>}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            disabled={uploading}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
        </label>
      ) : (
        <div className="flex gap-2">
          <input
            type="url"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleUrlConfirm(); } }}
            placeholder="https://example.com/image.jpg"
            className="w-64 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none ring-ring/20 focus:ring-2"
          />
          <button
            type="button"
            onClick={handleUrlConfirm}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            Use
          </button>
        </div>
      )}
    </div>
  );
}
