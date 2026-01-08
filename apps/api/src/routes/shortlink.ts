import { Hono } from "hono";
import { Effect } from "effect";
import { generateUniqueCode, createShortlink, getAndRedirect } from "../services/shortlink.js";

export const shortlinkRoutes = new Hono();

shortlinkRoutes.post("/api/shorten-html", async (c) => {
  const body = await c.req.parseBody();
  const url = body.url as string;

  const result = await Effect.runPromise(
    Effect.gen(function* () {
      const code = yield* generateUniqueCode.pipe(
        Effect.retry({ times: 3 }),
        Effect.timeout("5 seconds"),
      );

      const shortlink = yield* createShortlink(code, url);

      return {
        code: shortlink.code,
        shortUrl: `http://localhost:4000/${shortlink.code}`,
        originalUrl: shortlink.url,
      };
    }).pipe(
      Effect.catchAll((error) =>
        Effect.succeed({
          error: "Failed to shorten URL",
          details: String(error),
        }),
      ),
    ),
  );

  if ("error" in result) {
    return c.html(`
      <div class="neo-card bg-red-100">
        <p class="font-bold text-red-600">❌ Error: ${result.error}</p>
      </div>
    `);
  }

  return c.html(`
    <div class="neo-card bg-yellow-100" x-data="{ copied: false }">
      <h3 class="text-2xl font-black mb-4">Berhasil!</h3>

      <div class="space-y-4">
        <div>
          <label class="font-bold text-sm uppercase block mb-2">
          versi pendek link mu:
          </label>
          <div class="flex gap-2">
            <input
              x-ref="shortUrl"
              type="text"
              value="${result.shortUrl}"
              readonly
              class="neo-input flex-1"
              :class="{ 'selected': copied }"
              x-transition
            >
            <button
              @click="
                $refs.shortUrl.select();
                navigator.clipboard.writeText($refs.shortUrl.value);
                copied = true;
                setTimeout(() => copied = false, 2000);
              "
              class="neo-copy-btn"
              :class="{ 'copied': copied }"
            >
              <span x-show="!copied">Copy</span>
              <span x-show="copied">Ter-Copy</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `);
});

shortlinkRoutes.get("/:code", async (c) => {
  const code = c.req.param("code");

  const result = await Effect.runPromise(
    getAndRedirect(code).pipe(
      Effect.catchTags({
        NotFound: () => Effect.succeed(null),
        DatabaseError: (error) => {
          console.error("Database error:", error.cause);
          return Effect.succeed(null);
        },
      }),
    ),
  );

  if (!result) {
    return c.notFound();
  }

  return c.redirect(result);
});
