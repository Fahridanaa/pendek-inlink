import { db } from "./client.js";
import { shortlinks } from "./schema.js";

async function test() {
  console.log("Testing insert...");

  const result = await db
    .insert(shortlinks)
    .values({
      code: "test123",
      url: "https://google.com",
    })
    .returning();

  console.log("Inserted:", result);

  console.log("\nFetching all links...");
  const all = await db.select().from(shortlinks);
  console.log("All links:", all);
}

test().catch(console.error);
