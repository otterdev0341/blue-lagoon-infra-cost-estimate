import { memo, useState } from "react";
import { type NodeProps, NodeResizer } from "@xyflow/react";
import { useCanvasStore } from "../../store/canvasStore.ts";
import type { TextboxConfig } from "../../types.ts";

const PASTEL_COLORS = [
  "#FFFFFF", "#FFF5C2", "#FFD6E0", "#C8F5D8", "#CCE8FF",
  "#E5D9FF", "#FFE5CC", "#C8EEE8", "#DFFFC8", "#F0F4F8",
];

interface TextboxNodeData {
  config: TextboxConfig;
  label: string;
}

export const TextboxNode = memo(function TextboxNode({ id, data, selected }: NodeProps) {
  const d = data as unknown as TextboxNodeData;
  const cfg = d.config as TextboxConfig;
  const { updateNodeConfig } = useCanvasStore();
  const [showPalette, setShowPalette] = useState(false);

  return (
    <div
      className="relative w-full h-full rounded-lg border-2 border-gray-300 shadow-sm group/node flex flex-col"
      style={{ background: cfg.bgColor ?? "#FFFFFF", minWidth: 120, minHeight: 60 }}
    >
      <NodeResizer isVisible={selected} minWidth={120} minHeight={60} />

      {/* Color palette button */}
      <div
        className="absolute -top-2 -right-2 opacity-0 group-hover/node:opacity-100 transition-opacity nodrag"
        style={{ zIndex: 10 }}
      >
        <button
          className="w-5 h-5 rounded-full border-2 border-white shadow-sm"
          style={{ background: cfg.bgColor ?? "#FFFFFF" }}
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

      {/* Text input */}
      <textarea
        className="flex-1 w-full p-2 bg-transparent resize-none outline-none text-sm text-gray-800 placeholder:text-gray-400 nodrag nopan"
        placeholder="Type here…"
        value={cfg.content ?? ""}
        onChange={e => updateNodeConfig(id, { ...cfg, content: e.target.value })}
      />
    </div>
  );
});
