/**
 * Shared Meta Conversions API (CAPI) utility — server-only.
 * The .server.ts suffix prevents Vite from bundling this into the client.
 * Import only from .server.ts files or createServerFn handlers.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const GRAPH_API_VERSION = "v20.0";

async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(s.trim().toLowerCase()),
  );
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export interface CapiUserData {
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  fbp?: string;
  fbc?: string;
  userAgent?: string;
}

export interface CapiCustomData {
  value?: number;
  currency?: string;
  contentIds?: string[];
  contentName?: string;
  contentType?: string;
  numItems?: number;
}

export interface CapiEvent {
  eventName: string;
  eventId: string;
  userData?: CapiUserData;
  customData?: CapiCustomData;
}

export interface PixelSettings {
  meta_pixel_id: string | null;
  meta_capi_token: string | null;
  meta_test_event_code: string | null;
}

export async function getPixelSettings(): Promise<PixelSettings | null> {
  const { data } = await supabaseAdmin
    .from("site_settings")
    .select("meta_pixel_id, meta_capi_token, meta_test_event_code")
    .eq("id", 1)
    .single();
  return data;
}

/**
 * Fire a single event to Meta Conversions API (GRAPH_API_VERSION).
 *
 * - Logs the full request payload and response body to the server console.
 * - Forwards test_event_code when set so events appear in Meta Test Events.
 * - Throws on network / API failure so callers can catch and log upstream.
 */
export async function fireCapiEvent(event: CapiEvent): Promise<void> {
  const settings = await getPixelSettings();

  if (!settings?.meta_pixel_id || !settings?.meta_capi_token) {
    console.log(`[CAPI] Skipped ${event.eventName} — meta_pixel_id or meta_capi_token not set in site_settings`);
    return;
  }

  // ── Build user_data ───────────────────────────────────────────────────────
  const user_data: Record<string, unknown> = {};
  if (event.userData?.email)
    user_data.em = [await sha256Hex(event.userData.email)];
  if (event.userData?.phone)
    user_data.ph = [await sha256Hex(event.userData.phone.replace(/\D/g, ""))];
  if (event.userData?.firstName)
    user_data.fn = [await sha256Hex(event.userData.firstName)];
  if (event.userData?.lastName)
    user_data.ln = [await sha256Hex(event.userData.lastName)];
  if (event.userData?.fbp)       user_data.fbp = event.userData.fbp;
  if (event.userData?.fbc)       user_data.fbc = event.userData.fbc;
  if (event.userData?.userAgent) user_data.client_user_agent = event.userData.userAgent;

  // ── Build custom_data ─────────────────────────────────────────────────────
  const custom_data: Record<string, unknown> = {};
  // currency must be a 3-character ISO 4217 string (e.g. "EGP"), normalised to uppercase.
  if (event.customData?.currency !== undefined)
    custom_data.currency = event.customData.currency.trim().toUpperCase().slice(0, 3);
  // value must be a float — use toFixed(2) then re-parse to guarantee a numeric float.
  if (event.customData?.value !== undefined)
    custom_data.value = parseFloat(event.customData.value.toFixed(2));
  if (event.customData?.contentIds)
    custom_data.content_ids  = event.customData.contentIds;
  if (event.customData?.contentName)
    custom_data.content_name = event.customData.contentName;
  if (event.customData?.contentType)
    custom_data.content_type = event.customData.contentType;
  if (event.customData?.numItems  !== undefined)
    custom_data.num_items   = event.customData.numItems;

  // ── Assemble CAPI payload ─────────────────────────────────────────────────
  const body: Record<string, unknown> = {
    data: [{
      event_name:    event.eventName,
      event_time:    Math.floor(Date.now() / 1000),
      action_source: "website",
      event_id:      event.eventId,
      user_data,
      custom_data,
    }],
  };

  // Always forward test_event_code when configured — this is what makes
  // events appear in Meta Events Manager → Test Events panel.
  if (settings.meta_test_event_code) {
    body.test_event_code = settings.meta_test_event_code;
  }

  const pixelId = settings.meta_pixel_id;
  const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${pixelId}/events?access_token=${encodeURIComponent(settings.meta_capi_token)}`;

  // Log request — redact token from URL
  console.log(
    `[CAPI] → ${event.eventName} | event_id=${event.eventId} | pixel=${pixelId} | ` +
    `api=${GRAPH_API_VERSION} | test_code=${settings.meta_test_event_code ?? "none"}`,
  );
  console.log(`[CAPI] Request payload: ${JSON.stringify(body)}`);

  const res = await fetch(url, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(body),
  });

  const responseText = await res.text();

  if (!res.ok) {
    console.error(`[CAPI] ✗ ${event.eventName} HTTP ${res.status}: ${responseText}`);
    throw new Error(`CAPI ${event.eventName} failed [${res.status}]: ${responseText}`);
  }

  console.log(`[CAPI] ✓ ${event.eventName} HTTP ${res.status}: ${responseText}`);
}
