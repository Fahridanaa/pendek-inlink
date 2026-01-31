import { Hono } from "hono";
import { Effect, Schema } from "effect";
import { AppConfigLive } from "../config/index.js";
import { RequestParseError } from "../domain/errors.js";
import { getAndRedirect, createOrGetShortlink } from "../services/shortlink.js";
import { createRateLimiter } from "../middleware/rateLimiter.js";
import { renderShortenSuccess, renderError } from "../views/shortlink.js";

const ONE_MINUTE_MS = 60 * 1000;
const SHORTEN_RATE_LIMIT = 10;
const REDIRECT_RATE_LIMIT = 100;

type ShortenResult =
  | {
      code: string;
      shortUrl: string;
      clicks: number;
      isNew: boolean;
    }
  | {
      error: string;
      status: 400 | 500 | 503;
    };

const ShortenRequestSchema = Schema.Struct({
  url: Schema.String.pipe(Schema.nonEmptyString()),
});

const validateShortenRequest = (data: unknown) => Schema.decodeUnknown(ShortenRequestSchema)(data);

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
  const bodyEffect = Effect.tryPromise({
    try: () => c.req.parseBody(),
    catch: (e) => new RequestParseError({ cause: e }),
  });

  const result: ShortenResult = await Effect.runPromise(
    Effect.gen(function* () {
      const body = yield* bodyEffect;
      const validated = yield* validateShortenRequest(body);
      return yield* createOrGetShortlink(validated.url);
    }).pipe(
      Effect.provide(AppConfigLive),
      Effect.catchTags({
        ParseError: (e) => {
          console.error("Validation failed:", e);
          return Effect.succeed({
            error: "Format URL tidak valid. Pastikan URL sudah benar.",
            status: 400 as const,
          });
        },
        InvalidUrlError: (e) => {
          console.warn("Invalid URL attempted:", e.url);
          return Effect.succeed({
            error: `URL tidak valid: ${e.url}`,
            status: 400 as const,
          });
        },
        MaxAttemptsError: (e) => {
          console.error("Max attempts reached:", e.attempts);
          return Effect.succeed({
            error: "Gagal membuat kode unik. Silakan coba lagi.",
            status: 503 as const,
          });
        },
        RequestParseError: (e) => {
          console.error("Request parse error:", e.cause);
          return Effect.succeed({
            error: "Terjadi kesalahan server. Silakan coba lagi.",
            status: 500 as const,
          });
        },
        RepositoryError: (e) => {
          console.error("Database error:", e.cause);
          return Effect.succeed({
            error: "Terjadi kesalahan database. Silakan coba lagi.",
            status: 500 as const,
          });
        },
      }),

      // for safety purposes
      Effect.catchAllDefect((defect) => {
        console.error("DEFECT (BUG IN CODE):", defect);
        return Effect.succeed({
          error: "Internal server error",
          status: 500 as const,
        });
      }),
    ),
  );

  if ("error" in result) {
    return c.html(renderError(result.error), result.status);
  }

  return c.html(renderShortenSuccess(result.shortUrl, result.isNew), 200);
});

shortlinkRoutes.get("/:code", redirectLimiter, async (c) => {
  const code = c.req.param("code");
  const skipCountdown = c.req.query("direct") === "true";

  const result = await Effect.runPromise(getAndRedirect(code));

  if (!result) {
    return c.html(
      `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <title>Link Not Found - PendekInLink</title>
          <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@700;900&display=swap" rel="stylesheet">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: 'Space Grotesk', sans-serif;
              background: #f4f4f0;
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 2rem;
            }
            .container {
              background: white;
              border: 4px solid black;
              box-shadow: 8px 8px 0 black;
              padding: 3rem;
              max-width: 600px;
              text-align: center;
            }
            h1 { font-size: 4rem; font-weight: 900; margin-bottom: 1rem; }
            p { font-size: 1.2rem; font-weight: 600; margin-bottom: 2rem; }
            a {
              background: #FFFF00;
              border: 4px solid black;
              box-shadow: 4px 4px 0 black;
              padding: 1rem 2rem;
              font-weight: 900;
              text-transform: uppercase;
              text-decoration: none;
              color: black;
              display: inline-block;
            }
            a:hover {
              box-shadow: 2px 2px 0 black;
              transform: translate(2px, 2px);
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>404</h1>
            <p>Link nggak ditemukan! Mungkin salah ketik atau udah dihapus.</p>
            <a href="http://localhost:3000">BUAT LINK BARU</a>
          </div>
        </body>
        </html>
      `,
      404,
    );
  }

  if (skipCountdown) {
    return c.redirect(result);
  }

  return c.html(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Redirecting...</title>
        <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@700;900&display=swap" rel="stylesheet">
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: 'Space Grotesk', sans-serif;
            background: #f4f4f0;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 2rem;
          }
          .container {
            background: white;
            border: 4px solid black;
            box-shadow: 8px 8px 0 black;
            padding: 3rem;
            max-width: 600px;
            width: 100%;
            text-align: center;
          }
          h1 {
            font-size: 2.5rem;
            font-weight: 900;
            margin-bottom: 2rem;
          }
          .countdown {
            font-size: 5rem;
            font-weight: 900;
            color: #FFFF00;
            text-shadow: 4px 4px 0 black;
            margin: 2rem 0;
          }
          .url {
            background: #f4f4f0;
            border: 3px solid black;
            padding: 1rem;
            word-break: break-all;
            font-weight: 600;
            margin: 2rem 0;
          }
          .skip {
            background: #FFFF00;
            border: 4px solid black;
            box-shadow: 4px 4px 0 black;
            padding: 1rem 2rem;
            font-weight: 900;
            text-transform: uppercase;
            cursor: pointer;
            text-decoration: none;
            display: inline-block;
            color: black;
            margin-top: 1rem;
          }
          .skip:hover {
            box-shadow: 2px 2px 0 black;
            transform: translate(2px, 2px);
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Redirecting...</h1>
          <div class="countdown" id="countdown">5</div>
          <p style="font-weight: 700; margin-bottom: 1rem;">Kamu bakal diarahkan ke link berikut:</p>
          <div class="url">${result}</div>
          <a href="${result}" class="skip">SKIP</a>
        </div>

        <script>
          let count = 5;
          const countdownEl = document.getElementById('countdown');

          const interval = setInterval(() => {
            count--;
            countdownEl.textContent = count;

            if (count <= 0) {
              clearInterval(interval);
              window.location.href = "${result}";
            }
          }, 1000);
        </script>
      </body>
      </html>
    `);
});
