import { Hono } from "hono";
import { cors } from "hono/cors";
import { runMigrations } from "./db/migrate.ts";
import diagramsRoute from "./routes/diagrams.ts";
import pricingRoute from "./routes/pricing.ts";

// Apply all pending Drizzle migrations before handling any requests.
// Safe to call on every startup — already-applied migrations are skipped.
runMigrations();

const app = new Hono();

app.use(
  "/*",
  cors({
    origin: process.env.WEB_ORIGIN ?? "http://localhost:5173",
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  })
);

app.get("/health", (c) =>
  c.json({ status: "ok", db: "sqlite+drizzle", ts: new Date().toISOString() })
);

app.route("/api/diagrams", diagramsRoute);
app.route("/api/pricing", pricingRoute);

const PORT = Number(process.env.PORT ?? 3001);
console.log(`\n🚀  API  →  http://localhost:${PORT}`);
console.log(`   DB   →  SQLite + Drizzle ORM  (migrate to MongoDB for production)\n`);

export default { port: PORT, fetch: app.fetch };
