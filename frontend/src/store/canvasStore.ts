import { create } from "zustand";
import {
  applyNodeChanges, applyEdgeChanges,
  type NodeChange, type EdgeChange, type Connection, addEdge,
} from "@xyflow/react";
import type {
  CanvasNode, CanvasEdge, StickyNote, BillingModel, Diagram,
  AdditionalCostItem, SubscriptionItem, DepartmentRate,
} from "../types.ts";
import { randomId } from "../lib/utils.ts";
import { DEFAULT_CONFIGS } from "../lib/defaultConfigs.ts";
import { loadGlobalSettings, loadCanvasSettings } from "../lib/globalSettings.ts";
import type { AWSServiceType } from "../types.ts";

interface CanvasState {
  diagramId: string | null;
  diagramName: string;
  defaultRegion: string;
  billingModel: BillingModel;
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  stickyNotes: StickyNote[];
  selectedNodeId: string | null;
  additionalCosts: AdditionalCostItem[];
  subscriptions: SubscriptionItem[];
  sellingPriceUSD: number;

  // Canvas actions
  loadDiagram: (diagram: Diagram) => void;
  setDiagramMeta: (name: string, region: string) => void;
  setBillingModel: (m: BillingModel) => void;
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  addServiceNode: (type: AWSServiceType, position: { x: number; y: number }, parentId?: string) => void;
  updateNodeConfig: (id: string, config: Partial<CanvasNode["data"]["config"]>) => void;
  updateNodeMeta: (id: string, meta: { label?: string; costOverride?: number | null; discount?: number }) => void;
  updateNodeRegion: (id: string, region: string, az?: string) => void;
  updateNodeStyle: (id: string, style: { width?: number; height?: number }) => void;
  reparentNode: (id: string, parentId: string | undefined, position: { x: number; y: number }) => void;
  duplicateNode: (id: string) => void;
  deleteNode: (id: string) => void;
  setSelectedNode: (id: string | null) => void;
  mergeNodes: (nodes: CanvasNode[], edges: CanvasEdge[], stickyNotes: StickyNote[]) => void;

  // Sticky notes
  addStickyNote: (position: { x: number; y: number }) => void;
  updateStickyNote: (id: string, patch: Partial<StickyNote>) => void;
  deleteStickyNote: (id: string) => void;

  // Additional costs
  addAdditionalCost: (item: Omit<AdditionalCostItem, "id">) => void;
  updateAdditionalCost: (id: string, patch: Partial<Omit<AdditionalCostItem, "id">>) => void;
  deleteAdditionalCost: (id: string) => void;

  // Subscriptions
  addSubscription: (item: Omit<SubscriptionItem, "id">) => void;
  updateSubscription: (id: string, patch: Partial<Omit<SubscriptionItem, "id">>) => void;
  deleteSubscription: (id: string) => void;

  setSellingPrice: (usd: number) => void;

  exchangeRate: number;
  setExchangeRate: (rate: number) => void;

  departmentRates: DepartmentRate[];
  setDepartmentRates: (rates: DepartmentRate[]) => void;
}

