import { Effect, Ref } from "effect";
import { RateLimitError } from "../application/errors.js";

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

export interface RateLimiterConfig {
  windowMs: number;
  limit: number;
  keyType: "ip" | "ip+code";
}

const storeRef = Ref.unsafeMake(new Map<string, RateLimitEntry>());

const cleanup = Effect.gen(function* () {
  const store = yield* Ref.get(storeRef);
  const now = Date.now();
  const toDelete: string[] = [];

  for (const [key, value] of store.entries()) {
    if (now > value.resetTime) {
      toDelete.push(key);
    }
  }

  if (toDelete.length > 0) {
    yield* Ref.update(storeRef, (s) => {
      toDelete.forEach((key) => s.delete(key));
      return new Map(s);
    });
  }
});

setInterval(
  () => {
    Effect.runPromise(cleanup);
  },
  5 * 60 * 1000,
);

export const checkRateLimit = (key: string, config: RateLimiterConfig) =>
  Effect.gen(function* () {
    const now = Date.now();
    const store = yield* Ref.get(storeRef);
    const entry = store.get(key);

    if (!entry || now > entry.resetTime) {
      const newEntry: RateLimitEntry = {
        count: 1,
        resetTime: now + config.windowMs,
      };

      yield* Ref.update(storeRef, (s) => {
        const newMap = new Map(s);
        newMap.set(key, newEntry);
        return newMap;
      });

      return {
        allowed: true as const,
        remaining: config.limit - 1,
        resetTime: newEntry.resetTime,
      };
    }

    const newCount = entry.count + 1;
    const updatedEntry: RateLimitEntry = {
      count: newCount,
      resetTime: entry.resetTime,
    };

    yield* Ref.update(storeRef, (s) => {
      const newMap = new Map(s);
      newMap.set(key, updatedEntry);
      return newMap;
    });

    if (newCount > config.limit) {
      const secondsLeft = Math.ceil((entry.resetTime - now) / 1000);
      return yield* Effect.fail(
        new RateLimitError({
          limit: config.limit,
          resetTime: entry.resetTime,
          secondsLeft,
        }),
      );
    }

    return {
      allowed: true as const,
      remaining: config.limit - newCount,
      resetTime: entry.resetTime,
    };
  });
