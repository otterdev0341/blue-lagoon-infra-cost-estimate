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
  additionalCosts: z.array(z.any()).default([]),
  subscriptions: z.array(z.any()).default([]),
  sellingPriceUSD:      z.number().default(0),
  year2SellingPriceUSD: z.number().default(0),
});

// GET /api/diagrams
app.get("/", async (c) => {
  const diagrams = await listDiagrams();
  return c.json({ data: diagrams });
});

// POST /api/diagrams
app.post("/", zValidator("json", DiagramBody), async (c) => {
  const body = c.req.valid("json");
  const diagram = await createDiagram(body as any);
  return c.json({ data: diagram }, 201);
});

// GET /api/diagrams/:id
app.get("/:id", async (c) => {
  const diagram = await getDiagram(c.req.param("id"));
  if (!diagram) return c.json({ error: "Not found" }, 404);
  return c.json({ data: diagram });
});

// PUT /api/diagrams/:id
app.put("/:id", zValidator("json", DiagramBody.partial()), async (c) => {
  const updated = await updateDiagram(c.req.param("id"), c.req.valid("json") as any);
  if (!updated) return c.json({ error: "Not found" }, 404);
  return c.json({ data: updated });
});

// PATCH /api/diagrams/:id/canvas  — lightweight auto-save
app.patch("/:id/canvas", async (c) => {
  const body = await c.req.json();
  const updated = await updateDiagramCanvas(c.req.param("id"), {
    nodes:           body.nodes,
    edges:           body.edges,
    stickyNotes:     body.stickyNotes,
    departmentRates: body.departmentRates,
    additionalCosts: body.additionalCosts,
    subscriptions:   body.subscriptions,
    sellingPriceUSD:      body.sellingPriceUSD,
    year2SellingPriceUSD: body.year2SellingPriceUSD,
  });
  if (!updated) return c.json({ error: "Not found" }, 404);
  return c.json({ data: updated });
});

// PATCH /api/diagrams/:id/template
app.patch("/:id/template", async (c) => {
  const body = await c.req.json();
  const updated = await setDiagramTemplate(c.req.param("id"), !!body.isTemplate);
  if (!updated) return c.json({ error: "Not found" }, 404);
  return c.json({ data: updated });
});

// DELETE /api/diagrams/:id
app.delete("/:id", async (c) => {
  const ok = await deleteDiagram(c.req.param("id"));
  if (!ok) return c.json({ error: "Not found" }, 404);
  return c.json({ success: true });
});

// GET /api/diagrams/:id/snapshots
app.get("/:id/snapshots", async (c) => {
  const diagram = await getDiagram(c.req.param("id"));
  if (!diagram) return c.json({ error: "Not found" }, 404);
  return c.json({ data: await getSnapshots(c.req.param("id")) });
});

// POST /api/diagrams/:id/snapshots
app.post("/:id/snapshots", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const snapshot = await createNamedSnapshot(c.req.param("id"), body.label);
  if (!snapshot) return c.json({ error: "Not found" }, 404);
  return c.json({ data: snapshot }, 201);
});

// POST /api/diagrams/:id/snapshots/:snapshotId/restore
app.post("/:id/snapshots/:snapshotId/restore", async (c) => {
  const updated = await restoreSnapshot(c.req.param("id"), c.req.param("snapshotId"));
  if (!updated) return c.json({ error: "Not found" }, 404);
  return c.json({ data: updated });
});

// GET /api/diagrams/:id/cost
app.get("/:id/cost", async (c) => {
  const diagram = await getDiagram(c.req.param("id"));
  if (!diagram) return c.json({ error: "Not found" }, 404);
  const billing = (c.req.query("billingModel") ?? diagram.billingModel) as BillingModel;
  const cost = calculateDiagramCost(diagram.nodes, diagram.edges, billing);
  return c.json({ data: cost });
});

// POST /api/diagrams/cost/estimate
app.post("/cost/estimate", async (c) => {
  const body = await c.req.json();
  const billing = (body.billingModel ?? "ondemand") as BillingModel;
  const cost = calculateDiagramCost(body.nodes ?? [], body.edges ?? [], billing);
  return c.json({ data: cost });
});

export default app;
