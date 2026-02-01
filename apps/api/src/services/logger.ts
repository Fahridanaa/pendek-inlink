import { Context, Effect, Layer } from "effect";
import pino, { type Logger as PinoLogger } from "pino";
import { RequestContext } from "../middleware/requestContext.js";

export interface Logger {
  readonly debug: (msg: string, data?: Record<string, unknown>) => Effect.Effect<void>;
  readonly info: (msg: string, data?: Record<string, unknown>) => Effect.Effect<void>;
  readonly warn: (msg: string, data?: Record<string, unknown>) => Effect.Effect<void>;
  readonly error: (msg: string, data?: Record<string, unknown>) => Effect.Effect<void>;
  readonly child: (context: string) => Logger;
}

export interface RequestLogger {
  readonly debug: (msg: string, data?: Record<string, unknown>) => Effect.Effect<void>;
  readonly info: (msg: string, data?: Record<string, unknown>) => Effect.Effect<void>;
  readonly warn: (msg: string, data?: Record<string, unknown>) => Effect.Effect<void>;
  readonly error: (msg: string, data?: Record<string, unknown>) => Effect.Effect<void>;
  readonly child: (context: string) => RequestLogger;
}

export class LoggerService extends Context.Tag("LoggerService")<LoggerService, Logger>() {}

export class RequestLoggerService extends Context.Tag("RequestLoggerService")<
  RequestLoggerService,
  RequestLogger
>() {}

const createLoggerFromPino = (pinoLogger: PinoLogger): Logger => ({
  debug: (msg, data) => Effect.sync(() => pinoLogger.debug(data, msg)),
  info: (msg, data) => Effect.sync(() => pinoLogger.info(data, msg)),
  warn: (msg, data) => Effect.sync(() => pinoLogger.warn(data, msg)),
  error: (msg, data) => Effect.sync(() => pinoLogger.error(data, msg)),
  child: (context) => createLoggerFromPino(pinoLogger.child({ context })),
});

const createPinoLogger = Effect.sync(() => {
  const isProduction = process.env.NODE_ENV === "production";

  return pino({
    level: process.env.LOG_LEVEL || (isProduction ? "info" : "debug"),
    ...(isProduction
      ? {}
      : {
          transport: {
            target: "pino-pretty",
            options: {
              colorize: true,
              translateTime: "SYS:standard",
              ignore: "pid,hostname",
            },
          },
        }),
  });
});

export const LoggerServiceLive = Layer.effect(
  LoggerService,
  Effect.map(createPinoLogger, createLoggerFromPino)
);

const createRequestLoggerFromPino = (
  pinoLogger: PinoLogger,
  requestId: string
): RequestLogger => {
  const loggerWithReqId = pinoLogger.child({ requestId });
  return {
    debug: (msg, data) => Effect.sync(() => loggerWithReqId.debug(data, msg)),
    info: (msg, data) => Effect.sync(() => loggerWithReqId.info(data, msg)),
    warn: (msg, data) => Effect.sync(() => loggerWithReqId.warn(data, msg)),
    error: (msg, data) => Effect.sync(() => loggerWithReqId.error(data, msg)),
    child: (context) => createRequestLoggerFromPino(loggerWithReqId.child({ context }), requestId),
  };
};

export const RequestLoggerServiceLive = Layer.effect(
  RequestLoggerService,
  Effect.gen(function* () {
    const reqCtx = yield* RequestContext;
    const pinoLogger = yield* createPinoLogger;
    return createRequestLoggerFromPino(pinoLogger, reqCtx.requestId);
  })
);
