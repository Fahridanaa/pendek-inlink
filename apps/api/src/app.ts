import { Hono } from "hono";
import type { Runtime } from "effect";
import type { AppConfig } from "./config/index.js";
import type { RateLimitStore } from "./services/rateLimitStore.js";
import { createRequestContextMiddleware, type HonoEnv } from "./middleware/requestContext.js";
import { healthRoutes } from "./routes/health.js";
import { shortlinkRoutes } from "./routes/shortlink.js";

export const createApp = (runtime: Runtime.Runtime<AppConfig | RateLimitStore>) => {
  const app = new Hono<HonoEnv>();

  app.get("/health/live", (c) => c.json({ status: "ok" }));
  app.use("*", createRequestContextMiddleware(runtime));

  app.route("/", healthRoutes);
  app.route("/", shortlinkRoutes);

  return app;
};
