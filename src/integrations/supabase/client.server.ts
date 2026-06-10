import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

// ── Environment resolution ─────────────────────────────────────────────────────
//
// VITE_SUPABASE_URL is a public variable embedded at BUILD TIME by Vite.
// On Railway/Render it must be set as a build variable (not just runtime).
//
// SUPABASE_SERVICE_ROLE_KEY intentionally has NO VITE_ prefix — Vite never
// embeds it into the client bundle. It is read at RUNTIME from process.env.
// Set it as a service variable on Railway and in Render's env dashboard.
//
// We read both via a helper that checks import.meta.env first (Vite build
// injection) then falls back to process.env (runtime Node.js) so the code
// works correctly in all environments: local dev, Render, and Railway.

function readVar(name: string): string | undefined {
  // import.meta.env is populated by Vite for VITE_* prefixed vars at build time.
  // Non-VITE_ vars are never injected by Vite, so this will be undefined for
  // SUPABASE_SERVICE_ROLE_KEY (which is intentional — keeps it server-only).
  const viteVal =
    typeof import.meta !== "undefined"
      ? (import.meta as Record<string, unknown> & { env?: Record<string, string> }).env?.[name]
      : undefined;
  if (viteVal) return viteVal;

  // Runtime fallback: process.env works on Node.js (Render, Railway).
  if (typeof process !== "undefined" && process.env?.[name]) {
    return process.env[name];
  }
  return undefined;
}

// Use lazy singleton so we get a clear error at call time (not at module load),
// which produces a better stack trace and avoids crashing unrelated routes when
// only a specific env var is missing.
let _adminClient: SupabaseClient<Database> | null = null;

function buildAdminClient(): SupabaseClient<Database> {
  const supabaseUrl = readVar("VITE_SUPABASE_URL");
  const serviceRoleKey = readVar("SUPABASE_SERVICE_ROLE_KEY");

  const missing: string[] = [];
  if (!supabaseUrl) missing.push("VITE_SUPABASE_URL");
  if (!serviceRoleKey) missing.push("SUPABASE_SERVICE_ROLE_KEY");

  if (missing.length > 0) {
    throw new Error(
      `[supabase-admin] Missing required environment variable(s): ${missing.join(", ")}.\n` +
        "  • VITE_SUPABASE_URL must be set as a BUILD-TIME variable (Vite embeds it at compile time).\n" +
        "  • SUPABASE_SERVICE_ROLE_KEY must be set as a RUNTIME variable (server-only, never expose to client).\n" +
        "  See .env.example for details.",
    );
  }

  return createClient<Database>(supabaseUrl!, serviceRoleKey!, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

// Proxy object: the first property access triggers lazy initialisation.
// This way a missing env var only throws when an admin route is actually called,
// not when any unrelated module imports this file.
export const supabaseAdmin: SupabaseClient<Database> = new Proxy(
  {} as SupabaseClient<Database>,
  {
    get(_target, prop, receiver) {
      if (!_adminClient) {
        _adminClient = buildAdminClient();
      }
      return Reflect.get(_adminClient, prop, receiver);
    },
  },
);
