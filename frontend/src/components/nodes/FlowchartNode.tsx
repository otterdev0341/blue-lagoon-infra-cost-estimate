import { memo, useState } from "react";
import { type NodeProps, NodeResizer, Handle, Position } from "@xyflow/react";
import { useCanvasStore } from "../../store/canvasStore.ts";
import type { FlowchartConfig, FlowchartSubtype } from "../../types.ts";

const PASTEL_COLORS = [
  "#FFFFFF", "#D1FAE5", "#DBEAFE", "#FEF9C3", "#F3E8FF",
  "#FFF7ED", "#EFF6FF", "#FFE4E6", "#ECFDF5", "#F0F4F8",
];

function ShapeSVG({ subtype, bgColor }: { subtype: FlowchartSubtype; bgColor: string }) {
  const fill = bgColor;
  const stroke = "#94A3B8";
  const sw = 2;

  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      width="100%" height="100%"
      viewBox="0 0 200 100"
      preserveAspectRatio="none"
      style={{ overflow: "visible" }}
    >
      {subtype === "start" && (
        <rect x="1" y="1" width="198" height="98" rx="49" ry="49"
          fill={fill} stroke={stroke} strokeWidth={sw} />
      )}
      {subtype === "process" && (
        <rect x="1" y="1" width="198" height="98" rx="6" ry="6"
          fill={fill} stroke={stroke} strokeWidth={sw} />
      )}
      {subtype === "decision" && (
        <polygon points="100,2 198,50 100,98 2,50"
          fill={fill} stroke={stroke} strokeWidth={sw} />
      )}
      {subtype === "io" && (
        <polygon points="20,2 198,2 180,98 2,98"
          fill={fill} stroke={stroke} strokeWidth={sw} />
      )}
      {subtype === "document" && (
        <path
          d="M1,2 H199 V80 Q175,68 150,80 Q125,92 100,80 Q75,68 50,80 Q25,92 1,80 Z"
          fill={fill} stroke={stroke} strokeWidth={sw}
        />
      )}
      {subtype === "subprocess" && (
        <>
          <rect x="1" y="1" width="198" height="98" rx="6" ry="6"
            fill={fill} stroke={stroke} strokeWidth={sw} />
          <line x1="18" y1="1" x2="18" y2="99" stroke={stroke} strokeWidth={sw} />
          <line x1="182" y1="1" x2="182" y2="99" stroke={stroke} strokeWidth={sw} />
        </>
      )}
    </svg>
  );
}

// Inset padding per shape so text clears the shape boundary
const SHAPE_PADDING: Record<FlowchartSubtype, string> = {
  start:      "8px 20px",
  process:    "8px 12px",
  decision:   "16px 30%",
  io:         "8px 18px",
  document:   "6px 12px",
  subprocess: "8px 22px",
};

interface FlowchartNodeData {
  config: FlowchartConfig;
  label: string;
}

export const FlowchartNode = memo(function FlowchartNode({ id, data, selected }: NodeProps) {
  const d = data as unknown as FlowchartNodeData;
  const cfg = d.config as FlowchartConfig;
  const { updateNodeConfig } = useCanvasStore();
  const [showPalette, setShowPalette] = useState(false);

  const handleColor = "#64748B";

  return (
    <div
      className="relative w-full h-full group/node"
      style={{ minWidth: 100, minHeight: 50 }}
    >
      <NodeResizer isVisible={selected} minWidth={100} minHeight={50} />

      {/* Shape SVG background */}
      <ShapeSVG subtype={cfg.subtype ?? "process"} bgColor={cfg.bgColor ?? "#DBEAFE"} />

      {/* Handles */}
      <Handle type="target" position={Position.Top}    style={{ background: handleColor, width: 8, height: 8, zIndex: 10 }} />
      <Handle type="source" position={Position.Bottom} style={{ background: handleColor, width: 8, height: 8, zIndex: 10 }} />
      <Handle type="target" position={Position.Left}   style={{ background: handleColor, width: 8, height: 8, zIndex: 10 }} />
      <Handle type="source" position={Position.Right}  style={{ background: handleColor, width: 8, height: 8, zIndex: 10 }} />

      {/* Text label */}
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{ padding: SHAPE_PADDING[cfg.subtype ?? "process"] }}
      >
        <textarea
          className="w-full bg-transparent resize-none outline-none text-sm text-center text-gray-800 placeholder:text-gray-400 nodrag nopan leading-snug"
          placeholder="Label…"
          value={cfg.content ?? ""}
          style={{ height: "100%", overflow: "hidden" }}
          onChange={e => updateNodeConfig(id, { ...cfg, content: e.target.value })}
        />
      </div>

      {/* Color picker button */}
      <div
        className="absolute -top-2 -right-2 opacity-0 group-hover/node:opacity-100 transition-opacity nodrag"
        style={{ zIndex: 20 }}
      >
        <button
          className="w-5 h-5 rounded-full border-2 border-white shadow-sm"
          style={{ background: cfg.bgColor ?? "#DBEAFE" }}
          onClick={() => setShowPalette(v => !v)}
        />
        {showPalette && (
          <div
            className="absolute top-6 right-0 bg-white rounded-lg shadow-lg border border-gray-200 p-2 grid grid-cols-5 gap-1"
            style={{ zIndex: 50, minWidth: 120 }}
            onMouseDown={e => e.stopPropagation()}
          >
            {PASTEL_COLORS.map(c => (
              <button
                key={c}
                className="w-5 h-5 rounded border border-gray-300 hover:scale-110 transition-transform"
                style={{ background: c, outline: cfg.bgColor === c ? "2px solid #3B82F6" : undefined }}
                onClick={() => { updateNodeConfig(id, { ...cfg, bgColor: c }); setShowPalette(false); }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
});
