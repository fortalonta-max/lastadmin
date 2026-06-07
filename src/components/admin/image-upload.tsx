import { useState } from "react";
import { Upload, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

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

  async function handleFile(file: File) {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${folder}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("products").upload(path, file, {
        cacheControl: "3600",
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

  return (
    <div>
      {value ? (
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
      ) : (
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
      )}
    </div>
  );
}
