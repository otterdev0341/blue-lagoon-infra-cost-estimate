/**
 * MongoDB index setup — called at server startup.
 * Safe to call repeatedly (createIndex is idempotent).
 */
import { DiagramModel, SnapshotModel, PricingCacheModel } from "./schema.ts";

export async function runMigrations(): Promise<void> {
  console.log("[db] Ensuring MongoDB indexes…");
  await DiagramModel.createIndexes();
  await SnapshotModel.createIndexes();
  await PricingCacheModel.createIndexes();
  console.log("[db] Indexes ready.");
}
