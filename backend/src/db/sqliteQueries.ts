/**
 * All DB access backed by bun:sqlite.
 * Function signatures are identical to queries.ts (Mongoose version)
 * so the route layer can import from either file transparently.
 */
import { randomUUID } from "crypto";
import { sqliteDb } from "./sqliteClient.ts";
import type { Diagram, DiagramSnapshot, PricingCacheEntry } from "../types.ts";

// ── helpers ────────────────────────────────────────────────────────────────────

function rowToDiagram(row: any): Diagram {
  return {
    id:              row.id,
    name:            row.name,
    description:     row.description ?? undefined,
    region:          row.region,
    billingModel:    row.billingModel,
    nodes:           JSON.parse(row.nodes  ?? "[]"),
    edges:           JSON.parse(row.edges  ?? "[]"),
    stickyNotes:     JSON.parse(row.stickyNotes     ?? "[]"),
    departmentRates: JSON.parse(row.departmentRates ?? "[]"),
    additionalCosts: JSON.parse(row.additionalCosts ?? "[]"),
    subscriptions:   JSON.parse(row.subscriptions   ?? "[]"),
    sellingPriceUSD:      row.sellingPriceUSD      ?? 0,
    year2SellingPriceUSD: row.year2SellingPriceUSD ?? 0,
    monthlyChargeUSD:     row.monthlyChargeUSD     ?? 0,
    isTemplate:      row.isTemplate === 1,
    createdAt:       row.createdAt,
    updatedAt:       row.updatedAt,
  };
}

function rowToSnapshot(row: any): DiagramSnapshot {
  return {
    id:          row.id,
    diagramId:   row.diagramId,
    label:       row.label ?? "",
    nodes:       JSON.parse(row.nodes       ?? "[]"),
    edges:       JSON.parse(row.edges       ?? "[]"),
    stickyNotes: JSON.parse(row.stickyNotes ?? "[]"),
    createdAt:   row.createdAt,
  };
}

const now = () => new Date().toISOString();

// ── Diagrams ───────────────────────────────────────────────────────────────────

export async function listDiagrams(): Promise<Diagram[]> {
  const rows = sqliteDb.query(
    `SELECT id, name, description, region, billingModel, isTemplate,
            sellingPriceUSD, year2SellingPriceUSD, monthlyChargeUSD,
            createdAt, updatedAt
     FROM diagrams ORDER BY updatedAt DESC`
  ).all() as any[];
  return rows.map((r) => ({
    ...rowToDiagram({ ...r, nodes: "[]", edges: "[]", stickyNotes: "[]", departmentRates: "[]", additionalCosts: "[]", subscriptions: "[]" }),
  }));
}

export async function getDiagram(id: string): Promise<Diagram | null> {
  const row = sqliteDb.query("SELECT * FROM diagrams WHERE id = ?").get(id) as any;
  return row ? rowToDiagram(row) : null;
}

