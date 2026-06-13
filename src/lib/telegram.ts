/**
 * telegram.ts — server-only helper for Telegram Bot API notifications.
 *
 * Required env vars (add to .env and your hosting dashboard):
 *   TELEGRAM_BOT_TOKEN  — bot token from @BotFather
 *   TELEGRAM_CHAT_ID    — numeric ID of the chat / group to receive alerts
 *
 * How to find your TELEGRAM_CHAT_ID:
 *   1. Send any message to @OrderLeenBakery_bot from your Telegram account
 *   2. Open in browser:
 *      https://api.telegram.org/bot<TOKEN>/getUpdates
 *   3. Copy the number at result[0].message.chat.id
 */

/** Send a plain-text message. No parse_mode = no special-character issues. */
export async function sendTelegramMessage(text: string): Promise<void> {
  const token  = process.env.TELEGRAM_BOT_TOKEN ?? "";
  const chatId = process.env.TELEGRAM_CHAT_ID   ?? "";

  if (!token || !chatId) {
    console.warn("[Telegram] TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set — skipping notification");
    return;
  }

  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error(`[Telegram] sendMessage failed (${res.status}):`, body);
    } else {
      console.log("[Telegram] Notification sent OK");
    }
  } catch (err) {
    console.error("[Telegram] Network error:", err);
  }
}

/** Build and send an order-notification message. */
export async function notifyNewOrder(order: {
  order_number: number;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  notes?: string | null;
  items: Array<{
    box_name: string;
    cookie_count: number;
    quantity: number;
    selected_flavors: Array<{ flavor_name: string; quantity: number }>;
  }>;
  subtotal: number;
  discount: number;
  delivery_fee: number;
  total: number;
  coupon_code?: string | null;
}): Promise<void> {
  const fmt = (n: number) => `${n.toLocaleString("en-EG")} EGP`;

  const itemLines = order.items
    .map((item) => {
      const flavors =
        item.selected_flavors.length > 0
          ? item.selected_flavors.map((f) => `    - ${f.flavor_name} x${f.quantity}`).join("\n")
          : "";
      const line = `  [${item.box_name} | ${item.cookie_count} cookies] x${item.quantity}`;
      return flavors ? `${line}\n${flavors}` : line;
    })
    .join("\n");

  const couponLine =
    order.discount > 0
      ? `Coupon (${order.coupon_code ?? ""}): -${fmt(order.discount)}\n`
      : "";

  const text = [
    `==============================`,
    `  NEW ORDER #${order.order_number}`,
    `==============================`,
    `Name:    ${order.customer_name}`,
    `Phone:   ${order.customer_phone}`,
    `Address: ${order.customer_address}`,
    order.notes ? `Notes:   ${order.notes}` : null,
    ``,
    `ITEMS:`,
    itemLines,
    ``,
    `Subtotal:  ${fmt(order.subtotal)}`,
    couponLine.trim() ? couponLine.trim() : null,
    `Delivery:  ${fmt(order.delivery_fee)}`,
    `TOTAL:     ${fmt(order.total)}`,
    ``,
    `Time: ${new Date().toLocaleString("en-EG", { timeZone: "Africa/Cairo" })}`,
    `==============================`,
  ]
    .filter((l) => l !== null)
    .join("\n");

  await sendTelegramMessage(text);
}
