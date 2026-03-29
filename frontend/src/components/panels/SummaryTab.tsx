import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useCanvasStore } from "../../store/canvasStore.ts";
import { calculateDiagramCost } from "../../lib/costEngine.ts";
import { fmtTHB, fmtUSD } from "../../lib/utils.ts";
import { subMonthly, subYearlyUpfront } from "./SubscribeTab.tsx";
import type { AdditionalCostItem } from "../../types.ts";

type Period = "monthly" | "yearly";
type Currency = "thb" | "usd";

const PERIOD_LABELS: Record<Period, string> = {
  monthly: "Monthly", yearly: "Yearly",
};

function periodFactor(p: Period): number {
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
  primary: string;      // pre-formatted primary amount
  secondary?: string;   // pre-formatted secondary (smaller)
  color: string;
  badge?: string;
  items?: { label: string; amount: string }[];
}

function Row({ icon, title, subtitle, primary, secondary, color, badge, items }: RowProps) {
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
          <div className="text-sm font-bold whitespace-nowrap" style={{ color }}>{primary}</div>
          {secondary && <div className="text-[10px] text-gray-400 whitespace-nowrap">{secondary}</div>}
        </div>
      </button>
      {open && items && items.length > 0 && (
        <div className="border-t px-3 py-2 space-y-1 bg-white" style={{ borderColor: color + "25" }}>
          {items.map((it, i) => (
            <div key={i} className="flex justify-between text-xs text-gray-600">
              <span className="truncate flex-1">{it.label}</span>
              <span className="font-medium ml-2" style={{ color }}>{it.amount}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Section header divider ─────────────────────────────────────────────────

function SectionHeader({ label, color, primary, secondary, hint }: {
  label: string; color: string; primary: string; secondary?: string; hint?: string;
}) {
  return (
    <div className="flex items-center gap-2 pt-1 pb-0.5">
      <div className="w-1 h-4 rounded-full shrink-0" style={{ background: color }} />
      <div className="flex-1 min-w-0">
        <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color }}>{label}</span>
        {hint && <span className="text-[9px] text-gray-400 italic ml-1.5">{hint}</span>}
      </div>
      <div className="text-right shrink-0">
        <div className="text-xs font-bold" style={{ color }}>{primary}</div>
        {secondary && <div className="text-[9px] text-gray-400">{secondary}</div>}
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
  const [period, setPeriod]     = useState<Period>("monthly");
  const [currency, setCurrency] = useState<Currency>("thb");

  const cost = calculateDiagramCost(nodes, edges, billingModel);
  const f    = periodFactor(period);

  // ── Format helpers ────────────────────────────────────────────────────────
  const fmt  = (usd: number) => currency === "thb" ? fmtTHB(usd * rate) : fmtUSD(usd);
  const fmtAlt = (usd: number) => currency === "thb" ? fmtUSD(usd) : fmtTHB(usd * rate);

  // ── Buckets ──────────────────────────────────────────────────────────────
  const infraNodes    = cost.perNode.filter(n => n.serviceType !== "custom" && !API_LINE_TYPES.has(n.serviceType));
  const devNodes      = cost.perNode.filter(n => API_LINE_TYPES.has(n.serviceType));
  const externalNodes = cost.perNode.filter(n => n.serviceType === "custom");

  // ── Recurring (monthly cloud bill) ───────────────────────────────────────
  const infraUSD     = infraNodes.reduce((s, n) => s + n.monthly, 0) + cost.dataTransfer.monthly;
  const externalUSD  = externalNodes.reduce((s, n) => s + n.monthly, 0);
  const addUSD       = additionalCosts.reduce((s, c) => s + recurringMonthly(c), 0);
  const subsUSD      = subscriptions.reduce((s, sub) => s + subMonthly(sub), 0);
  const recurringUSD = infraUSD + externalUSD + addUSD + subsUSD;

  // ── Development cost (manday — NOT monthly recurring) ────────────────────
  const devUSD = devNodes.reduce((s, n) => s + n.monthly, 0);

  // ── One-time items ────────────────────────────────────────────────────────
  const oneTimeSetup = cost.setupCosts.reduce((s, c) => s + c.amountUSD, 0);
  const oneTimeAdd   = additionalCosts.reduce((s, c) => s + oneTimeAmount(c), 0);

  // ── Display values ────────────────────────────────────────────────────────
  const recurringDisplay = recurringUSD * f;

  const addCategories = [...new Set(
    additionalCosts.filter(c => c.billingPeriod !== "one-time").map(c => c.category)
  )].join(", ");

  const sellingDisplay = sellingPriceUSD * f;

  // Yearly subscriptions — full upfront amount
  const subsYearlyUpfrontUSD = subscriptions
    .filter(s => s.billingPeriod === "yearly")
    .reduce((sum, s) => sum + subYearlyUpfront(s), 0);

  const periodLabel = period === "daily" ? "day" : period === "yearly" ? "yr" : "mo";

  return (
    <div className="flex flex-col h-full">

      {/* ── Controls: Period + Currency ───────────────────────────────── */}
      <div className="px-4 pt-3 pb-2 border-b border-gray-100 space-y-2">
        {/* Period + Currency in one row */}
        <div className="flex gap-2">
          <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs font-medium flex-1">
            {(["monthly", "yearly"] as Period[]).map((p) => (
              <button key={p} onClick={() => setPeriod(p)}
                className="flex-1 py-1.5 transition-colors"
                style={period === p
                  ? { background: "#1D6FCA", color: "white" }
                  : { background: "white", color: "#64748B" }}>
                {PERIOD_LABELS[p]}
              </button>
            ))}
          </div>
          <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs font-medium flex-1">
            <button className="flex-1 py-1.5 transition-colors"
              style={currency === "thb" ? { background: "#0891B2", color: "white" } : { background: "white", color: "#64748B" }}
              onClick={() => setCurrency("thb")}>฿ THB</button>
            <button className="flex-1 py-1.5 transition-colors"
              style={currency === "usd" ? { background: "#0891B2", color: "white" } : { background: "white", color: "#64748B" }}
              onClick={() => setCurrency("usd")}>$ USD</button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5">

        {/* ══ RECURRING COSTS ══════════════════════════════════════════════ */}
        <SectionHeader
          label="Recurring Cost"
          color="#FF9900"
          primary={fmt(recurringDisplay)}
          secondary={fmtAlt(recurringDisplay)}
          hint={`per ${periodLabel}`}
        />

        {/* Infrastructure */}
        <Row
          icon="🏗" title="Infrastructure" color="#FF9900"
          subtitle={infraNodes.map(n => n.label).join(", ") || "No AWS services"}
          primary={fmt(infraUSD * f)} secondary={fmtAlt(infraUSD * f)}
          items={[
            ...infraNodes.map(n => ({ label: n.label, amount: fmt(n.monthly * f) })),
            ...(cost.dataTransfer.monthly > 0
              ? [{ label: "Data Transfer", amount: fmt(cost.dataTransfer.monthly * f) }] : []),
          ]}
        />

        {/* External Services */}
        <Row
          icon="🌐" title="External Services" color="#8C4FFF"
          subtitle={externalNodes.map(n => n.label).join(", ") || "No external APIs"}
          primary={fmt(externalUSD * f)} secondary={fmtAlt(externalUSD * f)}
          items={externalNodes.map(n => ({ label: n.label, amount: fmt(n.monthly * f) }))}
        />

        {/* Additional Costs */}
        <Row
          icon="📋" title="Additional Costs" color="#0EA5E9"
          subtitle={addCategories || "No additional costs (recurring)"}
          primary={fmt(addUSD * f)} secondary={fmtAlt(addUSD * f)}
          items={additionalCosts.filter(c => c.billingPeriod !== "one-time").map(c => ({
            label: c.label || c.category,
            amount: fmt(recurringMonthly(c) * f),
          }))}
        />

        {/* Subscriptions */}
        <Row
          icon="🔄" title="Subscriptions" color="#6366F1"
          subtitle={subscriptions.length > 0
            ? subscriptions.map(s => s.service).join(", ")
            : "No SaaS subscriptions"}
          primary={fmt(subsUSD * f)} secondary={fmtAlt(subsUSD * f)}
          items={subscriptions.map(s => ({
            label: `${s.service}${s.plan ? ` · ${s.plan}` : ""}`,
            amount: fmt(subMonthly(s) * f),
          }))}
        />

        {/* ══ DEVELOPMENT COST ═════════════════════════════════════════════ */}
        {devUSD > 0 && (<>
          <SectionHeader
            label="Development Cost"
            color="#0EA5E9"
            primary={fmt(devUSD)}
            secondary={fmtAlt(devUSD)}
            hint="project / manday"
          />
          <Row
            icon="🔗" title="API & Line Development" color="#0EA5E9"
            badge="manday"
            subtitle={devNodes.map(n => n.label).join(", ") || "No API or Line nodes"}
            primary={fmt(devUSD)} secondary={fmtAlt(devUSD)}
            items={devNodes.map(n => ({ label: n.label, amount: fmt(n.monthly) }))}
          />
        </>)}

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
                <div className="text-base font-bold text-purple-600">{fmt(subsYearlyUpfrontUSD)}</div>
                <div className="text-[10px] text-gray-400">{fmtAlt(subsYearlyUpfrontUSD)}/yr</div>
              </div>
            </div>
            <div className="mt-1.5 pt-1.5 border-t border-purple-100 text-[10px] text-purple-500">
              ≈ {fmt(subsYearlyUpfrontUSD / 12)}/mo equivalent after year 1
            </div>
          </div>
        )}

        {/* ══ ONE-TIME SETUP ════════════════════════════════════════════════ */}
        {(oneTimeSetup + oneTimeAdd) > 0 && (
          <>
            <SectionHeader
              label="One-time Setup"
              color="#F59E0B"
              primary={fmt(oneTimeSetup + oneTimeAdd)}
              secondary={fmtAlt(oneTimeSetup + oneTimeAdd)}
            />
            {cost.setupCosts.map((s, i) => (
              <Row key={i} icon="📦" title={s.label} color="#F59E0B"
                subtitle="Group setup cost"
                primary={fmt(s.amountUSD)} secondary={fmtAlt(s.amountUSD)}
                items={[]} />
            ))}
            {additionalCosts.filter(c => c.billingPeriod === "one-time").map((c, i) => (
              <Row key={i} icon="📦" title={c.label || c.category} color="#F59E0B"
                subtitle="One-time additional cost"
                primary={fmt(oneTimeAmount(c))} secondary={fmtAlt(oneTimeAmount(c))}
                items={[]} />
            ))}
          </>
        )}

        {/* ══ GRAND TOTAL (collapsible) ═════════════════════════════════ */}
        {(() => {
          const [open, setOpen] = useState(true);
          const totalUpfront = devUSD + subsYearlyUpfrontUSD + (oneTimeSetup + oneTimeAdd);
          const grandTotal = recurringDisplay + devUSD + subsYearlyUpfrontUSD;
          return (
            <div className="rounded-xl bg-gray-900 text-white overflow-hidden">
              <button
                className="w-full flex items-center gap-2 px-4 py-3 hover:bg-white/5 transition-colors"
                onClick={() => setOpen(v => !v)}
              >
                <div className="flex-1 text-left">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Total Cost Summary</div>
                  {!open && (
                    <div className="text-lg font-bold text-white leading-tight whitespace-nowrap mt-0.5">
                      {fmt(grandTotal)}
                    </div>
                  )}
                </div>
                {open ? <ChevronUp size={14} className="text-gray-500 shrink-0" /> : <ChevronDown size={14} className="text-gray-500 shrink-0" />}
              </button>

              {open && (
                <div className="px-4 pb-3 space-y-1.5 border-t border-white/10">
                  <div className="flex items-center gap-2 pt-2">
                    <span className="text-gray-400 text-xs min-w-0 flex-1 truncate">🏗 Recurring /{periodLabel}</span>
                    <span className="font-semibold text-orange-300 text-xs shrink-0 whitespace-nowrap">{fmt(recurringDisplay)}</span>
                  </div>
                  {devUSD > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400 text-xs min-w-0 flex-1 truncate">🔗 Dev cost (manday)</span>
                    <span className="font-semibold text-sky-300 text-xs shrink-0 whitespace-nowrap">{fmt(devUSD)}</span>
                  </div>
                  )}

                  {subsYearlyUpfrontUSD > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 text-xs min-w-0 flex-1 truncate">⚡ Yearly subs (upfront)</span>
                      <span className="font-semibold text-purple-300 text-xs shrink-0 whitespace-nowrap">{fmt(subsYearlyUpfrontUSD)}</span>
                    </div>
                  )}

                  {(oneTimeSetup + oneTimeAdd) > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 text-xs min-w-0 flex-1 truncate">📦 One-time setup</span>
                      <span className="font-semibold text-amber-300 text-xs shrink-0 whitespace-nowrap">{fmt(oneTimeSetup + oneTimeAdd)}</span>
                    </div>
                  )}

                  <div className="border-t border-white/10 pt-2 flex items-center gap-2">
                    <span className="text-sm text-gray-200 font-semibold flex-1">Total Cost</span>
                    <div className="text-right shrink-0">
                      <div className="text-lg font-bold text-white leading-tight whitespace-nowrap">
                        {fmt(grandTotal)}
                      </div>
                      <div className="text-[10px] text-gray-400 whitespace-nowrap">{fmtAlt(grandTotal)}</div>
                    </div>
                  </div>

                  {totalUpfront > 0 && (
                    <div className="rounded-lg bg-white/5 px-2.5 py-2 space-y-1 text-[10px]">
                      <div className="text-gray-400 font-semibold uppercase tracking-wide">Payment breakdown</div>
                      <div className="flex justify-between text-gray-300">
                        <span>🏗 Recurring /{periodLabel}</span>
                        <span>{fmt(recurringDisplay)}</span>
                      </div>
                      <div className="flex justify-between text-amber-300 font-medium">
                        <span>⚡ Upfront at start</span>
                        <span>{fmt(totalUpfront)}</span>
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
              {currency === "thb" ? `Selling price to client (THB/${periodLabel})` : `Selling price to client (USD/${periodLabel})`}
              <div className="flex items-center gap-1.5">
                <span className="text-sm text-gray-400">{currency === "thb" ? "฿" : "$"}</span>
                <input
                  type="number" min={0} step={100}
                  className="flex-1 border rounded px-2 py-1.5 text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-blue-400"
                  value={sellingPriceUSD > 0
                    ? (currency === "thb"
                        ? Math.round(sellingPriceUSD * f * rate)
                        : +(sellingPriceUSD * f).toFixed(2))
                    : ""}
                  placeholder="0"
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    if (currency === "thb") {
                      setSellingPrice(val / rate / f);
                    } else {
                      setSellingPrice(val / f);
                    }
                  }}
                />
              </div>
            </label>

            {sellingPriceUSD > 0 && (() => {
              // Always use annual perspective for Year 1 vs Year 2+ comparison
              const annualRevenue = sellingPriceUSD * 12;

              // Year 1: recurring×12 + dev + yearly subs upfront + one-time setup + one-time add
              const year1Cost = recurringUSD * 12 + devUSD + subsYearlyUpfrontUSD + oneTimeSetup + oneTimeAdd;
              const year1Profit = annualRevenue - year1Cost;
              const year1Margin = annualRevenue > 0 ? (year1Profit / annualRevenue) * 100 : 0;

              // Year 2+: recurring×12 + yearly subs (dev & one-time gone)
              const year2Cost = recurringUSD * 12 + subsYearlyUpfrontUSD;
              const year2Profit = annualRevenue - year2Cost;
              const year2Margin = annualRevenue > 0 ? (year2Profit / annualRevenue) * 100 : 0;

              return (
                <div className="space-y-3 pt-1 border-t border-gray-100">
                  {/* Annual revenue label */}
                  <div className="flex justify-between text-sm items-center">
                    <span className="text-gray-500 font-medium">Annual Revenue</span>
                    <div className="text-right">
                      <div className="font-bold text-gray-800 whitespace-nowrap">{fmt(annualRevenue)}</div>
                      <div className="text-[10px] text-gray-400 whitespace-nowrap">{fmtAlt(annualRevenue)}/yr</div>
                    </div>
                  </div>

                  {/* Year 1 */}
                  <div className="rounded-xl border border-blue-200 bg-blue-50 overflow-hidden">
                    <div className="px-3 py-2 bg-blue-100 flex items-center justify-between">
                      <span className="text-[10px] font-bold text-blue-700 uppercase tracking-widest">📅 Year 1</span>
                      <span className="text-[9px] text-blue-500">incl. dev + setup + subs</span>
                    </div>
                    <div className="px-3 py-2 space-y-1">
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>Recurring /yr</span>
                        <span className="whitespace-nowrap">–{fmt(recurringUSD * 12)}</span>
                      </div>
                      {devUSD > 0 && (
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>Dev cost (manday)</span>
                          <span className="whitespace-nowrap">–{fmt(devUSD)}</span>
                        </div>
                      )}
                      {subsYearlyUpfrontUSD > 0 && (
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>Yearly subs (upfront)</span>
                          <span className="whitespace-nowrap">–{fmt(subsYearlyUpfrontUSD)}</span>
                        </div>
                      )}
                      {(oneTimeSetup + oneTimeAdd) > 0 && (
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>One-time setup</span>
                          <span className="whitespace-nowrap">–{fmt(oneTimeSetup + oneTimeAdd)}</span>
                        </div>
                      )}
                      <div className="border-t border-blue-200 pt-1.5 flex justify-between items-center">
                        <span className="text-sm font-bold text-blue-700">Profit</span>
                        <div className="text-right">
                          <span className={`text-base font-bold whitespace-nowrap ${year1Profit >= 0 ? "text-green-600" : "text-red-500"}`}>
                            {year1Profit >= 0 ? "+" : ""}{fmt(year1Profit)}
                          </span>
                          <div className="text-[10px] text-gray-400 whitespace-nowrap">{fmtAlt(year1Profit)}</div>
                        </div>
                      </div>
                      {/* Margin bar */}
                      <div className="flex items-center gap-2 pt-0.5">
                        <span className="text-[10px] text-gray-400 shrink-0">Margin</span>
                        <div className="flex-1 h-1.5 bg-blue-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all"
                            style={{
                              width: `${Math.min(100, Math.abs(year1Margin))}%`,
                              background: year1Margin >= 0 ? "#22C55E" : "#EF4444",
                            }} />
                        </div>
                        <span className={`text-xs font-bold shrink-0 ${year1Margin >= 0 ? "text-green-600" : "text-red-500"}`}>
                          {year1Margin.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Year 2+ */}
                  <div className="rounded-xl border border-green-200 bg-green-50 overflow-hidden">
                    <div className="px-3 py-2 bg-green-100 flex items-center justify-between">
                      <span className="text-[10px] font-bold text-green-700 uppercase tracking-widest">📈 Year 2+</span>
                      <span className="text-[9px] text-green-500">recurring only</span>
                    </div>
                    <div className="px-3 py-2 space-y-1">
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>Recurring /yr</span>
                        <span className="whitespace-nowrap">–{fmt(recurringUSD * 12)}</span>
                      </div>
                      {subsYearlyUpfrontUSD > 0 && (
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>Yearly subs</span>
                          <span className="whitespace-nowrap">–{fmt(subsYearlyUpfrontUSD)}</span>
                        </div>
                      )}
                      <div className="border-t border-green-200 pt-1.5 flex justify-between items-center">
                        <span className="text-sm font-bold text-green-700">Profit</span>
                        <div className="text-right">
                          <span className={`text-base font-bold whitespace-nowrap ${year2Profit >= 0 ? "text-green-600" : "text-red-500"}`}>
                            {year2Profit >= 0 ? "+" : ""}{fmt(year2Profit)}
                          </span>
                          <div className="text-[10px] text-gray-400 whitespace-nowrap">{fmtAlt(year2Profit)}</div>
                        </div>
                      </div>
                      {/* Margin bar */}
                      <div className="flex items-center gap-2 pt-0.5">
                        <span className="text-[10px] text-gray-400 shrink-0">Margin</span>
                        <div className="flex-1 h-1.5 bg-green-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all"
                            style={{
                              width: `${Math.min(100, Math.abs(year2Margin))}%`,
                              background: year2Margin >= 0 ? "#22C55E" : "#EF4444",
                            }} />
                        </div>
                        <span className={`text-xs font-bold shrink-0 ${year2Margin >= 0 ? "text-green-600" : "text-red-500"}`}>
                          {year2Margin.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Total to Sell */}
                  <div className="rounded-lg bg-green-50 border border-green-100 px-3 py-2 flex justify-between items-center">
                    <div>
                      <div className="text-xs font-semibold text-green-700">Total to Sell</div>
                      <div className="text-[10px] text-green-500">What you charge the client /yr</div>
                    </div>
                    <div className="text-right">
                      <div className="text-base font-bold text-green-700 whitespace-nowrap">{fmt(annualRevenue)}</div>
                      <div className="text-[10px] text-gray-400 whitespace-nowrap">{fmtAlt(annualRevenue)}</div>
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
