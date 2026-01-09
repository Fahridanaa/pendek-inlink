import "dotenv/config";
import { serve } from "@hono/node-server";
import app from "./app.js";

const port = parseInt(process.env.PORT || "4000");
const baseUrl = process.env.BASE_URL || `http://localhost:${port}`;

console.log(`Server starting on ${baseUrl}`);

serve({
  fetch: app.fetch,
  port,
});
