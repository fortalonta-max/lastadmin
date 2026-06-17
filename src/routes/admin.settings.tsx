import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { X, Plus, Send, CheckCircle2, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fetchSettings, type SiteSettings } from "@/lib/storefront";
import { ImageUpload } from "@/components/admin/image-upload";
import { Input, Textarea, Toggle } from "@/routes/admin.flavors";

export const Route = createFileRoute("/admin/settings")({
  component: SettingsAdmin,
});

// ── Shared UI primitives ───────────────────────────────────────────────────────

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-6">
      <div className="mb-5 border-b border-border/60 pb-4">
        <h2 className="font-display text-lg">{title}</h2>
        {description && (
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function BilingualRow({
  label, enValue, arValue, onEnChange, onArChange, textarea,
}: {
  label: string; enValue: string; arValue: string;
  onEnChange: (v: string) => void; onArChange: (v: string) => void; textarea?: boolean;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div>
        <span className="mb-1 block text-xs font-medium text-muted-foreground">{label} (EN)</span>
        {textarea ? <Textarea label="" value={enValue} onChange={onEnChange} /> : <Input label="" value={enValue} onChange={onEnChange} />}
      </div>
      <div dir="rtl">
        <span className="mb-1 block text-xs font-medium text-muted-foreground">{label} (AR)</span>
        {textarea ? <Textarea label="" value={arValue} onChange={onArChange} /> : <Input label="" value={arValue} onChange={onArChange} />}
      </div>
    </div>
  );
}

// ── Hero images gallery ────────────────────────────────────────────────────────

function HeroImagesGallery({ images, onChange }: { images: string[]; onChange: (images: string[]) => void }) {
  const [uploadKey, setUploadKey] = useState(0);

  function remove(idx: number) { onChange(images.filter((_, i) => i !== idx)); }
  function add(url: string | null | undefined) {
    if (!url) return;
    onChange([...images, url]);
    setUploadKey((k) => k + 1);
  }

  return (
    <div className="space-y-3">
      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {images.map((url, i) => (
            <div key={url + i} className="group relative">
              <img src={url} alt={`Hero slide ${i + 1}`} className="aspect-[4/5] w-full rounded-xl object-cover" />
              <span className="absolute left-1.5 top-1.5 rounded-full bg-black/60 px-1.5 py-0.5 text-[10px] font-bold text-white">{i + 1}</span>
              <button type="button" onClick={() => remove(i)}
                className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full bg-destructive text-white opacity-0 transition-opacity group-hover:opacity-100">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="rounded-xl border border-dashed border-border/60 p-3">
        <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Plus className="h-3.5 w-3.5" /> Add image to carousel
        </p>
        <ImageUpload key={uploadKey} value={null} onChange={add} folder="hero" />
      </div>
      {images.length === 0 && (
        <p className="text-xs text-muted-foreground">No carousel images yet. Add at least one above.</p>
      )}
      {images.length > 0 && (
        <p className="text-xs text-muted-foreground">{images.length} image{images.length !== 1 ? "s" : ""} · auto-advances every 5 s · hover to remove</p>
      )}
    </div>
  );
}

// ── Telegram test button ───────────────────────────────────────────────────────

function TelegramTestButton({ token, chatId }: { token: string; chatId: string }) {
  const [status, setStatus] = useState<"idle" | "sending" | "ok" | "error">("idle");
  const [errMsg, setErrMsg] = useState("");

  async function sendTest() {
    if (!token || !chatId) {
      toast.error("Fill in both Bot Token and Chat ID first");
      return;
    }
    setStatus("sending");
    setErrMsg("");
    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: "✅ Leen Bakery — Telegram notifications are working!",
        }),
      });
      const json = await res.json() as { ok: boolean; description?: string };
      if (json.ok) {
        setStatus("ok");
        toast.success("Test message sent! Check your Telegram.");
        setTimeout(() => setStatus("idle"), 4000);
      } else {
        setStatus("error");
        setErrMsg(json.description ?? "Unknown error");
      }
    } catch (e) {
      setStatus("error");
      setErrMsg(e instanceof Error ? e.message : "Network error");
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={sendTest}
        disabled={status === "sending"}
        className="inline-flex items-center gap-2 rounded-full bg-[#229ED9] px-4 py-2 text-sm font-semibold text-white transition-opacity disabled:opacity-60 hover:opacity-90"
      >
        <Send className="h-3.5 w-3.5" />
        {status === "sending" ? "Sending…" : "Send test message"}
      </button>
      {status === "ok" && (
        <span className="flex items-center gap-1 text-xs font-semibold text-green-600">
          <CheckCircle2 className="h-4 w-4" /> Message delivered!
        </span>
      )}
      {status === "error" && (
        <span className="flex items-center gap-1 text-xs font-semibold text-red-600">
          <XCircle className="h-4 w-4" /> {errMsg}
        </span>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

function SettingsAdmin() {
  const qc = useQueryClient();
  const { data: loaded, isLoading } = useQuery({ queryKey: ["public-settings"], queryFn: fetchSettings });

  const [form, setForm] = useState<SiteSettings | null>(null);
  const [saving, setSaving] = useState(false);

  // Telegram config is stored in the same table but kept out of the public SiteSettings type
  const [tgToken,  setTgToken]  = useState("");
  const [tgChatId, setTgChatId] = useState("");

  // Meta CAPI fields — sensitive, stored outside the public SiteSettings type
  const [capiToken,     setCapiToken]     = useState("");
  const [testEventCode, setTestEventCode] = useState("");

  useEffect(() => {
    if (loaded && !form) setForm({ ...loaded });
  }, [loaded, form]);

  // Load telegram + CAPI fields directly (they're not in the public SiteSettings type)
  useEffect(() => {
    supabase
      .from("site_settings")
      .select("telegram_bot_token, telegram_chat_id, meta_capi_token, meta_test_event_code")
      .eq("id", 1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          const r = data as Record<string, unknown>;
          setTgToken(r.telegram_bot_token as string ?? "");
          setTgChatId(r.telegram_chat_id  as string ?? "");
          setCapiToken(r.meta_capi_token  as string ?? "");
          setTestEventCode(r.meta_test_event_code as string ?? "");
        }
      });
  }, []);

  function set<K extends keyof SiteSettings>(key: K, value: SiteSettings[K]) {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  async function save() {
    if (!form) return;
    setSaving(true);
    const { error } = await supabase
      .from("site_settings")
      .upsert(
        {
          id: 1,
          store_name: form.store_name,
          store_tagline_en: form.store_tagline_en,
          store_tagline_ar: form.store_tagline_ar,
          logo_url: form.logo_url || null,
          hero_image_url: form.hero_image_url || null,
          hero_images: form.hero_images,
          hero_eyebrow_en: form.hero_eyebrow_en,
          hero_eyebrow_ar: form.hero_eyebrow_ar,
          hero_title_en: form.hero_title_en,
          hero_title_ar: form.hero_title_ar,
          hero_subtitle_en: form.hero_subtitle_en,
          hero_subtitle_ar: form.hero_subtitle_ar,
          whatsapp_number: form.whatsapp_number,
          delivery_fee: form.delivery_fee,
          free_shipping_threshold: form.free_shipping_threshold,
          contact_email: form.contact_email,
          contact_phone: form.contact_phone,
          contact_address: form.contact_address,
          meta_pixel_id: form.meta_pixel_id || null,
          meta_capi_token: capiToken.trim() || null,
          meta_test_event_code: testEventCode.trim() || null,
          story_heading_en: form.story_heading_en,
          story_heading_ar: form.story_heading_ar,
          story_body_en: form.story_body_en,
          story_body_ar: form.story_body_ar,
          story_pillar1_en: form.story_pillar1_en,
          story_pillar1_ar: form.story_pillar1_ar,
          story_pillar2_en: form.story_pillar2_en,
          story_pillar2_ar: form.story_pillar2_ar,
          story_pillar3_en: form.story_pillar3_en,
          story_pillar3_ar: form.story_pillar3_ar,
          delivery_bar_text_en: form.delivery_bar_text_en,
          delivery_bar_text_ar: form.delivery_bar_text_ar,
          announcement_enabled: form.announcement_enabled,
          announcement_text_en: form.announcement_text_en,
          announcement_text_ar: form.announcement_text_ar,
          page_boxes_enabled:    form.page_boxes_enabled,
          page_buildbox_enabled: form.page_buildbox_enabled,
          page_flavors_enabled:  form.page_flavors_enabled,
          page_products_enabled: form.page_products_enabled,
          page_contact_enabled:  form.page_contact_enabled,
          // Telegram
          telegram_bot_token: tgToken.trim() || null,
          telegram_chat_id:   tgChatId.trim() || null,
        },
        { onConflict: "id" }
      );

    setSaving(false);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["public-settings"] });
    toast.success("Settings saved");
  }

  if (isLoading || !form) {
    return <div className="py-20 text-center text-sm text-muted-foreground">Loading settings…</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl">Settings</h1>
        <button onClick={save} disabled={saving}
          className="rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60">
          {saving ? "Saving…" : "Save all"}
        </button>
      </div>

      {/* ── Branding ─────────────────────────────────────────────────── */}
      <Section title="Branding" description="Store name, tagline, and logo.">
        <ImageUpload value={form.logo_url} onChange={(url) => set("logo_url", url ?? "")} folder="branding" />
        <p className="text-xs text-muted-foreground">PNG or SVG with transparent background recommended.</p>
        <Input label="Store name" value={form.store_name} onChange={(v) => set("store_name", v)} required />
        <BilingualRow label="Tagline" enValue={form.store_tagline_en} arValue={form.store_tagline_ar}
          onEnChange={(v) => set("store_tagline_en", v)} onArChange={(v) => set("store_tagline_ar", v)} />
      </Section>

      {/* ── Hero Section ─────────────────────────────────────────────── */}
      <Section title="Hero Section" description="Headline, subtitle, and fallback image shown on the homepage when no carousel images are set.">
        <ImageUpload value={form.hero_image_url} onChange={(url) => set("hero_image_url", url ?? "")} folder="hero" />
        <p className="text-xs text-muted-foreground">This is the <strong>fallback</strong> image. To show a rotating carousel instead, add images in the Hero Carousel section below.</p>
        <BilingualRow label="Eyebrow (small text above headline)" enValue={form.hero_eyebrow_en} arValue={form.hero_eyebrow_ar}
          onEnChange={(v) => set("hero_eyebrow_en", v)} onArChange={(v) => set("hero_eyebrow_ar", v)} />
        <BilingualRow label="Headline" enValue={form.hero_title_en} arValue={form.hero_title_ar}
          onEnChange={(v) => set("hero_title_en", v)} onArChange={(v) => set("hero_title_ar", v)} />
        <BilingualRow label="Subtitle" enValue={form.hero_subtitle_en} arValue={form.hero_subtitle_ar}
          onEnChange={(v) => set("hero_subtitle_en", v)} onArChange={(v) => set("hero_subtitle_ar", v)} textarea />
      </Section>

      {/* ── Hero Carousel ────────────────────────────────────────────── */}
      <Section title="Hero Carousel" description="Upload multiple images to rotate automatically in the hero section (every 5 s).">
        <HeroImagesGallery images={form.hero_images} onChange={(imgs) => set("hero_images", imgs)} />
      </Section>

      {/* ── Delivery Bar ─────────────────────────────────────────────── */}
      <Section title="Delivery Bar" description="The fixed baby-pink bar at the very top of every page.">
        <div className="rounded-lg px-4 py-2 text-xs font-semibold"
          style={{ background: "#FCE4EC", color: "#AD1457", border: "1px solid #F8BBD9" }}>
          🩷 Baby-pink bar — always visible
        </div>
        <BilingualRow label="Delivery bar text" enValue={form.delivery_bar_text_en} arValue={form.delivery_bar_text_ar}
          onEnChange={(v) => set("delivery_bar_text_en", v)} onArChange={(v) => set("delivery_bar_text_ar", v)} />
      </Section>

      {/* ── Announcement Bar ─────────────────────────────────────────── */}
      <Section title="Announcement Bar" description="A scrolling baby-blue ticker shown beneath the delivery bar.">
        <div className="rounded-lg px-4 py-2 text-xs font-semibold"
          style={{ background: "#E3F2FD", color: "#0D47A1", border: "1px solid #BBDEFB" }}>
          🟦 Baby-blue scrolling bar — visible on all pages when enabled
        </div>
        <Toggle label="Enable announcement bar" checked={form.announcement_enabled} onChange={(v) => set("announcement_enabled", v)} />
        {form.announcement_enabled && (
          <>
            <div className="overflow-hidden rounded-lg px-4 py-1.5 text-xs font-medium italic"
              style={{ background: "#E3F2FD", color: "#0D47A1", border: "1px solid #BBDEFB" }}>
              Preview: {form.announcement_text_en || "…"}
            </div>
            <BilingualRow label="Announcement text" enValue={form.announcement_text_en} arValue={form.announcement_text_ar}
              onEnChange={(v) => set("announcement_text_en", v)} onArChange={(v) => set("announcement_text_ar", v)} textarea />
          </>
        )}
      </Section>

      {/* ── Our Story ────────────────────────────────────────────────── */}
      <Section title="Our Story" description="Displayed in the Our Story section on the homepage.">
        <BilingualRow label="Heading" enValue={form.story_heading_en} arValue={form.story_heading_ar}
          onEnChange={(v) => set("story_heading_en", v)} onArChange={(v) => set("story_heading_ar", v)} />
        <BilingualRow label="Body text" enValue={form.story_body_en} arValue={form.story_body_ar}
          onEnChange={(v) => set("story_body_en", v)} onArChange={(v) => set("story_body_ar", v)} textarea />
        <p className="text-xs font-semibold text-foreground/70">Pillars (short highlight phrases)</p>
        <BilingualRow label="Pillar 1" enValue={form.story_pillar1_en} arValue={form.story_pillar1_ar}
          onEnChange={(v) => set("story_pillar1_en", v)} onArChange={(v) => set("story_pillar1_ar", v)} />
        <BilingualRow label="Pillar 2" enValue={form.story_pillar2_en} arValue={form.story_pillar2_ar}
          onEnChange={(v) => set("story_pillar2_en", v)} onArChange={(v) => set("story_pillar2_ar", v)} />
        <BilingualRow label="Pillar 3" enValue={form.story_pillar3_en} arValue={form.story_pillar3_ar}
          onEnChange={(v) => set("story_pillar3_en", v)} onArChange={(v) => set("story_pillar3_ar", v)} />
      </Section>

      {/* ── Contact & Delivery ───────────────────────────────────────── */}
      <Section title="Contact & Delivery">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input label="Contact phone" value={form.contact_phone} onChange={(v) => set("contact_phone", v)} />
          <Input label="WhatsApp number (E.164)" value={form.whatsapp_number} onChange={(v) => set("whatsapp_number", v)} placeholder="+201234567890" />
        </div>
        <Input label="Contact email" value={form.contact_email} onChange={(v) => set("contact_email", v)} type="email" />
        <Input label="Address" value={form.contact_address} onChange={(v) => set("contact_address", v)} />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input label="Delivery fee (EGP)" value={String(form.delivery_fee)} onChange={(v) => set("delivery_fee", Number(v) || 0)} type="number" />
          <Input label="Free delivery threshold (EGP)" value={String(form.free_shipping_threshold)} onChange={(v) => set("free_shipping_threshold", Number(v) || 0)} type="number" />
        </div>
      </Section>

      {/* ── Page Visibility ──────────────────────────────────────────── */}
      <Section
        title="Page Visibility"
        description="Toggle which pages appear in the storefront navigation. Disabling a page hides it from the menu — the URL still works if someone has a direct link."
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex items-center justify-between rounded-xl border border-border bg-background px-4 py-3">
            <div>
              <p className="text-sm font-medium">Boxes page</p>
              <p className="text-xs text-muted-foreground">/boxes</p>
            </div>
            <Toggle label="" checked={form.page_boxes_enabled} onChange={(v) => set("page_boxes_enabled", v)} />
          </div>
          <div className="flex items-center justify-between rounded-xl border border-border bg-background px-4 py-3">
            <div>
              <p className="text-sm font-medium">Build a Box page</p>
              <p className="text-xs text-muted-foreground">/buildbox</p>
            </div>
            <Toggle label="" checked={form.page_buildbox_enabled} onChange={(v) => set("page_buildbox_enabled", v)} />
          </div>
          <div className="flex items-center justify-between rounded-xl border border-border bg-background px-4 py-3">
            <div>
              <p className="text-sm font-medium">Flavors page</p>
              <p className="text-xs text-muted-foreground">/flavors</p>
            </div>
            <Toggle label="" checked={form.page_flavors_enabled} onChange={(v) => set("page_flavors_enabled", v)} />
          </div>
          <div className="flex items-center justify-between rounded-xl border border-border bg-background px-4 py-3">
            <div>
              <p className="text-sm font-medium">Products page</p>
              <p className="text-xs text-muted-foreground">/products</p>
            </div>
            <Toggle label="" checked={form.page_products_enabled} onChange={(v) => set("page_products_enabled", v)} />
          </div>
          <div className="flex items-center justify-between rounded-xl border border-border bg-background px-4 py-3">
            <div>
              <p className="text-sm font-medium">Contact section</p>
              <p className="text-xs text-muted-foreground">/#contact</p>
            </div>
            <Toggle label="" checked={form.page_contact_enabled} onChange={(v) => set("page_contact_enabled", v)} />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Changes take effect immediately after saving — no rebuild required.
        </p>
      </Section>

      {/* ── Telegram Notifications ───────────────────────────────────── */}
      <Section
        title="Telegram Notifications"
        description="Receive a message on Telegram whenever a new order is placed. Paste your bot token and chat ID below, then click Save all."
      >
        <div className="rounded-lg border border-[#229ED9]/30 bg-[#229ED9]/5 px-4 py-3 text-xs text-[#0c6da5]">
          <strong>How to get your Chat ID:</strong>
          <ol className="mt-1.5 list-decimal space-y-1 ps-4">
            <li>Open Telegram and send any message to <strong>@OrderLeenBakery_bot</strong></li>
            <li>Open in browser: <code className="rounded bg-white/60 px-1">https://api.telegram.org/bot{"<TOKEN>"}/getUpdates</code></li>
            <li>Copy the number from <code className="rounded bg-white/60 px-1">result[0].message.chat.id</code></li>
          </ol>
        </div>

        <label className="block">
          <span className="mb-1 block text-xs font-medium">Bot Token</span>
          <input
            type="password"
            value={tgToken}
            onChange={(e) => setTgToken(e.target.value)}
            placeholder="8928557067:AAG…"
            className="w-full rounded-xl border border-border bg-card px-4 py-2.5 font-mono text-sm outline-none ring-ring/20 focus:ring-2"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium">Chat ID</span>
          <input
            type="text"
            value={tgChatId}
            onChange={(e) => setTgChatId(e.target.value)}
            placeholder="e.g. 123456789"
            className="w-full rounded-xl border border-border bg-card px-4 py-2.5 font-mono text-sm outline-none ring-ring/20 focus:ring-2"
          />
        </label>

        <TelegramTestButton token={tgToken} chatId={tgChatId} />
        <p className="text-xs text-muted-foreground">
          Click <strong>Send test message</strong> to verify the connection before saving. You'll see a confirmation directly in Telegram.
        </p>
      </Section>

      {/* ── Advanced ─────────────────────────────────────────────────── */}
      <Section title="Advanced" description="Optional integrations.">
        <Input label="Meta Pixel ID" value={form.meta_pixel_id ?? ""} onChange={(v) => set("meta_pixel_id", v || null)}
          placeholder="Leave blank to disable" />
        <label className="block space-y-1">
          <span className="text-sm font-medium">Meta CAPI Token</span>
          <p className="text-xs text-muted-foreground">Conversions API access token — enables server-side Purchase event (recommended for higher match quality).</p>
          <input
            type="password"
            value={capiToken}
            onChange={(e) => setCapiToken(e.target.value)}
            placeholder="Leave blank to disable CAPI"
            className="w-full rounded-xl border border-border bg-card px-4 py-2.5 font-mono text-sm outline-none ring-ring/20 focus:ring-2"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-medium">Meta Test Event Code</span>
          <p className="text-xs text-muted-foreground">Optional — paste the code from Meta Events Manager → Test Events to verify CAPI is working. Remove after testing.</p>
          <input
            type="text"
            value={testEventCode}
            onChange={(e) => setTestEventCode(e.target.value)}
            placeholder="e.g. TEST12345"
            className="w-full rounded-xl border border-border bg-card px-4 py-2.5 font-mono text-sm outline-none ring-ring/20 focus:ring-2"
          />
        </label>
      </Section>

      <div className="flex justify-end pb-8">
        <button onClick={save} disabled={saving}
          className="rounded-full bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60">
          {saving ? "Saving…" : "Save all settings"}
        </button>
      </div>
    </div>
  );
}
