import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/cart";
import { updateOrderStatus } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin/orders/$id")({
  component: OrderDetail,
});

const STATUSES = ["pending", "confirmed", "preparing", "out_for_delivery", "delivered", "cancelled"] as const;

function OrderDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const updateStatus = useServerFn(updateOrderStatus);

  const { data: order } = useQuery({
    queryKey: ["admin-order", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  if (!order) return <p className="text-muted-foreground">Loading…</p>;

  return (
    <div className="space-y-6">
      <Link to="/admin/orders" className="inline-flex items-center gap-1 text-sm text-muted-foreground">
        <ArrowLeft className="h-4 w-4" /> All orders
      </Link>
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl">Order #{order.order_number}</h1>
          <p className="text-sm text-muted-foreground">
            {new Date(order.created_at).toLocaleString()}
          </p>
        </div>
        <select
          value={order.status}
          onChange={async (e) => {
            try {
              await updateStatus({ data: { order_id: id, status: e.target.value as any } });
              toast.success("Status updated");
              qc.invalidateQueries({ queryKey: ["admin-order", id] });
              qc.invalidateQueries({ queryKey: ["admin-orders"] });
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Update failed");
            }
          }}
          className="rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.replace(/_/g, " ")}
            </option>
          ))}
        </select>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <section className="rounded-2xl border border-border/60 bg-card">
          <h2 className="border-b border-border/60 px-5 py-3 font-display text-lg">Items</h2>
          <ul className="divide-y divide-border/60">
            {order.order_items?.map((it: any) => (
              <li key={it.id} className="px-5 py-4">
                <div className="flex justify-between gap-3">
                  <div>
                    <p className="font-semibold">{it.box_name} ×{it.quantity}</p>
                    <p className="text-xs text-muted-foreground">{it.cookie_count} cookies</p>
                  </div>
                  <p>{formatCurrency(Number(it.unit_price) * it.quantity)}</p>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {(it.selected_flavors as Array<{ flavor_name: string; quantity: number }>).map((f, i) => (
                    <span key={i} className="rounded-full bg-[var(--pink-soft)] px-2.5 py-1 text-[11px]">
                      {f.flavor_name} ×{f.quantity}
                    </span>
                  ))}
                </div>
              </li>
            ))}
          </ul>
          <div className="space-y-1 border-t border-border/60 px-5 py-4 text-sm">
            <Row label="Subtotal" value={formatCurrency(Number(order.subtotal))} />
            {Number(order.discount) > 0 && (
              <Row label={`Discount ${order.coupon_code ? `(${order.coupon_code})` : ""}`} value={`− ${formatCurrency(Number(order.discount))}`} />
            )}
            <Row label="Delivery" value={formatCurrency(Number(order.delivery_fee))} />
            <Row label="Total" value={formatCurrency(Number(order.total))} bold />
          </div>
        </section>
        <aside className="space-y-4">
          <Box title="Customer">
            <p className="font-semibold">{order.customer_name}</p>
            <p className="text-sm text-muted-foreground">{order.customer_phone}</p>
            <p className="mt-2 whitespace-pre-line text-sm">{order.customer_address}</p>
            {order.notes && (
              <p className="mt-3 rounded-lg bg-muted p-3 text-xs italic">{order.notes}</p>
            )}
          </Box>
        </aside>
      </div>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? "border-t border-border/60 pt-2 font-display text-base" : "text-muted-foreground"}`}>
      <span>{label}</span>
      <span className={bold ? "text-foreground" : ""}>{value}</span>
    </div>
  );
}

function Box({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5">
      <h3 className="mb-3 font-display text-lg">{title}</h3>
      {children}
    </div>
  );
}
