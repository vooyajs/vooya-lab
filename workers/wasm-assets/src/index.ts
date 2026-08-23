import { DurableObject } from "cloudflare:workers";

export interface Env {
  WASM_ASSETS: R2Bucket;
  DAILY_QUOTA: DurableObjectNamespace<DailyQuota>;
  ASSETS_ENABLED: string;
  ALLOWED_ORIGIN: string;
  MAX_REQUESTS_PER_DAY: string;
}

export class DailyQuota extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    ctx.blockConcurrencyWhile(async () => {
      this.ctx.storage.sql.exec(`
        CREATE TABLE IF NOT EXISTS daily_quota (
          id INTEGER PRIMARY KEY CHECK (id = 1),
          day TEXT NOT NULL,
          count INTEGER NOT NULL
        )
      `);
    });
  }

  consume(day: string, limit: number): { allowed: boolean; count: number } {
    const row = this.ctx.storage.sql
      .exec<{ day: string; count: number }>("SELECT day, count FROM daily_quota WHERE id = 1")
      .toArray()[0];
    const count = row?.day === day ? row.count : 0;
    if (count >= limit) return { allowed: false, count };
    const nextCount = count + 1;
    this.ctx.storage.sql.exec(
      `INSERT INTO daily_quota (id, day, count) VALUES (1, ?, ?)
       ON CONFLICT(id) DO UPDATE SET day = excluded.day, count = excluded.count`,
      day,
      nextCount,
    );
    return { allowed: true, count: nextCount };
  }
}

const ALLOWED_KEYS = new Set(["wasm/rspack.wasm"]);

function originAllowed(request: Request, env: Env): boolean {
  const origin = request.headers.get("Origin");
  return !origin || origin === env.ALLOWED_ORIGIN || origin === "http://localhost:5173";
}

function corsHeaders(request: Request, env: Env): Headers {
  const headers = new Headers({
    "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
    "Access-Control-Allow-Headers": "Range",
    "Access-Control-Max-Age": "86400",
    "Cross-Origin-Resource-Policy": "cross-origin",
  });
  const origin = request.headers.get("Origin");
  if (origin && (origin === env.ALLOWED_ORIGIN || origin === "http://localhost:5173")) {
    headers.set("Access-Control-Allow-Origin", origin);
  }
  return headers;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const headers = corsHeaders(request, env);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
    if (!originAllowed(request, env)) return new Response("Origin not allowed", { status: 403, headers });
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method not allowed", { status: 405, headers });
    }
    if (env.ASSETS_ENABLED !== "true") {
      return new Response("WASM assets are temporarily disabled", { status: 503, headers });
    }
    const pathname = new URL(request.url).pathname.replace(/^\/+/, "");
    if (!ALLOWED_KEYS.has(pathname)) return new Response("Not found", { status: 404, headers });

    const maxRequests = Math.max(1, Number.parseInt(env.MAX_REQUESTS_PER_DAY || "5000", 10));
    const quota = env.DAILY_QUOTA.getByName("wasm-assets");
    const result = await quota.consume(new Date().toISOString().slice(0, 10), maxRequests);
    if (!result.allowed) {
      headers.set("Retry-After", "86400");
      headers.set("X-Vooya-Quota", "daily-limit-reached");
      return new Response("Daily WASM request limit reached; service will resume tomorrow", { status: 429, headers });
    }

    const object = await env.WASM_ASSETS.get(pathname);
    if (!object) return new Response("Not found", { status: 404, headers });
    object.writeHttpMetadata(headers);
    headers.set("Content-Type", "application/wasm");
    headers.set("Cache-Control", "public, max-age=31536000, immutable");
    headers.set("ETag", object.httpEtag);
    return new Response(request.method === "HEAD" ? null : object.body, { headers });
  },
};
