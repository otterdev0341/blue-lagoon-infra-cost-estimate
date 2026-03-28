import { memo, useRef, useState, useEffect } from "react";
import { type NodeProps, NodeResizer } from "@xyflow/react";
import { X, GripHorizontal, Palette } from "lucide-react";
import { useCanvasStore } from "../../store/canvasStore.ts";

const NOTE_COLORS = [
  { hex: "#FEF08A", name: "Yellow"  },
  { hex: "#BBF7D0", name: "Green"   },
  { hex: "#BAE6FD", name: "Sky"     },
  { hex: "#FCA5A5", name: "Red"     },
  { hex: "#DDD6FE", name: "Violet"  },
  { hex: "#FED7AA", name: "Orange"  },
  { hex: "#F9A8D4", name: "Pink"    },
  { hex: "#FFFFFF", name: "White"   },
  { hex: "#1e293b", name: "Dark"    },
];

interface StickyNoteData {
  noteId: string;
  content: string;
  color: string;
  width: number;
  height: number;
}

export const StickyNoteNode = memo(function StickyNoteNode({ id, data, selected }: NodeProps) {
  const d = data as unknown as StickyNoteData;
  const { updateStickyNote, deleteStickyNote } = useCanvasStore();
  const [showPicker, setShowPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);

  // Close picker when clicking outside
  useEffect(() => {
    if (!showPicker) return;
    function handleClick(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowPicker(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showPicker]);

  const isDark = d.color === "#1e293b";
  const headerBg = d.color + "cc";

  return (
    <div
      className="rounded shadow-md flex flex-col group relative"
      style={{ background: d.color, width: d.width, height: d.height, minWidth: 150, minHeight: 100 }}
    >
      <NodeResizer
        isVisible={selected}
        minWidth={150}
        minHeight={100}
        onResize={(_, params) => updateStickyNote(d.noteId, { size: { width: params.width, height: params.height } })}
      />

      {/* Header bar */}
      <div
        className="flex items-center gap-1 px-2 py-1 rounded-t select-none"
        style={{ background: headerBg, cursor: "grab" }}
      >
        <GripHorizontal size={12} className={isDark ? "text-white/50 shrink-0" : "text-gray-500 shrink-0"} />

        <div className="flex-1" />

        {/* Color picker button */}
        <div className="relative nodrag" ref={pickerRef}>
          <button
            title="Change color"
            className={`flex items-center justify-center w-5 h-5 rounded hover:bg-black/10 transition-colors nodrag ${isDark ? "text-white/60 hover:text-white" : "text-gray-500 hover:text-gray-800"}`}
            onClick={() => setShowPicker(v => !v)}
          >
            {/* Small color preview dot + palette icon */}
            <span
              className="w-3 h-3 rounded-full border border-white/80 shadow-sm"
              style={{ background: d.color === "#FFFFFF" ? "#e5e7eb" : d.color }}
            />
          </button>

          {/* Swatch popover */}
          {showPicker && (
            <div
              className="absolute top-7 right-0 z-50 bg-white rounded-xl shadow-xl border border-gray-100 p-2.5 grid grid-cols-3 gap-1.5"
              style={{ minWidth: 108 }}
            >
              {NOTE_COLORS.map(({ hex, name }) => (
                <button
                  key={hex}
                  title={name}
                  className="w-8 h-8 rounded-lg border-2 hover:scale-110 transition-transform nodrag"
                  style={{
                    background: hex,
                    borderColor: d.color === hex ? "#6366f1" : "#374151",
                    boxShadow: d.color === hex ? "0 0 0 2px #6366f1" : undefined,
                  }}
                  onClick={() => { updateStickyNote(d.noteId, { color: hex }); setShowPicker(false); }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Delete button */}
        <button
          className={`transition-colors nodrag ${isDark ? "text-white/50 hover:text-red-400" : "text-gray-500 hover:text-red-500"}`}
          onClick={() => deleteStickyNote(d.noteId)}
        >
          <X size={13} />
        </button>
      </div>

      {/* Text area */}
      <textarea
        ref={textRef}
        className="flex-1 w-full px-2 pb-2 bg-transparent resize-none outline-none text-sm placeholder:text-gray-400 nodrag nopan"
        style={{ color: isDark ? "#f1f5f9" : "#1f2937" }}
        placeholder="Write a note…"
        value={d.content}
        onChange={(e) => updateStickyNote(d.noteId, { content: e.target.value })}
      />
    </div>
  );
});
