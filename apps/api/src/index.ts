import "dotenv/config";
import { Effect, Layer } from "effect";
import { serve } from "@hono/node-server";
import app from "./app.js";
import { AppConfig, AppConfigLive } from "./config/index.js";
import { LoggerService, LoggerServiceLive } from "./services/logger.js";

const AppLive = Layer.merge(AppConfigLive, LoggerServiceLive);

const startServer = Effect.gen(function* () {
  const config = yield* AppConfig;
  const logger = yield* LoggerService;

  yield* logger.info("Server starting", { port: config.port, baseUrl: config.baseUrl });

  serve({
    fetch: app.fetch,
    port: config.port,
  });

  yield* logger.info("Server started successfully");
});

Effect.runPromise(startServer.pipe(Effect.provide(AppLive)));
