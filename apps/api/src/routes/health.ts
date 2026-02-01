import { Hono } from "hono";
import { Effect, Runtime } from "effect";
import { db } from "db";
import { sql } from "drizzle-orm";
import { RateLimitStore } from "../services/rateLimitStore.js";
import type { HonoEnv } from "../middleware/requestContext.js";

export const healthRoutes = new Hono<HonoEnv>();

healthRoutes.get("/health/ready", async (c) => {
  const runtime = c.get("runtime");
  const checks: Record<string, { status: "ok" | "error"; message?: string }> = {};

  // Check db
  try {
    await db.execute(sql`SELECT 1`);
    checks.database = { status: "ok" };
  } catch (error) {
    checks.database = { status: "error", message: String(error) };
  }

  // Check rate limit
  const storeResult = await Runtime.runPromise(runtime)(
    RateLimitStore.pipe(
      Effect.flatMap((store) => store.ping()),
      Effect.map(() => ({ status: "ok" as const })),
      Effect.catchAll((error) => Effect.succeed({ status: "error" as const, message: error.message })),
    ),
  );
  checks.redis = storeResult;

  const isHealthy = Object.values(checks).every((check) => check.status === "ok");

  return c.json({ status: isHealthy ? "ok" : "error", checks }, isHealthy ? 200 : 503);
});
