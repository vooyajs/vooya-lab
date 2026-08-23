export interface Env {
  WASM_ASSETS: R2Bucket;
  ASSETS_ENABLED: string;
  ALLOWED_ORIGIN: string;
  RATE_LIMIT_PER_MINUTE: string;
}

const ALLOWED_KEYS = new Set(["wasm/rspack.wasm"]);
const WINDOW_MS = 60_000;
const requestWindows = new Map<string, { startedAt: number; count: number }>();

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

function rateLimited(request: Request, env: Env): boolean {
  const limit = Math.max(1, Number.parseInt(env.RATE_LIMIT_PER_MINUTE || "30", 10));
  const key = request.headers.get("CF-Connecting-IP") || "unknown";
  const now = Date.now();
  const current = requestWindows.get(key);
  if (!current || now - current.startedAt >= WINDOW_MS) {
    requestWindows.set(key, { startedAt: now, count: 1 });
    return false;
  }
  current.count += 1;
  return current.count > limit;
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
    if (rateLimited(request, env)) {
      headers.set("Retry-After", "60");
      return new Response("Rate limit exceeded", { status: 429, headers });
    }

    const pathname = new URL(request.url).pathname.replace(/^\/+/, "");
    if (!ALLOWED_KEYS.has(pathname)) return new Response("Not found", { status: 404, headers });
    const object = await env.WASM_ASSETS.get(pathname);
    if (!object) return new Response("Not found", { status: 404, headers });
    object.writeHttpMetadata(headers);
    headers.set("Content-Type", "application/wasm");
    headers.set("Cache-Control", "public, max-age=31536000, immutable");
    headers.set("ETag", object.httpEtag);
    return new Response(request.method === "HEAD" ? null : object.body, { headers });
  },
};
