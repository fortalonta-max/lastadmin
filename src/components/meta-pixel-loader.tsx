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

  useEffect(() => {
    if (data?.meta_pixel_id) {
      initMetaPixel(data.meta_pixel_id);
      // Fire the initial PageView here — after the pixel is initialized —
      // rather than inside initMetaPixel. This is the single source of truth
      // for the initial PageView. Subsequent SPA navigations are tracked by
      // the router.subscribe("onResolved") handler in __root.tsx.
      trackPixel("PageView");
    }
  }, [data?.meta_pixel_id]);

  return null;
}
