import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useCanvasStore } from "../../store/canvasStore.ts";
import { calculateDiagramCost } from "../../lib/costEngine.ts";
import { fmtTHB, fmtUSD } from "../../lib/utils.ts";
import { subMonthly, subYearlyUpfront } from "./SubscribeTab.tsx";
import type { AdditionalCostItem } from "../../types.ts";

type Period = "monthly" | "daily" | "yearly";

const PERIOD_LABELS: Record<Period, string> = {
  monthly: "Monthly", daily: "Daily", yearly: "Yearly",
};

function periodFactor(p: Period): number {
  if (p === "daily")  return 1 / 30;
  if (p === "yearly") return 12;
  return 1;
}

function recurringMonthly(item: AdditionalCostItem): number {
  if (item.billingPeriod === "one-time") return 0;
  const base = item.billingPeriod === "yearly" ? item.amountUSD / 12 : item.amountUSD;
  return base * (1 - (item.discount ?? 0) / 100);
}

function oneTimeAmount(item: AdditionalCostItem): number {
  if (item.billingPeriod !== "one-time") return 0;
  return item.amountUSD * (1 - (item.discount ?? 0) / 100);
}

// ── Collapsible row ────────────────────────────────────────────────────────

interface RowProps {
  icon: string;
  title: string;
  subtitle: string;
  amountTHB: number;
  amountUSD: number;
  color: string;
  badge?: string;
  items?: { label: string; thb: number }[];
}

