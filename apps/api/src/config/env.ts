import { Effect, Context, Layer, Schema } from "effect";

const EnvSchema = Schema.Struct({
  BASE_URL: Schema.String.pipe(Schema.nonEmptyString()),
  DATABASE_URL: Schema.String.pipe(Schema.nonEmptyString()),
  REDIS_URL: Schema.String.pipe(Schema.nonEmptyString()),
  PORT: Schema.Number.pipe(Schema.int(), Schema.positive()),
  NODE_ENV: Schema.Literal("development", "production", "test"),
});

type Env = typeof EnvSchema.Type;

export class AppConfig extends Context.Tag("AppConfig")<
  AppConfig,
  {
    readonly baseUrl: string;
    readonly databaseUrl: string;
    readonly redisUrl: string;
    readonly port: number;
    readonly isProduction: boolean;
  }
>() {}

// private helper
function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    console.error(`Missing required environment variable: ${key}`);
    process.exit(1);
  }
  return value;
}

const loadEnv = Effect.gen(function* () {
  const rawEnv: Env = {
    BASE_URL: requireEnv("BASE_URL"),
    DATABASE_URL: requireEnv("DATABASE_URL"),
    REDIS_URL: requireEnv("REDIS_URL"),
    PORT: parseInt(requireEnv("PORT")),
    NODE_ENV: requireEnv("NODE_ENV") as Env["NODE_ENV"],
  };

  const validated = yield* Schema.decodeUnknown(EnvSchema)(rawEnv).pipe(
    Effect.mapError((error) => {
      console.error("Environment validation failed:", error);
      process.exit(1);
    }),
  );

  return {
    baseUrl: validated.BASE_URL,
    databaseUrl: validated.DATABASE_URL,
    redisUrl: validated.REDIS_URL,
    port: validated.PORT,
    isProduction: validated.NODE_ENV === "production",
  };
});

export const AppConfigLive = Layer.effect(AppConfig, loadEnv);