export async function createDiagram(
  data: Omit<Diagram, "id" | "createdAt" | "updatedAt">
): Promise<Diagram> {
  const id = randomUUID();
  const ts = now();
  sqliteDb.query(`
    INSERT INTO diagrams
      (id, name, description, region, billingModel,
       nodes, edges, stickyNotes, departmentRates, additionalCosts, subscriptions,
       sellingPriceUSD, year2SellingPriceUSD, monthlyChargeUSD, isTemplate,
       createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    data.name,
    data.description ?? null,
    data.region,
    data.billingModel,
    JSON.stringify(data.nodes ?? []),
    JSON.stringify(data.edges ?? []),
    JSON.stringify(data.stickyNotes ?? []),
    JSON.stringify(data.departmentRates ?? []),
    JSON.stringify((data as any).additionalCosts ?? []),
    JSON.stringify((data as any).subscriptions ?? []),
    (data as any).sellingPriceUSD      ?? 0,
    (data as any).year2SellingPriceUSD ?? 0,
    (data as any).monthlyChargeUSD     ?? 0,
    data.isTemplate ? 1 : 0,
    ts, ts,
  );
  return (await getDiagram(id))!;
}

export async function updateDiagram(
  id: string,
  data: Partial<Omit<Diagram, "id" | "createdAt" | "updatedAt">>
): Promise<Diagram | null> {
  const existing = await getDiagram(id);
  if (!existing) return null;

  await insertSnapshot(id, existing, "Auto-checkpoint");

  sqliteDb.query(`
    UPDATE diagrams SET
      name            = ?,
      description     = ?,
      region          = ?,
      billingModel    = ?,
      nodes           = ?,
      edges           = ?,
      stickyNotes     = ?,
      departmentRates = ?,
      additionalCosts = ?,
      subscriptions   = ?,
      sellingPriceUSD       = ?,
      year2SellingPriceUSD  = ?,
      monthlyChargeUSD      = ?,
      isTemplate      = ?,
      updatedAt       = ?
    WHERE id = ?
  `).run(
    data.name            ?? existing.name,
    data.description     ?? existing.description ?? null,
    data.region          ?? existing.region,
    data.billingModel    ?? existing.billingModel,
    JSON.stringify(data.nodes           ?? existing.nodes),
    JSON.stringify(data.edges           ?? existing.edges),
    JSON.stringify(data.stickyNotes     ?? existing.stickyNotes),
    JSON.stringify(data.departmentRates ?? existing.departmentRates),
    JSON.stringify((data as any).additionalCosts ?? (existing as any).additionalCosts ?? []),
    JSON.stringify((data as any).subscriptions   ?? (existing as any).subscriptions   ?? []),
    (data as any).sellingPriceUSD      ?? (existing as any).sellingPriceUSD      ?? 0,
    (data as any).year2SellingPriceUSD ?? (existing as any).year2SellingPriceUSD ?? 0,
    (data as any).monthlyChargeUSD     ?? (existing as any).monthlyChargeUSD     ?? 0,
    (data as any).isTemplate !== undefined ? ((data as any).isTemplate ? 1 : 0) : (existing.isTemplate ? 1 : 0),
    now(),
    id,
  );
  return getDiagram(id);
}

/** Lightweight canvas update — no snapshot (used by auto-save). */
export async function updateDiagramCanvas(
  id: string,
  data: Pick<Diagram, "nodes" | "edges" | "stickyNotes"> & {
    departmentRates?: Diagram["departmentRates"];
    additionalCosts?: unknown[];
    subscriptions?: unknown[];
    sellingPriceUSD?: number;
    year2SellingPriceUSD?: number;
    monthlyChargeUSD?: number;
  }
): Promise<Diagram | null> {
  sqliteDb.query(`
    UPDATE diagrams SET
      nodes                = ?,
      edges                = ?,
      stickyNotes          = ?,
      departmentRates      = ?,
      additionalCosts      = ?,
      subscriptions        = ?,
      sellingPriceUSD      = ?,
      year2SellingPriceUSD = ?,
      monthlyChargeUSD     = ?,
      updatedAt            = ?
    WHERE id = ?
  `).run(
    JSON.stringify(data.nodes),
    JSON.stringify(data.edges),
    JSON.stringify(data.stickyNotes),
    JSON.stringify(data.departmentRates ?? []),
    JSON.stringify(data.additionalCosts ?? []),
    JSON.stringify(data.subscriptions   ?? []),
    data.sellingPriceUSD      ?? 0,
    data.year2SellingPriceUSD ?? 0,
    data.monthlyChargeUSD     ?? 0,
    now(),
    id,
  );
  return getDiagram(id);
}

export async function setDiagramTemplate(id: string, isTemplate: boolean): Promise<Diagram | null> {
  sqliteDb.query("UPDATE diagrams SET isTemplate = ?, updatedAt = ? WHERE id = ?")
    .run(isTemplate ? 1 : 0, now(), id);
  return getDiagram(id);
}

export async function deleteDiagram(id: string): Promise<boolean> {
  const res = sqliteDb.query("DELETE FROM diagrams WHERE id = ?").run(id);
  return (res.changes ?? 0) > 0;
}

// ── Snapshots ─────────────────────────────────────────────────────────────────

export async function getSnapshots(diagramId: string): Promise<DiagramSnapshot[]> {
  const rows = sqliteDb.query(
    "SELECT * FROM snapshots WHERE diagramId = ? ORDER BY createdAt DESC LIMIT 20"
  ).all(diagramId) as any[];
  return rows.map(rowToSnapshot);
}

export async function createNamedSnapshot(
  id: string,
  label?: string
): Promise<DiagramSnapshot | null> {
  const existing = await getDiagram(id);
  if (!existing) return null;
  const snapId = await insertSnapshot(id, existing, label ?? "Checkpoint");
  const row = sqliteDb.query("SELECT * FROM snapshots WHERE id = ?").get(snapId) as any;
  return row ? rowToSnapshot(row) : null;
}

export async function restoreSnapshot(
  diagramId: string,
  snapshotId: string
): Promise<Diagram | null> {
  const existing = await getDiagram(diagramId);
  if (!existing) return null;

  const snap = sqliteDb.query(
    "SELECT * FROM snapshots WHERE id = ? AND diagramId = ?"
  ).get(snapshotId, diagramId) as any;
  if (!snap) return null;

  await insertSnapshot(diagramId, existing, "Before restore");

  sqliteDb.query(`
    UPDATE diagrams SET nodes = ?, edges = ?, stickyNotes = ?, updatedAt = ? WHERE id = ?
  `).run(snap.nodes, snap.edges, snap.stickyNotes, now(), diagramId);

  return getDiagram(diagramId);
}

async function insertSnapshot(diagramId: string, d: Diagram, label?: string): Promise<string> {
  const id = randomUUID();
  sqliteDb.query(`
    INSERT INTO snapshots (id, diagramId, label, nodes, edges, stickyNotes, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, diagramId, label ?? null,
    JSON.stringify(d.nodes),
    JSON.stringify(d.edges),
    JSON.stringify(d.stickyNotes),
    now(),
  );

  // Keep only the 20 most recent snapshots per diagram
  const all = sqliteDb.query(
    "SELECT id FROM snapshots WHERE diagramId = ? ORDER BY createdAt DESC"
  ).all(diagramId) as any[];
  if (all.length > 20) {
    const toDelete = all.slice(20).map((r: any) => r.id);
    const placeholders = toDelete.map(() => "?").join(",");
    sqliteDb.query(`DELETE FROM snapshots WHERE id IN (${placeholders})`).run(...toDelete);
  }
  return id;
}

// ── Pricing Cache ──────────────────────────────────────────────────────────────

export async function getPricingCache(
  service: string,
  region: string
): Promise<PricingCacheEntry | null> {
  const row = sqliteDb.query(
    "SELECT * FROM pricing_cache WHERE service = ? AND region = ?"
  ).get(service, region) as any;
  if (!row) return null;

  const ageHours = (Date.now() - new Date(row.fetchedAt).getTime()) / 3_600_000;
  if (ageHours > row.ttlHours) return null;

  return {
    service: row.service,
    region:  row.region,
    data:    JSON.parse(row.data),
    fetchedAt: row.fetchedAt,
  };
}

export async function upsertPricingCache(service: string, region: string, data: unknown) {
  sqliteDb.query(`
    INSERT INTO pricing_cache (service, region, data, fetchedAt, ttlHours)
    VALUES (?, ?, ?, ?, 24)
    ON CONFLICT(service, region) DO UPDATE SET data = excluded.data, fetchedAt = excluded.fetchedAt
  `).run(service, region, JSON.stringify(data), now());
}
