import { Hono } from "hono";
import { cors } from "hono/cors";
import { serveStatic } from "hono/bun";
import { connectDB, useMongo } from "./db/client.ts";
import { runMigrations } from "./db/migrate.ts";
import diagramsRoute from "./routes/diagrams.ts";
import pricingRoute from "./routes/pricing.ts";

const isProd = process.env.NODE_ENV === "production";

async function main() {
  // Connect to DB:
  //   MONGODB_URI set  → MongoDB (production / cloud)
  //   MONGODB_URI unset → bun:sqlite (local dev, zero config)
  await connectDB();
  if (useMongo) await runMigrations();

  const app = new Hono();

  // CORS — in prod frontend is same origin (served by this server)
  app.use(
    "/api/*",
    cors({
      origin: process.env.WEB_ORIGIN ?? (isProd ? "*" : "http://localhost:5173"),
      allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowHeaders: ["Content-Type", "Authorization"],
    })
  );

  // Health check
  app.get("/health", (c) =>
    c.json({
      status: "ok",
      db: useMongo ? "mongodb" : "sqlite",
      ts: new Date().toISOString(),
    })
  );

  // API routes
  app.route("/api/diagrams", diagramsRoute);
  app.route("/api/pricing", pricingRoute);

  // Serve built frontend static files in production
  if (isProd) {
    app.use("/*", serveStatic({ root: "./public" }));
    // SPA catch-all — return index.html for any unmatched path (React Router)
    app.get("*", serveStatic({ path: "./public/index.html" }));
  }

  const PORT = Number(process.env.PORT ?? 3001);

  Bun.serve({ port: PORT, fetch: app.fetch });

  const dbLabel = useMongo ? "MongoDB + Mongoose" : "SQLite (bun:sqlite)";
  console.log(`\n🚀  Server  →  http://localhost:${PORT}`);
  console.log(`   DB      →  ${dbLabel}`);
  console.log(`   Mode    →  ${isProd ? "production (serving static frontend)" : "development"}\n`);
}

main().catch((err) => {
  console.error("[startup] Fatal error:", err);
  process.exit(1);
});
