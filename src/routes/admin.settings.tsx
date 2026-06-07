import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Input, Textarea } from "@/routes/admin.flavors";
import { ImageUpload } from "@/components/admin/image-upload";

export const Route = createFileRoute("/admin/settings")({
  component: SettingsAdmin,
});

type Settings = {
  id: number;
  store_name: string;
  store_tagline_en: string | null;
  store_tagline_ar: string | null;
  logo_url: string | null;
  hero_eyebrow_en: string | null;
  hero_eyebrow_ar: string | null;
  hero_title_en: string | null;
  hero_title_ar: string | null;
  hero_subtitle_en: string | null;
  hero_subtitle_ar: string | null;
  whatsapp_number: string | null;
  delivery_fee: number;
  meta_pixel_id: string | null;
  meta_capi_token: string | null;
  meta_test_event_code: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  contact_address: string | null;
};

function SettingsAdmin() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["admin-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("site_settings").select("*").eq("id", 1).maybeSingle();
      if (error) throw error;
      return data as Settings | null;
    },
  });
  const [s, setS] = useState<Partial<Settings>>({});
  useEffect(() => { if (data) setS(data); }, [data]);

  async function save() {
    const payload = {
      id: 1,
      store_name: s.store_name?.trim() || "NYC Cookies",
      store_tagline_en: s.store_tagline_en ?? null,
      store_tagline_ar: s.store_tagline_ar ?? null,
      logo_url: s.logo_url ?? null,
      hero_eyebrow_en: s.hero_eyebrow_en ?? null,
      hero_eyebrow_ar: s.hero_eyebrow_ar ?? null,
      hero_title_en: s.hero_title_en ?? null,
      hero_title_ar: s.hero_title_ar ?? null,
      hero_subtitle_en: s.hero_subtitle_en ?? null,
      hero_subtitle_ar: s.hero_subtitle_ar ?? null,
      whatsapp_number: s.whatsapp_number ?? null,
      delivery_fee: Number(s.delivery_fee ?? 0),
      meta_pixel_id: s.meta_pixel_id ?? null,
      meta_capi_token: s.meta_capi_token ?? null,
      meta_test_event_code: s.meta_test_event_code ?? null,
      contact_email: s.contact_email ?? null,
      contact_phone: s.contact_phone ?? null,
      contact_address: s.contact_address ?? null,
    };
    const { error } = data
      ? await supabase.from("site_settings").update(payload).eq("id", 1)
      : await supabase.from("site_settings").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Settings saved");
    qc.invalidateQueries({ queryKey: ["admin-settings"] });
    qc.invalidateQueries({ queryKey: ["public-settings"] });
  }

  return (
    <div className="max-w-2xl">
      <header className="mb-6">
        <h1 className="font-display text-3xl">Settings</h1>
        <p className="text-sm text-muted-foreground">Store identity, branding, hero content, contact, delivery, and Meta tracking.</p>
      </header>

      {/* ── Branding ── */}
      <section className="mb-8 space-y-5 rounded-2xl border border-border/60 bg-card p-6">
        <h2 className="font-display text-xl">Branding</h2>

        <div>
          <p className="mb-2 text-sm font-medium text-foreground">Logo</p>
          <ImageUpload
            value={s.logo_url ?? null}
            onChange={(url) => setS({ ...s, logo_url: url })}
            folder="logos"
          />
          <p className="mt-2 text-xs text-muted-foreground">
            Upload your logo (PNG or SVG with transparent background recommended). It replaces the cookie emoji in the header and footer.
          </p>
        </div>

        <Input label="Store name" value={s.store_name ?? ""} onChange={(v) => setS({ ...s, store_name: v })} />
        <Input label="Tagline (EN)" value={s.store_tagline_en ?? ""} onChange={(v) => setS({ ...s, store_tagline_en: v })} />
        <Input label="Tagline (AR)" value={s.store_tagline_ar ?? ""} onChange={(v) => setS({ ...s, store_tagline_ar: v })} />
      </section>

      {/* ── Hero Section Text ── */}
      <section className="mb-8 space-y-4 rounded-2xl border border-border/60 bg-card p-6">
        <div>
          <h2 className="font-display text-xl">Hero Section</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Controls the big headline on your homepage. Leave any field blank to use the default text.
          </p>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-semibold text-foreground/70">English</p>
          <Input
            label="Eyebrow (small text above headline)"
            value={s.hero_eyebrow_en ?? ""}
            onChange={(v) => setS({ ...s, hero_eyebrow_en: v })}
            placeholder="e.g. Fresh-baked, NYC-style"
          />
          <Input
            label="Headline"
            value={s.hero_title_en ?? ""}
            onChange={(v) => setS({ ...s, hero_title_en: v })}
            placeholder="e.g. Cookies the way New York does them."
          />
          <Textarea
            label="Subtitle"
            value={s.hero_subtitle_en ?? ""}
            onChange={(v) => setS({ ...s, hero_subtitle_en: v })}
            placeholder="e.g. Thick, gooey, stacked sky-high. Pick a box, choose your flavors, get them at your door."
          />
        </div>

        <div className="space-y-3 pt-2">
          <p className="text-sm font-semibold text-foreground/70">العربية</p>
          <Input
            label="العنوان الصغير (فوق العنوان الرئيسي)"
            value={s.hero_eyebrow_ar ?? ""}
            onChange={(v) => setS({ ...s, hero_eyebrow_ar: v })}
            placeholder="مثال: طازج، على الطريقة النيويوركية"
          />
          <Input
            label="العنوان الرئيسي"
            value={s.hero_title_ar ?? ""}
            onChange={(v) => setS({ ...s, hero_title_ar: v })}
            placeholder="مثال: كوكيز كما تصنعها نيويورك."
          />
          <Textarea
            label="النص التوضيحي"
            value={s.hero_subtitle_ar ?? ""}
            onChange={(v) => setS({ ...s, hero_subtitle_ar: v })}
            placeholder="مثال: سميكة، طرية، وعالية. اختر صندوقك، اختر نكهاتك، ونوصلك لباب البيت."
          />
        </div>
      </section>

      {/* ── Contact & Delivery ── */}
      <section className="mb-8 space-y-3 rounded-2xl border border-border/60 bg-card p-6">
        <h2 className="font-display text-xl">Contact & delivery</h2>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Contact phone" value={s.contact_phone ?? ""} onChange={(v) => setS({ ...s, contact_phone: v })} />
          <Input label="WhatsApp number (E.164)" value={s.whatsapp_number ?? ""} onChange={(v) => setS({ ...s, whatsapp_number: v })} placeholder="12125551234" />
        </div>
        <Input label="Contact email" value={s.contact_email ?? ""} onChange={(v) => setS({ ...s, contact_email: v })} />
        <Textarea label="Address" value={s.contact_address ?? ""} onChange={(v) => setS({ ...s, contact_address: v })} />
        <Input label="Delivery fee" type="number" value={String(s.delivery_fee ?? 0)} onChange={(v) => setS({ ...s, delivery_fee: Number(v) })} />
      </section>

      {/* ── Meta Pixel ── */}
      <section className="mb-8 space-y-3 rounded-2xl border border-border/60 bg-card p-6">
        <h2 className="font-display text-xl">Meta Pixel & CAPI</h2>
        <Input label="Pixel ID" value={s.meta_pixel_id ?? ""} onChange={(v) => setS({ ...s, meta_pixel_id: v })} />
        <Input label="CAPI access token" value={s.meta_capi_token ?? ""} onChange={(v) => setS({ ...s, meta_capi_token: v })} />
        <Input label="Test event code (optional)" value={s.meta_test_event_code ?? ""} onChange={(v) => setS({ ...s, meta_test_event_code: v })} />
      </section>

      <button onClick={save} className="rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground">
        Save settings
      </button>
    </div>
  );
}
