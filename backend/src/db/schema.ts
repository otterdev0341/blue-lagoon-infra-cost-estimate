import { sqliteTable, text, integer, uniqueIndex } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// ─── diagrams ────────────────────────────────────────────────────────────────
// Stores the full canvas state: React Flow nodes, edges, and sticky notes
// serialised as JSON columns.
//
// TODO (MongoDB migration): replace this table with a `diagrams` Mongoose model.
// JSON columns → native BSON objects (no serialisation needed in Mongo).
export const diagrams = sqliteTable("diagrams", {
  id:             text("id").primaryKey(),
  name:           text("name").notNull(),
  description:    text("description"),
  region:         text("region").notNull().default("us-east-1"),
  billingModel:   text("billing_model", {
                    enum: ["ondemand", "reserved1yr", "reserved3yr", "spot"],
                  }).notNull().default("ondemand"),
  nodesJson:      text("nodes_json").notNull().default("[]"),
  edgesJson:      text("edges_json").notNull().default("[]"),
  stickyNotesJson: text("sticky_notes_json").notNull().default("[]"),
  departmentRatesJson: text("department_rates_json").notNull().default("[]"),
  isTemplate:     integer("is_template").notNull().default(0),
  createdAt:      text("created_at").notNull().default(sql`(datetime('now'))`),
  updatedAt:      text("updated_at").notNull().default(sql`(datetime('now'))`),
});

// ─── diagram_snapshots ───────────────────────────────────────────────────────
// Auto-created before each update (max 10 per diagram via SQLite trigger).
// TODO (MongoDB migration): embed as a `snapshots[]` array inside the diagram
// document, capped at 10 entries with $slice on push.
export const diagramSnapshots = sqliteTable("diagram_snapshots", {
  id:             text("id").primaryKey(),
  diagramId:      text("diagram_id").notNull().references(() => diagrams.id, { onDelete: "cascade" }),
  label:          text("label"),
  nodesJson:      text("nodes_json").notNull(),
  edgesJson:      text("edges_json").notNull(),
  stickyNotesJson: text("sticky_notes_json").notNull(),
  createdAt:      text("created_at").notNull().default(sql`(datetime('now'))`),
});

// ─── pricing_cache ───────────────────────────────────────────────────────────
// Caches AWS price-list data per service+region with a TTL.
// TODO (MongoDB migration): use a `pricing_cache` collection with a TTL index
// on `fetchedAt` field (MongoDB handles expiry automatically).
export const pricingCache = sqliteTable(
  "pricing_cache",
  {
    id:        text("id").primaryKey(),
    service:   text("service").notNull(),
    region:    text("region").notNull(),
    dataJson:  text("data_json").notNull(),
    fetchedAt: text("fetched_at").notNull().default(sql`(datetime('now'))`),
    ttlHours:  integer("ttl_hours").notNull().default(24),
  },
  (t) => ({
    serviceRegionIdx: uniqueIndex("pricing_cache_service_region_idx").on(t.service, t.region),
  })
);

// ─── Inferred types ──────────────────────────────────────────────────────────
export type DiagramRow         = typeof diagrams.$inferSelect;
export type NewDiagramRow      = typeof diagrams.$inferInsert;
export type SnapshotRow        = typeof diagramSnapshots.$inferSelect;
export type NewSnapshotRow     = typeof diagramSnapshots.$inferInsert;
export type PricingCacheRow    = typeof pricingCache.$inferSelect;
