import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import {
  listDiagrams, getDiagram, createDiagram, updateDiagram, updateDiagramCanvas,
  deleteDiagram, getSnapshots, setDiagramTemplate, createNamedSnapshot, restoreSnapshot,
} from "../db/queries.ts";
import { calculateDiagramCost } from "../cost/calculator.ts";
import type { BillingModel } from "../types.ts";

const app = new Hono();

const DiagramBody = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  region: z.string().default("us-east-1"),
  billingModel: z.enum(["ondemand", "reserved1yr", "reserved3yr", "spot"]).default("ondemand"),
  nodes: z.array(z.any()).default([]),
  edges: z.array(z.any()).default([]),
  stickyNotes: z.array(z.any()).default([]),
  departmentRates: z.array(z.any()).default([]),
});

// GET /api/diagrams
app.get("/", (c) => {
  const diagrams = listDiagrams();
  return c.json({ data: diagrams });
});

// POST /api/diagrams
app.post("/", zValidator("json", DiagramBody), (c) => {
  const body = c.req.valid("json");
  const diagram = createDiagram(body as any);
  return c.json({ data: diagram }, 201);
});

// GET /api/diagrams/:id
app.get("/:id", (c) => {
  const diagram = getDiagram(c.req.param("id"));
  if (!diagram) return c.json({ error: "Not found" }, 404);
  return c.json({ data: diagram });
});

// PUT /api/diagrams/:id
app.put("/:id", zValidator("json", DiagramBody.partial()), (c) => {
  const updated = updateDiagram(c.req.param("id"), c.req.valid("json") as any);
  if (!updated) return c.json({ error: "Not found" }, 404);
  return c.json({ data: updated });
});

// PATCH /api/diagrams/:id/canvas  — lightweight auto-save (NO snapshot created)
app.patch("/:id/canvas", async (c) => {
  const body = await c.req.json();
  const updated = updateDiagramCanvas(c.req.param("id"), {
    nodes: body.nodes,
    edges: body.edges,
    stickyNotes: body.stickyNotes,
    departmentRates: body.departmentRates,
  });
  if (!updated) return c.json({ error: "Not found" }, 404);
  return c.json({ data: updated });
});

// PATCH /api/diagrams/:id/template  — toggle template flag
app.patch("/:id/template", async (c) => {
  const body = await c.req.json();
  const updated = setDiagramTemplate(c.req.param("id"), !!body.isTemplate);
  if (!updated) return c.json({ error: "Not found" }, 404);
  return c.json({ data: updated });
});

// DELETE /api/diagrams/:id
app.delete("/:id", (c) => {
  const ok = deleteDiagram(c.req.param("id"));
  if (!ok) return c.json({ error: "Not found" }, 404);
  return c.json({ success: true });
});

// GET /api/diagrams/:id/snapshots
app.get("/:id/snapshots", (c) => {
  const diagram = getDiagram(c.req.param("id"));
  if (!diagram) return c.json({ error: "Not found" }, 404);
  return c.json({ data: getSnapshots(c.req.param("id")) });
});

// POST /api/diagrams/:id/snapshots  — create a named checkpoint
app.post("/:id/snapshots", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const snapshot = createNamedSnapshot(c.req.param("id"), body.label);
  if (!snapshot) return c.json({ error: "Not found" }, 404);
  return c.json({ data: snapshot }, 201);
});

// POST /api/diagrams/:id/snapshots/:snapshotId/restore  — restore to a snapshot
app.post("/:id/snapshots/:snapshotId/restore", (c) => {
  const updated = restoreSnapshot(c.req.param("id"), c.req.param("snapshotId"));
  if (!updated) return c.json({ error: "Not found" }, 404);
  return c.json({ data: updated });
});

// GET /api/diagrams/:id/cost  — on-the-fly cost calculation
app.get("/:id/cost", (c) => {
  const diagram = getDiagram(c.req.param("id"));
  if (!diagram) return c.json({ error: "Not found" }, 404);
  const billing = (c.req.query("billingModel") ?? diagram.billingModel) as BillingModel;
  const cost = calculateDiagramCost(diagram.nodes, diagram.edges, billing);
  return c.json({ data: cost });
});

// POST /api/diagrams/cost/estimate  — estimate without saving
app.post("/cost/estimate", async (c) => {
  const body = await c.req.json();
  const billing = (body.billingModel ?? "ondemand") as BillingModel;
  const cost = calculateDiagramCost(body.nodes ?? [], body.edges ?? [], billing);
  return c.json({ data: cost });
});

export default app;
