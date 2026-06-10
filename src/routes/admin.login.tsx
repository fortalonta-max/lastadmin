import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { claimAdminIfFirst } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin/login")({
  head: () => ({ meta: [{ title: "Admin Login — NYC Cookies" }] }),
  component: AdminLogin,
});

// ✅ FIXED: proper user_id-based role check
async function checkAdminRole(): Promise<boolean> {
  const { data: sessionData } = await supabase.auth.getSession();
  const user = sessionData.session?.user;

  if (!user) return false;

  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .maybeSingle();

  if (error) return false;

  return !!data;
}

function AdminLogin() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // ✅ FIXED: safe session handling
  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted || !data.session?.user) return;

      try {
        const isAdmin = await checkAdminRole();
        if (mounted && isAdmin) {
          navigate({ to: "/admin" });
        }
      } catch {
        // ignore
      }
    });

    return () => {
      mounted = false;
    };
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin + "/admin",
          },
        });

        if (error) throw error;

        toast.success("Account created. Sign in to continue.");
        setMode("signin");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        // optional first admin claim
        try {
          const res = await claimAdminIfFirst();
          if (res?.granted) {
            toast.success("Welcome — you are the first admin.");
          }
        } catch {
          // ignore
        }

        // ✅ FIXED: proper role check
        const isAdmin = await checkAdminRole();

        if (!isAdmin) {
          toast.error("This account is not an admin.");
          await supabase.auth.signOut();
          return;
        }

        navigate({ to: "/admin" });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Auth failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-[var(--pink-soft)] px-4">
      <div className="w-full max-w-sm rounded-3xl border border-border/60 bg-card p-8 shadow-[var(--shadow-card)]">
        <Link to="/" className="mb-6 inline-flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-[var(--pink)]">🍪</span>
          <span className="font-display text-lg">NYC Cookies Admin</span>
        </Link>

        <h1 className="font-display text-2xl">
          {mode === "signin" ? "Sign in" : "Create admin account"}
        </h1>

        <p className="mt-1 text-xs text-muted-foreground">
          The first user to sign up automatically becomes the admin.
        </p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium">Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-medium">Password</span>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            {loading ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>

        <button
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="mt-4 w-full text-center text-xs text-muted-foreground hover:text-foreground"
        >
          {mode === "signin"
            ? "No account? Sign up"
            : "Already have an account? Sign in"}
        </button>
      </div>
    </div>
  );
}