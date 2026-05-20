import server from "./dist/server/server.js";

const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX = 60; // max requests per window per IP
const clients = new Map<string, { count: number; start: number }>();
let lastCleanup = Date.now();

function getIpFromRequest(request: Request) {
  const cfIp = request.headers.get("cf-connecting-ip");
  if (cfIp) return cfIp;
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return "unknown";
}

export default {
  async fetch(request: Request, env: any, ctx: any) {
    const now = Date.now();
    try {
      const ip = getIpFromRequest(request);
      let entry = clients.get(ip);
      if (!entry) {
        entry = { count: 0, start: now };
        clients.set(ip, entry);
      }
      // reset window
      if (now - entry.start > RATE_LIMIT_WINDOW_MS) {
        entry.count = 0;
        entry.start = now;
      }
      entry.count += 1;

      const remaining = Math.max(0, RATE_LIMIT_MAX - entry.count);
      const resetSeconds = Math.ceil((entry.start + RATE_LIMIT_WINDOW_MS - now) / 1000);

      if (entry.count > RATE_LIMIT_MAX) {
        return new Response("Too Many Requests", {
          status: 429,
          headers: {
            "Content-Type": "text/plain",
            "Retry-After": String(resetSeconds),
            "X-RateLimit-Limit": String(RATE_LIMIT_MAX),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(resetSeconds),
          },
        });
      }

      const res = await server.fetch(request, env, ctx);

      // Propagate rate-limit headers
      const newHeaders = new Headers(res.headers);
      newHeaders.set("X-RateLimit-Limit", String(RATE_LIMIT_MAX));
      newHeaders.set("X-RateLimit-Remaining", String(remaining));
      newHeaders.set("X-RateLimit-Reset", String(resetSeconds));

      return new Response(res.body, { status: res.status, statusText: res.statusText, headers: newHeaders });
    } catch (err) {
      return new Response("Internal Server Error", { status: 500 });
    } finally {
      // periodic cleanup of stale entries to avoid memory growth
      if (now - lastCleanup > RATE_LIMIT_WINDOW_MS * 5) {
        for (const [key, val] of clients) {
          if (now - val.start > RATE_LIMIT_WINDOW_MS * 2) clients.delete(key);
        }
        lastCleanup = now;
      }
    }
  },
};