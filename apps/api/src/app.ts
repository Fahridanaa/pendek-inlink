import { Hono } from "hono";
import { requestContextMiddleware, type HonoEnv } from "./middleware/requestContext.js";
import { shortlinkRoutes } from "./routes/shortlink.js";

const app = new Hono<HonoEnv>();

app.use("*", requestContextMiddleware);
app.route("/", shortlinkRoutes);

export default app;
