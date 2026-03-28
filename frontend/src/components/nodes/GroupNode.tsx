import { memo, useState, useRef } from "react";
import { Handle, Position, NodeResizer, type NodeProps } from "@xyflow/react";
import { Pencil, Trash2, Check, Palette } from "lucide-react";
import { useCanvasStore } from "../../store/canvasStore.ts";
import { fmtTHB, fmtUSD } from "../../lib/utils.ts";
import type { GroupConfig, GroupType } from "../../types.ts";

const PASTEL_COLORS = [
  { label: "Default",     value: null },
  { label: "Pink",        value: "#FFD6E0" },
  { label: "Yellow",      value: "#FFF5C2" },
  { label: "Mint",        value: "#C8F5D8" },
  { label: "Sky",         value: "#CCE8FF" },
  { label: "Lavender",    value: "#E5D9FF" },
  { label: "Peach",       value: "#FFE5CC" },
  { label: "Teal",        value: "#C8EEE8" },
  { label: "Rose",        value: "#FFD6EC" },
  { label: "Lime",        value: "#DFFFC8" },
  { label: "Slate",       value: "#F0F4F8" },
];

const GROUP_STYLES: Record<GroupType, { border: string; bg: string; label: string; text: string }> = {
  infrastructure: { border: "#F97316", bg: "#FFF7ED", label: "#F97316", text: "#ffffff" },
  external:       { border: "#8C4FFF", bg: "#F5F3FF", label: "#8C4FFF", text: "#ffffff" },
  implementation: { border: "#3B82F6", bg: "#EFF6FF", label: "#3B82F6", text: "#ffffff" },
  custom:         { border: "#94A3B8", bg: "#F8FAFC", label: "#94A3B8", text: "#ffffff" },
  generic:        { border: "#64748B", bg: "#F8FAFC", label: "#64748B", text: "#ffffff" },
  line:           { border: "#4ADE80", bg: "#F0FDF4", label: "#22C55E", text: "#ffffff" },
  api:            { border: "#10B981", bg: "#F0FDF4", label: "#10B981", text: "#ffffff" },
};

const GROUP_TYPE_LABELS: Record<GroupType, string> = {
  infrastructure: "Infrastructure",
  external:       "External",
  implementation: "Implementation",
  custom:         "Custom",
  generic:        "Generic",
  line:           "Line",
  api:            "API",
};

const ALL_GROUP_TYPES: GroupType[] = ["infrastructure", "external", "implementation", "generic", "line", "api", "custom"];

interface GroupNodeData {
  label: string;
  config: GroupConfig;
  childrenCost?: number;  // injected by CanvasBoard
}

const DEFAULT_RATE = 35;

