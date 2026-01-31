import type { Context, Next } from "hono";
import { Effect } from "effect";
import { checkRateLimit, type RateLimiterConfig } from "../services/rateLimiter.js";
import { renderRateLimitModal } from "../views/shortlink.js";

export function createRateLimiter(config: RateLimiterConfig) {
  return async (c: Context, next: Next) => {
    const ip = c.req.header("x-forwarded-for") || c.req.header("x-real-ip") || "unknown";

    let key: string;
    if (config.keyType === "ip+code") {
      const code = c.req.param("code") || "unknown";
      key = `ratelimit:${ip}:${code}`;
    } else {
      key = `ratelimit:${ip}`;
    }

    const result = await Effect.runPromise(
      checkRateLimit(key, config).pipe(
        Effect.catchTag("RateLimitError", (error) =>
          Effect.succeed({
            allowed: false as const,
            limit: error.limit,
            resetTime: error.resetTime,
            secondsLeft: error.secondsLeft,
          }),
        ),
      ),
    );

    if (!result.allowed) {
      // stupid htmx can't take 429 code, so use return 200 instead
      return c.html(renderRateLimitModal(result.secondsLeft), 200);
    }

    c.header("X-RateLimit-Limit", config.limit.toString());
    c.header("X-RateLimit-Remaining", result.remaining.toString());
    c.header("X-RateLimit-Reset", new Date(result.resetTime).toISOString());

    await next();
  };
}
