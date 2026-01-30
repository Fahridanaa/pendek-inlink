import { Effect, Context, Layer, Schema } from "effect";

const EnvSchema = Schema.Struct({
  BASE_URL: Schema.String,
  DATABASE_URL: Schema.String,
  PORT: Schema.Number.pipe(Schema.int()),
  NODE_ENV: Schema.Literal("development", "production", "test"),
});

type Env = typeof EnvSchema.Type;

export class AppConfig extends Context.Tag("AppConfig")<
  AppConfig,
  {
    readonly baseUrl: string;
    readonly databaseUrl: string;
    readonly port: number;
    readonly isProduction: boolean;
  }
>() {}

const loadEnv = Effect.gen(function* () {
  const rawEnv: Env = {
    BASE_URL: process.env.BASE_URL || "http://localhost:4000",
    DATABASE_URL: process.env.DATABASE_URL || "postgres://localhost/pendekinlink",
    PORT: parseInt(process.env.PORT || "4000"),
    NODE_ENV: (process.env.NODE_ENV || "development") as "development" | "production" | "test",
  };

  const validated = yield* Schema.decodeUnknown(EnvSchema)(rawEnv);

  return {
    baseUrl: validated.BASE_URL,
    databaseUrl: validated.DATABASE_URL,
    port: validated.PORT,
    isProduction: validated.NODE_ENV === "production",
  };
});

export const AppConfigLive = Layer.effect(AppConfig, loadEnv);
