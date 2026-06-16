import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { notifyNewOrder } from "@/lib/telegram";

const FlavorLine = z.object({
  flavor_id: z.string().uuid(),
  flavor_name: z.string().min(1).max(120),
  quantity: z.number().int().min(1).max(50),
});

const OrderItem = z.object({
  box_id: z.string().uuid(),
  box_name: z.string().min(1).max(200),
  cookie_count: z.number().int().min(1).max(100),
  quantity: z.number().int().min(1).max(50),
  selected_flavors: z.array(FlavorLine).max(50),
});

const PlaceOrderInput = z.object({
  customer: z.object({
    name: z.string().trim().min(1).max(200),
    phone: z.string().trim().min(4).max(30),
    address: z.string().trim().min(3).max(1000),
    notes: z.string().trim().max(1000).optional(),
  }),
  items: z.array(OrderItem).min(1).max(50),
  coupon_code: z.string().trim().max(50).optional(),
  delivery_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  delivery_time_slot: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  meta: z
    .object({
      event_id: z.string().max(100).optional(),
      fbp: z.string().max(200).optional(),
      fbc: z.string().max(200).optional(),
      user_agent: z.string().max(500).optional(),
    })
    .optional(),
  utm: z
    .object({
      utm_source:   z.string().max(200).optional(),
      utm_medium:   z.string().max(200).optional(),
      utm_campaign: z.string().max(200).optional(),
      utm_content:  z.string().max(200).optional(),
      utm_term:     z.string().max(200).optional(),
    })
    .optional(),
});

