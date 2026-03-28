import { memo, useState } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { useCanvasStore } from "../../store/canvasStore.ts";
import type { APINodeConfig } from "../../types.ts";

const PROTOCOL_COLORS: Record<string, string> = {
  rest:    "#0EA5E9",
  grpc:    "#8B5CF6",
  mcp:     "#10B981",
  jolt:    "#F97316",
  adapter: "#64748B",
  llm:     "#7C3AED",
};

const PROTOCOL_BADGES: Record<string, string> = {
  rest:    "REST",
  grpc:    "gRPC",
  mcp:     "MCP",
  jolt:    "Jolt",
  adapter: "Adapter",
  llm:     "LLM",
};

interface APINodeData {
  label: string;
  config: APINodeConfig;
  monthlyCost?: number;
}

export const APINode = memo(function APINode({ id, data, selected }: NodeProps) {
  const d = data as unknown as APINodeData;
  const cfg = d.config as APINodeConfig;
  const { updateNodeConfig, deleteNode, duplicateNode, departmentRates } = useCanvasStore();
  const [editing, setEditing] = useState(false);

  const color = PROTOCOL_COLORS[cfg.protocol] ?? "#0EA5E9";
  const badge = PROTOCOL_BADGES[cfg.protocol] ?? "API";
  const rate = departmentRates.find(r => r.name === cfg.department)?.ratePerManday ?? 10000;
  const costTHB = cfg.manday * rate;

  return (
    <div
      className="rounded-xl shadow-md bg-white border-2 min-w-[180px]"
      style={{ borderColor: selected ? color : "#E5E7EB" }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-t-xl" style={{ background: color + "22" }}>
        <span
          className="text-[10px] font-bold px-1.5 py-0.5 rounded text-white"
          style={{ background: color }}
        >{badge}</span>
        <span className="text-xs font-semibold truncate text-gray-700 flex-1">{d.label}</span>
        <button
          title="Duplicate (Ctrl+D)"
          className="text-gray-400 hover:text-blue-500 transition-colors nodrag text-xs"
          onClick={() => duplicateNode(id)}
        >⧉</button>
        <button
          className="text-gray-400 hover:text-red-500 transition-colors nodrag text-xs"
          onClick={() => deleteNode(id)}
        >✕</button>
      </div>

      {/* Body */}
      <div className="px-3 py-2 flex flex-col gap-1.5">
        {/* Endpoint */}
        <input
          type="text"
          placeholder="/endpoint"
          className="text-xs border border-gray-200 rounded px-1.5 py-0.5 bg-white nodrag nopan w-full"
          value={cfg.endpoint ?? ""}
          onChange={e => updateNodeConfig(id, { ...cfg, endpoint: e.target.value })}
        />

        {/* Department */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-gray-500 w-16 shrink-0">Position</span>
          <select
            className="flex-1 text-xs border border-gray-200 rounded px-1 py-0.5 bg-white nodrag"
            value={cfg.department}
            onChange={e => updateNodeConfig(id, { ...cfg, department: e.target.value })}
          >
            {departmentRates.map(r => (
              <option key={r.id} value={r.name}>{r.name}</option>
            ))}
          </select>
        </div>

        {/* Manday */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-gray-500 w-16 shrink-0">Manday</span>
          <input
            type="number"
            min={0}
            step={0.25}
            className="flex-1 text-xs border border-gray-200 rounded px-1 py-0.5 bg-white nodrag nopan w-16"
            value={cfg.manday}
            onChange={e => updateNodeConfig(id, { ...cfg, manday: parseFloat(e.target.value) || 1 })}
          />
        </div>

        {/* Description */}
        {editing ? (
          <textarea
            autoFocus
            className="text-xs border border-gray-200 rounded px-1 py-0.5 bg-white resize-none nodrag nopan w-full"
            rows={2}
            value={cfg.description ?? ""}
            onChange={e => updateNodeConfig(id, { ...cfg, description: e.target.value })}
            onBlur={() => setEditing(false)}
          />
        ) : (
          <div
            className="text-[10px] text-gray-400 cursor-text nodrag min-h-[16px] truncate"
            onClick={() => setEditing(true)}
          >
            {cfg.description || "Add description…"}
          </div>
        )}

        {/* Collaboration */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-gray-500 w-16 shrink-0">Created</span>
          <input
            type="text"
            placeholder="@username"
            className="flex-1 text-xs border border-gray-200 rounded px-1 py-0.5 bg-white nodrag nopan"
            value={cfg.createdBy ?? ""}
            onChange={e => updateNodeConfig(id, { ...cfg, createdBy: e.target.value })}
          />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-gray-500 w-16 shrink-0">Reviewed</span>
          <input
            type="text"
            placeholder="@username"
            className="flex-1 text-xs border border-gray-200 rounded px-1 py-0.5 bg-white nodrag nopan"
            value={cfg.reviewedBy ?? ""}
            onChange={e => updateNodeConfig(id, { ...cfg, reviewedBy: e.target.value })}
          />
        </div>
      </div>

      {/* Cost badge */}
      <div className="px-3 pb-2">
        <div className="rounded-lg text-center py-1" style={{ background: color + "15" }}>
          <span className="text-xs font-bold" style={{ color }}>
            ฿{costTHB.toLocaleString()}
          </span>
          <span className="text-[10px] text-gray-400"> / {cfg.manday}md</span>
        </div>
      </div>

      <Handle type="source" position={Position.Right} style={{ background: color }} />
      <Handle type="target" position={Position.Left} style={{ background: color }} />
      <Handle type="source" position={Position.Bottom} style={{ background: color }} />
      <Handle type="target" position={Position.Top} style={{ background: color }} />
    </div>
  );
});
