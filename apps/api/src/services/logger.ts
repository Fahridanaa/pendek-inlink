import { Context, Effect, Layer } from "effect";
import pino, { type Logger as PinoLogger } from "pino";

export interface Logger {
  readonly debug: (msg: string, data?: Record<string, unknown>) => Effect.Effect<void>;
  readonly info: (msg: string, data?: Record<string, unknown>) => Effect.Effect<void>;
  readonly warn: (msg: string, data?: Record<string, unknown>) => Effect.Effect<void>;
  readonly error: (msg: string, data?: Record<string, unknown>) => Effect.Effect<void>;
  readonly child: (context: string) => Logger;
}

export class LoggerService extends Context.Tag("LoggerService")<LoggerService, Logger>() {}

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
