/**
 * All DB access — same function signatures as the SQLite version,
 * now backed by Mongoose + MongoDB.
 */
import { randomUUID } from "crypto";
import { DiagramModel, SnapshotModel, PricingCacheModel } from "./schema.ts";
import type { Diagram, DiagramSnapshot, PricingCacheEntry } from "../types.ts";

// ── helpers ───────────────────────────────────────────────────────────────────

function docToDiagram(doc: any): Diagram {
  return {
    id:              doc._id,
    name:            doc.name,
    description:     doc.description,
    region:          doc.region,
    billingModel:    doc.billingModel,
    nodes:           doc.nodes ?? [],
    edges:           doc.edges ?? [],
    stickyNotes:     doc.stickyNotes ?? [],
    departmentRates: doc.departmentRates ?? [],
    additionalCosts: doc.additionalCosts ?? [],
    subscriptions:   doc.subscriptions ?? [],
    sellingPriceUSD:      doc.sellingPriceUSD      ?? 0,
    year2SellingPriceUSD: doc.year2SellingPriceUSD ?? 0,
    isTemplate:      doc.isTemplate ?? false,
    createdAt:       doc.createdAt instanceof Date ? doc.createdAt.toISOString() : doc.createdAt,
    updatedAt:       doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : doc.updatedAt,
  };
}

function docToSnapshot(doc: any): DiagramSnapshot {
  return {
    id:          doc._id,
    diagramId:   doc.diagramId,
    label:       doc.label,
    nodes:       doc.nodes ?? [],
    edges:       doc.edges ?? [],
    stickyNotes: doc.stickyNotes ?? [],
    createdAt:   doc.createdAt instanceof Date ? doc.createdAt.toISOString() : doc.createdAt,
  };
}

// ── Diagrams ──────────────────────────────────────────────────────────────────

export async function listDiagrams() {
  const docs = await DiagramModel
    .find({}, { nodes: 0, edges: 0, stickyNotes: 0, departmentRates: 0 })
    .sort({ updatedAt: -1 })
    .lean();
  return docs.map(docToDiagram);
}

export async function getDiagram(id: string): Promise<Diagram | null> {
  const doc = await DiagramModel.findById(id).lean();
  return doc ? docToDiagram(doc) : null;
}

export async function createDiagram(
  data: Omit<Diagram, "id" | "createdAt" | "updatedAt">
): Promise<Diagram> {
  const id = randomUUID();
  const doc = await DiagramModel.create({
    _id:             id,
    name:            data.name,
    description:     data.description,
    region:          data.region,
    billingModel:    data.billingModel,
    nodes:           data.nodes ?? [],
    edges:           data.edges ?? [],
    stickyNotes:     data.stickyNotes ?? [],
    departmentRates: data.departmentRates ?? [],
    additionalCosts: (data as any).additionalCosts ?? [],
    subscriptions:   (data as any).subscriptions ?? [],
    sellingPriceUSD:      (data as any).sellingPriceUSD      ?? 0,
    year2SellingPriceUSD: (data as any).year2SellingPriceUSD ?? 0,
    isTemplate:           data.isTemplate ?? false,
  });
  return docToDiagram(doc);
}

export async function updateDiagram(
  id: string,
  data: Partial<Omit<Diagram, "id" | "createdAt" | "updatedAt">>
): Promise<Diagram | null> {
  const existing = await getDiagram(id);
  if (!existing) return null;

  // Auto-snapshot before overwrite
  await insertSnapshot(id, existing, "Auto-checkpoint");

  const doc = await DiagramModel.findByIdAndUpdate(
    id,
    {
      $set: {
        name:            data.name            ?? existing.name,
        description:     data.description     ?? existing.description,
        region:          data.region          ?? existing.region,
        billingModel:    data.billingModel     ?? existing.billingModel,
        nodes:           data.nodes                       ?? existing.nodes,
        edges:           data.edges                       ?? existing.edges,
        stickyNotes:     data.stickyNotes                 ?? existing.stickyNotes,
        departmentRates: data.departmentRates             ?? existing.departmentRates,
        additionalCosts: (data as any).additionalCosts   ?? (existing as any).additionalCosts ?? [],
        subscriptions:   (data as any).subscriptions     ?? (existing as any).subscriptions ?? [],
        sellingPriceUSD:      (data as any).sellingPriceUSD      ?? (existing as any).sellingPriceUSD      ?? 0,
        year2SellingPriceUSD: (data as any).year2SellingPriceUSD ?? (existing as any).year2SellingPriceUSD ?? 0,
        isTemplate:      data.isTemplate                  ?? existing.isTemplate,
      },
    },
    { new: true }
  ).lean();
  return doc ? docToDiagram(doc) : null;
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
  }
): Promise<Diagram | null> {
  const doc = await DiagramModel.findByIdAndUpdate(
    id,
    {
      $set: {
        nodes:                data.nodes,
        edges:                data.edges,
        stickyNotes:          data.stickyNotes,
        departmentRates:      data.departmentRates ?? [],
        additionalCosts:      data.additionalCosts ?? [],
        subscriptions:        data.subscriptions ?? [],
        sellingPriceUSD:      data.sellingPriceUSD      ?? 0,
        year2SellingPriceUSD: data.year2SellingPriceUSD ?? 0,
      },
    },
    { new: true }
  ).lean();
  return doc ? docToDiagram(doc) : null;
}

