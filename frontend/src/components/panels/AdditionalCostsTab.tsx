import { useState } from "react";
import { Plus, Trash2, ChevronDown, ChevronUp, Settings, X } from "lucide-react";
import { useCanvasStore } from "../../store/canvasStore.ts";
import { fmtTHB, fmtUSD } from "../../lib/utils.ts";
import type { AdditionalCostCategory, AdditionalCostItem } from "../../types.ts";

const CATEGORIES: { value: AdditionalCostCategory; label: string; icon: string; color: string }[] = [
  { value: "rd",       label: "R&D",        icon: "🔬", color: "#6366F1" },
  { value: "devops",   label: "DevOps",     icon: "⚙️", color: "#0EA5E9" },
  { value: "maintain", label: "Maintenance",icon: "🔧", color: "#F59E0B" },
  { value: "other",    label: "Other",      icon: "📎", color: "#94A3B8" },
];

const PERIODS = [
  { value: "monthly",  label: "Monthly" },
  { value: "yearly",   label: "Yearly ÷12" },
  { value: "one-time", label: "One-time" },
] as const;

function effectiveMonthly(item: AdditionalCostItem): number {
  if (item.billingPeriod === "one-time") return 0;  // not in monthly recurring
  const base = item.billingPeriod === "yearly" ? item.amountUSD / 12 : item.amountUSD;
  return base * (1 - (item.discount ?? 0) / 100);
}

function catMeta(v: AdditionalCostCategory) {
  return CATEGORIES.find((c) => c.value === v) ?? CATEGORIES[3];
}

// ── Settings popover ──────────────────────────────────────────────────────

function SettingsPopover({ onClose }: { onClose: () => void }) {
  return (
    <div className="absolute top-8 right-2 z-50 w-60 bg-white border border-gray-200 rounded-xl shadow-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-700">Settings</span>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={13} /></button>
      </div>
      <div className="text-xs text-gray-500 space-y-1.5">
        <div className="font-medium text-gray-600">Categories</div>
        {CATEGORIES.map((c) => (
          <div key={c.value} className="flex items-center gap-2">
            <span>{c.icon}</span>
            <span style={{ color: c.color }} className="font-medium">{c.label}</span>
          </div>
        ))}
        <div className="pt-1 border-t border-gray-100 text-gray-400">
          One-time items are excluded from monthly totals and shown separately as setup costs.
        </div>
      </div>
    </div>
  );
}

// ── Edit row ──────────────────────────────────────────────────────────────

interface EditRowProps {
  item: AdditionalCostItem;
  rate: number;
  onClose: () => void;
}

function EditRow({ item, rate, onClose }: EditRowProps) {
  const { updateAdditionalCost } = useCanvasStore();
  const upd = (patch: Partial<Omit<AdditionalCostItem, "id">>) =>
    updateAdditionalCost(item.id, patch);

  const inp = (
    field: keyof AdditionalCostItem,
    type = "text",
    opts?: { min?: number; step?: number }
  ) => (
    <input
      type={type}
      className="border rounded px-2 py-1 text-xs w-full focus:outline-none focus:ring-1 focus:ring-blue-300"
      value={(item[field] as any) ?? ""}
      {...opts}
      onChange={(e) =>
        upd({ [field]: type === "number" ? Number(e.target.value) : e.target.value } as any)
      }
    />
  );

  const monthly = effectiveMonthly(item);
  const isOneTime = item.billingPeriod === "one-time";

  return (
    <tr className="bg-blue-50 border-t border-blue-100">
      <td colSpan={5} className="px-3 py-3">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <label className="flex flex-col gap-0.5 text-gray-500 font-medium">
            Label
            {inp("label")}
          </label>
          <label className="flex flex-col gap-0.5 text-gray-500 font-medium">
            Category
            <select
              className="border rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-300"
              value={item.category}
              onChange={(e) => upd({ category: e.target.value as AdditionalCostCategory })}
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.icon} {c.label}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-0.5 text-gray-500 font-medium">
            Amount (USD)
            {inp("amountUSD", "number", { min: 0, step: 0.01 })}
          </label>
          <label className="flex flex-col gap-0.5 text-gray-500 font-medium">
            Period
            <select
              className="border rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-300"
              value={item.billingPeriod}
              onChange={(e) => upd({ billingPeriod: e.target.value as any })}
            >
              {PERIODS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </label>
          {!isOneTime && (
            <label className="col-span-2 flex flex-col gap-0.5 text-gray-500 font-medium">
              Discount %
              <div className="flex items-center gap-2">
                <input
                  type="range" min={0} max={100} className="flex-1 accent-blue-500"
                  value={item.discount ?? 0}
                  onChange={(e) => upd({ discount: Number(e.target.value) })}
                />
                <span className="text-xs font-semibold w-8 text-right text-gray-700">
                  {item.discount ?? 0}%
                </span>
              </div>
            </label>
          )}
        </div>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-[10px] text-gray-400">
            {isOneTime
              ? `One-time: ${fmtTHB(item.amountUSD * rate)} · ${fmtUSD(item.amountUSD)}`
              : `≈ ${fmtTHB(monthly * rate)}/mo · ${fmtUSD(monthly)}/mo`}
          </span>
          <button
            onClick={onClose}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
          >
            Done
          </button>
        </div>
      </td>
    </tr>
  );
}

// ── Main tab ──────────────────────────────────────────────────────────────

