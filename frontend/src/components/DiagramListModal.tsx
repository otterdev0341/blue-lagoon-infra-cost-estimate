import { useEffect, useState } from "react";
import { X, Trash2, FileText } from "lucide-react";
import { api } from "../lib/api.ts";
import { useCanvasStore } from "../store/canvasStore.ts";
import type { Diagram } from "../types.ts";

interface Props { onClose: () => void; }

export function DiagramListModal({ onClose }: Props) {
  const [diagrams, setDiagrams] = useState<Omit<Diagram, "nodes" | "edges" | "stickyNotes">[]>([]);
  const [loading, setLoading] = useState(true);
  const { loadDiagram } = useCanvasStore();

  useEffect(() => {
    api.diagrams.list().then(setDiagrams).finally(() => setLoading(false));
  }, []);

  async function handleOpen(id: string) {
    const d = await api.diagrams.get(id);
    loadDiagram(d);
    onClose();
  }

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    await api.diagrams.delete(id);
    setDiagrams((prev) => prev.filter((d) => d.id !== id));
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-[480px] max-h-[70vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="font-semibold text-gray-800">Open Diagram</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={18} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {loading && <p className="text-gray-400 text-sm text-center py-8">Loading…</p>}
          {!loading && diagrams.length === 0 && (
            <p className="text-gray-400 text-sm text-center py-8">No saved diagrams yet.</p>
          )}
          {diagrams.map((d) => (
            <button
              key={d.id}
              onClick={() => handleOpen(d.id)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-50 text-left group border border-transparent hover:border-gray-200 transition-colors"
            >
              <FileText size={20} className="text-gray-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-800 truncate">{d.name}</div>
                <div className="text-xs text-gray-400">{d.region} · {new Date(d.updatedAt).toLocaleString()}</div>
              </div>
              <button
                onClick={(e) => handleDelete(d.id, e)}
                className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all"
              >
                <Trash2 size={15} />
              </button>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
