import { memo, useState } from "react";
import { type NodeProps, NodeResizer } from "@xyflow/react";
import { Pencil, Eye, Trash2 } from "lucide-react";
import { useCanvasStore } from "../../store/canvasStore.ts";
import type { ReqNoteConfig } from "../../types.ts";

const BG_COLORS = [
  "#F5F3FF", // lavender (default)
  "#FFFFFF", // white
  "#F0FDF4", // mint
  "#EFF6FF", // sky
  "#FFF7ED", // peach
  "#FDF2F8", // pink
  "#FEFCE8", // yellow
  "#F0F9FF", // ice
];

/** Minimal markdown → HTML for headings, bold, italic, lists, code, hr */
function renderMd(text: string): string {
  return text
    // Fenced code blocks
    .replace(/```[\w]*\n?([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
    // Headings
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    // Bold + italic
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // Checkbox items
    .replace(/^- \[x\] (.+)$/gim, '<li class="rn-done">✓ $1</li>')
    .replace(/^- \[ \] (.+)$/gim, '<li class="rn-todo">☐ $1</li>')
    // Unordered list items
    .replace(/^[-*] (.+)$/gm, '<li>$1</li>')
    // Ordered list items
    .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
    // Wrap consecutive <li> in <ul>
    .replace(/(<li[\s\S]*?<\/li>\n?)+/g, '<ul>$&</ul>')
    // Horizontal rule
    .replace(/^---+$/gm, '<hr/>')
    // Double newline → paragraph break
    .replace(/\n\n/g, '</p><p>')
    // Single newline → <br>
    .replace(/\n/g, '<br/>');
}

interface ReqNoteData {
  label: string;
  config: ReqNoteConfig;
}

export const ReqNoteNode = memo(function ReqNoteNode({ id, data, selected }: NodeProps) {
  const d = data as unknown as ReqNoteData;
  const cfg = d.config as ReqNoteConfig;
  const { updateNodeConfig, updateNodeMeta, deleteNode } = useCanvasStore();
  const [isEditing, setIsEditing] = useState(true);
  const [showPalette, setShowPalette] = useState(false);

  const accentColor = "#7C3AED";
  const fontSize = cfg.fontSize ?? 12;
  const FONT_SIZES = [10, 11, 12, 13, 14, 16, 18, 20, 24];

  return (
    <div
      className="relative w-full h-full rounded-xl shadow-md flex flex-col group/node"
      style={{
        background: cfg.bgColor ?? "#F5F3FF",
        border: `2px solid ${selected ? accentColor : accentColor + "40"}`,
        minWidth: 220,
        minHeight: 140,
      }}
    >
      <NodeResizer
        color={accentColor}
        isVisible={selected}
        minWidth={220}
        minHeight={140}
      />

      {/* Header */}
      <div
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-t-xl border-b"
        style={{ borderColor: accentColor + "25", background: accentColor + "12" }}
      >
        {/* Title — editable inline */}
        <input
          type="text"
          placeholder="Requirement title…"
          className="flex-1 text-xs font-semibold bg-transparent outline-none text-gray-700 placeholder:text-gray-400 nodrag nopan"
          value={d.label}
          onChange={e => updateNodeMeta(id, { label: e.target.value })}
        />

        {/* Edit / Preview toggle */}
        <button
          title={isEditing ? "Preview" : "Edit"}
          onClick={() => setIsEditing(v => !v)}
          className="w-5 h-5 flex items-center justify-center rounded hover:bg-white/60 transition-colors nodrag"
          style={{ color: accentColor }}
        >
          {isEditing ? <Eye size={11} /> : <Pencil size={11} />}
        </button>

        {/* Font size picker */}
        <select
          title="Font size"
          className="nodrag nopan text-[10px] font-medium bg-transparent border border-gray-300 rounded px-0.5 py-0 outline-none cursor-pointer hover:border-purple-400 transition-colors"
          style={{ color: accentColor, maxWidth: 42 }}
          value={fontSize}
          onChange={e => updateNodeConfig(id, { ...cfg, fontSize: Number(e.target.value) })}
        >
          {FONT_SIZES.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        {/* Color picker */}
        <div className="relative nodrag">
          <button
            title="Background color"
            onClick={() => setShowPalette(v => !v)}
            className="w-4 h-4 rounded-full border-2 border-white shadow-sm nodrag"
            style={{ background: cfg.bgColor ?? "#F5F3FF" }}
          />
          {showPalette && (
            <div
              className="absolute right-0 top-6 bg-white rounded-lg shadow-lg border border-gray-200 p-1.5 flex gap-1 flex-wrap"
              style={{ zIndex: 50, minWidth: 100 }}
              onMouseDown={e => e.stopPropagation()}
            >
              {BG_COLORS.map(c => (
                <button
                  key={c}
                  className="w-5 h-5 rounded border border-gray-300 hover:scale-110 transition-transform nodrag"
                  style={{
                    background: c,
                    outline: (cfg.bgColor ?? "#F5F3FF") === c ? `2px solid ${accentColor}` : undefined,
                  }}
                  onClick={() => { updateNodeConfig(id, { ...cfg, bgColor: c }); setShowPalette(false); }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Delete */}
        <button
          title="Delete"
          onClick={() => deleteNode(id)}
          className="w-5 h-5 flex items-center justify-center rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors nodrag"
        >
          <Trash2 size={10} />
        </button>
      </div>

      {/* Body */}
      {isEditing ? (
        <textarea
          className="flex-1 w-full px-3 py-2 bg-transparent resize-none outline-none text-gray-700 placeholder:text-gray-400 nodrag nopan leading-relaxed"
          style={{ fontSize }}
          placeholder={"# Title\n\nWrite requirements, user stories, or notes in **markdown**.\n\n- [ ] Acceptance criterion 1\n- [ ] Acceptance criterion 2"}
          value={cfg.content}
          onChange={e => updateNodeConfig(id, { ...cfg, content: e.target.value })}
        />
      ) : (
        <div
          className="flex-1 px-3 py-2 overflow-auto text-gray-700 nodrag nopan req-note-preview"
          style={{ fontSize }}
          dangerouslySetInnerHTML={{ __html: `<p>${renderMd(cfg.content || "_empty_")}</p>` }}
        />
      )}
    </div>
  );
});
