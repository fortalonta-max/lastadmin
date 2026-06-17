import { supabase } from "@/integrations/supabase/client";
import { type Locale, pickLocalized } from "./i18n";

// ── Types ─────────────────────────────────────────────────────────────────────

export type Flavor = {
  id: string;
  slug: string;
  name_en: string;
  name_ar: string | null;
  description_en: string | null;
  description_ar: string | null;
  image_url: string | null;
  /**
   * Legacy field — always stored as 0 in the database.
   * All flavor pricing is managed exclusively via flavor_box_prices.
   * Do NOT use this field for any price display or calculation.
   */
  price: number;
  is_available: boolean;
  is_limited_edition: boolean;
  is_out_of_stock: boolean;
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
  /**
   * Legacy cache field — kept for backward compatibility.
   * Live pricing is derived from flavor default prices (flavors.price) minus per-flavor discounts
   * stored in flavor_box_prices.discount.
   */
  price: number;
  type: "fixed" | "byo";
  is_active: boolean;
  is_best_seller: boolean;
  sort_order: number;
  sale_enabled?: boolean | null;
};

export type Product = {
  id: string;
  slug: string;
  name_en: string;
  name_ar: string | null;
  description_en: string | null;
  description_ar: string | null;
  image_url: string | null;
  price: number;
  is_active: boolean;
  is_best_seller: boolean;
  sort_order: number;
};

// ── SiteSettings ──────────────────────────────────────────────────────────────

export type SiteSettings = {
  store_name: string;
  store_tagline_en: string;
  store_tagline_ar: string;
  logo_url: string;
  hero_image_url: string;
  hero_images: string[];
  hero_eyebrow_en: string;
  hero_eyebrow_ar: string;
  hero_title_en: string;
  hero_title_ar: string;
  hero_subtitle_en: string;
  hero_subtitle_ar: string;
  whatsapp_number: string;
  delivery_fee: number;
  free_shipping_threshold: number;
  contact_email: string;
  contact_phone: string;
  contact_address: string;
  meta_pixel_id: string | null;
  story_heading_en: string;
  story_heading_ar: string;
  story_body_en: string;
  story_body_ar: string;
  story_pillar1_en: string;
  story_pillar1_ar: string;
  story_pillar2_en: string;
  story_pillar2_ar: string;
  story_pillar3_en: string;
  story_pillar3_ar: string;
  delivery_bar_text_en: string;
  delivery_bar_text_ar: string;
  announcement_enabled: boolean;
  announcement_text_en: string;
  announcement_text_ar: string;
};

// ── Defaults ──────────────────────────────────────────────────────────────────

