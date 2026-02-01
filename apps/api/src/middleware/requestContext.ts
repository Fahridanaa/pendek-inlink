import { Context, Layer, type ManagedRuntime, type Runtime } from "effect";
import type { AppConfig } from "../config/index.js";
import type { RequestLoggerService } from "../services/logger.js";
import { RequestLoggerServiceLive } from "../services/logger.js";
import type { RateLimitStore } from "../services/rateLimitStore.js";
import type { RedisError } from "../services/redis.js";
import { createMiddleware } from "hono/factory";
import { randomUUID } from "crypto";

export interface RequestContextValue {
  readonly requestId: string;
  readonly method: string;
  readonly path: string;
  readonly startTime: number;
}

export class RequestContext extends Context.Tag("RequestContext")<
  RequestContext,
  RequestContextValue
>() {}

export type GlobalLayer = Layer.Layer<AppConfig | RateLimitStore, RedisError>;
export type GlobalRuntime = ManagedRuntime.ManagedRuntime<AppConfig | RateLimitStore, RedisError>;
export type AppLayer = Layer.Layer<AppConfig | RateLimitStore | RequestLoggerService | RequestContext>;

export type HonoEnv = {
  Variables: {
    requestId: string;
    requestStartTime: number;
    runtime: Runtime.Runtime<AppConfig | RateLimitStore>;
    appLayer: AppLayer;
  };
};

export const createRequestContextMiddleware = (runtime: Runtime.Runtime<AppConfig | RateLimitStore>) =>
  createMiddleware<HonoEnv>(async (c, next) => {
    const requestId = c.req.header("x-request-id") || randomUUID();
    const startTime = Date.now();

    const requestContextLayer = Layer.succeed(RequestContext, {
      requestId,
      method: c.req.method,
      path: c.req.path,
      startTime,
    });

    // Convert runtime context to a layer for composition
    const globalLayer = Layer.succeedContext(runtime.context);

    const appLayer: AppLayer = Layer.mergeAll(
      globalLayer,
      Layer.provide(RequestLoggerServiceLive, requestContextLayer),
      requestContextLayer,
    );

    c.set("requestId", requestId);
    c.set("requestStartTime", startTime);
    c.set("runtime", runtime);
    c.set("appLayer", appLayer);

    c.header("X-Request-ID", requestId);

    await next();
  });
