import { Effect } from "effect";
import { RateLimitError } from "../application/errors.js";
import { RateLimitStore } from "./rateLimitStore.js";

export interface RateLimiterConfig {
  windowMs: number;
  limit: number;
  keyType: "ip" | "ip+code";
}

export const checkRateLimit = (key: string, config: RateLimiterConfig) =>
  Effect.gen(function* () {
    const store = yield* RateLimitStore;
    const windowSeconds = Math.ceil(config.windowMs / 1000);

    const { count, ttl } = yield* store.increment(key, windowSeconds);

    if (count > config.limit) {
      return yield* Effect.fail(
        new RateLimitError({
          limit: config.limit,
          resetTime: Date.now() + ttl * 1000,
          secondsLeft: ttl,
        }),
      );
    }

    return {
      allowed: true as const,
      remaining: config.limit - count,
      resetTime: Date.now() + ttl * 1000,
    };
  });
