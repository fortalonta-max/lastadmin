import { supabase } from "@/integrations/supabase/client";

/**
 * Resolves an image value stored in the database to a renderable URL.
 *
 * - Full URL (http/https): returned as-is. Covers external URLs pasted by
 *   admin AND Supabase public URLs already stored (current behaviour).
 * - Bare Supabase Storage path (legacy, no scheme): public URL is generated
 *   from the "products" bucket for backward compatibility.
 * - null / undefined: returns null.
 */
export function resolveImageUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  const { data } = supabase.storage.from("products").getPublicUrl(value);
  return data.publicUrl;
}