const DEFAULT_SETTINGS: SiteSettings = {
  store_name: "Leen Bakery",
  store_tagline_en: "Leen Bakery NYC-style cookies",
  store_tagline_ar: "لين بيكري كوكيز نيويورك",
  logo_url: "https://i.postimg.cc/x8ft8MhN/wmremove-transformed-removebg-preview-(1).png",
  hero_image_url: "https://i.postimg.cc/CKV3Zwfg/wmremove-transformed-(8).png",
  hero_images: [],
  hero_eyebrow_en: "Bake Share Smile",
  hero_eyebrow_ar: "اخبز شارك ابتسم",
  hero_title_en: "Fresh Out of the Oven",
  hero_title_ar: "طازج من الفرن",
  hero_subtitle_en: "Every cookie is baked fresh daily. Choose your favorites and we'll deliver them straight to your door.",
  hero_subtitle_ar: "كل كوكيز يُخبز طازجاً يومياً. اختر مفضلاتك وسنوصلها إلى بابك.",
  whatsapp_number: "+201070487228",
  delivery_fee: 90,
  free_shipping_threshold: 750,
  contact_email: "leendahban@gmail.com",
  contact_phone: "01070487228",
  contact_address: "Egypt – Cairo – New Cairo – Fifth Settlement",
  meta_pixel_id: null,
  story_heading_en: "Born in New York. Baked with obsession.",
  story_heading_ar: "وُلد في نيويورك. خُبز بشغف.",
  story_body_en:
    "We started with one oven, one recipe, and a belief that a truly great cookie should stop you mid-bite. Every batch uses high-fat European butter, single-origin chocolate, and flour we stone-mill in-house. No shortcuts. No preservatives. Just cookies the way New York does them.",
  story_body_ar:
    "بدأنا بفرن واحد ووصفة واحدة وإيمان بأن الكوكيز الرائعة حقاً يجب أن توقفك في كل لقمة. كل دفعة تستخدم زبدة أوروبية عالية الدسم وشوكولاتة من أصل واحد ودقيقاً نطحنه يدوياً. لا اختصارات. لا مواد حافظة. فقط كوكيز كما تصنعها نيويورك.",
  story_pillar1_en: "Baked fresh daily",
  story_pillar1_ar: "يُخبز طازجاً يومياً",
  story_pillar2_en: "Premium ingredients",
  story_pillar2_ar: "مكونات فاخرة",
  story_pillar3_en: "Hand-packed with care",
  story_pillar3_ar: "يُعبّأ بعناية يدوية",
  delivery_bar_text_en: "Same-day delivery until 8:00 PM  ·  Free delivery on orders over EGP 750",
  delivery_bar_text_ar: "توصيل في نفس اليوم حتى 8 مساءً  ·  توصيل مجاني للطلبات فوق 750 جنيه",
  announcement_enabled: false,
  announcement_text_en: "Same-day delivery until 8:00 PM. Free delivery on orders over EGP 750.",
  announcement_text_ar: "توصيل في نفس اليوم حتى 8 مساءً. توصيل مجاني للطلبات فوق 750 جنيه.",
};

// ── Fetch helpers ─────────────────────────────────────────────────────────────

export async function fetchSettings(): Promise<SiteSettings> {
  const { data, error } = await supabase
    .from("site_settings")
    .select(
      "store_name, store_tagline_en, store_tagline_ar, logo_url, hero_image_url, hero_images, " +
      "hero_eyebrow_en, hero_eyebrow_ar, hero_title_en, hero_title_ar, hero_subtitle_en, hero_subtitle_ar, " +
      "whatsapp_number, delivery_fee, free_shipping_threshold, contact_email, contact_phone, contact_address, meta_pixel_id, " +
      "story_heading_en, story_heading_ar, story_body_en, story_body_ar, " +
      "story_pillar1_en, story_pillar1_ar, story_pillar2_en, story_pillar2_ar, story_pillar3_en, story_pillar3_ar, " +
      "announcement_enabled, announcement_text_en, announcement_text_ar, " +
      "delivery_bar_text_en, delivery_bar_text_ar"
    )
    .eq("id", 1)
    .maybeSingle();

  if (error || !data) return { ...DEFAULT_SETTINGS };

  return {
    store_name: data.store_name ?? DEFAULT_SETTINGS.store_name,
    store_tagline_en: data.store_tagline_en ?? DEFAULT_SETTINGS.store_tagline_en,
    store_tagline_ar: data.store_tagline_ar ?? DEFAULT_SETTINGS.store_tagline_ar,
    logo_url: data.logo_url ?? DEFAULT_SETTINGS.logo_url,
    hero_image_url: data.hero_image_url ?? DEFAULT_SETTINGS.hero_image_url,
    hero_images: Array.isArray(data.hero_images) ? (data.hero_images as string[]) : [],
    hero_eyebrow_en: data.hero_eyebrow_en ?? DEFAULT_SETTINGS.hero_eyebrow_en,
    hero_eyebrow_ar: data.hero_eyebrow_ar ?? DEFAULT_SETTINGS.hero_eyebrow_ar,
    hero_title_en: data.hero_title_en ?? DEFAULT_SETTINGS.hero_title_en,
    hero_title_ar: data.hero_title_ar ?? DEFAULT_SETTINGS.hero_title_ar,
    hero_subtitle_en: data.hero_subtitle_en ?? DEFAULT_SETTINGS.hero_subtitle_en,
    hero_subtitle_ar: data.hero_subtitle_ar ?? DEFAULT_SETTINGS.hero_subtitle_ar,
    whatsapp_number: data.whatsapp_number ?? DEFAULT_SETTINGS.whatsapp_number,
    delivery_fee: data.delivery_fee != null ? Number(data.delivery_fee) : DEFAULT_SETTINGS.delivery_fee,
    free_shipping_threshold: data.free_shipping_threshold != null ? Number(data.free_shipping_threshold) : DEFAULT_SETTINGS.free_shipping_threshold,
    contact_email: data.contact_email ?? DEFAULT_SETTINGS.contact_email,
    contact_phone: data.contact_phone ?? DEFAULT_SETTINGS.contact_phone,
    contact_address: data.contact_address ?? DEFAULT_SETTINGS.contact_address,
    meta_pixel_id: data.meta_pixel_id ?? DEFAULT_SETTINGS.meta_pixel_id,
    story_heading_en: data.story_heading_en ?? DEFAULT_SETTINGS.story_heading_en,
    story_heading_ar: data.story_heading_ar ?? DEFAULT_SETTINGS.story_heading_ar,
    story_body_en: data.story_body_en ?? DEFAULT_SETTINGS.story_body_en,
    story_body_ar: data.story_body_ar ?? DEFAULT_SETTINGS.story_body_ar,
    story_pillar1_en: data.story_pillar1_en ?? DEFAULT_SETTINGS.story_pillar1_en,
    story_pillar1_ar: data.story_pillar1_ar ?? DEFAULT_SETTINGS.story_pillar1_ar,
    story_pillar2_en: data.story_pillar2_en ?? DEFAULT_SETTINGS.story_pillar2_en,
    story_pillar2_ar: data.story_pillar2_ar ?? DEFAULT_SETTINGS.story_pillar2_ar,
    story_pillar3_en: data.story_pillar3_en ?? DEFAULT_SETTINGS.story_pillar3_en,
    story_pillar3_ar: data.story_pillar3_ar ?? DEFAULT_SETTINGS.story_pillar3_ar,
    announcement_enabled: data.announcement_enabled ?? DEFAULT_SETTINGS.announcement_enabled,
    announcement_text_en: data.announcement_text_en ?? DEFAULT_SETTINGS.announcement_text_en,
    announcement_text_ar: data.announcement_text_ar ?? DEFAULT_SETTINGS.announcement_text_ar,
    delivery_bar_text_en: data.delivery_bar_text_en ?? DEFAULT_SETTINGS.delivery_bar_text_en,
    delivery_bar_text_ar: data.delivery_bar_text_ar ?? DEFAULT_SETTINGS.delivery_bar_text_ar,
  };
}