export const useCanvasStore = create<CanvasState>((set, get) => ({
  diagramId: null,
  diagramName: "Untitled Project",
  defaultRegion: "us-east-1",
  billingModel: "ondemand",
  nodes: [],
  edges: [],
  stickyNotes: [],
  selectedNodeId: null,
  additionalCosts: [],
  subscriptions: [],
  sellingPriceUSD: 0,
  exchangeRate: 35,
  setExchangeRate: (exchangeRate) => set({ exchangeRate }),
  departmentRates: loadGlobalSettings().departmentRates,

  loadDiagram: (diagram) => {
    set({
      diagramId: diagram.id,
      diagramName: diagram.name,
      defaultRegion: diagram.region,
      billingModel: diagram.billingModel,
      nodes: diagram.nodes,
      edges: diagram.edges,
      stickyNotes: diagram.stickyNotes,
    });
    // Load department rates: canvas-specific override > diagram saved rates > global default
    const canvasOverride = diagram.id ? loadCanvasSettings(diagram.id) : null;
    if (canvasOverride?.departmentRates) {
      set({ departmentRates: canvasOverride.departmentRates });
    } else if (diagram.departmentRates && diagram.departmentRates.length > 0) {
      set({ departmentRates: diagram.departmentRates });
    } else {
      set({ departmentRates: loadGlobalSettings().departmentRates });
    }
  },

  setDiagramMeta: (name, region) => set({ diagramName: name, defaultRegion: region }),
  setBillingModel: (billingModel) => set({ billingModel }),

  onNodesChange: (changes) =>
    set((s) => ({ nodes: applyNodeChanges(changes, s.nodes as any) as any })),

  onEdgesChange: (changes) =>
    set((s) => ({ edges: applyEdgeChanges(changes, s.edges as any) as any })),

  onConnect: (connection) =>
    set((s) => ({
      edges: addEdge({ ...connection, id: randomId() }, s.edges as any) as any,
    })),

  addServiceNode: (type, position, parentId) => {
    const id = randomId();
    const node: CanvasNode = {
      id, type, position,
      region: get().defaultRegion,
      data: {
        label: type === "group" ? "Group" : type.toUpperCase(),
        config: DEFAULT_CONFIGS[type] as any,
      },
      ...(type === "group" ? { style: { width: 420, height: 300 } } : {}),
      ...(parentId ? { parentId } : {}),
    };
    set((s) => {
      if (type === "group") return { nodes: [node, ...s.nodes] };
      return { nodes: [...s.nodes, node] };
    });
  },

  updateNodeConfig: (id, config) =>
    set((s) => ({
      nodes: s.nodes.map((n) =>
        n.id === id
          ? { ...n, data: { ...n.data, config: { ...n.data.config, ...config } as CanvasNode["data"]["config"] } }
          : n
      ),
    })),

  updateNodeMeta: (id, meta) =>
    set((s) => ({
      nodes: s.nodes.map((n) => {
        if (n.id !== id) return n;
        const data = { ...n.data };
        if (meta.label !== undefined) data.label = meta.label;
        if (meta.discount !== undefined) data.discount = meta.discount;
        if (meta.costOverride === null) delete data.costOverride;
        else if (meta.costOverride !== undefined) data.costOverride = meta.costOverride;
        return { ...n, data };
      }),
    })),

  updateNodeRegion: (id, region, az) =>
    set((s) => ({
      nodes: s.nodes.map((n) =>
        n.id === id ? { ...n, region, availabilityZone: az } : n
      ),
    })),

  updateNodeStyle: (id, style) =>
    set((s) => ({
      nodes: s.nodes.map((n) =>
        n.id === id ? { ...n, style: { ...(n.style ?? {}), ...style } } : n
      ),
    })),

  reparentNode: (id, parentId, position) =>
    set((s) => ({
      nodes: s.nodes.map((n) =>
        n.id === id
          ? { ...n, parentId: parentId ?? undefined, extent: undefined, position }
          : n
      ),
    })),

  duplicateNode: (id) =>
    set((s) => {
      const src = s.nodes.find((n) => n.id === id);
      if (!src) return {};
      const newId = randomId();
      const copy: CanvasNode = {
        ...src,
        id: newId,
        position: { x: src.position.x + 30, y: src.position.y + 30 },
        data: JSON.parse(JSON.stringify(src.data)), // deep clone
      };
      return { nodes: [...s.nodes, copy], selectedNodeId: newId };
    }),

  deleteNode: (id) =>
    set((s) => ({
      nodes: s.nodes.filter((n) => n.id !== id && n.parentId !== id),
      edges: s.edges.filter((e) => e.source !== id && e.target !== id),
    })),

  setSelectedNode: (id) => set({ selectedNodeId: id }),

  // Merge imported nodes/edges/notes into the current canvas.
  // Caller has already remapped IDs and offset positions.
  mergeNodes: (newNodes, newEdges, newNotes) =>
    set((s) => ({
      nodes: [...s.nodes, ...newNodes],
      edges: [...s.edges, ...newEdges],
      stickyNotes: [...s.stickyNotes, ...newNotes],
    })),

  addStickyNote: (position) => {
    const note: StickyNote = {
      id: randomId(), position,
      size: { width: 200, height: 150 },
      color: "#FEF08A", content: "",
      zIndex: Date.now(),
    };
    set((s) => ({ stickyNotes: [...s.stickyNotes, note] }));
  },

  updateStickyNote: (id, patch) =>
    set((s) => ({ stickyNotes: s.stickyNotes.map((n) => (n.id === id ? { ...n, ...patch } : n)) })),

  deleteStickyNote: (id) =>
    set((s) => ({ stickyNotes: s.stickyNotes.filter((n) => n.id !== id) })),

  addAdditionalCost: (item) =>
    set((s) => ({ additionalCosts: [...s.additionalCosts, { ...item, id: randomId() }] })),

  updateAdditionalCost: (id, patch) =>
    set((s) => ({
      additionalCosts: s.additionalCosts.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    })),

  deleteAdditionalCost: (id) =>
    set((s) => ({ additionalCosts: s.additionalCosts.filter((c) => c.id !== id) })),

  addSubscription: (item) =>
    set((s) => ({ subscriptions: [...s.subscriptions, { ...item, id: randomId() }] })),

  updateSubscription: (id, patch) =>
    set((s) => ({
      subscriptions: s.subscriptions.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    })),

  deleteSubscription: (id) =>
    set((s) => ({ subscriptions: s.subscriptions.filter((c) => c.id !== id) })),

  setSellingPrice: (sellingPriceUSD) => set({ sellingPriceUSD }),

  setDepartmentRates: (departmentRates) => set({ departmentRates }),
}));
