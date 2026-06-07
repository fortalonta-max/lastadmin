import { supabase } from "@/integrations/supabase/client";
import { type Locale, pickLocalized } from "./i18n";

export type Flavor = {
  id: string;
  slug: string;
  name_en: string;
  name_ar: string | null;
  description_en: string | null;
  description_ar: string | null;
  image_url: string | null;
  is_available: boolean;
  is_limited_edition: boolean;
  is_out_of_stock: boolean;
  price: number;
  sort_order: number;
};

export type Box = {
  id: string;
  slug: string;
  name_en: string;
  name_ar: string | null;
  description_en: string | null;
  description_ar: string | null;
  image_url: string | null;
  cookie_count: number;
  price: number;
  type: "fixed" | "byo";
  is_active: boolean;
  is_best_seller: boolean;
  sort_order: number;
};

export async function fetchFlavors() {
  const { data, error } = await supabase
    .from("flavors")
    .select("*")
    .eq("is_available", true)
    .order("sort_order");
  if (error) throw error;
  return (data ?? []) as Flavor[];
}

/** Returns a map of flavor_id → box-specific price for the given box. */
export async function fetchFlavorPricesForBox(boxId: string): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from("flavor_box_prices")
    .select("flavor_id, price")
    .eq("box_id", boxId);
  if (error) throw error;
  const map: Record<string, number> = {};
  (data ?? []).forEach((row) => {
    map[row.flavor_id] = Number(row.price);
  });
  return map;
}

export async function fetchBoxes() {
  const { data, error } = await supabase
    .from("boxes")
    .select("*")
    .eq("is_active", true)
    .order("sort_order");
  if (error) throw error;
  return (data ?? []).map((b) => ({ ...b, price: Number(b.price) })) as Box[];
}

export async function fetchBoxBySlug(slug: string) {
  const { data, error } = await supabase
    .from("boxes")
    .select("*, box_fixed_flavors(quantity, flavor_id, flavors(*))")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return { ...data, price: Number(data.price) } as Box & {
    box_fixed_flavors: Array<{ quantity: number; flavor_id: string; flavors: Flavor }>;
  };
}

export async function fetchReviews() {
  const { data, error } = await supabase
    .from("reviews")
    .select("*")
    .eq("is_published", true)
    .order("sort_order");
  if (error) throw error;
  return data ?? [];
}

export async function fetchFaqs() {
  const { data, error } = await supabase
    .from("faqs")
    .select("*")
    .eq("is_published", true)
    .order("sort_order");
  if (error) throw error;
  return data ?? [];
}

export async function fetchSettings() {
  const { data, error } = await supabase
    .from("site_settings")
    .select(
      "store_name, store_tagline_en, store_tagline_ar, logo_url, hero_image_url, " +
      "hero_eyebrow_en, hero_eyebrow_ar, hero_title_en, hero_title_ar, hero_subtitle_en, hero_subtitle_ar, " +
      "whatsapp_number, delivery_fee, contact_email, contact_phone, contact_address, meta_pixel_id"
    )
    .eq("id", 1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export function localizedName<T extends Record<string, unknown>>(o: T, locale: Locale) {
  return pickLocalized(o, "name", locale);
}
export function localizedDesc<T extends Record<string, unknown>>(o: T, locale: Locale) {
  return pickLocalized(o, "description", locale);
}
