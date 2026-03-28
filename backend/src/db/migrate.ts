/**
 * Programmatic migration runner — called at server startup.
 * Uses drizzle-kit generated SQL files in ./drizzle/
 *
 * Run manually: bun run db:migrate
 * Run at startup: imported by src/index.ts before serving requests.
 */
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import { db, sqlite } from "./client.ts";
import { existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_FOLDER = join(__dirname, "../../drizzle");

export function runMigrations() {
  if (!existsSync(MIGRATIONS_FOLDER)) {
    console.warn(
      `[db] No drizzle/ folder found at ${MIGRATIONS_FOLDER}.\n` +
      `     Run: cd backend && bun run db:generate  (first time)\n` +
      `     Then re-run the server.`
    );
    return;
  }

  console.log("[db] Running migrations…");
  migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
  console.log("[db] Migrations applied.");

  // Safely add new columns to existing databases
  try { sqlite.exec(`ALTER TABLE diagrams ADD COLUMN department_rates_json TEXT NOT NULL DEFAULT '[]'`); } catch { /* column already exists */ }
  try { sqlite.exec(`ALTER TABLE diagrams ADD COLUMN is_template INTEGER NOT NULL DEFAULT 0`); } catch { /* column already exists */ }
  try { sqlite.exec(`ALTER TABLE diagram_snapshots ADD COLUMN label TEXT`); } catch { /* column already exists */ }

  // Install trigger after tables exist — keeps snapshot history to 20 per diagram.
  // Drop old 10-limit trigger if present, then recreate at 20.
  sqlite.exec(`DROP TRIGGER IF EXISTS trim_snapshots`);
  sqlite.exec(`
    CREATE TRIGGER IF NOT EXISTS trim_snapshots
    AFTER INSERT ON diagram_snapshots
    BEGIN
      DELETE FROM diagram_snapshots
      WHERE diagram_id = NEW.diagram_id
        AND id NOT IN (
          SELECT id FROM diagram_snapshots
          WHERE diagram_id = NEW.diagram_id
          ORDER BY created_at DESC
          LIMIT 20
        );
    END;
  `);
}

// Allow running directly: bun run src/db/migrate.ts
if (import.meta.main) {
  runMigrations();
  sqlite.close();
  console.log("[db] Done.");
}
