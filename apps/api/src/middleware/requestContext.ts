import { Context, Layer } from "effect";
import type { AppConfig } from "../config/index.js";
import { AppConfigLive } from "../config/index.js";
import type { RequestLoggerService } from "../services/logger.js";
import { RequestLoggerServiceLive } from "../services/logger.js";
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

export type AppLayer = Layer.Layer<AppConfig | RequestLoggerService | RequestContext>;

export type HonoEnv = {
  Variables: {
    requestId: string;
    requestStartTime: number;
    appLayer: AppLayer;
  };
};

export const requestContextMiddleware = createMiddleware<HonoEnv>(async (c, next) => {
  const requestId = c.req.header("x-request-id") || randomUUID();
  const startTime = Date.now();

  const requestContextLayer = Layer.succeed(RequestContext, {
    requestId,
    method: c.req.method,
    path: c.req.path,
    startTime,
  });

  const appLayer: AppLayer = Layer.mergeAll(
    AppConfigLive,
    Layer.provide(RequestLoggerServiceLive, requestContextLayer),
    requestContextLayer
  );

  c.set("requestId", requestId);
  c.set("requestStartTime", startTime);
  c.set("appLayer", appLayer);

  c.header("X-Request-ID", requestId);

  await next();
});
