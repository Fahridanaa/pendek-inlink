import { Context, Data, Effect, Layer } from "effect";
import { createClient, type RedisClientType } from "redis";
import { AppConfig } from "../config/index.js";

export class RedisError extends Data.TaggedError("RedisError")<{
  readonly message: string;
  readonly cause?: unknown;
}> {}

export class RedisService extends Context.Tag("RedisService")<
  RedisService,
  {
    readonly incrWithExpire: (
      key: string,
      expireSeconds: number,
    ) => Effect.Effect<{ count: number; ttl: number }, RedisError>;
  }
>() {}

export const RedisServiceLive = Layer.scoped(
  RedisService,
  Effect.gen(function* () {
    const config = yield* AppConfig;
    const client: RedisClientType = createClient({ url: config.redisUrl });

    yield* Effect.tryPromise({
      try: () => client.connect(),
      catch: (error) => new RedisError({ message: "Failed to connect to Redis", cause: error }),
    });

    yield* Effect.addFinalizer(() => Effect.promise(() => client.quit()));

    return {
      incrWithExpire: (key: string, expireSeconds: number) =>
        Effect.gen(function* () {
          const count = yield* Effect.tryPromise({
            try: () => client.incr(key),
            catch: (error) => new RedisError({ message: "Redis INCR failed", cause: error }),
          });

          // Set expire only on first request
          if (count === 1) {
            yield* Effect.tryPromise({
              try: () => client.expire(key, expireSeconds),
              catch: (error) => new RedisError({ message: "Redis EXPIRE failed", cause: error }),
            });
          }

          const ttl = yield* Effect.tryPromise({
            try: () => client.ttl(key),
            catch: (error) => new RedisError({ message: "Redis TTL failed", cause: error }),
          });

          return { count, ttl };
        }),
    };
  }),
);
