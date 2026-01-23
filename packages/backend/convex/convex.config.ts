import migrations from "@convex-dev/migrations/convex.config";
import workpool from "@convex-dev/workpool/convex.config.js";
import { defineApp } from "convex/server";

const app = defineApp();
app.use(migrations);
app.use(workpool, { name: "cleanupWorkpool" });

export default app;
