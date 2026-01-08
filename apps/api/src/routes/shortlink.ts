import { Hono } from "hono";
import { Effect } from "effect";
import { generateUniqueCode, createShortlink, getAndRedirect } from "../services/shortlink.js";

export const shortlinkRoutes = new Hono();

shortlinkRoutes.post("/api/shorten", async (c) => {
  const body = await c.req.json<{ url: string }>();

    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const code = yield* generateUniqueCode.pipe(
          Effect.retry({ times: 3 }),
          Effect.timeout("5 seconds"),
        );

        const shortlink = yield* createShortlink(code, body.url);

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
      return c.json({ error: result.error }, 500);
    }

    return c.json(result);
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