export async function fetchFlavors() {
  const { data, error } = await supabase
    .from("flavors")
    .select("*")
    .eq("is_available", true)
    .order("sort_order");
  if (error) throw error;
  return (data ?? []) as Flavor[];
}

/**
 * Fetch effective per-cookie prices for every flavor in the context of a specific box.
 * Effective price = MAX(0, flavors.price − flavor_box_prices.discount).
 * If no discount row exists for a flavor+box pair the full flavors.price is used.
 * Returns a map of flavor_id → effective-price-per-cookie (flavors with price 0 are omitted).
 */
export async function fetchFlavorPricesForBox(boxId: string): Promise<Record<string, number>> {
  const [flavorsRes, discountsRes] = await Promise.all([
    supabase.from("flavors").select("id, price").eq("is_available", true),
    supabase.from("flavor_box_prices").select("flavor_id, discount").eq("box_id", boxId),
  ]);
  if (flavorsRes.error) throw flavorsRes.error;

  // Build discount lookup: flavor_id → discount amount for this box
  const discountMap: Record<string, number> = {};
  for (const row of discountsRes.data ?? []) {
    discountMap[row.flavor_id] = Number(row.discount ?? 0);
  }

  const map: Record<string, number> = {};
  for (const f of flavorsRes.data ?? []) {
    const base = Number(f.price ?? 0);
    if (base <= 0) continue;
    const discount = discountMap[f.id] ?? 0;
    map[f.id] = Math.max(0, base - discount);
  }
  return map;
}

