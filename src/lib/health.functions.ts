import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type HealthStatus = {
  status: "ok" | "error";
  supabase: "connected" | "unreachable";
  latencyMs: number;
  checkedAt: string;
  error?: string;
};

export async function checkSupabaseHealth(): Promise<HealthStatus> {
  const start = Date.now();
  try {
    const { error } = await supabaseAdmin
      .from("boxes")
      .select("id", { count: "exact", head: true });

    const latencyMs = Date.now() - start;

    if (error) {
      return {
        status: "error",
        supabase: "unreachable",
        latencyMs,
        checkedAt: new Date().toISOString(),
        error: error.message,
      };
    }

    return {
      status: "ok",
      supabase: "connected",
      latencyMs,
      checkedAt: new Date().toISOString(),
    };
  } catch (err) {
    return {
      status: "error",
      supabase: "unreachable",
      latencyMs: Date.now() - start,
      checkedAt: new Date().toISOString(),
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
