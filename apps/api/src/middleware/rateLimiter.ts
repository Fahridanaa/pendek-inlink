import type { Context, Next } from "hono";
import { Effect, Runtime } from "effect";
import { checkRateLimit, type RateLimiterConfig } from "../services/rateLimiter.js";
import { renderRateLimitModal } from "../views/shortlink.js";
import type { HonoEnv } from "./requestContext.js";

export function createRateLimiter(config: RateLimiterConfig) {
  return async (c: Context<HonoEnv>, next: Next) => {
    const ip = c.req.header("x-forwarded-for") || c.req.header("x-real-ip") || "unknown";

    let key: string;
    if (config.keyType === "ip+code") {
      const code = c.req.param("code") || "unknown";
      key = `${ip}:${code}`;
    } else {
      key = ip;
    }

    const runtime = c.get("runtime");

    const result = await Runtime.runPromise(runtime)(
      checkRateLimit(key, config).pipe(
        Effect.catchTag("RateLimitError", (error) =>
          Effect.succeed({
            allowed: false as const,
            limit: error.limit,
            resetTime: error.resetTime,
            secondsLeft: error.secondsLeft,
          }),
        ),
        Effect.catchTag("RateLimitStoreError", () =>
          // graceful degradation
          Effect.succeed({
            allowed: true as const,
            remaining: config.limit,
            resetTime: Date.now() + config.windowMs,
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
