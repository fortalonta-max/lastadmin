/**
 * telegram.ts — server-only helper.
 * Token and chat ID come from the database (site_settings table),
 * NOT from environment variables.
 */

export async function sendTelegramMessage(
  token: string,
  chatId: string,
  text: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!token || !chatId) {
    return { ok: false, error: "token or chatId is empty" };
  }

  try {
    const res = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text }),
      },
    );

    if (!res.ok) {
      const body = await res.text();
      console.error(`[Telegram] sendMessage failed (${res.status}):`, body);
      return { ok: false, error: `HTTP ${res.status}: ${body}` };
    }

    console.log("[Telegram] Notification sent OK");
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[Telegram] Network error:", msg);
    return { ok: false, error: msg };
  }
}

export async function notifyNewOrder(
  token: string,
  chatId: string,
  order: {
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
  },
): Promise<void> {
  const fmt = (n: number) => `${n.toLocaleString("en-EG")} EGP`;

  const itemLines = order.items
    .map((item) => {
      const flavors =
        item.selected_flavors.length > 0
          ? item.selected_flavors
              .map((f) => `    - ${f.flavor_name} x${f.quantity}`)
              .join("\n")
          : "";
      const line = `  [${item.box_name} | ${item.cookie_count} cookies] x${item.quantity}`;
      return flavors ? `${line}\n${flavors}` : line;
    })
    .join("\n");

  const lines: string[] = [
    "==============================",
    `  NEW ORDER #${order.order_number}`,
    "==============================",
    `Name:    ${order.customer_name}`,
    `Phone:   ${order.customer_phone}`,
    `Address: ${order.customer_address}`,
  ];
  if (order.notes) lines.push(`Notes:   ${order.notes}`);
  lines.push("", "ITEMS:", itemLines, "");
  lines.push(`Subtotal:  ${fmt(order.subtotal)}`);
  if (order.discount > 0)
    lines.push(`Coupon (${order.coupon_code ?? ""}): -${fmt(order.discount)}`);
  lines.push(`Delivery:  ${fmt(order.delivery_fee)}`);
  lines.push(`TOTAL:     ${fmt(order.total)}`);
  lines.push(
    "",
    `Time: ${new Date().toLocaleString("en-EG", { timeZone: "Africa/Cairo" })}`,
    "==============================",
  );

  await sendTelegramMessage(token, chatId, lines.join("\n"));
}