export async function setDiagramTemplate(id: string, isTemplate: boolean): Promise<Diagram | null> {
  const doc = await DiagramModel.findByIdAndUpdate(
    id,
    { $set: { isTemplate } },
    { new: true }
  ).lean();
  return doc ? docToDiagram(doc) : null;
}

export async function deleteDiagram(id: string): Promise<boolean> {
  const res = await DiagramModel.deleteOne({ _id: id });
  if (res.deletedCount > 0) {
    await SnapshotModel.deleteMany({ diagramId: id });
    return true;
  }
  return false;
}

// ── Snapshots ─────────────────────────────────────────────────────────────────

export async function getSnapshots(diagramId: string): Promise<DiagramSnapshot[]> {
  const docs = await SnapshotModel
    .find({ diagramId })
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();
  return docs.map(docToSnapshot);
}

export async function createNamedSnapshot(
  id: string,
  label?: string
): Promise<DiagramSnapshot | null> {
  const existing = await getDiagram(id);
  if (!existing) return null;
  const snapId = await insertSnapshot(id, existing, label ?? "Checkpoint");
  const doc = await SnapshotModel.findById(snapId).lean();
  return doc ? docToSnapshot(doc) : null;
}

export async function restoreSnapshot(
  diagramId: string,
  snapshotId: string
): Promise<Diagram | null> {
  const existing = await getDiagram(diagramId);
  if (!existing) return null;

  const snap = await SnapshotModel.findOne({ _id: snapshotId, diagramId }).lean();
  if (!snap) return null;

  await insertSnapshot(diagramId, existing, "Before restore");

  const doc = await DiagramModel.findByIdAndUpdate(
    diagramId,
    {
      $set: {
        nodes:       snap.nodes,
        edges:       snap.edges,
        stickyNotes: snap.stickyNotes,
      },
    },
    { new: true }
  ).lean();
  return doc ? docToDiagram(doc) : null;
}

async function insertSnapshot(diagramId: string, d: Diagram, label?: string): Promise<string> {
  const id = randomUUID();
  await SnapshotModel.create({
    _id:         id,
    diagramId,
    label,
    nodes:       d.nodes,
    edges:       d.edges,
    stickyNotes: d.stickyNotes,
  });
  // Trim to 20 snapshots per diagram
  const all = await SnapshotModel.find({ diagramId }, { _id: 1 }).sort({ createdAt: -1 }).lean();
  if (all.length > 20) {
    const toDelete = all.slice(20).map((s: any) => s._id);
    await SnapshotModel.deleteMany({ _id: { $in: toDelete } });
  }
  return id;
}

// ── Pricing Cache ─────────────────────────────────────────────────────────────

export async function getPricingCache(
  service: string,
  region: string
): Promise<PricingCacheEntry | null> {
  const doc = await PricingCacheModel.findOne({ service, region }).lean();
  if (!doc) return null;

  const ageHours = (Date.now() - new Date(doc.fetchedAt).getTime()) / 3_600_000;
  if (ageHours > doc.ttlHours) return null; // expired

  return { service: doc.service, region: doc.region, data: doc.data, fetchedAt: doc.fetchedAt.toISOString() };
}

export async function upsertPricingCache(service: string, region: string, data: unknown) {
  await PricingCacheModel.findOneAndUpdate(
    { service, region },
    { $set: { data, fetchedAt: new Date() } },
    { upsert: true, new: true }
  );
}
