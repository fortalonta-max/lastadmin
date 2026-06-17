import {
  createFileRoute,
  Outlet,
  Link,
  useNavigate,
  redirect,
  useRouterState,
} from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  LogOut,
  LayoutDashboard,
  Package,
  Cookie,
  ShoppingBag,
  Tag,
  Star,
  HelpCircle,
  Settings,
  ShoppingCart,
  Share2,
  CalendarX2,
  BarChart2,
  FolderOpen,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/admin")({
  beforeLoad: async ({ location }) => {
    if (location.pathname === "/admin/login") return;

    try {
      const { data } = await supabase.auth.getSession();
      if (!data.session?.user) {
        throw redirect({ to: "/admin/login" });
      }
    } catch (err) {
      if (err && typeof err === "object" && "to" in (err as any)) throw err;
      // eslint-disable-next-line no-console
      console.error("[admin] session check failed:", err);
      throw redirect({ to: "/admin/login" });
    }
  },
  component: AdminShell,
  errorComponent: AdminError,
});

function AdminError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="grid min-h-screen place-items-center px-4 text-center">
      <div className="max-w-md">
        <h1 className="font-display text-xl">Admin area didn't load</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {error?.message ?? "Unexpected error."}
        </p>
        <div className="mt-4 flex justify-center gap-2">
          <button
            onClick={reset}
            className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            Try again
          </button>
          <Link
            to="/admin/login"
            className="rounded-full border border-border px-4 py-2 text-sm"
          >
            Go to login
          </Link>
        </div>
      </div>
    </div>
  );
}

type AuthState = "loading" | "authorized" | "unauthorized";

function AdminShell() {
  const { t, locale, setLocale } = useI18n();
  const pathname = useRouterState({
    select: (s) => s.location.pathname,
  });

  const isLogin = pathname === "/admin/login";
  const navigate = useNavigate();

  const [authState, setAuthState] = useState<AuthState>(
    isLogin ? "authorized" : "loading"
  );

  useEffect(() => {
    if (isLogin) {
      setAuthState("authorized");
      return;
    }

    let mounted = true;

    async function verify() {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const user = sessionData.session?.user;

        if (!mounted) return;

        if (!user) {
          setAuthState("unauthorized");
          navigate({ to: "/admin/login" });
          return;
        }

        const { data, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id);

        console.log("ROLE QUERY:", data, error);

        const isAdmin = data?.some((r) => r.role === "admin");

        if (!isAdmin) {
          await supabase.auth.signOut();
          setAuthState("unauthorized");
          navigate({ to: "/admin/login" });
          return;
        }

        setAuthState("authorized");
      } catch (err) {
        console.error("AUTH ERROR:", err);
        if (!mounted) return;
        setAuthState("unauthorized");
        navigate({ to: "/admin/login" });
      }
    }

    verify();

    return () => {
      mounted = false;
    };
  }, [isLogin, navigate]);

  if (isLogin) return <Outlet />;

  if (authState === "loading") {
    return (
      <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">
        <div className="flex flex-col items-center gap-3">
          <span className="text-3xl">🍪</span>
          <span>{t("admin.verifying")}</span>
        </div>
      </div>
    );
  }

  if (authState === "unauthorized") return null;

  const nav = [
    { to: "/admin", label: t("admin.nav.overview"), icon: LayoutDashboard, exact: true },
    { to: "/admin/orders", label: t("admin.nav.orders"), icon: ShoppingBag },
    { to: "/admin/boxes", label: t("admin.nav.boxes"), icon: Package },
    { to: "/admin/flavors", label: t("admin.nav.flavors"), icon: Cookie },
    { to: "/admin/products", label: t("admin.nav.products"), icon: ShoppingCart },
    { to: "/admin/projects", label: t("admin.nav.projects"), icon: FolderOpen },
    { to: "/admin/coupons", label: t("admin.nav.coupons"), icon: Tag },
    { to: "/admin/reviews", label: t("admin.nav.reviews"), icon: Star },
    { to: "/admin/faqs", label: t("admin.nav.faqs"), icon: HelpCircle },
    { to: "/admin/social", label: t("admin.nav.social"), icon: Share2 },
    { to: "/admin/delivery", label: t("admin.nav.delivery"), icon: CalendarX2 },
    { to: "/admin/utm", label: t("admin.nav.utm"), icon: BarChart2 },
    { to: "/admin/settings", label: t("admin.nav.settings"), icon: Settings },
  ];

  return (
    <div className="grid min-h-screen grid-cols-1 md:grid-cols-[240px_1fr]">
      <aside className="border-b border-border/60 bg-card md:border-b-0 md:border-r">
        <div className="flex items-center justify-between gap-2 p-4">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-[var(--pink)]">
              🍪
            </span>
            <span className="font-display text-lg">{t("admin.title")}</span>
          </div>
          {/* Language Switcher */}
          <div className="flex items-center gap-1 rounded-full border border-border bg-muted p-0.5">
            <button
              onClick={() => setLocale("en")}
              title="English"
              className={cn(
                "rounded-full px-2 py-0.5 text-xs font-semibold transition-colors",
                locale === "en"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              EN
            </button>
            <button
              onClick={() => setLocale("ar")}
              title="العربية"
              className={cn(
                "rounded-full px-2 py-0.5 text-xs font-semibold transition-colors",
                locale === "ar"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              AR
            </button>
          </div>
        </div>

        <nav className="flex gap-1 overflow-x-auto px-2 pb-2 md:flex-col md:overflow-visible md:px-3">
          {nav.map((n) => {
            const active = n.exact
              ? pathname === n.to
              : pathname.startsWith(n.to);

            return (
              <Link
                key={n.to}
                to={n.to}
                className={cn(
                  "flex items-center gap-2.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground/75 hover:bg-muted"
                )}
              >
                <n.icon className="h-4 w-4" />
                {n.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden md:block">
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              navigate({ to: "/admin/login" });
            }}
            className="mx-3 mt-4 flex w-[calc(100%-1.5rem)] items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted"
          >
            <LogOut className="h-4 w-4" /> {t("admin.sign_out")}
          </button>
        </div>
      </aside>

      <main className="bg-background p-4 sm:p-8">
        <Outlet />
      </main>
    </div>
  );
}
