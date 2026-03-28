import { useState } from "react";
import { Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { useCanvasStore } from "../../store/canvasStore.ts";
import { fmtTHB, fmtUSD } from "../../lib/utils.ts";
import type { SubscriptionCategory, SubscriptionItem } from "../../types.ts";

const CATEGORIES: { value: SubscriptionCategory; label: string; icon: string; color: string }[] = [
  { value: "devtools",      label: "Dev Tools",    icon: "🛠",  color: "#6366F1" },
  { value: "monitoring",    label: "Monitoring",   icon: "📊",  color: "#0EA5E9" },
  { value: "communication", label: "Comms",        icon: "💬",  color: "#22C55E" },
  { value: "security",      label: "Security",     icon: "🔒",  color: "#EF4444" },
  { value: "saas",          label: "AI / SaaS",    icon: "🤖",  color: "#A855F7" },
  { value: "other",         label: "Other",        icon: "📦",  color: "#94A3B8" },
];

function catMeta(v: SubscriptionCategory) {
  return CATEGORIES.find((c) => c.value === v) ?? CATEGORIES[5];
}

export function subMonthly(item: SubscriptionItem): number {
  const units = item.unitCount ?? 1;
  const base = item.amountUSD * units * (item.billingPeriod === "yearly" ? 1 / 12 : 1);
  return base * (1 - (item.discount ?? 0) / 100);
}

// ── Edit row ──────────────────────────────────────────────────────────────

function EditRow({ item, rate, onClose }: { item: SubscriptionItem; rate: number; onClose: () => void }) {
  const { updateSubscription } = useCanvasStore();
  const upd = (patch: Partial<Omit<SubscriptionItem, "id">>) => updateSubscription(item.id, patch);
  const monthly = subMonthly(item);

  const inp = (field: keyof SubscriptionItem, type = "text", opts?: { min?: number; step?: number }) => (
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

  return (
    <tr className="bg-blue-50 border-t border-blue-100">
      <td colSpan={5} className="px-3 py-3">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <label className="flex flex-col gap-0.5 text-gray-500 font-medium">
            Service name {inp("service")}
          </label>
          <label className="flex flex-col gap-0.5 text-gray-500 font-medium">
            Plan {inp("plan")}
          </label>
          <label className="flex flex-col gap-0.5 text-gray-500 font-medium">
            Category
            <select
              className="border rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-300"
              value={item.category}
              onChange={(e) => upd({ category: e.target.value as SubscriptionCategory })}
            >
              {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.icon} {c.label}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-0.5 text-gray-500 font-medium">
            Billing
            <select
              className="border rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-300"
              value={item.billingPeriod}
              onChange={(e) => upd({ billingPeriod: e.target.value as any })}
            >
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly ÷12</option>
            </select>
          </label>
          <label className="flex flex-col gap-0.5 text-gray-500 font-medium">
            Amount USD {inp("amountUSD", "number", { min: 0, step: 0.01 })}
          </label>
          <label className="flex flex-col gap-0.5 text-gray-500 font-medium">
            Units (optional) {inp("unitCount", "number", { min: 1 })}
          </label>
          <label className="col-span-2 flex flex-col gap-0.5 text-gray-500 font-medium">
            Unit label (optional, e.g. "per user")
            {inp("unitLabel")}
          </label>
          <label className="col-span-2 flex flex-col gap-0.5 text-gray-500 font-medium">
            Discount %
            <div className="flex items-center gap-2">
              <input
                type="range" min={0} max={100} className="flex-1 accent-blue-500"
                value={item.discount ?? 0}
                onChange={(e) => upd({ discount: Number(e.target.value) })}
              />
              <span className="text-xs font-semibold w-8 text-right text-gray-700">{item.discount ?? 0}%</span>
            </div>
          </label>
        </div>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-[10px] text-gray-400">
            ≈ {fmtTHB(monthly * rate)}/mo · {fmtUSD(monthly)}/mo
          </span>
          <button onClick={onClose} className="text-xs text-blue-600 hover:text-blue-800 font-medium">
            Done
          </button>
        </div>
      </td>
    </tr>
  );
}

// ── Main tab ──────────────────────────────────────────────────────────────

export function SubscribeTab({ rate }: { rate: number }) {
  const { subscriptions, addSubscription, deleteSubscription } = useCanvasStore();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterCat, setFilterCat] = useState<SubscriptionCategory | "all">("all");

  const filtered = filterCat === "all"
    ? subscriptions
    : subscriptions.filter((s) => s.category === filterCat);

  const totalMonthly  = subscriptions.filter(s => s.billingPeriod === "monthly").reduce((a, s) => a + subMonthly(s), 0);
  const totalYearly12 = subscriptions.filter(s => s.billingPeriod === "yearly").reduce((a, s) => a + subMonthly(s), 0);
  const totalAll      = subscriptions.reduce((a, s) => a + subMonthly(s), 0);

  function addItem() {
    addSubscription({ service: "New Service", plan: "", category: "devtools", amountUSD: 0, billingPeriod: "monthly", discount: 0 });
  }

  return (
    <div className="flex flex-col h-full">
      {/* Category filter */}
      <div className="px-3 pt-2 pb-1 border-b border-gray-100 flex gap-1 flex-wrap">
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
            className="text-[10px] px-2 py-0.5 rounded-full font-medium transition-colors"
            style={filterCat === c.value
              ? { background: c.color, color: "#fff" }
              : { background: c.color + "18", color: c.color }}
          >
            {c.icon}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100 text-gray-400 uppercase tracking-wide text-[9px]">
              <th className="pl-3 py-1.5 text-left w-5"></th>
              <th className="py-1.5 text-left font-semibold">Service / Plan</th>
              <th className="py-1.5 text-left font-semibold">Units</th>
              <th className="pr-2 py-1.5 text-right font-semibold">/mo</th>
              <th className="pr-2 py-1.5 w-10"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-gray-400 text-xs">
                  No subscriptions yet.<br />Click + Add below.
                </td>
              </tr>
            )}
            {filtered.map((item) => {
              const cat = catMeta(item.category);
              const monthly = subMonthly(item);
              const isExpanded = expandedId === item.id;

              return [
                <tr
                  key={item.id}
                  className={`border-b border-gray-50 hover:bg-gray-50 cursor-pointer ${isExpanded ? "bg-blue-50/50" : ""}`}
                  onClick={() => setExpandedId(isExpanded ? null : item.id)}
                >
                  <td className="pl-3 py-2">
                    <span title={cat.label} style={{ fontSize: 14 }}>{cat.icon}</span>
                  </td>
                  <td className="py-2 pr-1 max-w-[80px]">
                    <div className="font-semibold text-gray-800 truncate">{item.service}</div>
                    <div className="text-[10px] text-gray-400 truncate">{item.plan || "—"}</div>
                  </td>
                  <td className="py-2 text-gray-500">
                    {item.unitCount && item.unitCount > 1 ? (
                      <span>×{item.unitCount}
                        {item.unitLabel && (
                          <span className="text-[9px] text-gray-400 ml-0.5">{item.unitLabel}</span>
                        )}
                      </span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                    {item.billingPeriod === "yearly" && (
                      <div className="text-[9px] text-purple-500">yr÷12</div>
                    )}
                  </td>
                  <td className="py-2 pr-2 text-right">
                    <div className="font-semibold text-gray-800">{fmtTHB(monthly * rate)}</div>
                    <div className="text-[9px] text-gray-400">{fmtUSD(monthly)}</div>
                  </td>
                  <td className="py-2 pr-2">
                    <div className="flex items-center gap-0.5">
                      {isExpanded
                        ? <ChevronUp size={11} className="text-blue-500" />
                        : <ChevronDown size={11} className="text-gray-300" />}
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteSubscription(item.id); }}
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
          <Plus size={13} /> Add subscription
        </button>

        {subscriptions.length > 0 && (
          <div className="grid grid-cols-2 gap-1 text-xs">
            {totalMonthly > 0 && (
              <div className="bg-white rounded-lg border border-gray-100 px-2 py-1.5">
                <div className="text-[9px] text-gray-400 uppercase font-semibold">Monthly</div>
                <div className="font-bold text-gray-800">{fmtTHB(totalMonthly * rate)}</div>
              </div>
            )}
            {totalYearly12 > 0 && (
              <div className="bg-white rounded-lg border border-gray-100 px-2 py-1.5">
                <div className="text-[9px] text-purple-400 uppercase font-semibold">Yearly÷12</div>
                <div className="font-bold text-purple-700">{fmtTHB(totalYearly12 * rate)}</div>
              </div>
            )}
            <div className="col-span-2 flex justify-between font-semibold text-gray-700 pt-0.5 border-t border-gray-100">
              <span>Total /mo</span>
              <span>{fmtTHB(totalAll * rate)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
