import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { initMetaPixel, trackPixel } from "@/lib/meta-pixel";

export function MetaPixelLoader() {
  const { data } = useQuery({
    queryKey: ["public-settings-pixel"],
    queryFn: async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("meta_pixel_id")
        .eq("id", 1)
        .maybeSingle();
      return data;
    },
    staleTime: 60_000,
  });

  // Normalise the pixel ID to a string BEFORE using it as a useEffect dependency.
  //
  // WHY: Supabase can return a Postgres bigint/numeric column as a JS number on
  // some code paths and as a string on others (e.g. SSR vs. client, or across
  // Supabase client versions). React uses Object.is() for dep comparison, so
  // Object.is(1234567890, "1234567890") === false — the effect would re-run even
  // though the logical value hasn't changed, calling initMetaPixel a second time.
  //
  // Coercing to string here means Object.is("123", "123") === true on every
  // subsequent background refetch, so the effect only ever runs once per mount.
  const pixelId = data?.meta_pixel_id != null ? String(data.meta_pixel_id).trim() : undefined;

  useEffect(() => {
    if (pixelId) {
      initMetaPixel(pixelId);
      // Fire the initial PageView here — after the pixel is initialized —
      // rather than inside initMetaPixel. This is the single source of truth
      // for the initial PageView. Subsequent SPA navigations are tracked by
      // the router.subscribe("onResolved") handler in __root.tsx.
      trackPixel("PageView");
    }
  }, [pixelId]);

  return null;
}
