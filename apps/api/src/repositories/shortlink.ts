import { db, shortlinks } from "db";
import { eq, sql } from "drizzle-orm";

export function findShortlinkByCode(code: string) {
  return db.query.shortlinks.findFirst({
    where: eq(shortlinks.code, code),
  });
}

export async function findShortlinkByUrl(url: string) {
  const result = await db.select().from(shortlinks).where(eq(shortlinks.url, url)).limit(1);

  return result[0] || null;
}

export function createShortlink(code: string, url: string) {
  return db.insert(shortlinks).values({ code, url }).returning();
}

export function incrementClickCount(code: string) {
  return db
    .update(shortlinks)
    .set({ clicks: sql`${shortlinks.clicks} + 1` })
    .where(eq(shortlinks.code, code));
}
