import { Context, Data, Effect, Layer, Ref } from "effect";
import { RedisService } from "./redis.js";

export class RateLimitStoreError extends Data.TaggedError("RateLimitStoreError")<{
  readonly message: string;
  readonly cause?: unknown;
}> {}

export interface IncrementResult {
  readonly count: number;
  readonly ttl: number;
}

export class RateLimitStore extends Context.Tag("RateLimitStore")<
  RateLimitStore,
  {
    readonly ping: () => Effect.Effect<boolean, RateLimitStoreError>;
    readonly increment: (key: string, windowSeconds: number) => Effect.Effect<IncrementResult, RateLimitStoreError>;
  }
>() {}

// redis
const RATE_LIMIT_PREFIX = "ratelimit:";

export const RateLimitStoreRedis = Layer.effect(
  RateLimitStore,
  Effect.gen(function* () {
    const redis = yield* RedisService;

    return {
      ping: () =>
        redis.ping().pipe(Effect.mapError((e) => new RateLimitStoreError({ message: e.message, cause: e.cause }))),

      increment: (key: string, windowSeconds: number) =>
        redis
          .incrWithExpire(`${RATE_LIMIT_PREFIX}${key}`, windowSeconds)
          .pipe(Effect.mapError((e) => new RateLimitStoreError({ message: e.message, cause: e.cause }))),
    };
  }),
);

// in-memory
interface MemoryEntry {
  count: number;
  expiresAt: number;
}

export const RateLimitStoreMemory = Layer.scoped(
  RateLimitStore,
  Effect.gen(function* () {
    const store = yield* Ref.make(new Map<string, MemoryEntry>());

    const cleanupInterval = setInterval(() => {
      Effect.runSync(
        Ref.update(store, (s) => {
          const now = Date.now();
          const newMap = new Map<string, MemoryEntry>();
          for (const [key, entry] of s.entries()) {
            if (entry.expiresAt > now) {
              newMap.set(key, entry);
            }
          }
          return newMap;
        }),
      );
    }, 60_000);

    yield* Effect.addFinalizer(() => Effect.sync(() => clearInterval(cleanupInterval)));

    return {
      ping: () => Effect.succeed(true),

      increment: (key: string, windowSeconds: number) =>
        Effect.gen(function* () {
          const now = Date.now();
          const windowMs = windowSeconds * 1000;

          const result = yield* Ref.modify(store, (s) => {
            const existing = s.get(key);
            const newMap = new Map(s);

            if (!existing || existing.expiresAt <= now) {
              const entry: MemoryEntry = { count: 1, expiresAt: now + windowMs };
              newMap.set(key, entry);
              return [{ count: 1, ttl: windowSeconds }, newMap] as const;
            }

            const newCount = existing.count + 1;
            newMap.set(key, { ...existing, count: newCount });
            const ttl = Math.ceil((existing.expiresAt - now) / 1000);
            return [{ count: newCount, ttl }, newMap] as const;
          });

          return result;
        }),
    };
  }),
);
