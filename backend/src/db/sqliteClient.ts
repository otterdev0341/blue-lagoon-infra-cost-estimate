/**
 * SQLite client using Bun's built-in bun:sqlite — zero extra dependencies.
 * Used automatically when MONGODB_URI is not set (local development).
 *
 * Database file: backend/data/app.db (auto-created on first run)
 */
import { Database } from "bun:sqlite";
import { mkdirSync } from "fs";
import { join } from "path";

const dbPath = process.env.SQLITE_PATH ?? join(import.meta.dir, "../../../data/app.db");

// Ensure data directory exists
mkdirSync(join(dbPath, ".."), { recursive: true });

export const sqliteDb = new Database(dbPath, { create: true });

// Enable WAL mode for better concurrent read performance
sqliteDb.exec("PRAGMA journal_mode = WAL;");
sqliteDb.exec("PRAGMA foreign_keys = ON;");

/** Create all tables if they do not already exist. */
export function initSQLite(): void {
  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS diagrams (
      id                   TEXT PRIMARY KEY,
      name                 TEXT NOT NULL,
      description          TEXT,
      region               TEXT NOT NULL DEFAULT 'us-east-1',
      billingModel         TEXT NOT NULL DEFAULT 'ondemand',
      nodes                TEXT NOT NULL DEFAULT '[]',
      edges                TEXT NOT NULL DEFAULT '[]',
      stickyNotes          TEXT NOT NULL DEFAULT '[]',
      departmentRates      TEXT NOT NULL DEFAULT '[]',
      additionalCosts      TEXT NOT NULL DEFAULT '[]',
      subscriptions        TEXT NOT NULL DEFAULT '[]',
      sellingPriceUSD      REAL NOT NULL DEFAULT 0,
      year2SellingPriceUSD REAL NOT NULL DEFAULT 0,
      monthlyChargeUSD     REAL NOT NULL DEFAULT 0,
      isTemplate           INTEGER NOT NULL DEFAULT 0,
      createdAt            TEXT NOT NULL,
      updatedAt            TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS snapshots (
      id          TEXT PRIMARY KEY,
      diagramId   TEXT NOT NULL,
      label       TEXT,
      nodes       TEXT NOT NULL DEFAULT '[]',
      edges       TEXT NOT NULL DEFAULT '[]',
      stickyNotes TEXT NOT NULL DEFAULT '[]',
      createdAt   TEXT NOT NULL,
      FOREIGN KEY (diagramId) REFERENCES diagrams(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_snapshots_diagram ON snapshots(diagramId);

    CREATE TABLE IF NOT EXISTS pricing_cache (
      service    TEXT NOT NULL,
      region     TEXT NOT NULL,
      data       TEXT NOT NULL,
      fetchedAt  TEXT NOT NULL,
      ttlHours   REAL NOT NULL DEFAULT 24,
      PRIMARY KEY (service, region)
    );
  `);

  console.log(`[db] SQLite ready → ${dbPath}`);
}
