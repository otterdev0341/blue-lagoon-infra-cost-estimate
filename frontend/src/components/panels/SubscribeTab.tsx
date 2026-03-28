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

/** Monthly cost equivalent (for recurring total) */
export function subMonthly(item: SubscriptionItem): number {
  const units = item.unitCount ?? 1;
  const base = item.amountUSD * units * (item.billingPeriod === "yearly" ? 1 / 12 : 1);
  return base * (1 - (item.discount ?? 0) / 100);
}

/** Full upfront cost for yearly subscriptions */
export function subYearlyUpfront(item: SubscriptionItem): number {
  if (item.billingPeriod !== "yearly") return 0;
  const units = item.unitCount ?? 1;
  return item.amountUSD * units * (1 - (item.discount ?? 0) / 100);
}

// ── Edit row ──────────────────────────────────────────────────────────────

function EditRow({ item, rate, onClose }: { item: SubscriptionItem; rate: number; onClose: () => void }) {
  const { updateSubscription } = useCanvasStore();
  const upd = (patch: Partial<Omit<SubscriptionItem, "id">>) => updateSubscription(item.id, patch);

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

  const monthly       = subMonthly(item);
  const upfront       = subYearlyUpfront(item);
  const isYearly      = item.billingPeriod === "yearly";

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
            Billing cycle
            <select
              className="border rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-300"
              value={item.billingPeriod}
              onChange={(e) => upd({ billingPeriod: e.target.value as any })}
            >
              <option value="monthly">Monthly — billed each month</option>
              <option value="yearly">Yearly — paid upfront (÷12 for monthly equiv.)</option>
            </select>
          </label>
          <label className="flex flex-col gap-0.5 text-gray-500 font-medium">
            Amount USD {isYearly ? "(per year)" : "(per month)"}
            {inp("amountUSD", "number", { min: 0, step: 0.01 })}
          </label>
          <label className="flex flex-col gap-0.5 text-gray-500 font-medium">
            Units (optional) {inp("unitCount", "number", { min: 1 })}
          </label>
          <label className="col-span-2 flex flex-col gap-0.5 text-gray-500 font-medium">
            Unit label (optional, e.g. "per user") {inp("unitLabel")}
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

        {/* Cost preview */}
        <div className="mt-2 rounded-lg bg-white border border-blue-100 px-2.5 py-2 space-y-1">
          <div className="flex justify-between text-[10px] text-gray-500">
            <span>Monthly equivalent</span>
            <span className="font-semibold text-gray-700">{fmtTHB(monthly * rate)}/mo · {fmtUSD(monthly)}/mo</span>
          </div>
          {isYearly && (
            <div className="flex justify-between text-[10px] text-purple-600 font-medium">
              <span>⚡ Upfront (yearly)</span>
              <span className="font-bold">{fmtTHB(upfront * rate)}/yr · {fmtUSD(upfront)}/yr</span>
            </div>
          )}
        </div>

        <div className="mt-2 flex justify-end">
          <button onClick={onClose} className="text-xs text-blue-600 hover:text-blue-800 font-medium">Done</button>
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

  const totalMonthlyBilled  = subscriptions.filter(s => s.billingPeriod === "monthly").reduce((a, s) => a + subMonthly(s), 0);
  const totalYearlyMonthly  = subscriptions.filter(s => s.billingPeriod === "yearly").reduce((a, s) => a + subMonthly(s), 0);
  const totalYearlyUpfront  = subscriptions.filter(s => s.billingPeriod === "yearly").reduce((a, s) => a + subYearlyUpfront(s), 0);
  const totalAllMonthly     = subscriptions.reduce((a, s) => a + subMonthly(s), 0);

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
        >All</button>
        {CATEGORIES.map((c) => (
          <button key={c.value} onClick={() => setFilterCat(filterCat === c.value ? "all" : c.value)}
            className="text-[10px] px-2 py-0.5 rounded-full font-medium transition-colors"
            style={filterCat === c.value ? { background: c.color, color: "#fff" } : { background: c.color + "18", color: c.color }}
          >{c.icon}</button>
        ))}
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100 text-gray-400 uppercase tracking-wide text-[9px]">
              <th className="pl-3 py-1.5 text-left w-5"></th>
              <th className="py-1.5 text-left font-semibold">Service / Plan</th>
              <th className="py-1.5 text-left font-semibold">Billing</th>
              <th className="pr-2 py-1.5 text-right font-semibold">Cost</th>
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
              const cat      = catMeta(item.category);
              const monthly  = subMonthly(item);
              const upfront  = subYearlyUpfront(item);
              const isYearly = item.billingPeriod === "yearly";
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
                  <td className="py-2">
                    {isYearly ? (
                      <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700 whitespace-nowrap">
                        ⚡ Yearly
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-600 whitespace-nowrap">
                        🔁 Monthly
                      </span>
                    )}
                    {item.unitCount && item.unitCount > 1 && (
                      <div className="text-[9px] text-gray-400 mt-0.5">×{item.unitCount}{item.unitLabel ? ` ${item.unitLabel}` : ""}</div>
                    )}
                  </td>
                  <td className="py-2 pr-2 text-right">
                    {isYearly ? (
                      <>
                        <div className="font-bold text-purple-700 whitespace-nowrap">{fmtTHB(upfront * rate)}/yr</div>
                        <div className="text-[9px] text-gray-400 whitespace-nowrap">≈{fmtTHB(monthly * rate)}/mo</div>
                      </>
                    ) : (
                      <>
                        <div className="font-semibold text-gray-800 whitespace-nowrap">{fmtTHB(monthly * rate)}/mo</div>
                        <div className="text-[9px] text-gray-400 whitespace-nowrap">{fmtUSD(monthly)}/mo</div>
                      </>
                    )}
                  </td>
                  <td className="py-2 pr-2">
                    <div className="flex items-center gap-0.5">
                      {isExpanded ? <ChevronUp size={11} className="text-blue-500" /> : <ChevronDown size={11} className="text-gray-300" />}
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteSubscription(item.id); }}
                        className="text-gray-300 hover:text-red-400 transition-colors ml-0.5"
                      ><Trash2 size={11} /></button>
                    </div>
                  </td>
                </tr>,
                isExpanded && (
                  <EditRow key={`${item.id}-edit`} item={item} rate={rate} onClose={() => setExpandedId(null)} />
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
          <div className="space-y-1.5 text-xs">
            {/* Monthly billed */}
            {totalMonthlyBilled > 0 && (
              <div className="flex justify-between items-center bg-white rounded-lg border border-blue-100 px-2.5 py-1.5">
                <div>
                  <span className="inline-block text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-600 mr-1.5">🔁 Monthly</span>
                  <span className="text-[10px] text-gray-500">billed each month</span>
                </div>
                <div className="text-right">
                  <div className="font-bold text-gray-800">{fmtTHB(totalMonthlyBilled * rate)}/mo</div>
                  <div className="text-[9px] text-gray-400">{fmtUSD(totalMonthlyBilled)}/mo</div>
                </div>
              </div>
            )}

            {/* Yearly — two lines: upfront + monthly equiv */}
            {totalYearlyUpfront > 0 && (
              <div className="bg-white rounded-lg border border-purple-100 px-2.5 py-1.5 space-y-1">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="inline-block text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700 mr-1.5">⚡ Yearly</span>
                    <span className="text-[10px] text-gray-500">paid upfront</span>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-purple-700">{fmtTHB(totalYearlyUpfront * rate)}/yr</div>
                    <div className="text-[9px] text-gray-400">{fmtUSD(totalYearlyUpfront)}/yr</div>
                  </div>
                </div>
                <div className="flex justify-between text-[9px] text-gray-400 border-t border-purple-50 pt-1">
                  <span>Monthly equivalent</span>
                  <span>{fmtTHB(totalYearlyMonthly * rate)}/mo</span>
                </div>
              </div>
            )}

            {/* Combined monthly total */}
            <div className="flex justify-between font-semibold text-gray-700 pt-0.5 border-t border-gray-200 text-xs">
              <span>Total /mo (all)</span>
              <span>{fmtTHB(totalAllMonthly * rate)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
