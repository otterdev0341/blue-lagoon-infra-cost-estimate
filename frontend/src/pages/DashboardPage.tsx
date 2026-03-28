import { useEffect, useState } from "react";
import {
  Plus, FolderOpen, Trash2, MapPin, Calendar, FileText,
  BarChart3, RefreshCw, Star, Copy, Layout,
} from "lucide-react";
import { api } from "../lib/api.ts";
import { useCanvasStore } from "../store/canvasStore.ts";
import type { Diagram } from "../types.ts";

const BILLING_LABELS: Record<string, string> = {
  ondemand:    "On-Demand",
  reserved1yr: "Reserved 1yr",
  reserved3yr: "Reserved 3yr",
  spot:        "Spot",
};

const REGION_SHORT: Record<string, string> = {
  "us-east-1":      "US East",
  "us-east-2":      "US East 2",
  "us-west-1":      "US West",
  "us-west-2":      "US West 2",
  "eu-west-1":      "EU West",
  "eu-central-1":   "EU Central",
  "ap-southeast-1": "AP SE",
  "ap-southeast-2": "AP SE 2",
  "ap-northeast-1": "AP NE",
  "ap-south-1":     "AP South",
  "sa-east-1":      "SA East",
};

type DiagramMeta = Omit<Diagram, "nodes" | "edges" | "stickyNotes">;
type Tab = "recent" | "templates";

interface Props {
  onOpenCanvas: (id: string) => void;
  onNewCanvas: () => void;
}

