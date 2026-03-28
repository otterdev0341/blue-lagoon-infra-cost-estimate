import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ReactFlow, ReactFlowProvider, Background, Controls, MiniMap,
  useReactFlow, type NodeTypes,
  MarkerType, applyNodeChanges,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useCanvasStore } from "../store/canvasStore.ts";
import { ServiceNode } from "./nodes/ServiceNode.tsx";
import { StickyNoteNode } from "./nodes/StickyNoteNode.tsx";
import { GroupNode } from "./nodes/GroupNode.tsx";
import { TextboxNode } from "./nodes/TextboxNode.tsx";
import { CircleNode } from "./nodes/CircleNode.tsx";
import { LineNode } from "./nodes/LineNode.tsx";
import { APINode } from "./nodes/APINode.tsx";
import { FlowchartNode } from "./nodes/FlowchartNode.tsx";
import { ReqNoteNode } from "./nodes/ReqNoteNode.tsx";
import { calculateDiagramCost } from "../lib/costEngine.ts";
import type { AWSServiceType, CanvasNode } from "../types.ts";

const NODE_TYPES: NodeTypes = {
  ec2: ServiceNode,
  s3: ServiceNode,
  rds: ServiceNode,
  lambda: ServiceNode,
  vpc: ServiceNode,
  alb: ServiceNode,
  cloudfront: ServiceNode,
  elasticache: ServiceNode,
  sqs: ServiceNode,
  apigateway: ServiceNode,
  custom: ServiceNode,
  bedrock: ServiceNode,
  ebs: ServiceNode,
  lightsail: ServiceNode,
  cognito: ServiceNode,
  route53: ServiceNode,
  dynamodb: ServiceNode,
  redshift: ServiceNode,
  sticky_note: StickyNoteNode,
  group: GroupNode,
  textbox: TextboxNode,
  circle: CircleNode,
  req_note: ReqNoteNode,
  line_image: LineNode,
  line_button: LineNode,
  line_carousel: LineNode,
  line_quick_reply: LineNode,
  line_flex_message: LineNode,
  line_rich_menu: LineNode,
  line_custom_payload: LineNode,
  line_api_call: LineNode,
  line_ai_agent: LineNode,
  line_intent: LineNode,
  line_dialog: LineNode,
  api_rest:    APINode,
  api_grpc:    APINode,
  api_mcp:     APINode,
  api_jolt:    APINode,
  api_adapter: APINode,
  api_llm:     APINode,
  fc_start:      FlowchartNode,
  fc_process:    FlowchartNode,
  fc_decision:   FlowchartNode,
  fc_io:         FlowchartNode,
  fc_document:   FlowchartNode,
  fc_subprocess: FlowchartNode,
};

// ── Inner component — has access to useReactFlow() ────────────────────────