export async function fetchBoxes() {
  const { data, error } = await supabase
    .from("boxes")
    .select("*")
    .eq("is_active", true)
    .order("sort_order");
  if (error) throw error;
  return (data ?? []).map((b) => ({
    ...b,
    price: Number(b.price),
  })) as Box[];
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
  return {
    ...data,
    price: Number(data.price),
  } as Box & {
    box_fixed_flavors: Array<{ quantity: number; flavor_id: string; flavors: Flavor }>;
  };
}

export async function fetchProducts() {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("is_active", true)
    .order("sort_order");
  if (error) throw error;
  return (data ?? []).map((p) => ({ ...p, price: Number(p.price) })) as Product[];
}

export async function fetchProductBySlug(slug: string) {
  const { data, error } = await supabase
    .from("products")
    .select("*, product_flavors(sort_order, flavor_id, flavors(*))")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return { ...data, price: Number(data.price) } as Product & {
    product_flavors: Array<{ sort_order: number; flavor_id: string; flavors: Flavor }>;
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

export function localizedName<T extends Record<string, unknown>>(o: T, locale: Locale) {
  return pickLocalized(o, "name", locale);
}
export function localizedDesc<T extends Record<string, unknown>>(o: T, locale: Locale) {
  return pickLocalized(o, "description", locale);
}

/**
 * Fetch per-box effective price ranges for all active boxes, applying per-flavor discounts.
 *
 * For BYO boxes:   returns { min, max } of effective per-cookie prices across all available
 *                  flavors scoped to that box (flavors.price − flavor_box_prices.discount).
 * For fixed boxes: returns { min:0, max:0, fixedPrice } where fixedPrice is the sum of
 *                  each preset flavor's effective price × its quantity.
 *
 * This is the authoritative source for the listing page — the detail page uses
 * fetchFlavorPricesForBox() per box which produces the same effective prices.
 */
export async function fetchByoPriceRangePerBox(): Promise<
  Record<string, { min: number; max: number; fixedPrice?: number }>
> {
  const [
    { data: flavorRows },
    { data: boxes },
    { data: discountRows },
    { data: fixedFlavorRows },
  ] = await Promise.all([
    supabase.from("flavors").select("id, price").eq("is_available", true),
    supabase.from("boxes").select("id, type").eq("is_active", true),
    supabase.from("flavor_box_prices").select("box_id, flavor_id, discount"),
    supabase.from("box_fixed_flavors").select("box_id, flavor_id, quantity"),
  ]);

  const allFlavors = flavorRows ?? [];
  const allBoxes = boxes ?? [];
  const allDiscounts = discountRows ?? [];
  const allFixedFlavors = fixedFlavorRows ?? [];

  // flavor_id -> default price
  const flavorPriceMap: Record<string, number> = {};
  for (const f of allFlavors) {
    flavorPriceMap[f.id] = Number(f.price ?? 0);
  }

  const result: Record<string, { min: number; max: number; fixedPrice?: number }> = {};

  for (const box of allBoxes) {
    // discount map scoped to this box: flavor_id -> discount
    const discountMap: Record<string, number> = {};
    for (const d of allDiscounts) {
      if (d.box_id === box.id) {
        discountMap[d.flavor_id] = Number(d.discount ?? 0);
      }
    }

    // effective price per flavor for this box
    const effectivePriceFor = (flavorId: string) =>
      Math.max(0, (flavorPriceMap[flavorId] ?? 0) - (discountMap[flavorId] ?? 0));

    if (box.type === "byo") {
      const effectivePrices = allFlavors
        .map((f) => effectivePriceFor(f.id))
        .filter((p) => p > 0);

      if (effectivePrices.length === 0) continue;

      result[box.id] = {
        min: Math.min(...effectivePrices),
        max: Math.max(...effectivePrices),
      };
    } else {
      // fixed box: sum effective price * quantity for its configured flavors
      const flavorsForThisBox = allFixedFlavors.filter((ff) => ff.box_id === box.id);
      if (flavorsForThisBox.length === 0) continue;

      const fixedPrice = flavorsForThisBox.reduce(
        (sum, ff) => sum + effectivePriceFor(ff.flavor_id) * Number(ff.quantity ?? 0),
        0,
      );

      result[box.id] = { min: 0, max: 0, fixedPrice };
    }
  }

  return result;
}
