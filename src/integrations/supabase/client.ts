import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Publishable (anon) keys are safe to ship in client code — they are
// gated by Row Level Security. We keep them here as a fallback so the
// app works locally even if a `.env` file is missing or Vite wasn't
// restarted after one was added.
const FALLBACK_URL = "https://xnyhsnyslfsdghqtillp.supabase.co";
const FALLBACK_PUBLISHABLE_KEY =
  "sb_publishable_broABqhVa4UCgRZmgMB9XA_Tv-M0af-";

function readEnv(name: string): string | undefined {
  // Vite-injected (browser + SSR build)
  const viteEnv =
    typeof import.meta !== "undefined" ? (import.meta as any).env : undefined;
  const fromVite = viteEnv?.[name];
  if (fromVite) return String(fromVite);

  // Node / server runtime
  if (typeof process !== "undefined" && process.env && process.env[name]) {
    return process.env[name];
  }
  return undefined;
}

const SUPABASE_URL = readEnv("VITE_SUPABASE_URL") ?? FALLBACK_URL;
const SUPABASE_PUBLISHABLE_KEY =
  readEnv("VITE_SUPABASE_PUBLISHABLE_KEY") ?? FALLBACK_PUBLISHABLE_KEY;

if (!readEnv("VITE_SUPABASE_URL") || !readEnv("VITE_SUPABASE_PUBLISHABLE_KEY")) {
  // eslint-disable-next-line no-console
  console.warn(
    "[supabase] VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY missing — " +
      "using built-in fallback. Create a .env file at the project root and " +
      "restart `bun run dev` to override.",
  );
}

export const supabase: SupabaseClient = createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      storage: typeof window !== "undefined" ? window.localStorage : undefined,
    },
  },
);
