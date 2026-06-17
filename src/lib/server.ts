import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";
import type { HealthStatus } from "./lib/health.functions";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
// Only applies to GET (page) requests — server function RPC calls are POST and expect
// JSON back; replacing them with HTML breaks the client-side error handling.
async function normalizeCatastrophicSsrResponse(request: Request, response: Response): Promise<Response> {
  if (request.method !== "GET") return response;
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!body.includes('"unhandled":true') || !body.includes('"message":"HTTPError"')) {
    return response;
  }

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

async function handleHealthCheck(): Promise<Response> {
  try {
    const { checkSupabaseHealth } = await import("./lib/health.functions");
    const health: HealthStatus = await checkSupabaseHealth();
    return new Response(JSON.stringify(health, null, 2), {
      status: health.status === "ok" ? 200 : 503,
      headers: { "content-type": "application/json" },
    });
  } catch (err) {
    const body: HealthStatus = {
      status: "error",
      supabase: "unreachable",
      latencyMs: 0,
      checkedAt: new Date().toISOString(),
      error: err instanceof Error ? err.message : String(err),
    };
    return new Response(JSON.stringify(body, null, 2), {
      status: 503,
      headers: { "content-type": "application/json" },
    });
  }
}

// Reads a variable from Vite's build-time injection first, then from process.env
// at runtime. Mirrors the pattern in integrations/supabase/client.server.ts.
function readEnvVar(name: string): string | undefined {
  const viteVal =
    typeof import.meta !== "undefined"
      ? (import.meta as Record<string, unknown> & { env?: Record<string, string> }).env?.[name]
      : undefined;
  if (viteVal) return viteVal;
  if (typeof process !== "undefined" && process.env?.[name]) return process.env[name];
  return undefined;
}

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function buildSitemapXml(baseUrl: string, urls: string[]): string {
  const entries = urls
    .map((u) => `  <url>\n    <loc>${xmlEscape(u)}</loc>\n  </url>`)
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>`;
}

async function handleSitemap(): Promise<Response> {
  const siteUrl = (readEnvVar("VITE_SITE_URL") ?? "").replace(/\/$/, "");

  if (!siteUrl) {
    return new Response(
      "<!-- sitemap unavailable: VITE_SITE_URL is not set -->",
      { status: 503, headers: { "content-type": "application/xml; charset=utf-8" } },
    );
  }

  try {
    const { supabaseAdmin } = await import("./integrations/supabase/client.server");

    const [boxesResult, productsResult] = await Promise.all([
      supabaseAdmin.from("boxes").select("slug").eq("is_active", true),
      supabaseAdmin.from("products").select("slug").eq("is_active", true),
    ]);

    const boxSlugs: string[] = (boxesResult.data ?? []).map((r) => r.slug as string);
    const productSlugs: string[] = (productsResult.data ?? []).map((r) => r.slug as string);

    const urls: string[] = [
      `${siteUrl}/`,
      `${siteUrl}/boxes`,
      `${siteUrl}/buildbox`,
      `${siteUrl}/flavors`,
      `${siteUrl}/products`,
      ...boxSlugs.map((s) => `${siteUrl}/boxes/${s}`),
      ...productSlugs.map((s) => `${siteUrl}/products/${s}`),
    ];

    return new Response(buildSitemapXml(siteUrl, urls), {
      status: 200,
      headers: {
        "content-type": "application/xml; charset=utf-8",
        "cache-control": "public, max-age=3600",
      },
    });
  } catch (err) {
    console.error("[sitemap] failed to generate:", err);
    return new Response(buildSitemapXml(siteUrl, [`${siteUrl}/`]), {
      status: 200,
      headers: {
        "content-type": "application/xml; charset=utf-8",
        "cache-control": "public, max-age=60",
      },
    });
  }
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    const url = new URL(request.url);

    if (url.pathname === "/api/health") {
      return handleHealthCheck();
    }

    if (url.pathname === "/sitemap.xml") {
      return handleSitemap();
    }

    try {
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(request, response);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
