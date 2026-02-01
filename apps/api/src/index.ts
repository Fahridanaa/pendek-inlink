import "dotenv/config";
import { Effect, Layer, ManagedRuntime } from "effect";
import { serve } from "@hono/node-server";
import { createApp } from "./app.js";
import { AppConfig, AppConfigLive } from "./config/index.js";
import { LoggerService, LoggerServiceLive } from "./services/logger.js";
import { RedisServiceLive } from "./services/redis.js";
import { RateLimitStoreRedis } from "./services/rateLimitStore.js";
import type { GlobalLayer } from "./middleware/requestContext.js";

const GlobalLive: GlobalLayer = Layer.merge(
  AppConfigLive,
  Layer.provide(RateLimitStoreRedis, Layer.provide(RedisServiceLive, AppConfigLive)),
);

const awaitShutdownSignal = Effect.async<"SIGINT" | "SIGTERM">((resume) => {
  const onSignal = (signal: "SIGINT" | "SIGTERM") => () => {
    resume(Effect.succeed(signal));
  };

  process.once("SIGINT", onSignal("SIGINT"));
  process.once("SIGTERM", onSignal("SIGTERM"));
});

const startServer = Effect.gen(function* () {
  const config = yield* AppConfig;
  const logger = yield* LoggerService;

  const globalRuntime = ManagedRuntime.make(GlobalLive);
  const runtime = yield* Effect.promise(() => globalRuntime.runtime());

  yield* Effect.addFinalizer(() => Effect.promise(() => globalRuntime.dispose()));

  yield* logger.info("Server starting", {
    port: config.port,
    baseUrl: config.baseUrl,
  });

  const app = createApp(runtime);

  const server = serve({
    fetch: app.fetch,
    port: config.port,
  });

  yield* Effect.addFinalizer(() =>
    Effect.gen(function* () {
      yield* logger.info("Closing HTTP server...");
      yield* Effect.promise(
        () =>
          new Promise<void>((resolve, reject) => {
            server.close((err) => (err ? reject(err) : resolve()));
          }),
      );
      yield* logger.info("HTTP server closed");
    }),
  );

  yield* logger.info("Server started successfully");

  const signal = yield* awaitShutdownSignal;
  yield* logger.info("Received shutdown signal, starting graceful shutdown...", { signal });
});

const StartupLive = Layer.merge(AppConfigLive, LoggerServiceLive);

Effect.runPromise(startServer.pipe(Effect.provide(StartupLive), Effect.scoped));
