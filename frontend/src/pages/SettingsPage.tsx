import { useState } from "react";
import { Plus, Trash2, Save, RotateCcw, Globe, Layers, Check } from "lucide-react";
import { useCanvasStore } from "../store/canvasStore.ts";
import {
  loadGlobalSettings, saveGlobalSettings,
  loadCanvasSettings, saveCanvasSettings, clearCanvasSettings, hasCanvasOverride,
  DEFAULT_DEPARTMENT_RATES,
} from "../lib/globalSettings.ts";
import { AdditionalCostsTab } from "../components/panels/AdditionalCostsTab.tsx";
import { SubscribeTab } from "../components/panels/SubscribeTab.tsx";
import type { DepartmentRate } from "../types.ts";
import { randomId } from "../lib/utils.ts";

const COLOR_PRESETS = [
  "#3B82F6","#EC4899","#10B981","#F59E0B","#8B5CF6",
  "#EF4444","#14B8A6","#F97316","#06B6D4","#6366F1",
];

type SettingsTab = "rates" | "costs";

export function SettingsPage() {
  const [tab, setTab] = useState<SettingsTab>("rates");
  const { diagramId, departmentRates, setDepartmentRates } = useCanvasStore();
  const [saved, setSaved] = useState(false);

  // Local draft of rates for editing
  const [draft, setDraft] = useState<DepartmentRate[]>(() => [...departmentRates]);
  const [isOverride, setIsOverride] = useState(() => diagramId ? hasCanvasOverride(diagramId) : false);

  function handleRateChange(i: number, field: keyof DepartmentRate, value: string | number) {
    setDraft(prev => {
      const next = [...prev];
      next[i] = { ...next[i], [field]: value };
      return next;
    });
  }

  function handleAddRate() {
    setDraft(prev => [...prev, {
      id: randomId(),
      name: "New Position",
      ratePerManday: 10000,
      color: COLOR_PRESETS[prev.length % COLOR_PRESETS.length],
    }]);
  }

  function handleDeleteRate(i: number) {
    setDraft(prev => prev.filter((_, idx) => idx !== i));
  }

  function handleSaveGlobal() {
    saveGlobalSettings({ departmentRates: draft });
    setDepartmentRates(draft);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  function handleSaveCanvasOverride() {
    if (!diagramId) return;
    saveCanvasSettings(diagramId, { departmentRates: draft });
    setDepartmentRates(draft);
    setIsOverride(true);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  function handleLoadGlobal() {
    const global = loadGlobalSettings();
    setDraft([...global.departmentRates]);
  }

  function handleClearOverride() {
    if (!diagramId) return;
    clearCanvasSettings(diagramId);
    const global = loadGlobalSettings();
    setDraft([...global.departmentRates]);
    setDepartmentRates(global.departmentRates);
    setIsOverride(false);
  }

  function handleResetToDefaults() {
    setDraft([...DEFAULT_DEPARTMENT_RATES]);
  }

  return (
    <div className="flex-1 bg-gray-50 overflow-y-auto">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-5">
        <h1 className="text-xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Global defaults and per-canvas configuration</p>
      </div>

      <div className="flex h-full">
        {/* Left nav */}
        <div className="w-48 bg-white border-r border-gray-200 pt-4 shrink-0">
          <button
            onClick={() => setTab("rates")}
            className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-left transition-colors ${
              tab === "rates" ? "bg-blue-50 text-blue-700 font-semibold border-r-2 border-blue-500" : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            <Layers size={15} /> Positions & Rates
          </button>
          <button
            onClick={() => setTab("costs")}
            className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-left transition-colors ${
              tab === "costs" ? "bg-blue-50 text-blue-700 font-semibold border-r-2 border-blue-500" : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            <Globe size={15} /> Cost Categories
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 p-8 overflow-y-auto">

          {/* ─── Positions & Rates tab ─── */}
          {tab === "rates" && (
            <div className="max-w-2xl space-y-6">
              {/* Canvas override notice */}
              {diagramId && (
                <div className={`flex items-center justify-between px-4 py-3 rounded-xl border text-sm ${
                  isOverride
                    ? "bg-amber-50 border-amber-200 text-amber-800"
                    : "bg-blue-50 border-blue-200 text-blue-800"
                }`}>
                  <div className="flex items-center gap-2">
                    {isOverride ? <Layers size={14} /> : <Globe size={14} />}
                    <span>
                      {isOverride
                        ? "This canvas uses canvas-specific rates"
                        : "This canvas uses global default rates"}
                    </span>
                  </div>
                  {isOverride && (
                    <button
                      onClick={handleClearOverride}
                      className="text-xs text-amber-700 hover:text-amber-900 underline"
                    >
                      Clear override
                    </button>
                  )}
                </div>
              )}

              {/* Rate table */}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                  <div>
                    <h2 className="font-semibold text-gray-800">Department Positions & Manday Rates</h2>
                    <p className="text-xs text-gray-400 mt-0.5">Rate in THB per manday (man-day of work)</p>
                  </div>
                  <button
                    onClick={handleResetToDefaults}
                    className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 px-2 py-1 rounded hover:bg-gray-50"
                  >
                    <RotateCcw size={11} /> Defaults
                  </button>
                </div>

                <div className="divide-y divide-gray-50">
                  {draft.map((rate, i) => (
                    <div key={rate.id} className="flex items-center gap-3 px-5 py-3">
                      {/* Color picker */}
                      <div className="relative group/color">
                        <div
                          className="w-6 h-6 rounded-full border-2 border-white shadow cursor-pointer"
                          style={{ background: rate.color }}
                        />
                        <div className="absolute left-0 top-8 bg-white rounded-lg shadow-lg border border-gray-200 p-2 grid grid-cols-5 gap-1 z-10 hidden group-hover/color:grid min-w-[120px]">
                          {COLOR_PRESETS.map(c => (
                            <button
                              key={c}
                              className="w-5 h-5 rounded-full hover:scale-110 transition-transform border border-gray-200"
                              style={{ background: c, outline: rate.color === c ? "2px solid #1d4ed8" : undefined }}
                              onClick={() => handleRateChange(i, "color", c)}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Name */}
                      <input
                        className="text-sm font-medium text-gray-700 border border-transparent hover:border-gray-200 focus:border-blue-400 rounded px-2 py-1 w-28 outline-none"
                        value={rate.name}
                        onChange={e => handleRateChange(i, "name", e.target.value)}
                      />

                      {/* Rate */}
                      <div className="flex items-center gap-1 flex-1">
                        <input
                          type="number"
                          min={0}
                          step={500}
                          className="text-sm text-right border border-gray-200 focus:border-blue-400 rounded px-2 py-1 w-24 outline-none"
                          value={rate.ratePerManday}
                          onChange={e => handleRateChange(i, "ratePerManday", parseInt(e.target.value) || 0)}
                        />
                        <span className="text-xs text-gray-400">฿/md</span>
                      </div>

                      {/* Delete */}
                      <button
                        onClick={() => handleDeleteRate(i)}
                        className="text-gray-300 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add row */}
                <div className="px-5 py-3 border-t border-gray-100">
                  <button
                    onClick={handleAddRate}
                    className="flex items-center gap-1.5 text-sm text-blue-500 hover:text-blue-700 transition-colors"
                  >
                    <Plus size={14} /> Add Position
                  </button>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-3">
                <button
                  onClick={handleSaveGlobal}
                  className="flex items-center gap-2 bg-gray-800 hover:bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  {saved ? <Check size={14} /> : <Globe size={14} />}
                  Save as Global Default
                </button>

                {diagramId && (
                  <button
                    onClick={handleSaveCanvasOverride}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    {saved ? <Check size={14} /> : <Layers size={14} />}
                    Save for This Canvas
                  </button>
                )}

                <button
                  onClick={handleLoadGlobal}
                  className="flex items-center gap-2 text-gray-600 hover:text-gray-800 px-4 py-2 rounded-lg text-sm border border-gray-200 hover:border-gray-300 transition-colors"
                >
                  <RotateCcw size={14} /> Load Global
                </button>
              </div>

              {saved && (
                <div className="flex items-center gap-2 text-green-600 text-sm">
                  <Check size={14} /> Settings saved
                </div>
              )}
            </div>
          )}

          {/* ─── Cost Categories tab ─── */}
          {tab === "costs" && (
            <div className="max-w-2xl space-y-6">
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100">
                  <h2 className="font-semibold text-gray-800">Additional Costs</h2>
                  <p className="text-xs text-gray-400 mt-0.5">R&D, DevOps, Maintenance, and other recurring costs for the current canvas</p>
                </div>
                <div className="p-4">
                  <AdditionalCostsTab />
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100">
                  <h2 className="font-semibold text-gray-800">SaaS Subscriptions</h2>
                  <p className="text-xs text-gray-400 mt-0.5">Third-party tools and subscriptions for the current canvas</p>
                </div>
                <div className="p-4">
                  <SubscribeTab />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
