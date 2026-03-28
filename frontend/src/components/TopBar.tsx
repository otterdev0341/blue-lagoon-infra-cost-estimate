import { useState, useRef } from "react";
import { Save, FolderOpen, Plus, Download, Upload, X, Clock, CheckCircle, Loader2, AlertCircle, WifiOff } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useCanvasStore } from "../store/canvasStore.ts";
import { api } from "../lib/api.ts";
import { exportCanvasFile, parseCanvasFile, prepareForMerge } from "../lib/canvasFile.ts";
import { VersionHistoryPanel } from "./VersionHistoryPanel.tsx";
import type { SaveStatus } from "../hooks/useAutoSave.ts";
import type { Diagram } from "../types.ts";
import type { CanvasFile } from "../lib/canvasFile.ts";

interface Props {
  onNew: () => void;
  saveStatus?: SaveStatus;
  lastSaved?: Date | null;
}

const NAV_ITEMS = [
  { path: "/canvas/new", match: "/canvas", label: "Canvas" },
  { path: "/dashboard",  match: "/dashboard", label: "Dashboard" },
  { path: "/settings",   match: "/settings",  label: "Settings" },
] as const;

function SaveIndicator({ status, lastSaved }: { status: SaveStatus; lastSaved?: Date | null }) {
  if (status === "idle") {
    if (!lastSaved) return null;
    return (
      <span className="flex items-center gap-1 text-white/40 text-[11px]">
        <CheckCircle size={11} />
        Saved {lastSaved.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
      </span>
    );
  }
  if (status === "unsaved") {
    return (
      <span className="flex items-center gap-1 text-white/50 text-[11px]">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
        Unsaved changes
      </span>
    );
  }
  if (status === "saving") {
    return (
      <span className="flex items-center gap-1 text-white/50 text-[11px]">
        <Loader2 size={11} className="animate-spin" />
        Saving…
      </span>
    );
  }
  if (status === "saved") {
    return (
      <span className="flex items-center gap-1 text-emerald-400 text-[11px]">
        <CheckCircle size={11} />
        Saved
      </span>
    );
  }
  if (status === "error") {
    return (
      <span className="flex items-center gap-1 text-red-400 text-[11px]">
        <AlertCircle size={11} />
        Save failed
      </span>
    );
  }
  return null;
}

export function TopBar({ onNew, saveStatus = "idle", lastSaved }: Props) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { diagramId, diagramName, defaultRegion, billingModel, nodes, edges, stickyNotes, departmentRates, setDiagramMeta, loadDiagram, mergeNodes } = useCanvasStore();
  const [saving, setSaving] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameVal, setNameVal] = useState(diagramName);
  const [pendingImport, setPendingImport] = useState<CanvasFile | null>(null);
  const [showOpen, setShowOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleSave() {
    setSaving(true);
    try {
      if (diagramId) {
        // PUT creates a snapshot (versioned save)
        await api.diagrams.update(diagramId, { nodes, edges, stickyNotes, departmentRates, name: diagramName, region: defaultRegion, billingModel });
      } else {
        const d = await api.diagrams.create({ name: diagramName, region: defaultRegion, billingModel, nodes, edges, stickyNotes });
        loadDiagram(d as Diagram);
        navigate(`/canvas/${d.id}`);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  function handleExport() {
    exportCanvasFile({ name: diagramName, region: defaultRegion, billingModel, nodes, edges, stickyNotes });
  }

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    try {
      const text = await file.text();
      const parsed = parseCanvasFile(text);
      setPendingImport(parsed);
    } catch (err) {
      alert(`Import failed: ${(err as Error).message}`);
    }
  }

  function handleReplace() {
    if (!pendingImport) return;
    loadDiagram({
      id: "",
      name: pendingImport.meta.name,
      region: pendingImport.canvas.region,
      billingModel: pendingImport.canvas.billingModel,
      nodes: pendingImport.canvas.nodes,
      edges: pendingImport.canvas.edges,
      stickyNotes: pendingImport.canvas.stickyNotes,
      createdAt: "",
      updatedAt: "",
    });
    setPendingImport(null);
    navigate("/canvas/new");
  }

  function handleMerge() {
    if (!pendingImport) return;
    const merged = prepareForMerge(pendingImport, nodes);
    mergeNodes(merged.nodes, merged.edges, merged.stickyNotes);
    setPendingImport(null);
    navigate("/canvas/new");
  }

  const isCanvas = pathname.startsWith("/canvas");

  return (
    <div className="relative">
      <div className="h-12 bg-[#232F3E] flex items-center px-4 gap-3 shrink-0">
        {/* Logo */}
        <div className="flex items-center gap-2 mr-2 cursor-pointer" onClick={() => navigate("/dashboard")}>
          <span className="text-lg">🌊</span>
          <span className="text-white font-bold text-sm">Blue Lagoon</span>
        </div>

        <div className="w-px h-6 bg-white/20" />

        {/* Navigation */}
        <div className="flex items-center gap-0.5 mr-2">
          {NAV_ITEMS.map(({ path, match, label }) => {
            const active = pathname.startsWith(match);
            return (
              <button
                key={match}
                onClick={() => navigate(path)}
                className={`text-xs px-2.5 py-1 rounded capitalize transition-colors ${
                  active
                    ? "bg-white/20 text-white font-semibold"
                    : "text-white/60 hover:text-white hover:bg-white/10"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Diagram name — only on canvas */}
        {isCanvas && (
          editingName ? (
            <input
              autoFocus
              className="bg-white/10 text-white rounded px-2 py-1 text-sm w-48 focus:outline-none focus:ring-1 focus:ring-white/40"
              value={nameVal}
              onChange={(e) => setNameVal(e.target.value)}
              onBlur={() => { setEditingName(false); setDiagramMeta(nameVal, defaultRegion); }}
              onKeyDown={(e) => { if (e.key === "Enter") { setEditingName(false); setDiagramMeta(nameVal, defaultRegion); } }}
            />
          ) : (
            <button
              className="text-white/80 hover:text-white text-sm px-2 py-1 rounded hover:bg-white/10 transition-colors"
              onClick={() => { setNameVal(diagramName); setEditingName(true); }}
            >
              {diagramName}
            </button>
          )
        )}

        {/* Auto-save status indicator */}
        {isCanvas && diagramId && (
          <SaveIndicator status={saveStatus} lastSaved={lastSaved} />
        )}

        <div className="flex-1" />

        {/* Actions */}
        <button onClick={onNew} className="flex items-center gap-1.5 text-white/70 hover:text-white text-sm px-3 py-1.5 rounded hover:bg-white/10 transition-colors">
          <Plus size={15} /> New
        </button>
        <button onClick={() => setShowOpen(true)} className="flex items-center gap-1.5 text-white/70 hover:text-white text-sm px-3 py-1.5 rounded hover:bg-white/10 transition-colors">
          <FolderOpen size={15} /> Open
        </button>
        <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1.5 text-white/70 hover:text-white text-sm px-3 py-1.5 rounded hover:bg-white/10 transition-colors">
          <Upload size={15} /> Import
        </button>
        <button onClick={handleExport} className="flex items-center gap-1.5 text-white/70 hover:text-white text-sm px-3 py-1.5 rounded hover:bg-white/10 transition-colors">
          <Download size={15} /> Export
        </button>

        {/* History button — only when a diagram is saved */}
        {isCanvas && diagramId && (
          <button
            onClick={() => setShowHistory(true)}
            className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded transition-colors ${
              showHistory
                ? "bg-white/20 text-white"
                : "text-white/70 hover:text-white hover:bg-white/10"
            }`}
          >
            <Clock size={15} /> History
          </button>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-1.5 bg-[#FF9900] hover:bg-[#e88a00] text-white text-sm px-3 py-1.5 rounded font-medium transition-colors disabled:opacity-60"
        >
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
          {saving ? "Saving…" : "Save"}
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept=".bluelagoon,.json"
          className="hidden"
          onChange={handleFileSelected}
        />
      </div>

      {/* Import modal */}
      {pendingImport && (
        <div className="absolute top-12 left-1/2 -translate-x-1/2 z-50 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 flex items-center justify-between border-b border-gray-100">
            <div>
              <div className="text-sm font-semibold text-gray-800">Import Canvas</div>
              <div className="text-[10px] text-gray-400 truncate max-w-[220px]">{pendingImport.meta.name}</div>
            </div>
            <button onClick={() => setPendingImport(null)} className="text-gray-400 hover:text-gray-600">
              <X size={14} />
            </button>
          </div>
          <div className="px-4 py-4 space-y-3">
            <p className="text-xs text-gray-500">How would you like to import this canvas?</p>
            <button
              onClick={handleReplace}
              className="w-full text-left px-3 py-2.5 rounded-lg border border-gray-200 hover:border-red-300 hover:bg-red-50 transition-colors group"
            >
              <div className="text-sm font-semibold text-gray-700 group-hover:text-red-700">Replace</div>
              <div className="text-[10px] text-gray-400">Clear the current canvas and load this one</div>
            </button>
            <button
              onClick={handleMerge}
              className="w-full text-left px-3 py-2.5 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors group"
            >
              <div className="text-sm font-semibold text-gray-700 group-hover:text-blue-700">Merge</div>
              <div className="text-[10px] text-gray-400">Add alongside existing nodes (IDs remapped, offset right)</div>
            </button>
          </div>
        </div>
      )}

      {/* Open modal */}
      {showOpen && <OpenModal onClose={() => setShowOpen(false)} onOpen={(id) => { navigate(`/canvas/${id}`); setShowOpen(false); }} />}

      {/* Version history panel */}
      {showHistory && (
        <VersionHistoryPanel
          onClose={() => setShowHistory(false)}
          onRestored={() => setShowHistory(false)}
        />
      )}
    </div>
  );
}

// ── Inline open modal ─────────────────────────────────────────────────────────
function OpenModal({ onClose, onOpen }: { onClose: () => void; onOpen: (id: string) => void }) {
  const [diagrams, setDiagrams] = useState<{ id: string; name: string; updatedAt: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const { loadDiagram } = useCanvasStore();

  useState(() => {
    api.diagrams.list()
      .then(d => setDiagrams(d as any))
      .catch(console.error)
      .finally(() => setLoading(false));
  });

  async function handleOpen(id: string) {
    const d = await api.diagrams.get(id);
    loadDiagram(d);
    onOpen(id);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-96 max-h-[70vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <span className="font-semibold text-gray-800 text-sm">Open Canvas</span>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={14} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {loading && <div className="text-center text-sm text-gray-400 py-8">Loading…</div>}
          {!loading && diagrams.length === 0 && <div className="text-center text-sm text-gray-400 py-8">No saved canvases</div>}
          {diagrams.filter((d: any) => !d.isTemplate).map((d: any) => (
            <button
              key={d.id}
              onClick={() => handleOpen(d.id)}
              className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors group"
            >
              <div className="text-sm font-medium text-gray-800">{d.name}</div>
              <div className="text-[10px] text-gray-400">{new Date(d.updatedAt).toLocaleString()}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
