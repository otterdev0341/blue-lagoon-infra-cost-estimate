import { Hono } from "hono";
import { cors } from "hono/cors";
import { serveStatic } from "hono/bun";
import { connectDB } from "./db/client.ts";
import { runMigrations } from "./db/migrate.ts";
import diagramsRoute from "./routes/diagrams.ts";
import pricingRoute from "./routes/pricing.ts";

const isProd = process.env.NODE_ENV === "production";

async function main() {
  // Connect to MongoDB and ensure indexes
  await connectDB();
  await runMigrations();

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
    c.json({ status: "ok", db: "mongodb+mongoose", ts: new Date().toISOString() })
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

  // Use Bun.serve() directly so the HTTP listener binds immediately
  // (export default with a Promise does NOT start the server in Bun)
  Bun.serve({ port: PORT, fetch: app.fetch });

  console.log(`\n🚀  Server  →  http://localhost:${PORT}`);
  console.log(`   DB      →  MongoDB + Mongoose`);
  console.log(`   Mode    →  ${isProd ? "production (serving static frontend)" : "development"}\n`);
}

main().catch((err) => {
  console.error("[startup] Fatal error:", err);
  process.exit(1);
});
