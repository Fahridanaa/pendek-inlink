import { Hono } from "hono";
import { Effect, Schema } from "effect";
import { AppConfigLive } from "../config/index.js";
import { BadRequestError, NotFoundError, ServiceUnavailableError, InternalServerError } from "../application/errors.js";
import { getAndRedirect, createOrGetShortlink } from "../services/shortlink.js";
import { createRateLimiter } from "../middleware/rateLimiter.js";
import { renderShortenSuccess, renderError, renderNotFound, renderCountdown } from "../views/shortlink.js";

const ONE_MINUTE_MS = 60 * 1000;
const SHORTEN_RATE_LIMIT = 10;
const REDIRECT_RATE_LIMIT = 100;

const ShortenRequestSchema = Schema.Struct({
  url: Schema.String.pipe(Schema.nonEmptyString()),
});

export const shortlinkRoutes = new Hono();

const shortenLimiter = createRateLimiter({
  windowMs: ONE_MINUTE_MS,
  limit: SHORTEN_RATE_LIMIT,
  message: "Terlalu banyak request! Tunggu 1 menit ya.",
  keyType: "ip",
});

const redirectLimiter = createRateLimiter({
  windowMs: ONE_MINUTE_MS,
  limit: REDIRECT_RATE_LIMIT,
  message: "Terlalu banyak klik! Tunggu sebentar.",
  keyType: "ip+code",
});

shortlinkRoutes.post("/api/shorten-html", shortenLimiter, async (c) => {
  try {
    const body = await c.req.parseBody();
    const validated = Schema.decodeUnknownSync(ShortenRequestSchema)(body);

    const shortlink = await Effect.runPromise(createOrGetShortlink(validated.url).pipe(Effect.provide(AppConfigLive)));

    return c.html(renderShortenSuccess(shortlink.shortUrl, shortlink.isNew), 200);
  } catch (error) {
    console.error("Shorten failed:", error);
    if (error instanceof BadRequestError) {
      return c.html(renderError(error.message), 400);
    }
    if (error instanceof ServiceUnavailableError) {
      return c.html(renderError(error.message), 503);
    }
    if (error instanceof InternalServerError) {
      return c.html(renderError(error.message), 500);
    }
    if (error instanceof NotFoundError) {
      return c.html(renderNotFound(), 404);
    }
    return c.html(renderError("Server error"), 500);
  }
});

shortlinkRoutes.get("/:code", redirectLimiter, async (c) => {
  const code = c.req.param("code");
  const skipCountdown = c.req.query("direct") === "true";

  try {
    const url = await Effect.runPromise(getAndRedirect(code));

    if (skipCountdown) {
      return c.redirect(url, 302);
    }

    return c.html(renderCountdown(url), 200);
  } catch (error) {
    console.error("Redirect failed:", { code, error });
    if (error instanceof NotFoundError) {
      return c.html(renderNotFound(), 404);
    }
    if (error instanceof InternalServerError) {
      return c.html(renderError(error.message), 500);
    }
    return c.html(renderError("Server error"), 500);
  }
});
