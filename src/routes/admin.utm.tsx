import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { TrendingUp, ShoppingBag, DollarSign, Filter, Copy, Check, Link } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/cart";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/admin/utm")({
  component: UtmPage,
});

type UtmOrder = {
  id: string;
  order_number: number;
  total: number;
  created_at: string;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
};

type GroupRow = {
  key: string;
  source: string;
  medium: string;
  campaign: string;
  orders: number;
  revenue: number;
};

// ── helpers ─────────────────────────────────────────────────────────────────

function badge(val: string | null, color: string) {
  if (!val) return <span className="text-muted-foreground/40">—</span>;
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${color}`}
    >
      {val}
    </span>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5">
      <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
        <Icon className="h-4 w-4" />
        {label}
      </div>
      <p className="font-display text-2xl font-semibold">{value}</p>
      {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

// ── UTM link generator ────────────────────────────────────────────────────────

function UtmLinkGenerator() {
  const { t } = useI18n();
  const [baseUrl, setBaseUrl] = useState("");
  const [source, setSource]   = useState("");
  const [medium, setMedium]   = useState("");
  const [campaign, setCampaign] = useState("");
  const [content, setContent] = useState("");
  const [copied, setCopied]   = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setBaseUrl(window.location.origin);
    }
  }, []);

  const generatedUrl = (() => {
    try {
      const url = new URL(baseUrl || window.location.origin);
      if (source)   url.searchParams.set("utm_source",   source);
      if (medium)   url.searchParams.set("utm_medium",   medium);
      if (campaign) url.searchParams.set("utm_campaign", campaign);
      if (content)  url.searchParams.set("utm_content",  content);
      return url.toString();
    } catch {
      return baseUrl;
    }
  })();

  function copyUrl() {
    navigator.clipboard.writeText(generatedUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const inputCls =
    "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40";

  return (
    <div className="rounded-2xl border border-border/60 bg-card">
      <div className="border-b border-border/60 px-6 py-4 flex items-center gap-2">
        <Link className="h-4 w-4 text-muted-foreground" />
        <div>
          <h2 className="font-display text-base">{t("admin.utm.link_title")}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{t("admin.utm.link_subtitle")}</p>
        </div>
      </div>

      <div className="grid gap-4 p-6 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            {t("admin.utm.link_baseurl")}
          </label>
          <input
            className={inputCls}
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="https://your-site.com"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            {t("admin.utm.link_source")}
          </label>
          <input
            className={inputCls}
            value={source}
            onChange={(e) => setSource(e.target.value)}
            placeholder="facebook"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            {t("admin.utm.link_medium")}
          </label>
          <input
            className={inputCls}
            value={medium}
            onChange={(e) => setMedium(e.target.value)}
            placeholder="paid_ad"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            {t("admin.utm.link_campaign")}
          </label>
          <input
            className={inputCls}
            value={campaign}
            onChange={(e) => setCampaign(e.target.value)}
            placeholder="eid_2025"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            {t("admin.utm.link_content")}
          </label>
          <input
            className={inputCls}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="banner_top"
          />
        </div>

        {/* generated link */}
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            {t("admin.utm.link_result")}
          </label>
          <div className="flex items-center gap-2">
            <button
              onClick={copyUrl}
              className="flex-1 rounded-lg border border-border bg-muted/40 px-3 py-2 text-start text-xs text-foreground truncate hover:bg-muted/70 transition-colors"
              title={t("admin.utm.link_copy")}
            >
              {generatedUrl}
            </button>
            <button
              onClick={copyUrl}
              className={`flex shrink-0 items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                copied
                  ? "bg-green-500 text-white"
                  : "bg-primary text-primary-foreground hover:bg-primary/90"
              }`}
            >
              {copied ? (
                <><Check className="h-4 w-4" />{t("admin.utm.link_copied")}</>
              ) : (
                <><Copy className="h-4 w-4" />{t("admin.utm.link_copy")}</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── main component ───────────────────────────────────────────────────────────

function UtmPage() {
  const { t } = useI18n();
  const [activeSource, setActiveSource] = useState<string | null>(null);
  const [days, setDays] = useState<number>(30);

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["utm-orders", days],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(
          "id, order_number, total, created_at, utm_source, utm_medium, utm_campaign, utm_content, utm_term"
        )
        .gte("created_at", since)
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as UtmOrder[];
    },
  });

  const tracked   = orders.filter((o) => o.utm_source);
  const untracked = orders.filter((o) => !o.utm_source);

  const groupMap = new Map<string, GroupRow>();
  for (const o of tracked) {
    const src  = o.utm_source  ?? "unknown";
    const med  = o.utm_medium  ?? "";
    const camp = o.utm_campaign ?? "";
    const key  = `${src}||${med}||${camp}`;
    const existing = groupMap.get(key);
    if (existing) {
      existing.orders  += 1;
      existing.revenue += o.total;
    } else {
      groupMap.set(key, { key, source: src, medium: med, campaign: camp, orders: 1, revenue: o.total });
    }
  }
  const groups = [...groupMap.values()].sort((a, b) => b.revenue - a.revenue);

  const sources = [...new Set(tracked.map((o) => o.utm_source!))];

  const filteredOrders = activeSource
    ? tracked.filter((o) => o.utm_source === activeSource)
    : tracked;

  const trackedRevenue = tracked.reduce((s, o) => s + o.total, 0);
  const topSource   = groups[0]?.source   ?? "—";
  const topCampaign = groups[0]?.campaign || groups[0]?.source || "—";

  const SOURCE_COLORS: Record<string, string> = {
    facebook:  "bg-blue-100 text-blue-700",
    instagram: "bg-pink-100 text-pink-700",
    whatsapp:  "bg-green-100 text-green-700",
    google:    "bg-yellow-100 text-yellow-700",
    tiktok:    "bg-purple-100 text-purple-700",
    email:     "bg-orange-100 text-orange-700",
  };
  function sourceColor(src: string) {
    return SOURCE_COLORS[src.toLowerCase()] ?? "bg-muted text-foreground";
  }

  return (
    <div className="space-y-8">
      {/* header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl">{t("admin.utm.title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("admin.utm.subtitle")}</p>
        </div>

        <div className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-sm">
          <Filter className="h-3.5 w-3.5 text-muted-foreground" />
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
                days === d
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* UTM link generator */}
      <UtmLinkGenerator />

      {/* stat cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={ShoppingBag}
          label={t("admin.utm.stat_tracked")}
          value={`${tracked.length} / ${orders.length}`}
          sub={t("admin.utm.stat_no_utm", { n: String(untracked.length) })}
        />
        <StatCard
          icon={DollarSign}
          label={t("admin.utm.stat_revenue")}
          value={formatCurrency(trackedRevenue)}
          sub={t("admin.utm.stat_of_total", { total: formatCurrency(orders.reduce((s, o) => s + o.total, 0)) })}
        />
        <StatCard
          icon={TrendingUp}
          label={t("admin.utm.stat_top")}
          value={topCampaign !== "—" ? topCampaign : topSource}
          sub={topCampaign !== "—" ? `${t("admin.utm.col_source")}: ${topSource}` : undefined}
        />
      </div>

      {/* campaign breakdown table */}
      <div className="rounded-2xl border border-border/60 bg-card">
        <div className="border-b border-border/60 px-6 py-4">
          <h2 className="font-display text-base">{t("admin.utm.table_title")}</h2>
        </div>
        {isLoading ? (
          <p className="px-6 py-8 text-sm text-muted-foreground">{t("admin.utm.loading")}</p>
        ) : groups.length === 0 ? (
          <p className="px-6 py-8 text-sm text-muted-foreground">{t("admin.utm.empty")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/40 text-xs text-muted-foreground">
                  <th className="px-6 py-3 text-right font-medium">{t("admin.utm.col_source")}</th>
                  <th className="px-4 py-3 text-right font-medium">{t("admin.utm.col_medium")}</th>
                  <th className="px-4 py-3 text-right font-medium">{t("admin.utm.col_campaign")}</th>
                  <th className="px-4 py-3 text-right font-medium">{t("admin.utm.col_orders")}</th>
                  <th className="px-4 py-3 text-right font-medium">{t("admin.utm.col_revenue")}</th>
                  <th className="px-4 py-3 text-right font-medium">{t("admin.utm.col_avg")}</th>
                </tr>
              </thead>
              <tbody>
                {groups.map((g) => (
                  <tr
                    key={g.key}
                    onClick={() => setActiveSource(activeSource === g.source ? null : g.source)}
                    className={`cursor-pointer border-b border-border/30 transition-colors last:border-0 hover:bg-muted/50 ${
                      activeSource === g.source ? "bg-primary/5" : ""
                    }`}
                  >
                    <td className="px-6 py-3">{badge(g.source, sourceColor(g.source))}</td>
                    <td className="px-4 py-3">{badge(g.medium || null, "bg-muted text-foreground")}</td>
                    <td className="px-4 py-3">{badge(g.campaign || null, "bg-muted text-foreground")}</td>
                    <td className="px-4 py-3 font-medium">{g.orders}</td>
                    <td className="px-4 py-3 font-medium">{formatCurrency(g.revenue)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatCurrency(g.revenue / g.orders)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* source filter pills */}
      {sources.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">{t("admin.utm.filter_by")}</span>
          <button
            onClick={() => setActiveSource(null)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              !activeSource
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-foreground hover:bg-muted/80"
            }`}
          >
            {t("admin.utm.filter_all", { n: String(tracked.length) })}
          </button>
          {sources.map((src) => {
            const count = tracked.filter((o) => o.utm_source === src).length;
            return (
              <button
                key={src}
                onClick={() => setActiveSource(activeSource === src ? null : src)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  activeSource === src
                    ? "bg-primary text-primary-foreground"
                    : `${sourceColor(src)} hover:opacity-80`
                }`}
              >
                {src} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* individual orders list */}
      {filteredOrders.length > 0 && (
        <div className="rounded-2xl border border-border/60 bg-card">
          <div className="border-b border-border/60 px-6 py-4">
            <h2 className="font-display text-base">
              {t("admin.utm.orders_title")}
              {activeSource ? ` — ${activeSource}` : ""}
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({filteredOrders.length})
              </span>
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/40 text-xs text-muted-foreground">
                  <th className="px-6 py-3 text-right font-medium">#</th>
                  <th className="px-4 py-3 text-right font-medium">{t("admin.utm.col_date")}</th>
                  <th className="px-4 py-3 text-right font-medium">{t("admin.utm.col_source")}</th>
                  <th className="px-4 py-3 text-right font-medium">{t("admin.utm.col_medium")}</th>
                  <th className="px-4 py-3 text-right font-medium">{t("admin.utm.col_campaign")}</th>
                  <th className="px-4 py-3 text-right font-medium">{t("admin.utm.col_content")}</th>
                  <th className="px-4 py-3 text-right font-medium">{t("admin.utm.col_total")}</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((o) => (
                  <tr
                    key={o.id}
                    className="border-b border-border/30 last:border-0 hover:bg-muted/30"
                  >
                    <td className="px-6 py-3 font-medium text-primary">#{o.order_number}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(o.created_at).toLocaleDateString("ar-EG", {
                        day: "numeric",
                        month: "short",
                      })}
                    </td>
                    <td className="px-4 py-3">{badge(o.utm_source, sourceColor(o.utm_source ?? ""))}</td>
                    <td className="px-4 py-3">{badge(o.utm_medium, "bg-muted text-foreground")}</td>
                    <td className="px-4 py-3">{badge(o.utm_campaign, "bg-muted text-foreground")}</td>
                    <td className="px-4 py-3">{badge(o.utm_content, "bg-muted text-foreground")}</td>
                    <td className="px-4 py-3 font-semibold">{formatCurrency(o.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