export function DashboardPage({ onOpenCanvas, onNewCanvas }: Props) {
  const [diagrams, setDiagrams] = useState<DiagramMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [togglingTemplate, setTogglingTemplate] = useState<string | null>(null);
  const [usingTemplate, setUsingTemplate] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("recent");
  const { loadDiagram } = useCanvasStore();

  function fetchDiagrams() {
    setLoading(true);
    api.diagrams.list()
      .then(data => setDiagrams(data as DiagramMeta[]))
      .catch(console.error)
      .finally(() => setLoading(false));
  }

  useEffect(() => { fetchDiagrams(); }, []);

  async function handleOpen(id: string) {
    const d = await api.diagrams.get(id);
    loadDiagram(d);
    onOpenCanvas(id);
  }

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    setDeleting(id);
    try {
      await api.diagrams.delete(id);
      setDiagrams(prev => prev.filter(d => d.id !== id));
    } catch (err) {
      console.error(err);
    } finally {
      setDeleting(null);
    }
  }

  async function handleToggleTemplate(id: string, current: boolean, e: React.MouseEvent) {
    e.stopPropagation();
    setTogglingTemplate(id);
    try {
      const updated = await api.diagrams.setTemplate(id, !current);
      setDiagrams(prev => prev.map(d => d.id === id ? { ...d, isTemplate: (updated as any).isTemplate } : d));
    } catch (err) {
      console.error(err);
    } finally {
      setTogglingTemplate(null);
    }
  }

  async function handleUseTemplate(templateId: string, e: React.MouseEvent) {
    e.stopPropagation();
    setUsingTemplate(templateId);
    try {
      const source = await api.diagrams.get(templateId);
      const copy = await api.diagrams.create({
        name: `${source.name} (copy)`,
        region: source.region,
        billingModel: source.billingModel,
        nodes: source.nodes,
        edges: source.edges,
        stickyNotes: source.stickyNotes,
        departmentRates: source.departmentRates,
        isTemplate: false,
      });
      loadDiagram(copy);
      onOpenCanvas(copy.id);
    } catch (err) {
      console.error(err);
    } finally {
      setUsingTemplate(null);
    }
  }

  const recent = diagrams.filter(d => !d.isTemplate);
  const templates = diagrams.filter(d => d.isTemplate);

  const regionGroups = recent.reduce<Record<string, number>>((acc, d) => {
    acc[d.region] = (acc[d.region] ?? 0) + 1;
    return acc;
  }, {});
  const topRegion = Object.entries(regionGroups).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";

  const visibleDiagrams = tab === "recent" ? recent : templates;

  return (
    <div className="flex-1 bg-gray-50 overflow-y-auto">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-sm text-gray-500 mt-0.5">Manage your architecture canvases</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchDiagrams}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <RefreshCw size={14} /> Refresh
            </button>
            <button
              onClick={onNewCanvas}
              className="flex items-center gap-1.5 text-sm bg-[#FF9900] hover:bg-[#e88a00] text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              <Plus size={15} /> New Canvas
            </button>
          </div>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-4 gap-4 mt-5">
          <div className="bg-blue-50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <FileText size={16} className="text-blue-500" />
              <span className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Total Canvases</span>
            </div>
            <div className="text-2xl font-bold text-blue-700">{recent.length}</div>
          </div>
          <div className="bg-amber-50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <Star size={16} className="text-amber-500" />
              <span className="text-xs font-semibold text-amber-600 uppercase tracking-wide">Templates</span>
            </div>
            <div className="text-2xl font-bold text-amber-700">{templates.length}</div>
          </div>
          <div className="bg-purple-50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <MapPin size={16} className="text-purple-500" />
              <span className="text-xs font-semibold text-purple-600 uppercase tracking-wide">Top Region</span>
            </div>
            <div className="text-2xl font-bold text-purple-700">{REGION_SHORT[topRegion] ?? topRegion}</div>
          </div>
          <div className="bg-green-50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 size={16} className="text-green-500" />
              <span className="text-xs font-semibold text-green-600 uppercase tracking-wide">Regions Used</span>
            </div>
            <div className="text-2xl font-bold text-green-700">{Object.keys(regionGroups).length}</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-5 border-b border-gray-100 -mb-5 pb-0">
          <button
            onClick={() => setTab("recent")}
            className={`flex items-center gap-1.5 text-sm px-4 py-2.5 border-b-2 transition-colors font-medium ${
              tab === "recent"
                ? "border-[#FF9900] text-[#FF9900]"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <Layout size={14} /> Recent
            <span className={`ml-1 text-[10px] rounded-full px-1.5 py-0.5 font-semibold ${
              tab === "recent" ? "bg-orange-100 text-orange-600" : "bg-gray-100 text-gray-500"
            }`}>{recent.length}</span>
          </button>
          <button
            onClick={() => setTab("templates")}
            className={`flex items-center gap-1.5 text-sm px-4 py-2.5 border-b-2 transition-colors font-medium ${
              tab === "templates"
                ? "border-[#FF9900] text-[#FF9900]"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <Star size={14} /> Templates
            <span className={`ml-1 text-[10px] rounded-full px-1.5 py-0.5 font-semibold ${
              tab === "templates" ? "bg-orange-100 text-orange-600" : "bg-gray-100 text-gray-500"
            }`}>{templates.length}</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="px-8 py-6">
        {loading && (
          <div className="flex items-center justify-center py-20 text-gray-400">
            <RefreshCw size={20} className="animate-spin mr-2" /> Loading…
          </div>
        )}

        {!loading && visibleDiagrams.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            {tab === "templates" ? (
              <>
                <Star size={48} className="mb-4 opacity-30" />
                <p className="text-lg font-medium text-gray-500">No templates yet</p>
                <p className="text-sm mt-1">Star any canvas card to mark it as a template</p>
              </>
            ) : (
              <>
                <FileText size={48} className="mb-4 opacity-30" />
                <p className="text-lg font-medium text-gray-500">No canvases yet</p>
                <p className="text-sm mt-1">Create your first architecture canvas to get started</p>
                <button
                  onClick={onNewCanvas}
                  className="mt-4 flex items-center gap-2 bg-[#FF9900] text-white px-5 py-2.5 rounded-lg font-medium hover:bg-[#e88a00] transition-colors"
                >
                  <Plus size={16} /> Create Canvas
                </button>
              </>
            )}
          </div>
        )}

        {!loading && visibleDiagrams.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {visibleDiagrams.map(d => (
              <div
                key={d.id}
                onClick={() => tab === "recent" ? handleOpen(d.id) : undefined}
                className={`bg-white rounded-xl border hover:shadow-md transition-all group p-4 flex flex-col gap-3 ${
                  tab === "recent"
                    ? "border-gray-200 hover:border-blue-300 cursor-pointer"
                    : "border-amber-200 hover:border-amber-400 cursor-default"
                }`}
              >
                {/* Card header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      d.isTemplate ? "bg-amber-100" : "bg-[#232F3E]"
                    }`}>
                      <span className="text-sm">{d.isTemplate ? "⭐" : "☁️"}</span>
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-gray-800 text-sm leading-tight truncate max-w-[130px]">{d.name}</div>
                      <div className="text-[10px] text-gray-400 mt-0.5">{BILLING_LABELS[d.billingModel] ?? d.billingModel}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {/* Star toggle */}
                    <button
                      onClick={e => handleToggleTemplate(d.id, !!d.isTemplate, e)}
                      disabled={togglingTemplate === d.id}
                      title={d.isTemplate ? "Unmark as template" : "Mark as template"}
                      className={`p-1 rounded transition-all ${
                        d.isTemplate
                          ? "text-amber-400 hover:text-amber-600"
                          : "opacity-0 group-hover:opacity-100 text-gray-300 hover:text-amber-400"
                      }`}
                    >
                      <Star size={14} fill={d.isTemplate ? "currentColor" : "none"} />
                    </button>
                    {/* Delete */}
                    <button
                      onClick={e => handleDelete(d.id, e)}
                      disabled={deleting === d.id}
                      className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-all p-1 rounded"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Region badge */}
                <div className="flex items-center gap-1.5">
                  <MapPin size={11} className="text-gray-400" />
                  <span className="text-xs text-gray-500">{d.region}</span>
                </div>

                {/* Footer */}
                <div className="border-t border-gray-100 pt-2 flex items-center justify-between">
                  <div className="flex items-center gap-1 text-[10px] text-gray-400">
                    <Calendar size={10} />
                    {new Date(d.updatedAt).toLocaleDateString()}
                  </div>
                  {d.isTemplate ? (
                    <button
                      onClick={e => handleUseTemplate(d.id, e)}
                      disabled={usingTemplate === d.id}
                      className="flex items-center gap-1 text-[10px] text-amber-600 hover:text-amber-800 font-medium disabled:opacity-60"
                    >
                      <Copy size={11} /> {usingTemplate === d.id ? "Creating…" : "Use as Template"}
                    </button>
                  ) : (
                    <button
                      onClick={e => { e.stopPropagation(); handleOpen(d.id); }}
                      className="flex items-center gap-1 text-[10px] text-blue-500 hover:text-blue-700 font-medium"
                    >
                      <FolderOpen size={11} /> Open
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
