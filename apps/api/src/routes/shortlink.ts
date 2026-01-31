import { Hono } from "hono";
import { Effect, Schema } from "effect";
import { AppConfigLive } from "../config/index.js";
import { BadRequestError, InternalServerError } from "../application/errors.js";
import { getAndRedirect, createOrGetShortlink } from "../services/shortlink.js";
import { createRateLimiter } from "../middleware/rateLimiter.js";
import { renderShortenSuccess, renderError, renderCountdown } from "../views/shortlink.js";

const ONE_MINUTE_MS = 60 * 1000;
const SHORTEN_RATE_LIMIT = 1;
const REDIRECT_RATE_LIMIT = 100;

const ShortenRequestSchema = Schema.Struct({
  url: Schema.String.pipe(Schema.nonEmptyString()),
});

export const shortlinkRoutes = new Hono();

const shortenLimiter = createRateLimiter({
  windowMs: ONE_MINUTE_MS,
  limit: SHORTEN_RATE_LIMIT,
  keyType: "ip",
});

const redirectLimiter = createRateLimiter({
  windowMs: ONE_MINUTE_MS,
  limit: REDIRECT_RATE_LIMIT,
  keyType: "ip+code",
});

shortlinkRoutes.post("/api/shorten-html", shortenLimiter, async (c) => {
  const result = await Effect.runPromise(
    Effect.gen(function* () {
      const body = yield* Effect.tryPromise({
        try: () => c.req.parseBody(),
        catch: () => new InternalServerError({ message: "Failed to parse request" }),
      });

      const validated = yield* Effect.try({
        try: () => Schema.decodeUnknownSync(ShortenRequestSchema)(body),
        catch: () => new BadRequestError({ message: "Format URL tidak valid" }),
      });

      return yield* createOrGetShortlink(validated.url);
    }).pipe(
      Effect.provide(AppConfigLive),
      Effect.map((shortlink) => ({ success: true as const, shortlink })),
      Effect.catchTags({
        BadRequest: (e) =>
          Effect.succeed({
            success: false as const,
            error: e.message,
            status: 400 as const,
          }),
        ServiceUnavailable: (e) =>
          Effect.succeed({
            success: false as const,
            error: e.message,
            status: 503 as const,
          }),
        InternalError: (e) =>
          Effect.succeed({
            success: false as const,
            error: e.message,
            status: 500 as const,
          }),
      }),
    ),
  );

  if (!result.success) {
    return c.html(renderError(result.error, result.status), result.status);
  }

  return c.html(renderShortenSuccess(result.shortlink.shortUrl, result.shortlink.isNew), 200);
});

shortlinkRoutes.get("/:code", redirectLimiter, async (c) => {
  const code = c.req.param("code");
  const skipCountdown = c.req.query("direct") === "true";

  const result = await Effect.runPromise(
    getAndRedirect(code).pipe(
      Effect.map((url) => ({ success: true as const, url })),
      Effect.catchTags({
        NotFound: (e) =>
          Effect.succeed({
            success: false as const,
            error: e.message,
            status: 404 as const,
          }),
        InternalError: (e) =>
          Effect.succeed({
            success: false as const,
            error: e.message,
            status: 500 as const,
          }),
      }),
    ),
  );

  if (!result.success) {
    return c.html(renderError(result.error, result.status), result.status);
  }

  const { url } = result;

  if (skipCountdown) {
    return c.redirect(url, 302);
  }

  return c.html(renderCountdown(url), 200);
});
