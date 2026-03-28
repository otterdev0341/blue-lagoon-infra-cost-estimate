/**
 * Canvas file I/O utilities.
 *
 * Format: JSON with .bluelagoon extension.
 * {
 *   version: "1.0",
 *   meta: { name, description, tags, exportedAt },
 *   canvas: { region, billingModel, nodes, edges, stickyNotes }
 * }
 *
 * On MERGE: all node/edge/note IDs are remapped to fresh IDs so they
 * cannot collide with the existing canvas.  parentId references and edge
 * source/target references within the import are updated to the new IDs.
 * All imported positions are offset to the right of the current bounding box.
 */
import type { CanvasNode, CanvasEdge, StickyNote, BillingModel } from "../types.ts";
import { randomId } from "./utils.ts";

// ── Public types ──────────────────────────────────────────────────────────

export interface CanvasMeta {
  name: string;
  description?: string;
  tags?: string[];
  exportedAt: string;
}

export interface CanvasFileData {
  region: string;
  billingModel: BillingModel;
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  stickyNotes: StickyNote[];
}

export interface CanvasFile {
  version: string;
  meta: CanvasMeta;
  canvas: CanvasFileData;
}

// ── Export ────────────────────────────────────────────────────────────────

export interface ExportOptions {
  name: string;
  description?: string;
  tags?: string[];
  region: string;
  billingModel: BillingModel;
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  stickyNotes: StickyNote[];
}

export function exportCanvasFile(opts: ExportOptions): void {
  const file: CanvasFile = {
    version: "1.0",
    meta: {
      name: opts.name,
      description: opts.description,
      tags: opts.tags,
      exportedAt: new Date().toISOString(),
    },
    canvas: {
      region: opts.region,
      billingModel: opts.billingModel,
      nodes: opts.nodes,
      edges: opts.edges,
      stickyNotes: opts.stickyNotes,
    },
  };

  const blob = new Blob([JSON.stringify(file, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${opts.name.replace(/[^a-zA-Z0-9_-]/g, "_")}.bluelagoon`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Parse ─────────────────────────────────────────────────────────────────

export function parseCanvasFile(text: string): CanvasFile {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("File is not valid JSON.");
  }

  const f = parsed as any;
  if (!f.canvas || !Array.isArray(f.canvas.nodes)) {
    throw new Error("File does not contain a valid canvas structure.");
  }

  return {
    version: f.version ?? "1.0",
    meta: {
      name: f.meta?.name ?? "Imported Canvas",
      description: f.meta?.description,
      tags: f.meta?.tags,
      exportedAt: f.meta?.exportedAt ?? new Date().toISOString(),
    },
    canvas: {
      region: f.canvas.region ?? "us-east-1",
      billingModel: f.canvas.billingModel ?? "ondemand",
      nodes: f.canvas.nodes ?? [],
      edges: f.canvas.edges ?? [],
      stickyNotes: f.canvas.stickyNotes ?? [],
    },
  };
}

// ── Merge ─────────────────────────────────────────────────────────────────

/**
 * Remap all IDs in the imported file, offset positions to the right of the
 * existing canvas, and return arrays ready to be merged into the store.
 */
export function prepareForMerge(
  file: CanvasFile,
  existingNodes: CanvasNode[]
): { nodes: CanvasNode[]; edges: CanvasEdge[]; stickyNotes: StickyNote[] } {
  const { nodes: importNodes, edges: importEdges, stickyNotes: importNotes } = file.canvas;

  // Compute right edge of existing canvas for offset
  let maxX = 0;
  existingNodes.forEach((n) => {
    const w = (n.style?.width as number) ?? 200;
    maxX = Math.max(maxX, n.position.x + w);
  });
  const offsetX = maxX > 0 ? maxX + 120 : 0;
  const offsetY = 0;

  // Build old→new ID map
  const idMap: Record<string, string> = {};
  importNodes.forEach((n) => { idMap[n.id] = randomId(); });
  importNotes.forEach((n) => { idMap[n.id] = randomId(); });

  // Remap nodes
  const nodes: CanvasNode[] = importNodes.map((n) => ({
    ...n,
    id: idMap[n.id],
    position: {
      x: n.position.x + (n.parentId ? 0 : offsetX),  // children keep relative pos
      y: n.position.y + (n.parentId ? 0 : offsetY),
    },
    parentId: n.parentId ? idMap[n.parentId] : undefined,
  }));

  // Remap edges
  const edges: CanvasEdge[] = importEdges.map((e) => ({
    ...e,
    id: randomId(),
    source: idMap[e.source] ?? e.source,
    target: idMap[e.target] ?? e.target,
  }));

  // Remap notes
  const stickyNotes: StickyNote[] = importNotes.map((n) => ({
    ...n,
    id: idMap[n.id],
    position: { x: n.position.x + offsetX, y: n.position.y + offsetY },
    zIndex: Date.now(),
  }));

  return { nodes, edges, stickyNotes };
}
