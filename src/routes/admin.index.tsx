import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/cart";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/admin/")({
  component: Overview,
});

function Overview() {
  const { t } = useI18n();

  const { data: stats } = useQuery({
    queryKey: ["admin-overview"],
    queryFn: async () => {
      const [pendingOrdersRes, pendingCountRes, flavorsRes, boxesRes] = await Promise.all([
        // Only fetch pending orders for the "Recent" section
        supabase
          .from("orders")
          .select("id, total, created_at")
          .eq("status", "pending")
          .order("created_at", { ascending: false })
          .limit(5),
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("flavors").select("id", { count: "exact", head: true }),
        supabase.from("boxes").select("id", { count: "exact", head: true }),
      ]);
      const totalRes = await supabase.from("orders").select("total");
      const ordersCountRes = await supabase.from("orders").select("id", { count: "exact", head: true });
      const revenue =
        totalRes.data?.reduce((s, r) => s + Number(r.total ?? 0), 0) ?? 0;
      return {
        recent: pendingOrdersRes.data ?? [],
        pending: pendingCountRes.count ?? 0,
        flavors: flavorsRes.count ?? 0,
        boxes: boxesRes.count ?? 0,
        revenue,
        ordersCount: ordersCountRes.count ?? 0,
      };
    },
  });

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-3xl">{t("admin.ov.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("admin.ov.subtitle")}</p>
      </header>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label={t("admin.ov.stat_orders")} value={String(stats?.ordersCount ?? 0)} />
        <Stat label={t("admin.ov.stat_pending")} value={String(stats?.pending ?? 0)} />
        <Stat label={t("admin.ov.stat_revenue")} value={formatCurrency(stats?.revenue ?? 0)} />
        <Stat label={t("admin.ov.stat_flavors_boxes")} value={`${stats?.flavors ?? 0} / ${stats?.boxes ?? 0}`} />
      </div>
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-xl">{t("admin.ov.recent_pending")}</h2>
          <Link to="/admin/orders" className="text-sm text-muted-foreground hover:text-foreground">
            {t("admin.ov.view_all")}
          </Link>
        </div>
        <ul className="divide-y divide-border/60 rounded-2xl border border-border/60 bg-card">
          {stats?.recent?.length ? (
            stats.recent.map((o) => (
              <li key={o.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <Link to="/admin/orders/$id" params={{ id: o.id }} className="font-mono text-xs hover:underline">
                  {o.id.slice(0, 8)}
                </Link>
                <span>{formatCurrency(Number(o.total))}</span>
                <span className="text-xs text-muted-foreground">
                  {new Date(o.created_at).toLocaleString()}
                </span>
              </li>
            ))
          ) : (
            <li className="px-4 py-6 text-center text-sm text-muted-foreground">
              {t("admin.ov.no_orders")}
            </li>
          )}
        </ul>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-2 font-display text-3xl">{value}</p>
    </div>
  );
}