export function AdditionalCostsTab({ rate }: { rate: number }) {
  const { additionalCosts, addAdditionalCost, deleteAdditionalCost } = useCanvasStore();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [filterCat, setFilterCat] = useState<AdditionalCostCategory | "all">("all");

  const recurringItems = additionalCosts.filter((c) => c.billingPeriod !== "one-time");
  const oneTimeItems   = additionalCosts.filter((c) => c.billingPeriod === "one-time");

  const totalRecurring = recurringItems.reduce((s, c) => s + effectiveMonthly(c), 0);
  const totalOneTime   = oneTimeItems.reduce((s, c) => s + c.amountUSD * (1 - (c.discount ?? 0) / 100), 0);

  const filtered = filterCat === "all"
    ? additionalCosts
    : additionalCosts.filter((c) => c.category === filterCat);

  function addItem() {
    addAdditionalCost({ category: "rd", label: "New item", amountUSD: 0, billingPeriod: "monthly", discount: 0 });
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header bar */}
      <div className="px-3 pt-2 pb-1 border-b border-gray-100 flex items-center gap-1 flex-wrap relative">
        {/* Category pills */}
        <button
          onClick={() => setFilterCat("all")}
          className={`text-[10px] px-2 py-0.5 rounded-full font-medium transition-colors ${filterCat === "all" ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}
        >
          All
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c.value}
            onClick={() => setFilterCat(filterCat === c.value ? "all" : c.value)}
            className={`text-[10px] px-2 py-0.5 rounded-full font-medium transition-colors`}
            style={filterCat === c.value
              ? { background: c.color, color: "#fff" }
              : { background: c.color + "18", color: c.color }}
          >
            {c.icon} {c.label}
          </button>
        ))}
        <button
          onClick={() => setShowSettings((v) => !v)}
          className="ml-auto text-gray-400 hover:text-gray-600 p-1 rounded"
          title="Settings"
        >
          <Settings size={12} />
        </button>
        {showSettings && <SettingsPopover onClose={() => setShowSettings(false)} />}
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100 text-gray-400 uppercase tracking-wide text-[9px]">
              <th className="pl-3 py-1.5 text-left font-semibold w-5"></th>
              <th className="py-1.5 text-left font-semibold">Label</th>
              <th className="py-1.5 text-left font-semibold">Period</th>
              <th className="pr-2 py-1.5 text-right font-semibold">Cost</th>
              <th className="pr-2 py-1.5 w-10"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-gray-400 text-xs">
                  No items. Click + Add below.
                </td>
              </tr>
            )}
            {filtered.map((item) => {
              const cat = catMeta(item.category);
              const monthly = effectiveMonthly(item);
              const isOneTime = item.billingPeriod === "one-time";
              const isExpanded = expandedId === item.id;

              return [
                <tr
                  key={item.id}
                  className={`border-b border-gray-50 hover:bg-gray-50 cursor-pointer ${isExpanded ? "bg-blue-50/50" : ""}`}
                  onClick={() => setExpandedId(isExpanded ? null : item.id)}
                >
                  {/* Category icon */}
                  <td className="pl-3 py-2">
                    <span title={cat.label}>{cat.icon}</span>
                  </td>
                  {/* Label */}
                  <td className="py-2 pr-1 max-w-[90px]">
                    <div className="font-medium text-gray-700 truncate">{item.label || "—"}</div>
                    {(item.discount ?? 0) > 0 && !isOneTime && (
                      <div className="text-[9px] text-green-600">-{item.discount}%</div>
                    )}
                  </td>
                  {/* Period badge */}
                  <td className="py-2">
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${
                        isOneTime
                          ? "bg-amber-100 text-amber-700"
                          : item.billingPeriod === "yearly"
                          ? "bg-purple-100 text-purple-700"
                          : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      {isOneTime ? "Once" : item.billingPeriod === "yearly" ? "Yr÷12" : "Mo"}
                    </span>
                  </td>
                  {/* Cost */}
                  <td className="py-2 pr-2 text-right">
                    <div className="font-semibold text-gray-800">
                      {isOneTime
                        ? fmtTHB(item.amountUSD * rate)
                        : fmtTHB(monthly * rate)}
                    </div>
                    <div className="text-[9px] text-gray-400">
                      {isOneTime ? fmtUSD(item.amountUSD) : fmtUSD(monthly)}
                    </div>
                  </td>
                  {/* Actions */}
                  <td className="py-2 pr-2">
                    <div className="flex items-center gap-0.5">
                      {isExpanded
                        ? <ChevronUp size={11} className="text-blue-500" />
                        : <ChevronDown size={11} className="text-gray-300" />}
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteAdditionalCost(item.id); }}
                        className="text-gray-300 hover:text-red-400 transition-colors ml-0.5"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </td>
                </tr>,
                isExpanded && (
                  <EditRow
                    key={`${item.id}-edit`}
                    item={item}
                    rate={rate}
                    onClose={() => setExpandedId(null)}
                  />
                ),
              ];
            })}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="px-3 py-2.5 border-t border-gray-100 bg-gray-50 space-y-2">
        <button
          onClick={addItem}
          className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg border-2 border-dashed border-gray-200 text-gray-400 hover:border-blue-300 hover:text-blue-500 text-xs transition-colors"
        >
          <Plus size={13} /> Add cost item
        </button>

        {additionalCosts.length > 0 && (
          <div className="space-y-1">
            {totalRecurring > 0 && (
              <div className="flex justify-between text-xs text-gray-700 font-semibold">
                <span>Recurring /mo</span>
                <span>{fmtTHB(totalRecurring * rate)}</span>
              </div>
            )}
            {totalOneTime > 0 && (
              <div className="flex justify-between text-xs font-semibold text-amber-700">
                <span>One-time total</span>
                <span>{fmtTHB(totalOneTime * rate)}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
