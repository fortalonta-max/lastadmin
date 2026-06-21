/**
 * Server functions for firing Meta Conversions API events from the browser.
 * Used for ViewContent, AddToCart, and InitiateCheckout — events that
 * originate client-side but must also be sent server-side for CAPI coverage.
 *
 * Purchase is handled separately inside placeOrder (orders.functions.ts)
 * because it already runs as a server function with full customer data.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { fireCapiEvent } from "@/lib/capi.server";

const TrackEventInput = z.object({
  event_name:   z.enum(["ViewContent", "AddToCart", "InitiateCheckout"]),
  event_id:     z.string().min(1).max(100),
  // custom_data
  value:        z.number().optional(),
  currency:     z.string().max(10).optional(),
  content_ids:  z.array(z.string().max(200)).max(10).optional(),
  content_name: z.string().max(300).optional(),
  content_type: z.string().max(50).optional(),
  num_items:    z.number().int().min(0).optional(),
  // user_data — browser cookies forwarded from the client
  fbp:          z.string().max(200).optional(),
  fbc:          z.string().max(200).optional(),
  user_agent:   z.string().max(500).optional(),
  // Advanced Matching — identity fields collected from form state
  phone:        z.string().max(30).optional(),
  email:        z.string().email().max(254).optional(),
  first_name:   z.string().max(100).optional(),
  last_name:    z.string().max(100).optional(),
  // Advanced Matching — address fields
  city:         z.string().max(100).optional(),
  state:        z.string().max(100).optional(),
  country:      z.string().max(2).optional(),   // 2-letter ISO 3166-1 alpha-2, e.g. "eg"
});

export type TrackEventInput = z.infer<typeof TrackEventInput>;

export const trackCapiEvent = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => TrackEventInput.parse(d))
  .handler(async ({ data }) => {
    try {
      await fireCapiEvent({
        eventName: data.event_name,
        eventId:   data.event_id,
        userData: {
          email:     data.email,
          phone:     data.phone,
          firstName: data.first_name,
          lastName:  data.last_name,
          city:      data.city,
          state:     data.state,
          country:   data.country,
          fbp:       data.fbp,
          fbc:       data.fbc,
          userAgent: data.user_agent,
        },
        customData: {
          value:       data.value,
          currency:    data.currency,
          contentIds:  data.content_ids,
          contentName: data.content_name,
          contentType: data.content_type,
          numItems:    data.num_items,
        },
      });
    } catch (e) {
      // Never throw from here — CAPI errors must not break the user's flow.
      console.error("[CAPI] trackCapiEvent caught:", e);
    }
    return { ok: true };
  });
