import { memo, useState } from "react";
import { type NodeProps } from "@xyflow/react";
import { useCanvasStore } from "../../store/canvasStore.ts";
import type { CircleConfig } from "../../types.ts";

const PASTEL_COLORS = [
  "#FFFFFF", "#FFF5C2", "#FFD6E0", "#C8F5D8", "#CCE8FF",
  "#DBEAFE", "#E5D9FF", "#FFE5CC", "#C8EEE8", "#DFFFC8",
];

interface CircleNodeData {
  config: CircleConfig;
}

export const CircleNode = memo(function CircleNode({ id, data }: NodeProps) {
  const d = data as unknown as CircleNodeData;
  const cfg = d.config as CircleConfig;
  const { updateNodeConfig } = useCanvasStore();
  const [showPalette, setShowPalette] = useState(false);

  return (
    <div
      className="relative group/node flex items-center justify-center"
      style={{ width: 120, height: 120 }}
    >
      {/* Circle background */}
      <div
        className="absolute inset-0 rounded-full border-2 border-gray-300 shadow-sm"
        style={{ background: cfg.bgColor ?? "#DBEAFE" }}
      />

      {/* Color palette button */}
      <div
        className="absolute -top-1 -right-1 opacity-0 group-hover/node:opacity-100 transition-opacity nodrag"
        style={{ zIndex: 10 }}
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

      {/* Text input centered */}
      <textarea
        className="relative z-10 w-20 h-20 bg-transparent resize-none outline-none text-xs text-gray-700 text-center placeholder:text-gray-400 nodrag nopan"
        style={{ lineHeight: "1.4" }}
        placeholder="Text…"
        value={cfg.content ?? ""}
        onChange={e => updateNodeConfig(id, { ...cfg, content: e.target.value })}
      />
    </div>
  );
});
