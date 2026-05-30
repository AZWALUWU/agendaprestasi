import * as Sentry from "@sentry/cloudflare";
import server from "./dist/server/server.js";

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 60;

const clients = new Map<
  string,
  {
    count: number;
    start: number;
  }
>();

let lastCleanup = Date.now();

const CACHE_TTL_SECONDS = 300;

const POSTS_PER_PAGE = 12;

const CACHE_KEYS = {
  posts: (category?: string, page?: string, limit?: string) =>
    `posts:${category || "all"}:page:${page || "1"}:limit:${
      limit || POSTS_PER_PAGE
    }`,
};

function getIpFromRequest(request: Request) {
  const cfIp = request.headers.get("cf-connecting-ip");

  if (cfIp) return cfIp;

  const xff = request.headers.get("x-forwarded-for");

  if (xff) {
    return xff.split(",")[0].trim();
  }

  return "unknown";
}

async function handleCacheApi(
  request: Request,
  env: any,
): Promise<Response | null> {
  const url = new URL(request.url);

  // ONLY CACHE POSTS API
  if (request.method === "GET" && url.pathname === "/api/posts") {
    const category = url.searchParams.get("category") ?? undefined;

    const search = url.searchParams.get("search");

    const tags = url.searchParams.get("tags");

    const page = url.searchParams.get("page") ?? "1";

    const limit = url.searchParams.get("limit") ?? String(POSTS_PER_PAGE);

    // DO NOT CACHE SEARCH/FILTER
    if (search || tags) {
      return null;
    }

    const cacheKey = CACHE_KEYS.posts(category, page, limit);

    try {
      const cached = await env.POSTS_CACHE.get(cacheKey);

      if (cached) {
        return new Response(cached, {
          status: 200,
          headers: {
            "Content-Type": "application/json",

            "X-Cache": "HIT",

            "Cache-Control": `public, max-age=${CACHE_TTL_SECONDS}`,
          },
        });
      }
    } catch (error) {
      Sentry.captureException(error);
    }

    return null;
  }

  // CACHE INVALIDATION
  if (request.method === "POST" && url.pathname === "/api/cache/invalidate") {
    const authHeader = request.headers.get("x-cache-secret");

    if (authHeader !== env.CACHE_INVALIDATE_SECRET) {
      return new Response("Unauthorized", {
        status: 401,
      });
    }

    try {
      // DELETE COMMON CACHE PAGES
      const keys: string[] = [];

      const categories = ["all", "scholarship", "competition", "event"];

      const pages = ["1", "2", "3", "4", "5"];

      for (const category of categories) {
        for (const page of pages) {
          keys.push(`posts:${category}:page:${page}:limit:${POSTS_PER_PAGE}`);
        }
      }

      await Promise.all(keys.map((key) => env.POSTS_CACHE.delete(key)));

      return new Response(
        JSON.stringify({
          success: true,
          cleared: keys.length,
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        },
      );
    } catch (error) {
      Sentry.captureException(error);

      return new Response(
        JSON.stringify({
          error: "Failed to invalidate cache",
        }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
          },
        },
      );
    }
  }

  return null;
}

async function populateCache(
  request: Request,
  response: Response,
  env: any,
  ctx: any,
) {
  const url = new URL(request.url);

  if (request.method !== "GET" || url.pathname !== "/api/posts") {
    return;
  }

  const search = url.searchParams.get("search");

  const tags = url.searchParams.get("tags");

  // DO NOT CACHE SEARCH/FILTER
  if (search || tags) {
    return;
  }

  const category = url.searchParams.get("category") ?? undefined;

  const page = url.searchParams.get("page") ?? "1";

  const limit = url.searchParams.get("limit") ?? String(POSTS_PER_PAGE);

  const cacheKey = CACHE_KEYS.posts(category, page, limit);

  try {
    const body = await response.clone().text();

    ctx.waitUntil(
      env.POSTS_CACHE.put(cacheKey, body, {
        expirationTtl: CACHE_TTL_SECONDS,
      }),
    );
  } catch (error) {
    Sentry.captureException(error);
  }
}

export default Sentry.withSentry(
  (env: any): Sentry.CloudflareOptions => ({
    dsn: env.SENTRY_DSN,

    tracesSampleRate: 1.0,

    environment: env.ENVIRONMENT || "production",
  }),

  {
    async fetch(request: Request, env: any, ctx: any): Promise<Response> {
      const now = Date.now();

      try {
        // RATE LIMIT

        const ip = getIpFromRequest(request);

        let entry = clients.get(ip);

        if (!entry) {
          entry = {
            count: 0,
            start: now,
          };

          clients.set(ip, entry);
        }

        if (now - entry.start > RATE_LIMIT_WINDOW_MS) {
          entry.count = 0;
          entry.start = now;
        }

        entry.count += 1;

        const remaining = Math.max(0, RATE_LIMIT_MAX - entry.count);

        const resetSeconds = Math.ceil(
          (entry.start + RATE_LIMIT_WINDOW_MS - now) / 1000,
        );

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

        // CACHE

        const cacheResponse = await handleCacheApi(request, env);

        if (cacheResponse) {
          const headers = new Headers(cacheResponse.headers);

          headers.set("X-RateLimit-Limit", String(RATE_LIMIT_MAX));

          headers.set("X-RateLimit-Remaining", String(remaining));

          headers.set("X-RateLimit-Reset", String(resetSeconds));

          return new Response(cacheResponse.body, {
            status: cacheResponse.status,
            headers,
          });
        }

        // SERVER

        const response = await server.fetch(request, env, ctx);

        // STORE CACHE

        if (response.status === 200) {
          await populateCache(request, response, env, ctx);
        }

        const headers = new Headers(response.headers);

        headers.set("X-RateLimit-Limit", String(RATE_LIMIT_MAX));

        headers.set("X-RateLimit-Remaining", String(remaining));

        headers.set("X-RateLimit-Reset", String(resetSeconds));

        return new Response(response.body, {
          status: response.status,

          statusText: response.statusText,

          headers,
        });
      } catch (error) {
        Sentry.captureException(error);

        return new Response("Internal Server Error", {
          status: 500,
        });
      } finally {
        // CLEANUP OLD CLIENTS

        if (now - lastCleanup > RATE_LIMIT_WINDOW_MS * 5) {
          for (const [key, val] of clients) {
            if (now - val.start > RATE_LIMIT_WINDOW_MS * 2) {
              clients.delete(key);
            }
          }

          lastCleanup = now;
        }
      }
    },
  },
);