export const placeOrder = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => PlaceOrderInput.parse(d))
  .handler(async ({ data }) => {
    const { data: settings } = await supabaseAdmin
      .from("site_settings")
      .select("*")
      .eq("id", 1)
      .single();

    const deliveryFee = Number(settings?.delivery_fee ?? 0);

    const boxIds = [...new Set(data.items.map((i) => i.box_id))];
    const { data: boxes, error: boxErr } = await supabaseAdmin
      .from("boxes")
      .select("id, price, discount, cookie_count, name_en, type, is_active")
      .in("id", boxIds);
    if (boxErr) throw new Error(boxErr.message);

    const boxMap = new Map(boxes?.map((b) => [b.id, b]) ?? []);

    // Collect all flavor IDs referenced by any order item (both BYO and fixed)
    const allFlavorIds = new Set<string>();
    for (const item of data.items) {
      item.selected_flavors.forEach((f) => allFlavorIds.add(f.flavor_id));
    }

    // Fetch all referenced flavors' default prices in one query
    const flavorPriceMap = new Map<string, number>();
    if (allFlavorIds.size > 0) {
      const { data: flavorRows, error: flavorErr } = await supabaseAdmin
        .from("flavors")
        .select("id, price")
        .in("id", [...allFlavorIds]);
      if (flavorErr) throw new Error(flavorErr.message);
      (flavorRows ?? []).forEach((f) => flavorPriceMap.set(f.id, Number(f.price ?? 0)));
    }

    let subtotal = 0;
    const computedUnitPrices: number[] = [];
    for (const item of data.items) {
      const b = boxMap.get(item.box_id);
      if (!b || !b.is_active) throw new Error(`Box unavailable: ${item.box_name}`);
      const totalSelected = item.selected_flavors.reduce((s, f) => s + f.quantity, 0);
      if (b.type === "byo" && totalSelected !== b.cookie_count) {
        throw new Error(`Please select exactly ${b.cookie_count} cookies for ${b.name_en}.`);
      }

      // New pricing: sum of selected flavors' default prices minus the box fixed discount.
      // Works for both BYO (customer-selected flavors) and fixed boxes (preset flavors).
      const flavorTotal = item.selected_flavors.reduce(
        (sum, f) => sum + (flavorPriceMap.get(f.flavor_id) ?? 0) * f.quantity,
        0,
      );
      const boxDiscount = Number((b as any).discount ?? 0);
      // If no flavor prices are configured yet, fall back to box.price for backward compat.
      const unitPrice =
        flavorTotal > 0
          ? Math.max(0, flavorTotal - boxDiscount)
          : Number(b.price);

      computedUnitPrices.push(unitPrice);
      subtotal += unitPrice * item.quantity;
    }

    let discount = 0;
    let appliedCode: string | null = null;
    let appliedCouponId: string | null = null;
    if (data.coupon_code) {
      const { data: coupon } = await supabaseAdmin
        .from("coupons")
        .select("*")
        .eq("code", data.coupon_code.toUpperCase())
        .eq("active", true)
        .maybeSingle();
      if (coupon) {
        const notExpired = !coupon.expires_at || new Date(coupon.expires_at) > new Date();
        const hasUsesLeft = coupon.usage_limit === null || coupon.usage_limit > 0;
        if (notExpired && hasUsesLeft && subtotal >= Number(coupon.min_subtotal ?? 0)) {
          discount =
            coupon.type === "percent"
              ? Math.round(subtotal * (Number(coupon.value) / 100) * 100) / 100
              : Math.min(subtotal, Number(coupon.value));
          appliedCode = coupon.code;
          appliedCouponId = coupon.id;
        }
      }
    }

    const total = Math.max(0, subtotal - discount + deliveryFee);
    const eventId = data.meta?.event_id ?? crypto.randomUUID();

    // delivery_time_slot is a plain TEXT column — store the "HH:MM" string as-is.
    // Never write to `delivery_time` (timestamp without time zone).
    const insertPayload = {
      customer_name: data.customer.name,
      customer_phone: data.customer.phone,
      customer_address: data.customer.address,
      notes: data.customer.notes ?? null,
      subtotal,
      delivery_fee: deliveryFee,
      discount,
      total,
      coupon_code: appliedCode,
      meta_event_id: eventId,
      delivery_date: data.delivery_date ?? null,
      delivery_time_slot: data.delivery_time_slot ?? null,
    };

    console.log("FINAL PAYLOAD SENT TO SUPABASE:", JSON.stringify(insertPayload));

    const { data: order, error: orderErr } = await supabaseAdmin
      .from("orders")
      .insert(insertPayload)
      .select("*")
      .single();
    if (orderErr || !order) throw new Error(orderErr?.message ?? "Failed to create order");

    // Save UTM params — best-effort: silently skipped if migration hasn't been run yet
    if (data.utm && Object.values(data.utm).some(Boolean)) {
      try {
        await supabaseAdmin
          .from("orders")
          .update({
            utm_source:   data.utm.utm_source   ?? null,
            utm_medium:   data.utm.utm_medium   ?? null,
            utm_campaign: data.utm.utm_campaign ?? null,
            utm_content:  data.utm.utm_content  ?? null,
            utm_term:     data.utm.utm_term     ?? null,
          })
          .eq("id", order.id);
      } catch {
        // UTM columns not yet in DB — run utm_migration.sql in Supabase to enable
      }
    }

    const { error: itemsErr } = await supabaseAdmin.from("order_items").insert(
      data.items.map((i, idx) => ({
        order_id: order.id,
        box_id: i.box_id,
        box_name: i.box_name,
        cookie_count: i.cookie_count,
        unit_price: computedUnitPrices[idx],
        quantity: i.quantity,
        selected_flavors: i.selected_flavors,
      })),
    );
    if (itemsErr) throw new Error(itemsErr.message);

    if (appliedCouponId) {
      await supabaseAdmin.rpc("use_coupon", { p_coupon_id: appliedCouponId });
    }

    // Fire Telegram notification — token + chatId come from the DB settings row
    try {
      const tToken  = (settings as Record<string,unknown>)?.telegram_bot_token as string | null;
      const tChatId = (settings as Record<string,unknown>)?.telegram_chat_id   as string | null;
      if (tToken && tChatId) {
        await notifyNewOrder(tToken, tChatId, {
          order_number: order.order_number,
          customer_name: data.customer.name,
          customer_phone: data.customer.phone,
          customer_address: data.customer.address,
          notes: data.customer.notes,
          items: data.items.map((i) => ({
            box_name: i.box_name,
            cookie_count: i.cookie_count,
            quantity: i.quantity,
            selected_flavors: i.selected_flavors,
          })),
          subtotal,
          discount,
          delivery_fee: deliveryFee,
          total,
          coupon_code: appliedCode,
          delivery_date: data.delivery_date,
          delivery_time_slot: data.delivery_time_slot,
        });
      }
    } catch (e) {
      console.error("[Telegram] notify failed:", e);
    }

    // Fire Meta Conversion API (best-effort)
    try {
      if (settings?.meta_pixel_id && settings?.meta_capi_token) {
        await sendPurchaseToCapi({
          pixelId: settings.meta_pixel_id,
          token: settings.meta_capi_token,
          testCode: settings.meta_test_event_code ?? undefined,
          eventId,
          value: total,
          phone: data.customer.phone,
          name: data.customer.name,
          fbp: data.meta?.fbp,
          fbc: data.meta?.fbc,
          userAgent: data.meta?.user_agent,
        });
      }
    } catch (e) {
      console.error("CAPI Purchase failed:", e);
    }

    return {
      id: order.id,
      order_number: order.order_number,
      total: order.total,
      whatsapp_number: settings?.whatsapp_number ?? null,
    };
  });

async function sha256(s: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s.trim().toLowerCase()));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function sendPurchaseToCapi(args: {
  pixelId: string; token: string; testCode?: string; eventId: string;
  value: number; phone: string; name: string;
  fbp?: string; fbc?: string; userAgent?: string;
}) {
  const phoneNorm = args.phone.replace(/\D/g, "");
  const [firstName, ...rest] = args.name.split(" ");
  const lastName = rest.join(" ");
  const user_data: Record<string, unknown> = {
    ph: [await sha256(phoneNorm)],
    fn: [await sha256(firstName || "")],
    ln: [await sha256(lastName || "")],
  };
  if (args.fbp) user_data.fbp = args.fbp;
  if (args.fbc) user_data.fbc = args.fbc;
  if (args.userAgent) user_data.client_user_agent = args.userAgent;

  const body = {
    data: [{
      event_name: "Purchase",
      event_time: Math.floor(Date.now() / 1000),
      action_source: "website",
      event_id: args.eventId,
      user_data,
      custom_data: { currency: "EGP", value: args.value },
    }],
    ...(args.testCode ? { test_event_code: args.testCode } : {}),
  };

  const url = `https://graph.facebook.com/v19.0/${args.pixelId}/events?access_token=${encodeURIComponent(args.token)}`;
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!res.ok) console.error("CAPI error", res.status, await res.text());
}
