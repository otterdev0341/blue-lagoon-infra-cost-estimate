import { useEffect, useRef, useState } from "react";
import { X, Clock, RotateCcw, Tag, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { api } from "../lib/api.ts";
import { useCanvasStore } from "../store/canvasStore.ts";
import type { DiagramSnapshot } from "../types.ts";

interface Props {
  onClose: () => void;
  /** Called after a successful restore so the canvas can refresh. */
  onRestored: () => void;
}

export function VersionHistoryPanel({ onClose, onRestored }: Props) {
  const { diagramId, loadDiagram } = useCanvasStore();
  const [snapshots, setSnapshots] = useState<DiagramSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [labelInput, setLabelInput] = useState("");
  const [showLabelInput, setShowLabelInput] = useState(false);
  const [toast, setToast] = useState<{ type: "ok" | "err"; msg: string } | null>(null);
  const labelRef = useRef<HTMLInputElement>(null);

  function showToast(type: "ok" | "err", msg: string) {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  }

  async function fetchSnapshots() {
    if (!diagramId) return;
    setLoading(true);
    try {
      const data = await api.snapshots.list(diagramId);
      setSnapshots(data);
    } catch {
      showToast("err", "Failed to load version history");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchSnapshots(); }, [diagramId]);

  useEffect(() => {
    if (showLabelInput) labelRef.current?.focus();
  }, [showLabelInput]);

  async function handleCreateCheckpoint() {
    if (!diagramId) return;
    setCreating(true);
    try {
      const label = labelInput.trim() || `Checkpoint ${new Date().toLocaleTimeString()}`;
      await api.snapshots.create(diagramId, label);
      setLabelInput("");
      setShowLabelInput(false);
      showToast("ok", `Checkpoint "${label}" created`);
      fetchSnapshots();
    } catch {
      showToast("err", "Failed to create checkpoint");
    } finally {
      setCreating(false);
    }
  }

  async function handleRestore(snapshot: DiagramSnapshot) {
    if (!diagramId) return;
    const ts = formatTime(snapshot.createdAt);
    const label = snapshot.label ?? ts;
    if (!window.confirm(`Restore to "${label}"?\n\nThe current state will be saved as "Before restore" first.`)) return;
    setRestoring(snapshot.id);
    try {
      const updated = await api.snapshots.restore(diagramId, snapshot.id);
      loadDiagram(updated);
      showToast("ok", `Restored to "${label}"`);
      onRestored();
      fetchSnapshots();
    } catch {
      showToast("err", "Restore failed");
    } finally {
      setRestoring(null);
    }
  }

  function formatTime(iso: string) {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60_000);
    if (diffMin < 1) return "Just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `${diffH}h ago`;
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/20" />

      {/* Panel */}
      <div
        className="relative w-80 h-full bg-white shadow-2xl flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2">
            <Clock size={15} className="text-gray-500" />
            <span className="font-semibold text-gray-800 text-sm">Version History</span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={15} />
          </button>
        </div>

        {/* Create checkpoint */}
        <div className="px-4 py-3 border-b border-gray-100 shrink-0 space-y-2">
          {showLabelInput ? (
            <div className="flex gap-1.5">
              <input
                ref={labelRef}
                value={labelInput}
                onChange={e => setLabelInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter") handleCreateCheckpoint();
                  if (e.key === "Escape") { setShowLabelInput(false); setLabelInput(""); }
                }}
                placeholder="Checkpoint label…"
                className="flex-1 text-xs px-2.5 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              <button
                onClick={handleCreateCheckpoint}
                disabled={creating}
                className="text-xs px-2.5 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-1"
              >
                {creating ? <Loader2 size={11} className="animate-spin" /> : null}
                Save
              </button>
              <button
                onClick={() => { setShowLabelInput(false); setLabelInput(""); }}
                className="text-xs px-2 py-1.5 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X size={13} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowLabelInput(true)}
              className="w-full flex items-center justify-center gap-1.5 text-xs py-1.5 px-3 rounded-lg border border-dashed border-gray-300 text-gray-500 hover:text-blue-600 hover:border-blue-400 hover:bg-blue-50 transition-colors"
            >
              <Tag size={12} />
              Create Checkpoint
            </button>
          )}
        </div>

        {/* Snapshot list */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={20} className="animate-spin text-gray-400" />
            </div>
          )}

          {!loading && snapshots.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <Clock size={28} className="text-gray-300 mb-2" />
              <p className="text-sm text-gray-400">No versions yet</p>
              <p className="text-xs text-gray-300 mt-1">Versions are created when you click Save or create a checkpoint.</p>
            </div>
          )}

          {!loading && snapshots.map((snap, idx) => {
            const isRestoring = restoring === snap.id;
            const isCheckpoint = snap.label && snap.label !== "Auto-checkpoint" && snap.label !== "Before restore";
            return (
              <div
                key={snap.id}
                className="group px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      {isCheckpoint && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-600 font-medium">
                          <Tag size={9} />
                          checkpoint
                        </span>
                      )}
                      {idx === 0 && (
                        <span className="inline-flex text-[10px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-600 font-medium">
                          latest
                        </span>
                      )}
                    </div>
                    <div className="text-xs font-medium text-gray-700 truncate">
                      {snap.label ?? "Save"}
                    </div>
                    <div className="text-[11px] text-gray-400 mt-0.5">
                      {formatTime(snap.createdAt)}
                    </div>
                    <div className="text-[10px] text-gray-300 mt-0.5">
                      {snap.nodes.length} node{snap.nodes.length !== 1 ? "s" : ""}
                      {" · "}
                      {snap.edges.length} edge{snap.edges.length !== 1 ? "s" : ""}
                      {snap.stickyNotes.length > 0 ? ` · ${snap.stickyNotes.length} note${snap.stickyNotes.length !== 1 ? "s" : ""}` : ""}
                    </div>
                  </div>

                  {/* Restore button */}
                  <button
                    onClick={() => handleRestore(snap)}
                    disabled={!!restoring}
                    title="Restore this version"
                    className="opacity-0 group-hover:opacity-100 flex items-center gap-1 text-[11px] px-2 py-1 rounded-md border border-gray-200 text-gray-500 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50 disabled:opacity-30 transition-all"
                  >
                    {isRestoring
                      ? <Loader2 size={11} className="animate-spin" />
                      : <RotateCcw size={11} />
                    }
                    Restore
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer note */}
        <div className="px-4 py-2.5 border-t border-gray-100 shrink-0">
          <p className="text-[10px] text-gray-400 leading-relaxed">
            Versions are created on manual Save. Up to 20 versions stored per diagram.
          </p>
        </div>

        {/* Toast */}
        {toast && (
          <div className={`absolute bottom-14 left-4 right-4 flex items-center gap-2 px-3 py-2.5 rounded-lg shadow-lg text-white text-xs font-medium transition-all ${
            toast.type === "ok" ? "bg-green-600" : "bg-red-600"
          }`}>
            {toast.type === "ok"
              ? <CheckCircle size={14} />
              : <AlertCircle size={14} />
            }
            {toast.msg}
          </div>
        )}
      </div>
    </div>
  );
}
