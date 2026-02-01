import { Hono } from "hono";
import { Effect, Schema } from "effect";
import { BadRequestError, InternalServerError, catchHttpErrors } from "../application/errors.js";
import { getAndRedirect, createOrGetShortlink } from "../services/shortlink.js";
import { createRateLimiter } from "../middleware/rateLimiter.js";
import { renderShortenSuccess, renderError, renderCountdown, renderErrorModal } from "../views/shortlink.js";
import { type HonoEnv } from "../middleware/requestContext.js";

const ONE_MINUTE_MS = 60 * 1000;
const SHORTEN_RATE_LIMIT = 10;
const REDIRECT_RATE_LIMIT = 100;

const ShortenRequestSchema = Schema.Struct({
  url: Schema.String.pipe(Schema.nonEmptyString()),
  customSlug: Schema.optional(Schema.String.pipe(Schema.nonEmptyString())),
});

export const shortlinkRoutes = new Hono<HonoEnv>();

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

      return yield* createOrGetShortlink(validated.url, validated.customSlug);
    }).pipe(
      Effect.map((shortlink) => ({ success: true as const, shortlink })),
      catchHttpErrors,
      Effect.provide(c.get("appLayer")),
    ),
  );

  if (!result.success) {
    return c.html(renderErrorModal(result.error, result.status), 200);
  }

  return c.html(renderShortenSuccess(result.shortlink.shortUrl, result.shortlink.isNew), 200);
});

shortlinkRoutes.get("/:code", redirectLimiter, async (c) => {
  const code = c.req.param("code");
  const skipCountdown = c.req.query("direct") === "true";

  const result = await Effect.runPromise(
    getAndRedirect(code).pipe(
      Effect.map((url) => ({ success: true as const, url })),
      catchHttpErrors,
      Effect.provide(c.get("appLayer")),
    ),
  );

  if (!result.success) {
    return c.html(renderError(result.error, result.status), 200);
  }

  const { url } = result;

  if (skipCountdown) {
    return c.redirect(url, 302);
  }

  return c.html(renderCountdown(url), 200);
});
