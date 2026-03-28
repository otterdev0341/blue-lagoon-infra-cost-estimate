/**
 * Database client — bun:sqlite (built-in, zero deps) via Drizzle ORM.
 *
 * bun:sqlite is bundled inside the bun binary — no npm package or native
 * compilation required. This is why we dropped better-sqlite3.
 *
 * TODO (MongoDB migration):
 *   1. Replace this file with a Mongoose connect() call.
 *   2. Export a connected mongoose instance instead of `db`.
 *   3. Swap function bodies in queries.ts — signatures stay the same.
 */
import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { mkdirSync } from "fs";
import { dirname } from "path";
import * as schema from "./schema.ts";

const DB_PATH = process.env.SQLITE_PATH ?? "./data/app.db";

// Ensure the data directory exists before opening the file
mkdirSync(dirname(DB_PATH), { recursive: true });

const sqlite = new Database(DB_PATH, { create: true });

sqlite.exec("PRAGMA journal_mode = WAL;");
sqlite.exec("PRAGMA foreign_keys = ON;");

export const db = drizzle(sqlite, { schema });
export { sqlite };