function Row({ icon, title, subtitle, amountTHB, amountUSD, color, badge, items }: RowProps) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: color + "35" }}>
      <button
        className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-gray-50/80 transition-colors"
        style={{ background: color + "08" }}
        onClick={() => items && items.length > 0 && setOpen(v => !v)}
      >
        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base shrink-0"
          style={{ background: color + "20" }}>
          {icon}
        </div>
        <div className="flex-1 min-w-0 overflow-hidden">
          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-sm font-semibold text-gray-800 truncate">{title}</span>
            {badge && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wide shrink-0"
                style={{ background: color + "25", color }}>
                {badge}
              </span>
            )}
          </div>
          <div className="text-[10px] text-gray-400 truncate">{subtitle}</div>
        </div>
        <div className="text-right shrink-0 pl-1">
          <div className="text-sm font-bold whitespace-nowrap" style={{ color }}>{fmtTHB(amountTHB)}</div>
          <div className="text-[10px] text-gray-400 whitespace-nowrap">{fmtUSD(amountUSD)}</div>
        </div>
      </button>
      {open && items && items.length > 0 && (
        <div className="border-t px-3 py-2 space-y-1 bg-white" style={{ borderColor: color + "25" }}>
          {items.map((it, i) => (
            <div key={i} className="flex justify-between text-xs text-gray-600">
              <span className="truncate flex-1">{it.label}</span>
              <span className="font-medium ml-2" style={{ color }}>{fmtTHB(it.thb)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Section header divider ─────────────────────────────────────────────────

function SectionHeader({ label, color, totalTHB, totalUSD, hint }: {
  label: string; color: string; totalTHB: number; totalUSD: number; hint?: string;
}) {
  return (
    <div className="flex items-center gap-2 pt-1 pb-0.5">
      <div className="w-1 h-4 rounded-full shrink-0" style={{ background: color }} />
      <div className="flex-1 min-w-0">
        <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color }}>{label}</span>
        {hint && <span className="text-[9px] text-gray-400 italic ml-1.5">{hint}</span>}
      </div>
      <div className="text-right shrink-0">
        <div className="text-xs font-bold" style={{ color }}>{fmtTHB(totalTHB)}</div>
        <div className="text-[9px] text-gray-400">{fmtUSD(totalUSD)}</div>
      </div>
    </div>
  );
}

// ── Types ──────────────────────────────────────────────────────────────────

const API_TYPES  = ["api_rest","api_grpc","api_mcp"];
const LINE_TYPES = [
  "line_image","line_button","line_carousel","line_quick_reply",
  "line_flex_message","line_rich_menu","line_custom_payload",
  "line_api_call","line_ai_agent","line_intent","line_dialog",
];
const API_LINE_TYPES = new Set([...API_TYPES, ...LINE_TYPES]);

// ── Main component ─────────────────────────────────────────────────────────

export function SummaryTab({ rate }: { rate: number }) {
  const { nodes, edges, billingModel, additionalCosts, subscriptions, sellingPriceUSD, setSellingPrice } = useCanvasStore();
  const [period, setPeriod] = useState<Period>("monthly");

  const cost = calculateDiagramCost(nodes, edges, billingModel);
  const f    = periodFactor(period);

  // ── Buckets ──────────────────────────────────────────────────────────────
  const infraNodes   = cost.perNode.filter(n => n.serviceType !== "custom" && !API_LINE_TYPES.has(n.serviceType));
  const devNodes     = cost.perNode.filter(n => API_LINE_TYPES.has(n.serviceType));   // manday = project cost
  const externalNodes= cost.perNode.filter(n => n.serviceType === "custom");

  // ── Recurring (monthly cloud bill) ───────────────────────────────────────
  const infraUSD     = infraNodes.reduce((s, n) => s + n.monthly, 0) + cost.dataTransfer.monthly;
  const externalUSD  = externalNodes.reduce((s, n) => s + n.monthly, 0);
  const addUSD       = additionalCosts.reduce((s, c) => s + recurringMonthly(c), 0);
  const subsUSD      = subscriptions.reduce((s, sub) => s + subMonthly(sub), 0);
  const recurringUSD = infraUSD + externalUSD + addUSD + subsUSD;  // what client pays monthly

  // ── Development cost (manday — NOT monthly recurring) ────────────────────
  const devUSD       = devNodes.reduce((s, n) => s + n.monthly, 0);  // stored as USD per manday equivalent

  // ── One-time items ────────────────────────────────────────────────────────
  const oneTimeSetup = cost.setupCosts.reduce((s, c) => s + c.amountUSD, 0);
  const oneTimeAdd   = additionalCosts.reduce((s, c) => s + oneTimeAmount(c), 0);

  // ── Display values (recurring respects period; dev cost is flat project cost) ──
  const recurringDisplay = recurringUSD * f;
  const devDisplay       = devUSD;            // manday cost doesn't scale with period

  const addCategories = [...new Set(
    additionalCosts.filter(c => c.billingPeriod !== "one-time").map(c => c.category)
  )].join(", ");

  const sellingDisplay = sellingPriceUSD * f;   // used by selling price input binding

  // Yearly subscriptions — full upfront amount (paid at project start)
  const subsYearlyUpfrontUSD = subscriptions
    .filter(s => s.billingPeriod === "yearly")
    .reduce((sum, s) => sum + subYearlyUpfront(s), 0);

  const periodLabel = period === "daily" ? "day" : period === "yearly" ? "yr" : "mo";

  return (
    <div className="flex flex-col h-full">

      {/* Period selector — only affects recurring section */}
      <div className="px-4 pt-3 pb-2 border-b border-gray-100">
        <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs font-medium">
          {(["monthly", "daily", "yearly"] as Period[]).map((p) => (
            <button key={p} onClick={() => setPeriod(p)}
              className="flex-1 py-1.5 transition-colors"
              style={period === p
                ? { background: "#1D6FCA", color: "white" }
                : { background: "white", color: "#64748B" }}>
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
        <p className="text-[9px] text-gray-400 mt-1 text-center">Period applies to recurring costs only</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5">

        {/* ══ RECURRING COSTS ══════════════════════════════════════════════ */}
        <SectionHeader
          label="Recurring Cost"
          color="#FF9900"
          totalTHB={recurringDisplay * rate}
          totalUSD={recurringDisplay}
          hint={`per ${periodLabel}`}
        />

        {/* Infrastructure */}
        <Row
          icon="🏗" title="Infrastructure" color="#FF9900"
          subtitle={infraNodes.map(n => n.label).join(", ") || "No AWS services"}
          amountTHB={infraUSD * f * rate} amountUSD={infraUSD * f}
          items={[
            ...infraNodes.map(n => ({ label: n.label, thb: n.monthly * f * rate })),
            ...(cost.dataTransfer.monthly > 0
              ? [{ label: "Data Transfer", thb: cost.dataTransfer.monthly * f * rate }] : []),
          ]}
        />

        {/* External Services */}
        <Row
          icon="🌐" title="External Services" color="#8C4FFF"
          subtitle={externalNodes.map(n => n.label).join(", ") || "No external APIs"}
          amountTHB={externalUSD * f * rate} amountUSD={externalUSD * f}
          items={externalNodes.map(n => ({ label: n.label, thb: n.monthly * f * rate }))}
        />

        {/* Additional Costs */}
        <Row
          icon="📋" title="Additional Costs" color="#0EA5E9"
          subtitle={addCategories || "No additional costs (recurring)"}
          amountTHB={addUSD * f * rate} amountUSD={addUSD * f}
          items={additionalCosts.filter(c => c.billingPeriod !== "one-time").map(c => ({
            label: c.label || c.category,
            thb: recurringMonthly(c) * f * rate,
          }))}
        />

        {/* Subscriptions */}
        <Row
          icon="🔄" title="Subscriptions" color="#6366F1"
          subtitle={subscriptions.length > 0
            ? subscriptions.map(s => s.service).join(", ")
            : "No SaaS subscriptions"}
          amountTHB={subsUSD * f * rate} amountUSD={subsUSD * f}
          items={subscriptions.map(s => ({
            label: `${s.service}${s.plan ? ` · ${s.plan}` : ""}`,
            thb: subMonthly(s) * f * rate,
          }))}
        />

        {/* Recurring total bar */}
        <div className="rounded-lg bg-orange-50 border border-orange-100 px-3 py-2 flex justify-between items-center">
          <div>
            <div className="text-xs font-semibold text-orange-700">Monthly Cloud Bill</div>
            <div className="text-[10px] text-orange-400">Infra + Services + Subs</div>
          </div>
          <div className="text-right">
            <div className="text-base font-bold text-orange-600">{fmtTHB(recurringDisplay * rate)}</div>
            <div className="text-[10px] text-gray-400">{fmtUSD(recurringDisplay)}</div>
          </div>
        </div>

        {/* ══ DEVELOPMENT COST ═════════════════════════════════════════════ */}
        <SectionHeader
          label="Development Cost"
          color="#0EA5E9"
          totalTHB={devDisplay * rate}
          totalUSD={devDisplay}
          hint="project / manday"
        />

        <Row
          icon="🔗" title="API & Line Development" color="#0EA5E9"
          badge="manday"
          subtitle={devNodes.map(n => n.label).join(", ") || "No API or Line nodes"}
          amountTHB={devDisplay * rate} amountUSD={devDisplay}
          items={devNodes.map(n => ({ label: n.label, thb: n.monthly * rate }))}
        />

        {/* Dev cost bar */}
        <div className="rounded-lg bg-sky-50 border border-sky-100 px-3 py-2 flex justify-between items-center">
          <div>
            <div className="text-xs font-semibold text-sky-700">Project Build Cost</div>
            <div className="text-[10px] text-sky-400">API + Line manday effort</div>
          </div>
          <div className="text-right">
            <div className="text-base font-bold text-sky-600">{fmtTHB(devDisplay * rate)}</div>
            <div className="text-[10px] text-gray-400">{fmtUSD(devDisplay)}</div>
          </div>
        </div>

        {/* Yearly subscriptions upfront */}
        {subsYearlyUpfrontUSD > 0 && (
          <div className="rounded-lg bg-purple-50 border border-purple-100 px-3 py-2">
            <div className="flex justify-between items-center">
              <div>
                <div className="text-xs font-semibold text-purple-700 flex items-center gap-1">
                  ⚡ Yearly Subscriptions
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-purple-200 text-purple-800">UPFRONT</span>
                </div>
                <div className="text-[10px] text-purple-400">Paid at project start (year 1)</div>
              </div>
              <div className="text-right">
                <div className="text-base font-bold text-purple-600">{fmtTHB(subsYearlyUpfrontUSD * rate)}</div>
                <div className="text-[10px] text-gray-400">{fmtUSD(subsYearlyUpfrontUSD)}/yr</div>
              </div>
            </div>
            <div className="mt-1.5 pt-1.5 border-t border-purple-100 text-[10px] text-purple-500">
              ≈ {fmtTHB((subsYearlyUpfrontUSD / 12) * rate)}/mo equivalent after year 1
            </div>
          </div>
        )}

        {/* ══ ONE-TIME SETUP ════════════════════════════════════════════════ */}
        {(oneTimeSetup + oneTimeAdd) > 0 && (
          <>
            <SectionHeader
              label="One-time Setup"
              color="#F59E0B"
              totalTHB={(oneTimeSetup + oneTimeAdd) * rate}
              totalUSD={oneTimeSetup + oneTimeAdd}
            />
            {cost.setupCosts.map((s, i) => (
              <Row key={i} icon="📦" title={s.label} color="#F59E0B"
                subtitle="Group setup cost"
                amountTHB={s.amountUSD * rate} amountUSD={s.amountUSD}
                items={[]} />
            ))}
            {additionalCosts.filter(c => c.billingPeriod === "one-time").map((c, i) => (
              <Row key={i} icon="📦" title={c.label || c.category} color="#F59E0B"
                subtitle="One-time additional cost"
                amountTHB={oneTimeAmount(c) * rate} amountUSD={oneTimeAmount(c)}
                items={[]} />
            ))}
          </>
        )}

        {/* ══ GRAND TOTAL (collapsible) ═════════════════════════════════ */}
        {(() => {
          const [open, setOpen] = useState(true);
          const totalUpfront = devDisplay + subsYearlyUpfrontUSD + (oneTimeSetup + oneTimeAdd);
          return (
            <div className="rounded-xl bg-gray-900 text-white overflow-hidden">
              {/* Header — always visible, click to toggle */}
              <button
                className="w-full flex items-center gap-2 px-4 py-3 hover:bg-white/5 transition-colors"
                onClick={() => setOpen(v => !v)}
              >
                <div className="flex-1 text-left">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Total Cost Summary</div>
                  {!open && (
                    <div className="text-lg font-bold text-white leading-tight whitespace-nowrap mt-0.5">
                      {fmtTHB((recurringDisplay + devDisplay + subsYearlyUpfrontUSD) * rate)}
                    </div>
                  )}
                </div>
                {open ? <ChevronUp size={14} className="text-gray-500 shrink-0" /> : <ChevronDown size={14} className="text-gray-500 shrink-0" />}
              </button>

              {open && (
                <div className="px-4 pb-3 space-y-1.5 border-t border-white/10">
                  {/* Recurring */}
                  <div className="flex items-center gap-2 pt-2">
                    <span className="text-gray-400 text-xs min-w-0 flex-1 truncate">🏗 Recurring /{periodLabel}</span>
                    <span className="font-semibold text-orange-300 text-xs shrink-0 whitespace-nowrap">{fmtTHB(recurringDisplay * rate)}</span>
                  </div>
                  {period === "monthly" && (
                    <div className="flex items-center gap-2 text-[10px] text-gray-500 pl-4">
                      <span className="flex-1">Daily avg</span>
                      <span className="shrink-0">{fmtTHB((recurringUSD / 30) * rate)}</span>
                    </div>
                  )}

                  {/* Dev cost */}
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400 text-xs min-w-0 flex-1 truncate">🔗 Dev cost (manday)</span>
                    <span className="font-semibold text-sky-300 text-xs shrink-0 whitespace-nowrap">{fmtTHB(devDisplay * rate)}</span>
                  </div>

                  {/* Yearly subs upfront */}
                  {subsYearlyUpfrontUSD > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 text-xs min-w-0 flex-1 truncate">⚡ Yearly subs (upfront)</span>
                      <span className="font-semibold text-purple-300 text-xs shrink-0 whitespace-nowrap">{fmtTHB(subsYearlyUpfrontUSD * rate)}</span>
                    </div>
                  )}

                  {/* One-time */}
                  {(oneTimeSetup + oneTimeAdd) > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 text-xs min-w-0 flex-1 truncate">📦 One-time setup</span>
                      <span className="font-semibold text-amber-300 text-xs shrink-0 whitespace-nowrap">{fmtTHB((oneTimeSetup + oneTimeAdd) * rate)}</span>
                    </div>
                  )}

                  {/* Total */}
                  <div className="border-t border-white/10 pt-2 flex items-center gap-2">
                    <span className="text-sm text-gray-200 font-semibold flex-1">Total Cost</span>
                    <div className="text-right shrink-0">
                      <div className="text-lg font-bold text-white leading-tight whitespace-nowrap">
                        {fmtTHB((recurringDisplay + devDisplay + subsYearlyUpfrontUSD) * rate)}
                      </div>
                      <div className="text-[10px] text-gray-400 whitespace-nowrap">{fmtUSD(recurringDisplay + devDisplay + subsYearlyUpfrontUSD)}</div>
                    </div>
                  </div>

                  {/* Upfront vs recurring breakdown */}
                  {totalUpfront > 0 && (
                    <div className="rounded-lg bg-white/5 px-2.5 py-2 space-y-1 text-[10px]">
                      <div className="text-gray-400 font-semibold uppercase tracking-wide">Payment breakdown</div>
                      <div className="flex justify-between text-gray-300">
                        <span>🏗 Recurring /{periodLabel}</span>
                        <span>{fmtTHB(recurringDisplay * rate)}</span>
                      </div>
                      <div className="flex justify-between text-amber-300 font-medium">
                        <span>⚡ Upfront at start</span>
                        <span>{fmtTHB(totalUpfront * rate)}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })()}

        {/* ══ REVENUE & PROFIT ═════════════════════════════════════════════ */}
        <div className="rounded-xl border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 px-3 py-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
            Revenue & Profit
          </div>
          <div className="px-3 py-3 space-y-3">
            <label className="text-xs text-gray-600 font-medium flex flex-col gap-1">
              Selling price to client (THB/{periodLabel})
              <div className="flex items-center gap-1.5">
                <span className="text-sm text-gray-400">฿</span>
                <input
                  type="number" min={0} step={100}
                  className="flex-1 border rounded px-2 py-1.5 text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-blue-400"
                  value={sellingPriceUSD > 0 ? Math.round(sellingPriceUSD * f * rate) : ""}
                  placeholder="0"
                  onChange={(e) => {
                    const thbPerPeriod = Number(e.target.value);
                    setSellingPrice(thbPerPeriod / rate / f);
                  }}
                />
              </div>
            </label>

            {sellingPriceUSD > 0 && (() => {
              const totalCostTHB = (recurringDisplay + devDisplay) * rate;
              const revenueTHB   = sellingDisplay * rate;
              const profitTHB    = revenueTHB - totalCostTHB;
              const mg           = revenueTHB > 0 ? (profitTHB / revenueTHB) * 100 : 0;
              return (
                <div className="space-y-1.5 pt-1 border-t border-gray-100">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Revenue (selling price)</span>
                    <span className="font-semibold text-gray-800 whitespace-nowrap">{fmtTHB(revenueTHB)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>– Recurring /{periodLabel}</span>
                    <span className="whitespace-nowrap">–{fmtTHB(recurringDisplay * rate)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>– Dev cost (project)</span>
                    <span className="whitespace-nowrap">–{fmtTHB(devDisplay * rate)}</span>
                  </div>
                  <div className="flex justify-between text-sm border-t border-gray-100 pt-1.5">
                    <span className="font-semibold text-gray-700">Profit</span>
                    <span className={`font-bold text-base whitespace-nowrap ${profitTHB >= 0 ? "text-green-600" : "text-red-500"}`}>
                      {profitTHB >= 0 ? "+" : ""}{fmtTHB(profitTHB)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-400">Gross margin</span>
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all"
                          style={{
                            width: `${Math.min(100, Math.abs(mg))}%`,
                            background: mg >= 0 ? "#22C55E" : "#EF4444",
                          }} />
                      </div>
                      <span className={`text-sm font-bold ${mg >= 0 ? "text-green-600" : "text-red-500"}`}>
                        {mg.toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  {/* Total to Sell — only when selling price is set */}
                  <div className="mt-2 rounded-lg bg-green-50 border border-green-100 px-3 py-2 flex justify-between items-center">
                    <div>
                      <div className="text-xs font-semibold text-green-700">Total to Sell</div>
                      <div className="text-[10px] text-green-500">What you charge the client</div>
                    </div>
                    <div className="text-right">
                      <div className="text-base font-bold text-green-700 whitespace-nowrap">{fmtTHB(revenueTHB)}</div>
                      <div className="text-[10px] text-gray-400 whitespace-nowrap">{fmtUSD(sellingDisplay)}</div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

      </div>
    </div>
  );
}