export const GroupNode = memo(function GroupNode({ id, data, selected }: NodeProps) {
  const d = data as unknown as GroupNodeData;
  const cfg = d.config ?? { groupType: "infrastructure" as GroupType };
  const groupType: GroupType = cfg.groupType ?? "infrastructure";
  const style = GROUP_STYLES[groupType];
  const { deleteNode, updateNodeMeta, updateNodeStyle, updateNodeConfig, exchangeRate } = useCanvasStore();

  const [editing, setEditing] = useState(false);
  const [labelDraft, setLabelDraft] = useState(d.label);
  const [showPalette, setShowPalette] = useState(false);
  const [showTypeMenu, setShowTypeMenu] = useState(false);
  const paletteRef = useRef<HTMLDivElement>(null);

  const commitLabel = () => {
    updateNodeMeta(id, { label: labelDraft });
    setEditing(false);
  };

  const setupUSD = cfg.setupCostUSD ?? 0;
  const bgColor = cfg.bgColor ?? style.bg;

  return (
    <div
      className="group/node relative w-full h-full rounded-xl"
      style={{
        background: bgColor,
        border: `2px dashed ${style.border}`,
      }}
    >
      {/* Resize handles on all edges/corners */}
      <NodeResizer
        color={style.border}
        isVisible={selected}
        minWidth={220}
        minHeight={160}
        onResize={(_, params) => updateNodeStyle(id, { width: params.width, height: params.height })}
      />

      {/* Label bar */}
      <div
        className="absolute -top-px left-4 flex items-center gap-1.5 px-3 py-1 rounded-b-lg"
        style={{ background: style.label }}
      >
        {editing ? (
          <>
            <input
              autoFocus
              className="bg-transparent text-white text-xs font-semibold outline-none w-32 border-b border-white/60"
              value={labelDraft}
              onChange={(e) => setLabelDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") commitLabel(); if (e.key === "Escape") setEditing(false); }}
              onBlur={commitLabel}
            />
            <button onClick={commitLabel} className="text-white/80 hover:text-white">
              <Check size={11} />
            </button>
          </>
        ) : (
          <>
            <span className="text-xs font-semibold text-white">{d.label}</span>
            <div className="relative nodrag">
              <button
                title="Change group type"
                onClick={() => setShowTypeMenu((v) => !v)}
                className="text-[9px] text-white/70 font-normal hover:text-white transition-colors cursor-pointer"
              >
                {GROUP_TYPE_LABELS[groupType]}
              </button>
              {showTypeMenu && (
                <div
                  className="absolute left-0 top-5 bg-white rounded-lg shadow-lg border border-gray-200 py-1"
                  style={{ minWidth: 110, zIndex: 50 }}
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  {ALL_GROUP_TYPES.map((t) => (
                    <button
                      key={t}
                      onClick={() => {
                        updateNodeConfig(id, { ...cfg, groupType: t });
                        setShowTypeMenu(false);
                      }}
                      className="w-full text-left px-3 py-1 text-xs hover:bg-gray-50 flex items-center gap-2"
                      style={{ color: t === groupType ? GROUP_STYLES[t].border : "#374151", fontWeight: t === groupType ? 600 : 400 }}
                    >
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ background: GROUP_STYLES[t].border }}
                      />
                      {GROUP_TYPE_LABELS[t]}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Toolbar — shown on hover */}
      <div
        className="absolute top-1 right-2 flex items-center gap-1 opacity-0 group-hover/node:opacity-100 transition-opacity"
        style={{ zIndex: 10 }}
      >
        {/* Color palette picker */}
        <div ref={paletteRef} className="relative nodrag">
          <button
            title="Change background color"
            onClick={() => setShowPalette((v) => !v)}
            className="w-5 h-5 flex items-center justify-center rounded bg-white/80 hover:bg-white text-gray-500 hover:text-purple-500 shadow-sm transition-colors"
          >
            <Palette size={10} />
          </button>
          {showPalette && (
            <div
              className="absolute right-0 top-6 bg-white rounded-lg shadow-lg border border-gray-200 p-2 grid grid-cols-4 gap-1"
              style={{ minWidth: 120, zIndex: 50 }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              {PASTEL_COLORS.map((c) => (
                <button
                  key={c.label}
                  title={c.label}
                  onClick={() => {
                    updateNodeConfig(id, { ...cfg, bgColor: c.value ?? undefined });
                    setShowPalette(false);
                  }}
                  className="w-6 h-6 rounded border border-gray-300 hover:scale-110 transition-transform"
                  style={{
                    background: c.value ?? style.bg,
                    outline: (cfg.bgColor ?? null) === c.value ? `2px solid ${style.border}` : undefined,
                  }}
                />
              ))}
            </div>
          )}
        </div>
        <button
          title="Rename group"
          onClick={() => { setLabelDraft(d.label); setEditing(true); }}
          className="w-5 h-5 flex items-center justify-center rounded bg-white/80 hover:bg-white text-gray-500 hover:text-blue-600 shadow-sm transition-colors nodrag"
        >
          <Pencil size={10} />
        </button>
        <button
          title="Delete group and children"
          onClick={() => deleteNode(id)}
          className="w-5 h-5 flex items-center justify-center rounded bg-white/80 hover:bg-white text-gray-500 hover:text-red-500 shadow-sm transition-colors nodrag"
        >
          <Trash2 size={10} />
        </button>
      </div>

      {/* Cost badge — bottom right */}
      {(d.childrenCost !== undefined && d.childrenCost > 0) && (
        <div
          className="absolute bottom-2 right-3 text-right"
          style={{ pointerEvents: "none" }}
        >
          <div className="text-xs font-semibold" style={{ color: style.border }}>
            {fmtUSD(d.childrenCost)}
            <span className="text-[10px] font-normal opacity-60">/mo</span>
          </div>
          <div className="text-[10px] opacity-50" style={{ color: style.border }}>
            {fmtTHB(d.childrenCost * exchangeRate)}
          </div>
        </div>
      )}

      {/* Setup cost badge */}
      {setupUSD > 0 && (
        <div
          className="absolute bottom-2 left-3 text-[10px] px-2 py-0.5 rounded-full font-medium"
          style={{ background: style.border + "20", color: style.border, pointerEvents: "none" }}
        >
          Setup: {fmtUSD(setupUSD)}
        </div>
      )}

      {/* Connection handles */}
      <Handle type="source" position={Position.Right} style={{ background: style.border }} />
      <Handle type="target" position={Position.Left}  style={{ background: style.border }} />
      <Handle type="source" position={Position.Bottom} style={{ background: style.border }} />
      <Handle type="target" position={Position.Top}    style={{ background: style.border }} />
    </div>
  );
});
