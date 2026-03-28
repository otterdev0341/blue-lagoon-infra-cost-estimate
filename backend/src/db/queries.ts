/**
 * All DB access lives here — one function per operation.
 *
 * TODO (MongoDB migration):
 *   Replace each function body with a Mongoose call.
 *   All function signatures stay identical so routes need zero changes.
 */
import { eq, desc, and } from "drizzle-orm";
import { db } from "./client.ts";
import { diagrams, diagramSnapshots, pricingCache } from "./schema.ts";
import { randomUUID } from "crypto";
import type { Diagram, DiagramSnapshot, PricingCacheEntry } from "../types.ts";

// ─── helpers ─────────────────────────────────────────────────────────────────

function rowToDiagram(r: typeof diagrams.$inferSelect): Diagram {
  return {
    id: r.id,
    name: r.name,
    description: r.description ?? undefined,
    region: r.region,
    billingModel: r.billingModel as Diagram["billingModel"],
    nodes: JSON.parse(r.nodesJson),
    edges: JSON.parse(r.edgesJson),
    stickyNotes: JSON.parse(r.stickyNotesJson),
    departmentRates: JSON.parse(r.departmentRatesJson ?? "[]"),
    isTemplate: r.isTemplate === 1,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

function now() {
  return new Date().toISOString();
}

// ─── Diagrams ────────────────────────────────────────────────────────────────

export function listDiagrams() {
  return db
    .select({
      id:           diagrams.id,
      name:         diagrams.name,
      description:  diagrams.description,
      region:       diagrams.region,
      billingModel: diagrams.billingModel,
      isTemplate:   diagrams.isTemplate,
      createdAt:    diagrams.createdAt,
      updatedAt:    diagrams.updatedAt,
    })
    .from(diagrams)
    .orderBy(desc(diagrams.updatedAt))
    .all();
}

export function getDiagram(id: string): Diagram | null {
  const row = db.select().from(diagrams).where(eq(diagrams.id, id)).get();
  return row ? rowToDiagram(row) : null;
}

export function createDiagram(
  data: Omit<Diagram, "id" | "createdAt" | "updatedAt">
): Diagram {
  const id = randomUUID();
  const ts = now();
  db.insert(diagrams).values({
    id,
    name:            data.name,
    description:     data.description,
    region:          data.region,
    billingModel:    data.billingModel,
    nodesJson:       JSON.stringify(data.nodes),
    edgesJson:       JSON.stringify(data.edges),
    stickyNotesJson: JSON.stringify(data.stickyNotes),
    departmentRatesJson: JSON.stringify(data.departmentRates ?? []),
    isTemplate:      data.isTemplate ? 1 : 0,
    createdAt:       ts,
    updatedAt:       ts,
  }).run();
  return getDiagram(id)!;
}

export function updateDiagram(
  id: string,
  data: Partial<Omit<Diagram, "id" | "createdAt" | "updatedAt">>
): Diagram | null {
  const existing = getDiagram(id);
  if (!existing) return null;

  // Auto-snapshot before overwrite (named manual save)
  insertSnapshot(id, existing, "Auto-checkpoint");

  db.update(diagrams)
    .set({
      name:            data.name            ?? existing.name,
      description:     data.description     ?? existing.description,
      region:          data.region          ?? existing.region,
      billingModel:    data.billingModel     ?? existing.billingModel,
      nodesJson:       JSON.stringify(data.nodes        ?? existing.nodes),
      edgesJson:       JSON.stringify(data.edges        ?? existing.edges),
      stickyNotesJson: JSON.stringify(data.stickyNotes  ?? existing.stickyNotes),
      departmentRatesJson: JSON.stringify(data.departmentRates ?? existing.departmentRates ?? []),
      isTemplate:      data.isTemplate !== undefined ? (data.isTemplate ? 1 : 0) : (existing.isTemplate ? 1 : 0),
      updatedAt:       now(),
    })
    .where(eq(diagrams.id, id))
    .run();

  return getDiagram(id)!;
}

/** Lightweight canvas update — no snapshot (used by auto-save). */
export function updateDiagramCanvas(
  id: string,
  data: Pick<Diagram, "nodes" | "edges" | "stickyNotes"> & { departmentRates?: Diagram["departmentRates"] }
): Diagram | null {
  const existing = getDiagram(id);
  if (!existing) return null;

  db.update(diagrams)
    .set({
      nodesJson:          JSON.stringify(data.nodes),
      edgesJson:          JSON.stringify(data.edges),
      stickyNotesJson:    JSON.stringify(data.stickyNotes),
      departmentRatesJson: JSON.stringify(data.departmentRates ?? existing.departmentRates ?? []),
      updatedAt:          now(),
    })
    .where(eq(diagrams.id, id))
    .run();

  return getDiagram(id)!;
}

/** Explicitly create a named snapshot checkpoint. */
export function createNamedSnapshot(id: string, label?: string): DiagramSnapshot | null {
  const existing = getDiagram(id);
  if (!existing) return null;
  const snapshotId = insertSnapshot(id, existing, label ?? "Checkpoint");
  const row = db.select().from(diagramSnapshots).where(eq(diagramSnapshots.id, snapshotId)).get();
  if (!row) return null;
  return {
    id:          row.id,
    diagramId:   row.diagramId,
    label:       row.label ?? undefined,
    nodes:       JSON.parse(row.nodesJson),
    edges:       JSON.parse(row.edgesJson),
    stickyNotes: JSON.parse(row.stickyNotesJson),
    createdAt:   row.createdAt,
  };
}

/** Restore a snapshot into the live diagram (creates a "before restore" snapshot first). */
export function restoreSnapshot(diagramId: string, snapshotId: string): Diagram | null {
  const existing = getDiagram(diagramId);
  if (!existing) return null;

  const row = db.select().from(diagramSnapshots)
    .where(eq(diagramSnapshots.id, snapshotId))
    .get();
  if (!row || row.diagramId !== diagramId) return null;

  // Save current state as "Before restore" snapshot
  insertSnapshot(diagramId, existing, "Before restore");

  db.update(diagrams)
    .set({
      nodesJson:       row.nodesJson,
      edgesJson:       row.edgesJson,
      stickyNotesJson: row.stickyNotesJson,
      updatedAt:       now(),
    })
    .where(eq(diagrams.id, diagramId))
    .run();

  return getDiagram(diagramId)!;
}

export function setDiagramTemplate(id: string, isTemplate: boolean): Diagram | null {
  const existing = getDiagram(id);
  if (!existing) return null;
  db.update(diagrams)
    .set({ isTemplate: isTemplate ? 1 : 0, updatedAt: now() })
    .where(eq(diagrams.id, id))
    .run();
  return getDiagram(id)!;
}

export function deleteDiagram(id: string): boolean {
  const result = db.delete(diagrams).where(eq(diagrams.id, id)).run();
  return result.changes > 0;
}

// ─── Snapshots ───────────────────────────────────────────────────────────────

export function getSnapshots(diagramId: string): DiagramSnapshot[] {
  return db
    .select()
    .from(diagramSnapshots)
    .where(eq(diagramSnapshots.diagramId, diagramId))
    .orderBy(desc(diagramSnapshots.createdAt))
    .limit(20)
    .all()
    .map((r) => ({
      id:          r.id,
      diagramId:   r.diagramId,
      label:       (r as any).label ?? undefined,
      nodes:       JSON.parse(r.nodesJson),
      edges:       JSON.parse(r.edgesJson),
      stickyNotes: JSON.parse(r.stickyNotesJson),
      createdAt:   r.createdAt,
    }));
}

function insertSnapshot(diagramId: string, d: Diagram, label?: string): string {
  const id = randomUUID();
  db.insert(diagramSnapshots).values({
    id,
    diagramId,
    nodesJson:       JSON.stringify(d.nodes),
    edgesJson:       JSON.stringify(d.edges),
    stickyNotesJson: JSON.stringify(d.stickyNotes),
    ...(label ? { label } : {}),
  } as any).run();
  // SQLite trigger trims to 20 automatically
  return id;
}

// ─── Pricing Cache ───────────────────────────────────────────────────────────

export function getPricingCache(
  service: string,
  region: string
): PricingCacheEntry | null {
  const row = db
    .select()
    .from(pricingCache)
    .where(
      and(
        eq(pricingCache.service, service),
        eq(pricingCache.region,  region)
      )
    )
    .get();

  if (!row) return null;

  const ageHours = (Date.now() - new Date(row.fetchedAt).getTime()) / 3_600_000;
  if (ageHours > row.ttlHours) return null; // expired

  return {
    service:   row.service,
    region:    row.region,
    data:      JSON.parse(row.dataJson),
    fetchedAt: row.fetchedAt,
  };
}

export function upsertPricingCache(service: string, region: string, data: unknown) {
  db.insert(pricingCache)
    .values({
      id:        randomUUID(),
      service,
      region,
      dataJson:  JSON.stringify(data),
      fetchedAt: now(),
    })
    .onConflictDoUpdate({
      target: [pricingCache.service, pricingCache.region],
      set: {
        dataJson:  JSON.stringify(data),
        fetchedAt: now(),
      },
    })
    .run();
}
