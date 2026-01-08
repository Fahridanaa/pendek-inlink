import { integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const shortlinks = pgTable("shortlinks", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  url: text("url").notNull(),
  clicks: integer("clicks").default(0).notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

export type ShortLink = typeof shortlinks.$inferSelect;
export type NewShortLink = typeof shortlinks.$inferInsert;