function CanvasInner() {
  const {
    nodes, edges, stickyNotes, billingModel, defaultRegion, departmentRates,
    onNodesChange, onEdgesChange, onConnect,
    addServiceNode, addStickyNote, updateStickyNote, reparentNode,
  } = useCanvasStore();

  const { screenToFlowPosition } = useReactFlow();

  // Local React Flow internal state for sticky notes.
  // Sticky notes live in stickyNotes[] (not nodes[]), so onNodesChange / applyNodeChanges
  // can't track their RF-internal state (dimensions, selected, etc.).
  // We maintain it here so RF can properly initialise them.
  const [stickyRFNodes, setStickyRFNodes] = useState<any[]>([]);

  // Keep stickyRFNodes in sync when sticky notes are added/removed in the store.
  useEffect(() => {
    setStickyRFNodes((prev) => {
      const prevById = new Map(prev.map((n) => [n.id, n]));
      return stickyNotes.map((note) => {
        const rfId = `sticky-${note.id}`;
        const existing = prevById.get(rfId);
        const base = {
          id: rfId,
          type: "sticky_note" as const,
          position: note.position,
          style: { zIndex: note.zIndex, width: note.size.width, height: note.size.height },
          data: {
            noteId: note.id,
            content: note.content,
            color: note.color,
            width: note.size.width,
            height: note.size.height,
          },
        };
        // Preserve RF internals (measured, selected…) but refresh position + data from store
        return existing
          ? { ...existing, position: note.position, style: base.style, data: base.data }
          : base;
      });
    });
  }, [stickyNotes]);

  const cost = useMemo(
    () => calculateDiagramCost(nodes, edges, billingModel, departmentRates),
    [nodes, edges, billingModel, departmentRates]
  );

  // Cost map: nodeId → { monthly, min, max }
  const costMap = useMemo(() => {
    const m: Record<string, { monthly: number; monthlyMin?: number; monthlyMax?: number }> = {};
    cost.perNode.forEach((c) => { m[c.nodeId] = { monthly: c.monthly, monthlyMin: c.monthlyMin, monthlyMax: c.monthlyMax }; });
    return m;
  }, [cost]);

  // Aggregate children costs per group
  const groupChildCosts = useMemo(() => {
    const totals: Record<string, number> = {};
    nodes.forEach((n) => {
      if (n.parentId && costMap[n.id] !== undefined) {
        totals[n.parentId] = (totals[n.parentId] ?? 0) + costMap[n.id].monthly;
      }
    });
    return totals;
  }, [nodes, costMap]);

  // Enrich nodes with computed costs (sticky notes excluded — managed via stickyRFNodes)
  const enrichedNodes = useMemo(() => nodes.map((n) => ({
    ...n,
    data: n.type === "group"
      ? { ...n.data, childrenCost: groupChildCosts[n.id] ?? 0 }
      : {
          ...n.data,
          serviceType: n.type,
          region: n.region,
          availabilityZone: n.availabilityZone,
          isDifferentRegion: n.region !== defaultRegion,
          hasAutoScaling: !!(n.data.config as any)?.autoScaling?.enabled,
          monthlyCost: costMap[n.id]?.monthly,
          monthlyMin: costMap[n.id]?.monthlyMin,
          monthlyMax: costMap[n.id]?.monthlyMax,
        },
  })), [nodes, costMap, groupChildCosts, defaultRegion]);

  // Final node list passed to React Flow: regular nodes + sticky RF nodes
  const rfNodes = useMemo(
    () => [...enrichedNodes, ...stickyRFNodes],
    [enrichedNodes, stickyRFNodes],
  );

  const enrichedEdges = useMemo(() =>
    edges.map((e) => {
      const src = nodes.find((n) => n.id === e.source);
      const tgt = nodes.find((n) => n.id === e.target);
      const crossRegion = src && tgt && src.region !== tgt.region;
      const edgeCost = cost.dataTransfer.details.find((d) => d.edgeId === e.id);
      return {
        ...e,
        animated: crossRegion,
        zIndex: 1000,
        style: { stroke: crossRegion ? "#8C4FFF" : "#94A3B8", strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: crossRegion ? "#8C4FFF" : "#94A3B8" },
        label: edgeCost && edgeCost.cost > 0 ? `$${edgeCost.cost.toFixed(2)}/mo` : e.label,
        labelStyle: { fontSize: 10, fill: "#6B7280" },
        labelBgStyle: { fill: "white", fillOpacity: 0.8 },
      };
    }),
    [edges, nodes, cost]
  );

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const type = e.dataTransfer.getData("application/aws-service") as AWSServiceType;
    if (!type) return;

    const flowPos = screenToFlowPosition({ x: e.clientX, y: e.clientY });

    if (type === "sticky_note") {
      addStickyNote({ x: flowPos.x - 100, y: flowPos.y - 75 });
      return;
    }

    if (type === "group") {
      addServiceNode("group", { x: flowPos.x - 210, y: flowPos.y - 150 });
      return;
    }

    // Detect drop onto a group node — use flow coordinates
    const groupNode = nodes.find((n) => {
      if (n.type !== "group") return false;
      const w = (n.style?.width as number) ?? 420;
      const h = (n.style?.height as number) ?? 300;
      return (
        flowPos.x >= n.position.x &&
        flowPos.x <= n.position.x + w &&
        flowPos.y >= n.position.y &&
        flowPos.y <= n.position.y + h
      );
    });

    if (groupNode) {
      // Position relative to group, accounting for label bar height (~30px)
      const relPos = {
        x: Math.max(8, flowPos.x - groupNode.position.x - 90),
        y: Math.max(36, flowPos.y - groupNode.position.y - 40),
      };
      addServiceNode(type, relPos, groupNode.id);
    } else {
      addServiceNode(type, { x: flowPos.x - 90, y: flowPos.y - 40 });
    }
  }, [addServiceNode, addStickyNote, nodes, screenToFlowPosition]);

  // Re-parent nodes when dragged in/out of groups
  const onNodeDragStop = useCallback((_evt: React.MouseEvent, node: any) => {
    if (node.type === "group" || node.id?.startsWith("sticky-")) return;

    // Compute absolute position (node.position is relative if it has a parent)
    const currentParentId: string | undefined = node.parentId;
    let absPos = { ...node.position };
    if (currentParentId) {
      const parent = nodes.find((n) => n.id === currentParentId);
      if (parent) {
        absPos = { x: parent.position.x + node.position.x, y: parent.position.y + node.position.y };
      }
    }

    // Find which group now contains the absolute position
    const containingGroup = nodes.find((n) => {
      if (n.type !== "group") return false;
      const w = (n.style?.width as number) ?? 420;
      const h = (n.style?.height as number) ?? 300;
      return (
        absPos.x >= n.position.x &&
        absPos.x <= n.position.x + w &&
        absPos.y >= n.position.y &&
        absPos.y <= n.position.y + h
      );
    });

    const newParentId = containingGroup?.id;
    if (newParentId === currentParentId) return;

    if (newParentId && containingGroup) {
      reparentNode(node.id, newParentId, {
        x: absPos.x - containingGroup.position.x,
        y: absPos.y - containingGroup.position.y,
      });
    } else {
      reparentNode(node.id, undefined, absPos);
    }
  }, [nodes, reparentNode]);

  // Route node changes: sticky notes → local RF state; all others → store.
  const handleNodesChange = useCallback((changes: any[]) => {
    const stickyChanges = changes.filter((ch) => ch.id?.startsWith("sticky-"));
    const otherChanges  = changes.filter((ch) => !ch.id?.startsWith("sticky-"));

    if (stickyChanges.length > 0) {
      // Apply ALL changes (dimensions, select, position…) to local RF state so
      // React Flow can properly initialise and track sticky note nodes.
      setStickyRFNodes((prev) => applyNodeChanges(stickyChanges, prev));
      // Sync position changes back to the store so they persist.
      stickyChanges.forEach((ch) => {
        if (ch.type === "position" && ch.position) {
          updateStickyNote(ch.id.replace("sticky-", ""), { position: ch.position });
        }
      });
    }

    onNodesChange(otherChanges);
  }, [onNodesChange, updateStickyNote]);

  return (
    <div className="flex-1 h-full">
      <ReactFlow
        nodes={rfNodes}
        edges={enrichedEdges}
        onNodesChange={handleNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onNodeDragStop={onNodeDragStop}
        nodeTypes={NODE_TYPES}
        fitView
        defaultEdgeOptions={{ type: "smoothstep" }}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#E5E7EB" gap={24} />
        <Controls className="!shadow-md" />
        <MiniMap
          nodeStrokeWidth={2}
          zoomable
          pannable
          className="!shadow-md !rounded-lg"
        />
      </ReactFlow>
    </div>
  );
}

// ── Outer wrapper provides React Flow context ─────────────────────────────

export function CanvasBoard() {
  return (
    <ReactFlowProvider>
      <CanvasInner />
    </ReactFlowProvider>
  );
}
