import { Hono } from "hono";
import { shortlinkRoutes } from "./routes/shortlink.js";

const app = new Hono();

app.route("/", shortlinkRoutes);

export default app;
