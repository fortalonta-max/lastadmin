/**
 * telegram.ts — server-only helper for sending Telegram Bot API messages.
 *
 * Required env vars (set these in your .env / hosting dashboard):
 *   TELEGRAM_BOT_TOKEN  — your bot token from @BotFather
 *   TELEGRAM_CHAT_ID    — the chat / group ID that receives notifications
 *                         (send any message to your bot, then call:
 *                          https://api.telegram.org/bot<TOKEN>/getUpdates
 *                          and read result[0].message.chat.id)
 */

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? "";
const CHAT_ID   = process.env.TELEGRAM_CHAT_ID   ?? "";

/** Send a plain-text or Markdown message to the configured chat. */
export async function sendTelegramMessage(text: string): Promise<void> {
  if (!BOT_TOKEN || !CHAT_ID) return; // silently skip if not configured

  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: CHAT_ID,
      text,
      parse_mode: "Markdown",
    }),
  });

  if (!res.ok) {
    console.error("Telegram notify failed:", res.status, await res.text());
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
  const fmt = (n: number) => `EGP ${n.toLocaleString("en-EG", { minimumFractionDigits: 0 })}`;

  const itemLines = order.items
    .map((item) => {
      const flavors =
        item.selected_flavors.length > 0
          ? item.selected_flavors.map((f) => `      • ${f.flavor_name} ×${f.quantity}`).join("\n")
          : "";
      const line = `  📦 *${item.box_name}* (${item.cookie_count} cookies) ×${item.quantity}`;
      return flavors ? `${line}\n${flavors}` : line;
    })
    .join("\n");

  const lines = [
    `🛒 *طلب جديد #${order.order_number}*`,
    ``,
    `👤 *${order.customer_name}*`,
    `📞 ${order.customer_phone}`,
    `📍 ${order.customer_address}`,
    order.notes ? `📝 _${order.notes}_` : null,
    ``,
    `*الطلبات:*`,
    itemLines,
    ``,
    order.discount > 0
      ? `💰 المجموع: ${fmt(order.subtotal)}\n🏷 خصم (${order.coupon_code ?? ""}): − ${fmt(order.discount)}\n🚚 توصيل: ${fmt(order.delivery_fee)}`
      : `🚚 توصيل: ${fmt(order.delivery_fee)}`,
    ``,
    `*الإجمالي: ${fmt(order.total)}* 💵`,
    ``,
    `⏰ ${new Date().toLocaleString("ar-EG", { timeZone: "Africa/Cairo" })}`,
  ]
    .filter((l) => l !== null)
    .join("\n");

  await sendTelegramMessage(lines);
}
