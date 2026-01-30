import { Effect } from "effect";
import { db, shortlinks } from "db";
import { eq, sql } from "drizzle-orm";
import { RepositoryError } from "../domain/errors.js";

export const findShortlinkByCode = (code: string) =>
  Effect.tryPromise({
    try: async () => {
      const result = await db.query.shortlinks.findFirst({
        where: eq(shortlinks.code, code),
      });
      return result || null;
    },
    catch: (error) =>
      new RepositoryError({
        operation: "findByCode",
        cause: error,
      }),
  });

export const findShortlinkByUrl = (url: string) =>
  Effect.tryPromise({
    try: async () => {
      const results = await db.select().from(shortlinks).where(eq(shortlinks.url, url)).limit(1);
      return results[0] || null;
    },
    catch: (error) =>
      new RepositoryError({
        operation: "findByUrl",
        cause: error,
      }),
  });

export const createShortlink = (code: string, url: string) =>
  Effect.tryPromise({
    try: async () => {
      const [result] = await db.insert(shortlinks).values({ code, url }).returning();
      return result;
    },
    catch: (error) =>
      new RepositoryError({
        operation: "create",
        cause: error,
      }),
  });

export const incrementClickCount = (code: string) =>
  Effect.tryPromise({
    try: () =>
      db
        .update(shortlinks)
        .set({ clicks: sql`${shortlinks.clicks} + 1` })
        .where(eq(shortlinks.code, code)),
    catch: (error) =>
      new RepositoryError({
        operation: "incrementClicks",
        cause: error,
      }),
  });
