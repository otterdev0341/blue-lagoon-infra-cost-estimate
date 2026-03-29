/**
 * Unified DB export — routes should import from here, not from queries.ts directly.
 *
 * Automatically selects the right backend:
 *   MONGODB_URI set   → MongoDB + Mongoose  (queries.ts)
 *   MONGODB_URI unset → bun:sqlite          (sqliteQueries.ts)
 */
import { useMongo } from "./client.ts";

let db: typeof import("./queries.ts");

if (useMongo) {
  db = await import("./queries.ts");
} else {
  const { initSQLite } = await import("./sqliteClient.ts");
  initSQLite();
  db = await import("./sqliteQueries.ts") as typeof import("./queries.ts");
}

export const {
  listDiagrams,
  getDiagram,
  createDiagram,
  updateDiagram,
  updateDiagramCanvas,
  setDiagramTemplate,
  deleteDiagram,
  getSnapshots,
  createNamedSnapshot,
  restoreSnapshot,
  getPricingCache,
  upsertPricingCache,
} = db;
