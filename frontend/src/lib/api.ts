import type { Diagram, DiagramCost, BillingModel, DiagramSnapshot } from "../types.ts";

const BASE = "/api";

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  const json = await res.json();
  return json.data as T;
}

export const api = {
  diagrams: {
    list: () => req<Omit<Diagram, "nodes" | "edges" | "stickyNotes">[]>("/diagrams"),
    get: (id: string) => req<Diagram>(`/diagrams/${id}`),
    create: (body: Partial<Diagram>) => req<Diagram>("/diagrams", { method: "POST", body: JSON.stringify(body) }),
    update: (id: string, body: Partial<Diagram>) => req<Diagram>(`/diagrams/${id}`, { method: "PUT", body: JSON.stringify(body) }),
    saveCanvas: (id: string, nodes: Diagram["nodes"], edges: Diagram["edges"], stickyNotes: Diagram["stickyNotes"], departmentRates?: Diagram["departmentRates"]) =>
      req<Diagram>(`/diagrams/${id}/canvas`, { method: "PATCH", body: JSON.stringify({ nodes, edges, stickyNotes, departmentRates }) }),
    delete: (id: string) => req<{ success: boolean }>(`/diagrams/${id}`, { method: "DELETE" }),
    setTemplate: (id: string, isTemplate: boolean) =>
      req<Diagram>(`/diagrams/${id}/template`, { method: "PATCH", body: JSON.stringify({ isTemplate }) }),
    cost: (id: string, billingModel?: BillingModel) =>
      req<DiagramCost>(`/diagrams/${id}/cost${billingModel ? `?billingModel=${billingModel}` : ""}`),
  },
  snapshots: {
    list: (diagramId: string) =>
      req<DiagramSnapshot[]>(`/diagrams/${diagramId}/snapshots`),
    create: (diagramId: string, label?: string) =>
      req<DiagramSnapshot>(`/diagrams/${diagramId}/snapshots`, { method: "POST", body: JSON.stringify({ label }) }),
    restore: (diagramId: string, snapshotId: string) =>
      req<Diagram>(`/diagrams/${diagramId}/snapshots/${snapshotId}/restore`, { method: "POST" }),
  },
  pricing: {
    regions: () => req<string[]>("/pricing/regions"),
    instanceTypes: () => req<string[]>("/pricing/ec2/instance-types"),
    rdsClasses: () => req<string[]>("/pricing/rds/instance-classes"),
  },
};
