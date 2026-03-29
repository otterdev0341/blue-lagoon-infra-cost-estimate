import { useState, useMemo } from "react";
import { ChevronDown, ChevronUp, Maximize2, X } from "lucide-react";
import { useCanvasStore } from "../../store/canvasStore.ts";
import { calculateDiagramCost } from "../../lib/costEngine.ts";
import { fmtTHB, fmtUSD } from "../../lib/utils.ts";
import { subMonthly, subYearlyUpfront } from "./SubscribeTab.tsx";
import type { AdditionalCostItem, GroupBillingType } from "../../types.ts";

type Currency = "thb" | "usd";

// ── Helpers ──────────────────────────────────────────────────────────────────

function recurringMonthly(item: AdditionalCostItem): number {
  if (item.billingPeriod === "one-time") return 0;
  const base = item.billingPeriod === "yearly" ? item.amountUSD / 12 : item.amountUSD;
  return base * (1 - (item.discount ?? 0) / 100);
}
function oneTimeAmount(item: AdditionalCostItem): number {
  if (item.billingPeriod !== "one-time") return 0;
  return item.amountUSD * (1 - (item.discount ?? 0) / 100);
}

const BILLING_COLORS: Record<GroupBillingType, string> = {
  monthly: "#3B82F6",
  yearly:  "#6366F1",
  onetime: "#F59E0B",
};
const BILLING_LABELS: Record<GroupBillingType, string> = {
  monthly: "Monthly",
  yearly:  "Yearly",
  onetime: "One-time",
};

const API_LINE_TYPES = new Set([
  "api_rest","api_grpc","api_mcp",
  "line_image","line_button","line_carousel","line_quick_reply",
  "line_flex_message","line_rich_menu","line_custom_payload",
  "line_api_call","line_ai_agent","line_intent","line_dialog",
]);

// ── Collapsible row ──────────────────────────────────────────────────────────

interface RowItem { label: string; sublabel?: string; amount: string }
interface RowProps {
  icon: string;
  title: string;
  subtitle: string;
  primary: string;
  secondary?: string;
  color: string;
  badge?: string;
  items?: RowItem[];
}
function Row({ icon, title, subtitle, primary, secondary, color, badge, items }: RowProps) {
  const [open, setOpen] = useState(false);
  const canExpand = !!items && items.length > 0;
  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: color + "35" }}>
      <button
        className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-gray-50/80 transition-colors"
        style={{ background: color + "08" }}
        onClick={() => canExpand && setOpen(v => !v)}
      >
        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base shrink-0"
          style={{ background: color + "20" }}>{icon}</div>
        <div className="flex-1 min-w-0 overflow-hidden">
          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-sm font-semibold text-gray-800 truncate">{title}</span>
            {badge && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wide shrink-0"
                style={{ background: color + "25", color }}>{badge}</span>
            )}
          </div>
          <div className="text-[10px] text-gray-400 truncate">{subtitle}</div>
        </div>
        <div className="text-right shrink-0 pl-1">
          <div className="text-sm font-bold whitespace-nowrap" style={{ color }}>{primary}</div>
          {secondary && <div className="text-[10px] text-gray-400 whitespace-nowrap">{secondary}</div>}
        </div>
        {canExpand && (
          <div className="shrink-0 ml-0.5 text-gray-400">
            {open ? <ChevronUp size={13}/> : <ChevronDown size={13}/>}
          </div>
        )}
      </button>
      {open && canExpand && (
        <div className="border-t px-3 py-2 space-y-1.5 bg-white" style={{ borderColor: color + "25" }}>
          {items!.map((it, i) => (
            <div key={i} className="flex justify-between gap-2 text-xs text-gray-600">
              <div className="flex-1 min-w-0">
                <div className="truncate font-medium">{it.label}</div>
                {it.sublabel && (
                  <div className="text-[10px] text-gray-400 truncate">{it.sublabel}</div>
                )}
              </div>
              <span className="font-semibold shrink-0" style={{ color }}>{it.amount}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Year 1 "What to pay" card ─────────────────────────────────────────────────

interface Year1CardProps {
  monthlyAnnual:  number;   // monthly groups × 12 + ungrouped × 12 + add + subs
  yearlyPayment:  number;   // yearly groups total (already ×12)
  onetimePayment: number;   // onetime groups + dev + one-time add
  fmt:    (usd: number) => string;
  fmtAlt: (usd: number) => string;
}
function Year1Card({ monthlyAnnual, yearlyPayment, onetimePayment, fmt, fmtAlt }: Year1CardProps) {
  const total = monthlyAnnual + yearlyPayment + onetimePayment;
  return (
    <div className="rounded-xl overflow-hidden" style={{ background: "#0F172A" }}>
      <div className="px-4 pt-3 pb-1">
        <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2.5">
          💸 What to Pay — Year 1
        </div>

        {onetimePayment > 0 && (
          <div className="flex justify-between items-center py-1.5 border-b border-white/5">
            <div>
              <div className="text-xs text-amber-300 font-medium">One-time (at project start)</div>
              <div className="text-[10px] text-slate-500">Setup, dev &amp; one-time fees</div>
            </div>
            <span className="text-sm font-bold text-amber-300 ml-3">{fmt(onetimePayment)}</span>
          </div>
        )}

        {yearlyPayment > 0 && (
          <div className="flex justify-between items-center py-1.5 border-b border-white/5">
            <div>
              <div className="text-xs text-indigo-300 font-medium">Yearly subscriptions</div>
              <div className="text-[10px] text-slate-500">Paid annually</div>
            </div>
            <span className="text-sm font-bold text-indigo-300 ml-3">{fmt(yearlyPayment)}/yr</span>
          </div>
        )}

        {monthlyAnnual > 0 && (
          <div className="flex justify-between items-center py-1.5 border-b border-white/5">
            <div>
              <div className="text-xs text-blue-300 font-medium">Monthly recurring × 12</div>
              <div className="text-[10px] text-slate-500">Infrastructure &amp; services</div>
            </div>
            <span className="text-sm font-bold text-blue-300 ml-3">{fmt(monthlyAnnual)}</span>
          </div>
        )}
      </div>

      <div className="px-4 py-3 flex justify-between items-center mt-1" style={{ background: "#1E293B" }}>
        <span className="text-sm font-bold text-white">Year 1 Total</span>
        <div className="text-right">
          <div className="text-xl font-bold text-white">{fmt(total)}</div>
          <div className="text-[10px] text-slate-400">{fmtAlt(total)}</div>
        </div>
      </div>
    </div>
  );
}

// ── Year 2+ recurring summary card ──────────────────────────────────────────

interface Year2CardProps {
  monthlyAnnual: number;
  yearlyPayment: number;
  fmt: (usd: number) => string;
  fmtAlt: (usd: number) => string;
}
function Year2Card({ monthlyAnnual, yearlyPayment, fmt, fmtAlt }: Year2CardProps) {
  const total = monthlyAnnual + yearlyPayment;
  if (total === 0) return null;
  return (
    <div className="rounded-xl overflow-hidden border border-slate-200">
      <div className="px-4 pt-3 pb-1 bg-slate-50">
        <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2.5">
          📈 From Year 2 (per year)
        </div>
        {yearlyPayment > 0 && (
          <div className="flex justify-between items-center py-1 border-b border-slate-200">
            <span className="text-xs text-slate-500">Yearly payments</span>
            <span className="text-xs font-semibold text-indigo-600">{fmt(yearlyPayment)}/yr</span>
          </div>
        )}
        {monthlyAnnual > 0 && (
          <div className="flex justify-between items-center py-1 border-b border-slate-200">
            <span className="text-xs text-slate-500">Monthly recurring × 12</span>
            <span className="text-xs font-semibold text-blue-600">{fmt(monthlyAnnual)}</span>
          </div>
        )}
      </div>
      <div className="px-4 py-3 flex justify-between items-center bg-slate-100">
        <span className="text-sm font-bold text-slate-700">Year 2+ Cost /yr</span>
        <div className="text-right">
          <div className="text-base font-bold text-slate-800">{fmt(total)}</div>
          <div className="text-[10px] text-slate-400">{fmtAlt(total)}</div>
        </div>
      </div>
    </div>
  );
}

// ── Price input helper ───────────────────────────────────────────────────────

interface PriceInputProps {
  label: string;
  hint?: string;
  value: number;       // stored as USD/month internally
  onChange: (usdPerMonth: number) => void;
  currency: Currency;
  rate: number;
  fmtAlt: (usd: number) => string;
  step?: number;
  placeholder?: string;
}
function PriceInput({ label, hint, value, onChange, currency, rate, fmtAlt, step = 1000, placeholder = "0" }: PriceInputProps) {
  const displayAnnual = value > 0
    ? (currency === "thb" ? Math.round(value * 12 * rate) : +(value * 12).toFixed(2))
    : "";
  return (
    <div>
      <div className="text-xs font-semibold text-gray-600 mb-0.5">{label}</div>
      {hint && <div className="text-[10px] text-gray-400 mb-1">{hint}</div>}
      <div className="flex items-center gap-2">
        <span className="text-base text-gray-400">{currency === "thb" ? "฿" : "$"}</span>
        <input
          type="number" min={0} step={step}
          className="flex-1 border-2 border-gray-200 rounded-xl px-3 py-2 text-lg font-bold focus:outline-none focus:border-blue-400"
          value={displayAnnual}
          placeholder={placeholder}
          onChange={e => {
            const val = Number(e.target.value);
            onChange(currency === "thb" ? val / rate / 12 : val / 12);
          }}
        />
        <span className="text-sm text-gray-400 whitespace-nowrap">/yr</span>
      </div>
      {value > 0 && (
        <div className="text-[10px] text-gray-400 mt-1 ml-6">{fmtAlt(value * 12)} annually</div>
      )}
    </div>
  );
}

// ── 3-year profit table ───────────────────────────────────────────────────────

interface ThreeYearProps {
  sellingPriceUSD:      number;
  setSellingPrice:      (v: number) => void;
  year2SellingPriceUSD: number;
  setYear2SellingPrice: (v: number) => void;
  monthlyChargeUSD:     number;
  setMonthlyCharge:     (v: number) => void;
  monthlySubsList:      any[];
  yearlySubsList:       any[];
  monthlySubsUSD:       number;
  yearlySubsUSD:        number;
  subsRevenueAnnual:    number;
  year1Cost:      number;
  year2PlusCost:  number;
  monthlyAnnual:  number;
  yearlyPayment:  number;
  onetimePayment: number;
  currency: Currency;
  rate:     number;
  fmt:      (usd: number) => string;
  fmtAlt:   (usd: number) => string;
}
function ThreeYearTable({
  sellingPriceUSD, setSellingPrice,
  year2SellingPriceUSD, setYear2SellingPrice,
  monthlyChargeUSD, setMonthlyCharge,
  monthlySubsList, yearlySubsList, monthlySubsUSD, yearlySubsUSD,
  subsRevenueAnnual,
  year1Cost, year2PlusCost,
  monthlyAnnual, yearlyPayment, onetimePayment,
  currency, rate, fmt, fmtAlt,
}: ThreeYearProps) {
  // Revenue = project fee (Y1) + MA + monthly billing + subscription billing
  const y1Revenue = sellingPriceUSD * 12 + year2SellingPriceUSD * 12 + monthlyChargeUSD * 12 + subsRevenueAnnual;
  const y2Revenue = year2SellingPriceUSD * 12 + monthlyChargeUSD * 12 + subsRevenueAnnual;

  const years = [
    { label: "Year 1", hint: "fee + MA + subs + monthly", cost: year1Cost,     revenue: y1Revenue,  border: "#BFDBFE", bg: "#EFF6FF", hbg: "#DBEAFE", lc: "#1D4ED8" },
    { label: "Year 2", hint: "MA + subs + monthly",       cost: year2PlusCost, revenue: y2Revenue,  border: "#BBF7D0", bg: "#F0FDF4", hbg: "#DCFCE7", lc: "#15803D" },
    { label: "Year 3", hint: "MA + subs + monthly",       cost: year2PlusCost, revenue: y2Revenue,  border: "#BBF7D0", bg: "#F0FDF4", hbg: "#DCFCE7", lc: "#15803D" },
  ];

  return (
    <div className="space-y-6">
      {/* Selling price inputs */}
      <div className="space-y-4">
        <PriceInput
          label="Project fee (one-time, Year 1 only)"
          hint="One-time delivery / implementation fee charged in Year 1"
          value={sellingPriceUSD}
          onChange={setSellingPrice}
          currency={currency} rate={rate} fmtAlt={fmtAlt}
        />
        <PriceInput
          label="MA / support revenue (all years)"
          hint="Annual revenue from client — applies from Year 1 onwards (maintenance, support)"
          value={year2SellingPriceUSD}
          onChange={setYear2SellingPrice}
          currency={currency} rate={rate} fmtAlt={fmtAlt}
          placeholder={sellingPriceUSD > 0 ? String(currency === "thb" ? Math.round(sellingPriceUSD * 12 * rate) : +(sellingPriceUSD * 12).toFixed(2)) : "0"}
        />

        {/* Monthly service charge — true per-month billing (not /yr) */}
        <div>
          <div className="text-xs font-semibold text-gray-600 mb-0.5">Monthly service charge to client</div>
          <div className="text-[10px] text-gray-400 mb-1">Billed monthly — applied every year</div>
          <div className="flex items-center gap-2">
            <span className="text-base text-gray-400">{currency === "thb" ? "฿" : "$"}</span>
            <input
              type="number" min={0} step={100}
              className="flex-1 border-2 border-gray-200 rounded-xl px-3 py-2 text-lg font-bold focus:outline-none focus:border-green-400"
              value={monthlyChargeUSD > 0 ? (currency === "thb" ? Math.round(monthlyChargeUSD * rate) : +monthlyChargeUSD.toFixed(2)) : ""}
              placeholder="0"
              onChange={e => {
                const val = Number(e.target.value);
                setMonthlyCharge(currency === "thb" ? val / rate : val);
              }}
            />
            <span className="text-sm text-gray-400 whitespace-nowrap">/mo</span>
          </div>
          {monthlyChargeUSD > 0 && (
            <div className="text-[10px] text-gray-400 mt-1 ml-6">{fmtAlt(monthlyChargeUSD * 12)} annually</div>
          )}
        </div>
      </div>

      {/* Subscription revenue (billed to client — all years) */}
      {(monthlySubsList.length > 0 || yearlySubsList.length > 0) && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 space-y-2">
          <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 mb-1">
            💰 Subscription Revenue — billed to client
          </div>
          {yearlySubsList.map((s: any) => (
            <div key={s.id} className="flex justify-between text-xs text-gray-600">
              <span className="flex-1 truncate">{s.service}{s.plan ? ` · ${s.plan}` : ""}</span>
              <span className="font-semibold text-emerald-600 ml-2">+{fmt(subYearlyUpfront(s))}/yr</span>
            </div>
          ))}
          {monthlySubsList.map((s: any) => (
            <div key={s.id} className="flex justify-between text-xs text-gray-600">
              <span className="flex-1 truncate">{s.service}{s.plan ? ` · ${s.plan}` : ""}</span>
              <span className="font-semibold text-emerald-600 ml-2">+{fmt(subMonthly(s))}/mo</span>
            </div>
          ))}
          <div className="flex justify-between text-xs font-bold text-emerald-700 pt-1 border-t border-emerald-200">
            <span>Total subscription revenue /yr</span>
            <span>+{fmt(subsRevenueAnnual)}</span>
          </div>
        </div>
      )}

      {/* 3-year grid */}
      <div className="grid grid-cols-3 gap-4">
        {years.map((yr, i) => {
          const profit = yr.revenue - yr.cost;
          const margin = yr.revenue > 0 ? (profit / yr.revenue) * 100 : 0;
          const isPos  = profit >= 0;
          const isYear1 = i === 0;
          return (
            <div key={i} className="rounded-2xl border-2 overflow-hidden flex flex-col"
              style={{ borderColor: yr.border, background: yr.bg }}>
              {/* Header */}
              <div className="px-4 py-2.5 flex justify-between items-center"
                style={{ background: yr.hbg }}>
                <span className="text-sm font-bold" style={{ color: yr.lc }}>{yr.label}</span>
                <span className="text-[10px]" style={{ color: yr.lc + "99" }}>{yr.hint}</span>
              </div>
              {/* Body */}
              <div className="px-4 py-3 flex-1 space-y-2">
                {/* Revenue */}
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Revenue /yr</span>
                  <span className="font-medium text-gray-700">{yr.revenue > 0 ? fmt(yr.revenue) : "—"}</span>
                </div>
                {/* Revenue breakdown */}
                {yr.revenue > 0 && (
                  <div className="space-y-0.5">
                    {isYear1 && sellingPriceUSD > 0 && (
                      <div className="flex justify-between text-[10px] text-gray-400">
                        <span>↳ Project fee</span>
                        <span className="text-amber-500">+{fmt(sellingPriceUSD * 12)}</span>
                      </div>
                    )}
                    {year2SellingPriceUSD > 0 && (
                      <div className="flex justify-between text-[10px] text-gray-400">
                        <span>↳ MA /yr</span>
                        <span className="text-indigo-500">+{fmt(year2SellingPriceUSD * 12)}</span>
                      </div>
                    )}
                    {monthlyChargeUSD > 0 && (
                      <div className="flex justify-between text-[10px] text-gray-400">
                        <span>↳ Monthly billing × 12</span>
                        <span className="text-green-500">+{fmt(monthlyChargeUSD * 12)}</span>
                      </div>
                    )}
                    {subsRevenueAnnual > 0 && (
                      <div className="flex justify-between text-[10px] text-gray-400">
                        <span>↳ Subscriptions billed</span>
                        <span className="text-emerald-500">+{fmt(subsRevenueAnnual)}</span>
                      </div>
                    )}
                  </div>
                )}
                {/* Cost breakdown */}
                <div className="space-y-0.5">
                  {isYear1 && onetimePayment > 0 && (
                    <div className="flex justify-between text-[10px] text-gray-400">
                      <span>↳ One-time setup</span>
                      <span className="text-amber-500">–{fmt(onetimePayment)}</span>
                    </div>
                  )}
                  {yearlyPayment > 0 && (
                    <div className="flex justify-between text-[10px] text-gray-400">
                      <span>↳ Yearly subs/infra</span>
                      <span className="text-indigo-400">–{fmt(yearlyPayment)}</span>
                    </div>
                  )}
                  {monthlyAnnual > 0 && (
                    <div className="flex justify-between text-[10px] text-gray-400">
                      <span>↳ Monthly × 12</span>
                      <span className="text-blue-400">–{fmt(monthlyAnnual)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-xs text-gray-500 pt-0.5 border-t" style={{ borderColor: yr.border }}>
                    <span>Cost /yr</span>
                    <span className="font-medium text-red-400">–{fmt(yr.cost)}</span>
                  </div>
                </div>
                <div className="border-t pt-2" style={{ borderColor: yr.border }}>
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs font-semibold" style={{ color: yr.lc }}>Profit</span>
                    <span className={`text-base font-bold ${isPos ? "text-green-600" : "text-red-500"}`}>
                      {yr.revenue > 0 ? `${isPos ? "+" : ""}${fmt(profit)}` : "—"}
                    </span>
                  </div>
                  {yr.revenue > 0 && (
                    <>
                      <div className="flex items-center gap-2 mt-1.5">
                        <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: yr.hbg }}>
                          <div className="h-full rounded-full transition-all"
                            style={{
                              width: `${Math.min(100, Math.abs(margin))}%`,
                              background: isPos ? "#22C55E" : "#EF4444",
                            }} />
                        </div>
                        <span className={`text-xs font-bold w-12 text-right shrink-0 ${isPos ? "text-green-600" : "text-red-500"}`}>
                          {margin.toFixed(1)}%
                        </span>
                      </div>
                      <div className="text-[10px] text-gray-400 mt-1">{fmtAlt(profit)}</div>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 3-year total summary */}
      {(y1Revenue > 0 || y2Revenue > 0 || sellingPriceUSD > 0) && (
        <div className="rounded-xl bg-slate-800 text-white p-4 space-y-2">
          <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">3-Year Summary</div>
          <div className="flex justify-between text-xs text-slate-400">
            <span>Total revenue (3 yr)</span>
            <span className="text-white font-semibold">{fmt(y1Revenue + y2Revenue * 2)}</span>
          </div>
          <div className="flex justify-between text-xs text-slate-400">
            <span>Total cost (3 yr)</span>
            <span className="text-red-300 font-semibold">–{fmt(year1Cost + year2PlusCost * 2)}</span>
          </div>
          <div className="flex justify-between items-center pt-1 border-t border-white/10">
            <span className="text-sm font-bold text-white">Total profit</span>
            {(() => {
              const totalProfit = (y1Revenue + y2Revenue * 2) - (year1Cost + year2PlusCost * 2);
              const totalMargin = (y1Revenue + y2Revenue * 2) > 0
                ? (totalProfit / (y1Revenue + y2Revenue * 2)) * 100 : 0;
              const isPos = totalProfit >= 0;
              return (
                <div className="text-right">
                  <div className={`text-xl font-bold ${isPos ? "text-green-400" : "text-red-400"}`}>
                    {isPos ? "+" : ""}{fmt(totalProfit)}
                  </div>
                  <div className="text-[10px] text-slate-400">{totalMargin.toFixed(1)}% margin</div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Cost reference */}
      <div className="rounded-xl bg-gray-50 border border-gray-200 p-4 text-xs text-gray-500 space-y-1">
        <div className="font-semibold text-gray-600 mb-1.5">Cost reference</div>
        <div className="flex justify-between">
          <span>Year 1 cost (incl. one-time)</span>
          <span className="font-medium text-gray-700">{fmt(year1Cost)}</span>
        </div>
        <div className="flex justify-between">
          <span>Year 2+ cost /yr (recurring)</span>
          <span className="font-medium text-gray-700">{fmt(year2PlusCost)}</span>
        </div>
      </div>
    </div>
  );
}

// ── Left cost column (fullscreen) ─────────────────────────────────────────────

interface CostColumnProps {
  groupBreakdowns:  { id: string; label: string; billingType: GroupBillingType; total: number; services: any[] }[];
  ungroupedNodes:   any[];
  ungroupedUSD:     number;
  devUSD:           number;
  additionalCosts:  AdditionalCostItem[];
  monthlyAnnual:    number;
  yearlyPayment:    number;
  onetimePayment:   number;
  addUSD:           number;
  nodes:            any[];
  fmt:    (usd: number) => string;
  fmtAlt: (usd: number) => string;
}
function CostColumn({
  groupBreakdowns, ungroupedNodes, ungroupedUSD, devUSD,
  additionalCosts,
  monthlyAnnual, yearlyPayment, onetimePayment,
  addUSD, nodes,
  fmt, fmtAlt,
}: CostColumnProps) {
  return (
    <div className="space-y-3">
      <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 pb-1">Cost Breakdown</div>

      {/* Groups */}
      {groupBreakdowns.map(g => {
        const bColor = BILLING_COLORS[g.billingType];
        const bLabel = BILLING_LABELS[g.billingType];
        const displayAmt = g.billingType === "onetime" ? g.total
          : g.billingType === "yearly" ? g.total * 12
          : g.total;
        const suffix = g.billingType === "onetime" ? "" : g.billingType === "yearly" ? "/yr" : "/mo";
        return (
          <Row key={g.id} icon="📦" title={g.label} color={bColor} badge={bLabel}
            subtitle={`${g.services.length} service${g.services.length !== 1 ? "s" : ""}`}
            primary={fmt(displayAmt) + suffix} secondary={fmtAlt(displayAmt) + suffix}
            items={g.services.map((n: any) => {
              const nd = nodes.find((x: any) => x.id === n.nodeId);
              const desc = (nd?.data?.config as any)?.description;
              return { label: n.label, sublabel: desc || undefined, amount: fmt(n.monthly) + "/mo" };
            })}
          />
        );
      })}

      {/* Ungrouped AWS services */}
      {ungroupedNodes.length > 0 && (
        <Row icon="🔧" title="Ungrouped" color="#94A3B8"
          subtitle={`${ungroupedNodes.length} service${ungroupedNodes.length !== 1 ? "s" : ""}`}
          primary={fmt(ungroupedUSD) + "/mo"} secondary={fmtAlt(ungroupedUSD) + "/mo"}
          items={ungroupedNodes.map((n: any) => {
            const nd = nodes.find((x: any) => x.id === n.nodeId);
            const desc = (nd?.data?.config as any)?.description;
            return { label: n.label, sublabel: desc || undefined, amount: fmt(n.monthly) + "/mo" };
          })}
        />
      )}

      {/* Additional costs */}
      {additionalCosts.filter(c => c.billingPeriod !== "one-time").length > 0 && (
        <Row icon="📋" title="Additional Costs" color="#0EA5E9"
          subtitle={`${additionalCosts.filter(c => c.billingPeriod !== "one-time").length} items`}
          primary={fmt(addUSD) + "/mo"} secondary={fmtAlt(addUSD) + "/mo"}
          items={additionalCosts.filter(c => c.billingPeriod !== "one-time").map(c => ({
            label: c.label || c.category, amount: fmt(recurringMonthly(c)) + "/mo",
          }))}
        />
      )}

      {/* Dev cost — only ungrouped dev nodes */}
      {devUSD > 0 && (
        <Row icon="🔗" title="Dev Cost (ungrouped)" color="#0EA5E9" badge="manday"
          subtitle="Dev nodes not inside any group"
          primary={fmt(devUSD)} secondary={fmtAlt(devUSD)} items={[]}
        />
      )}

      {/* Year 1 payment summary */}
      <Year1Card
        monthlyAnnual={monthlyAnnual}
        yearlyPayment={yearlyPayment}
        onetimePayment={onetimePayment}
        fmt={fmt} fmtAlt={fmtAlt}
      />

      {/* Year 2+ recurring */}
      <Year2Card
        monthlyAnnual={monthlyAnnual}
        yearlyPayment={yearlyPayment}
        fmt={fmt} fmtAlt={fmtAlt}
      />
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function SummaryTab({ rate }: { rate: number }) {
  const {
    nodes, edges, billingModel,
    additionalCosts, subscriptions,
    sellingPriceUSD, setSellingPrice,
    year2SellingPriceUSD, setYear2SellingPrice,
    monthlyChargeUSD, setMonthlyCharge,
  } = useCanvasStore();

  const [currency,   setCurrency]   = useState<Currency>("thb");
  const [fullscreen, setFullscreen] = useState(false);
  const [grandOpen,  setGrandOpen]  = useState(true);

  const cost = calculateDiagramCost(nodes, edges, billingModel);

  const fmt    = (usd: number) => currency === "thb" ? fmtTHB(usd * rate) : fmtUSD(usd);
  const fmtAlt = (usd: number) => currency === "thb" ? fmtUSD(usd) : fmtTHB(usd * rate);

  // ── Dev nodes (ungrouped only — grouped devs belong to their group) ────────
  const devNodes = useMemo(() =>
    cost.perNode.filter(n => {
      if (!API_LINE_TYPES.has(n.serviceType)) return false;
      const nd = nodes.find(x => x.id === n.nodeId);
      return !nd?.parentId;
    }),
  [cost.perNode, nodes]);
  const devUSD = devNodes.reduce((s, n) => s + n.monthly, 0);

  // ── Groups ─────────────────────────────────────────────────────────────────
  const groupBreakdowns = useMemo(() => {
    const groupNodes = nodes.filter(n => n.type === "group");
    return groupNodes.map(g => {
      const services = cost.perNode.filter(n => {
        const nd = nodes.find(x => x.id === n.nodeId);
        return nd?.parentId === g.id;
      });
      const billingType: GroupBillingType = (g.data.config as any)?.billingType ?? "monthly";
      return {
        id: g.id, label: g.data.label as string, billingType,
        total: services.reduce((s, n) => s + n.monthly, 0), services,
      };
    }).filter(g => g.services.length > 0);
  }, [nodes, cost.perNode]);

  const onetimeGroups = groupBreakdowns.filter(g => g.billingType === "onetime");
  const yearlyGroups  = groupBreakdowns.filter(g => g.billingType === "yearly");
  const monthlyGroups = groupBreakdowns.filter(g => g.billingType === "monthly");

  // ── Ungrouped (non-dev AWS/custom nodes) ──────────────────────────────────
  const ungroupedNodes = useMemo(() =>
    cost.perNode.filter(n => {
      if (API_LINE_TYPES.has(n.serviceType)) return false;
      const nd = nodes.find(x => x.id === n.nodeId);
      return !nd?.parentId;
    }),
  [cost.perNode, nodes]);
  const ungroupedUSD = ungroupedNodes.reduce((s, n) => s + n.monthly, 0);

  // ── Cost buckets ───────────────────────────────────────────────────────────
  const addUSD         = additionalCosts.reduce((s, c) => s + recurringMonthly(c), 0);
  const oneTimeAdd     = additionalCosts.reduce((s, c) => s + oneTimeAmount(c), 0);
  const oneTimeSetup   = cost.setupCosts.reduce((s, c) => s + c.amountUSD, 0);

  // Subscriptions are REVENUE (billed to client), NOT costs
  const monthlySubsList = subscriptions.filter(s => s.billingPeriod === "monthly");
  const yearlySubsList  = subscriptions.filter(s => s.billingPeriod === "yearly");
  const monthlySubsUSD = monthlySubsList.reduce((sum, s) => sum + subMonthly(s), 0);
  const yearlySubsUSD  = yearlySubsList.reduce((sum, s) => sum + subYearlyUpfront(s), 0);
  // Total subscription revenue per year (monthly × 12 + yearly upfront)
  const subsRevenueAnnual = monthlySubsUSD * 12 + yearlySubsUSD;

  // ── COSTS: infra groups only (no subscriptions) ────────────────────────────
  // Monthly recurring = monthly infra groups + ungrouped AWS + additional costs
  const recurringUSD =
    monthlyGroups.reduce((s, g) => s + g.total, 0) +
    ungroupedUSD + cost.dataTransfer.monthly + addUSD;

  const monthlyAnnual  = recurringUSD * 12;
  // Yearly infra cost (e.g. yearly-billed cloud services) — subscriptions excluded
  const yearlyPayment  = yearlyGroups.reduce((s, g) => s + g.total * 12, 0);
  const onetimePayment =
    onetimeGroups.reduce((s, g) => s + g.total, 0) +
    devUSD + oneTimeAdd + oneTimeSetup;

  const year1Cost     = monthlyAnnual + yearlyPayment + onetimePayment;
  const year2PlusCost = monthlyAnnual + yearlyPayment;

  // ── REVENUE: project fee + MA + monthly billing + subscriptions ────────────
  // Year 1 = project fee + MA + monthly charge + subscription billing
  // Year 2+ = MA + monthly charge + subscription billing (no project fee)
  const y1Rev = sellingPriceUSD * 12 + year2SellingPriceUSD * 12 + monthlyChargeUSD * 12 + subsRevenueAnnual;
  const y2Rev = year2SellingPriceUSD * 12 + monthlyChargeUSD * 12 + subsRevenueAnnual;

  const isEmpty = groupBreakdowns.length === 0 && ungroupedNodes.length === 0 &&
    additionalCosts.length === 0 && subscriptions.length === 0 && devUSD === 0;

  // ── Fullscreen ─────────────────────────────────────────────────────────────
  if (fullscreen) {
    return (
      <div className="fixed inset-0 z-[9999] bg-white flex flex-col overflow-hidden">
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200 shrink-0 bg-white">
          <div className="flex items-center gap-4">
            <h1 className="text-base font-bold text-gray-900">Cost Summary — Presentation</h1>
            <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs font-medium">
              {(["thb", "usd"] as Currency[]).map(c => (
                <button key={c} onClick={() => setCurrency(c)}
                  className="px-3 py-1.5 transition-colors"
                  style={currency === c
                    ? { background: "#0891B2", color: "white" }
                    : { background: "white", color: "#64748B" }}>
                  {c === "thb" ? "฿ THB" : "$ USD"}
                </button>
              ))}
            </div>
          </div>
          <button onClick={() => setFullscreen(false)}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* 2-column body */}
        <div className="flex-1 overflow-hidden grid grid-cols-2 divide-x divide-gray-200">
          {/* Left — Cost */}
          <div className="overflow-y-auto px-6 py-5">
            <CostColumn
              groupBreakdowns={groupBreakdowns}
              ungroupedNodes={ungroupedNodes}
              ungroupedUSD={ungroupedUSD}
              devUSD={devUSD}
              additionalCosts={additionalCosts}
              monthlyAnnual={monthlyAnnual}
              yearlyPayment={yearlyPayment}
              onetimePayment={onetimePayment}
              addUSD={addUSD}
              nodes={nodes}
              fmt={fmt}
              fmtAlt={fmtAlt}
            />
          </div>

          {/* Right — Revenue & Profit */}
          <div className="overflow-y-auto px-6 py-5">
            <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 pb-3">
              Revenue & Profit — 3 Year View
            </div>
            <ThreeYearTable
              sellingPriceUSD={sellingPriceUSD}
              setSellingPrice={setSellingPrice}
              year2SellingPriceUSD={year2SellingPriceUSD}
              setYear2SellingPrice={setYear2SellingPrice}
              monthlyChargeUSD={monthlyChargeUSD}
              setMonthlyCharge={setMonthlyCharge}
              monthlySubsList={monthlySubsList}
              yearlySubsList={yearlySubsList}
              monthlySubsUSD={monthlySubsUSD}
              yearlySubsUSD={yearlySubsUSD}
              subsRevenueAnnual={subsRevenueAnnual}
              year1Cost={year1Cost}
              year2PlusCost={year2PlusCost}
              monthlyAnnual={monthlyAnnual}
              yearlyPayment={yearlyPayment}
              onetimePayment={onetimePayment}
              currency={currency}
              rate={rate}
              fmt={fmt}
              fmtAlt={fmtAlt}
            />
          </div>
        </div>
      </div>
    );
  }

  // ── Normal panel view ──────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full">

      {/* Controls */}
      <div className="px-4 pt-3 pb-2 border-b border-gray-100">
        <div className="flex gap-2 items-center">
          <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs font-medium flex-1">
            {(["thb", "usd"] as Currency[]).map(c => (
              <button key={c} onClick={() => setCurrency(c)}
                className="flex-1 py-1.5 transition-colors"
                style={currency === c
                  ? { background: "#0891B2", color: "white" }
                  : { background: "white", color: "#64748B" }}>
                {c === "thb" ? "฿ THB" : "$ USD"}
              </button>
            ))}
          </div>
          <button
            onClick={() => setFullscreen(true)}
            title="Fullscreen presentation"
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:text-blue-600 hover:border-blue-300 transition-colors shrink-0"
          >
            <Maximize2 size={14} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5">
        {isEmpty && (
          <div className="text-center text-gray-400 text-sm py-10">
            Drop services or add<br />costs to begin
          </div>
        )}

        {/* Groups */}
        {groupBreakdowns.map(g => {
          const bColor = BILLING_COLORS[g.billingType];
          const bLabel = BILLING_LABELS[g.billingType];
          const displayAmt = g.billingType === "onetime" ? g.total
            : g.billingType === "yearly" ? g.total * 12
            : g.total;
          const suffix = g.billingType === "onetime" ? "" : g.billingType === "yearly" ? "/yr" : "/mo";
          return (
            <Row key={g.id} icon="📦" title={g.label} color={bColor} badge={bLabel}
              subtitle={`${g.services.length} service${g.services.length !== 1 ? "s" : ""}`}
              primary={fmt(displayAmt) + suffix} secondary={fmtAlt(displayAmt) + suffix}
              items={g.services.map((n: any) => {
                const nd = nodes.find(x => x.id === n.nodeId);
                const desc = (nd?.data?.config as any)?.description;
                return { label: n.label, sublabel: desc || undefined, amount: fmt(n.monthly) + "/mo" };
              })}
            />
          );
        })}

        {/* Ungrouped */}
        {ungroupedNodes.length > 0 && (
          <Row icon="🔧" title="Ungrouped" color="#94A3B8"
            subtitle={`${ungroupedNodes.length} service${ungroupedNodes.length !== 1 ? "s" : ""}`}
            primary={fmt(ungroupedUSD) + "/mo"} secondary={fmtAlt(ungroupedUSD) + "/mo"}
            items={ungroupedNodes.map((n: any) => {
              const nd = nodes.find(x => x.id === n.nodeId);
              const desc = (nd?.data?.config as any)?.description;
              return { label: n.label, sublabel: desc || undefined, amount: fmt(n.monthly) + "/mo" };
            })}
          />
        )}

        {/* Additional costs */}
        {additionalCosts.filter(c => c.billingPeriod !== "one-time").length > 0 && (
          <Row icon="📋" title="Additional Costs" color="#0EA5E9"
            subtitle={`${additionalCosts.filter(c => c.billingPeriod !== "one-time").length} items`}
            primary={fmt(addUSD) + "/mo"} secondary={fmtAlt(addUSD) + "/mo"}
            items={additionalCosts.filter(c => c.billingPeriod !== "one-time").map(c => ({
              label: c.label || c.category, amount: fmt(recurringMonthly(c)) + "/mo",
            }))}
          />
        )}

        {/* Subscription revenue (billed to client) */}
        {(monthlySubsList.length > 0 || yearlySubsList.length > 0) && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 space-y-1">
            <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-wide mb-1">
              💰 Subscription Revenue (billed to client)
            </div>
            {yearlySubsList.map(s => (
              <div key={s.id} className="flex justify-between text-xs text-gray-600">
                <span className="flex-1 truncate">{s.service}{s.plan ? ` · ${s.plan}` : ""}</span>
                <span className="font-semibold text-emerald-600 ml-2">+{fmt(subYearlyUpfront(s))}/yr</span>
              </div>
            ))}
            {monthlySubsList.map(s => (
              <div key={s.id} className="flex justify-between text-xs text-gray-600">
                <span className="flex-1 truncate">{s.service}{s.plan ? ` · ${s.plan}` : ""}</span>
                <span className="font-semibold text-emerald-600 ml-2">+{fmt(subMonthly(s))}/mo</span>
              </div>
            ))}
            <div className="flex justify-between text-xs font-bold text-emerald-700 pt-1 border-t border-emerald-200">
              <span>Total /yr</span>
              <span>+{fmt(subsRevenueAnnual)}</span>
            </div>
          </div>
        )}

        {/* Ungrouped dev nodes */}
        {devUSD > 0 && (
          <Row icon="🔗" title="Dev Cost (ungrouped)" color="#0EA5E9" badge="manday"
            subtitle="Dev nodes not inside any group"
            primary={fmt(devUSD)} secondary={fmtAlt(devUSD)} items={[]}
          />
        )}

        {/* ── Year 1 payment card ──────────────────────────────────────────── */}
        {!isEmpty && (
          <Year1Card
            monthlyAnnual={monthlyAnnual}
            yearlyPayment={yearlyPayment}
            onetimePayment={onetimePayment}
            fmt={fmt} fmtAlt={fmtAlt}
          />
        )}

        {/* ── Year 2+ recurring card ───────────────────────────────────────── */}
        {!isEmpty && (
          <Year2Card
            monthlyAnnual={monthlyAnnual}
            yearlyPayment={yearlyPayment}
            fmt={fmt} fmtAlt={fmtAlt}
          />
        )}

        {/* ── Cost by Type (collapsible) ───────────────────────────────────── */}
        {!isEmpty && (
          <div className="rounded-xl bg-gray-800 text-white overflow-hidden">
            <button
              className="w-full flex items-center gap-2 px-4 py-3 hover:bg-white/5 transition-colors"
              onClick={() => setGrandOpen(v => !v)}
            >
              <div className="flex-1 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400">
                Cost by Type
              </div>
              {grandOpen
                ? <ChevronUp size={14} className="text-gray-500 shrink-0" />
                : <ChevronDown size={14} className="text-gray-500 shrink-0" />}
            </button>
            {grandOpen && (
              <div className="px-4 pb-3 space-y-1 border-t border-white/10 pt-2">
                {/* Monthly groups */}
                {monthlyGroups.map(g => (
                  <div key={g.id} className="flex items-center gap-2">
                    <span className="text-gray-400 text-xs flex-1 truncate">📦 {g.label}</span>
                    <span className="text-[9px] text-blue-400 shrink-0">monthly</span>
                    <span className="text-xs font-semibold text-blue-300 shrink-0">{fmt(g.total)}/mo</span>
                  </div>
                ))}
                {(ungroupedUSD > 0 || addUSD > 0) && (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400 text-xs flex-1 truncate">Other recurring</span>
                    <span className="text-xs font-semibold text-blue-300 shrink-0">
                      {fmt(ungroupedUSD + addUSD + cost.dataTransfer.monthly)}/mo
                    </span>
                  </div>
                )}
                {recurringUSD > 0 && (
                  <div className="flex items-center gap-2 border-t border-white/10 pt-1">
                    <span className="text-gray-300 text-xs font-semibold flex-1">Infra recurring /mo</span>
                    <span className="text-sm font-bold text-orange-300">{fmt(recurringUSD)}</span>
                  </div>
                )}
                {/* Yearly infra groups only (subscriptions are revenue) */}
                {yearlyGroups.length > 0 && (
                  <div className="border-t border-white/10 pt-1">
                    {yearlyGroups.map(g => (
                      <div key={g.id} className="flex items-center gap-2 mb-1">
                        <span className="text-gray-400 text-xs flex-1 truncate">📦 {g.label}</span>
                        <span className="text-[9px] text-indigo-400 shrink-0">yearly</span>
                        <span className="text-xs font-semibold text-indigo-300 shrink-0">{fmt(g.total * 12)}/yr</span>
                      </div>
                    ))}
                    <div className="flex items-center gap-2">
                      <span className="text-gray-300 text-xs font-semibold flex-1">Yearly infra total</span>
                      <span className="text-sm font-bold text-indigo-300">{fmt(yearlyPayment)}/yr</span>
                    </div>
                  </div>
                )}
                {/* One-time groups */}
                {onetimeGroups.length > 0 && (
                  <div className="border-t border-white/10 pt-1 space-y-1">
                    {onetimeGroups.map(g => (
                      <div key={g.id} className="flex items-center gap-2">
                        <span className="text-gray-400 text-xs flex-1 truncate">📦 {g.label}</span>
                        <span className="text-[9px] text-amber-400 shrink-0">one-time</span>
                        <span className="text-xs font-semibold text-amber-300 shrink-0">{fmt(g.total)}</span>
                      </div>
                    ))}
                    {devUSD > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400 text-xs flex-1 truncate">🔗 Dev (ungrouped)</span>
                        <span className="text-xs font-semibold text-amber-300 shrink-0">{fmt(devUSD)}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <span className="text-gray-300 text-xs font-semibold flex-1">One-time total</span>
                      <span className="text-sm font-bold text-amber-300">{fmt(onetimePayment)}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Revenue & Profit (panel compact) ────────────────────────────── */}
        <div className="rounded-xl border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 px-3 py-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wider flex items-center justify-between">
            <span>Revenue & Profit</span>
            <button onClick={() => setFullscreen(true)}
              className="text-[9px] text-blue-500 hover:text-blue-700 font-semibold flex items-center gap-1">
              <Maximize2 size={10} /> Full 3-yr view
            </button>
          </div>
          <div className="px-3 py-3 space-y-3">

            {/* Year 1 project fee */}
            <label className="text-xs text-gray-600 font-medium flex flex-col gap-1">
              {currency === "thb" ? "Project fee — Year 1 only (THB)" : "Project fee — Year 1 only (USD)"}
              <div className="flex items-center gap-1.5">
                <span className="text-sm text-gray-400">{currency === "thb" ? "฿" : "$"}</span>
                <input
                  type="number" min={0} step={1000}
                  className="flex-1 border rounded px-2 py-1.5 text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-blue-400"
                  value={sellingPriceUSD > 0
                    ? (currency === "thb"
                        ? Math.round(sellingPriceUSD * 12 * rate)
                        : +(sellingPriceUSD * 12).toFixed(2))
                    : ""}
                  placeholder="0"
                  onChange={e => {
                    const val = Number(e.target.value);
                    setSellingPrice(currency === "thb" ? val / rate / 12 : val / 12);
                  }}
                />
                <span className="text-xs text-gray-400">/yr</span>
              </div>
            </label>

            {/* MA / support revenue — all years */}
            <label className="text-xs text-gray-600 font-medium flex flex-col gap-1">
              {currency === "thb" ? "MA / support revenue /yr (THB)" : "MA / support revenue /yr (USD)"}
              <div className="flex items-center gap-1.5">
                <span className="text-sm text-gray-400">{currency === "thb" ? "฿" : "$"}</span>
                <input
                  type="number" min={0} step={1000}
                  className="flex-1 border rounded px-2 py-1.5 text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-400"
                  value={year2SellingPriceUSD > 0
                    ? (currency === "thb"
                        ? Math.round(year2SellingPriceUSD * 12 * rate)
                        : +(year2SellingPriceUSD * 12).toFixed(2))
                    : ""}
                  placeholder="0 (uses Year 1 price)"
                  onChange={e => {
                    const val = Number(e.target.value);
                    setYear2SellingPrice(currency === "thb" ? val / rate / 12 : val / 12);
                  }}
                />
                <span className="text-xs text-gray-400">/yr</span>
              </div>
              <div className="text-[10px] text-gray-400">Revenue you receive from client (MA, support contract, etc.)</div>
            </label>

            {/* Monthly service charge */}
            <label className="text-xs text-gray-600 font-medium flex flex-col gap-1">
              {currency === "thb" ? "Monthly service charge /mo (THB)" : "Monthly service charge /mo (USD)"}
              <div className="flex items-center gap-1.5">
                <span className="text-sm text-gray-400">{currency === "thb" ? "฿" : "$"}</span>
                <input
                  type="number" min={0} step={100}
                  className="flex-1 border rounded px-2 py-1.5 text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-green-400"
                  value={monthlyChargeUSD > 0
                    ? (currency === "thb"
                        ? Math.round(monthlyChargeUSD * rate)
                        : +monthlyChargeUSD.toFixed(2))
                    : ""}
                  placeholder="0"
                  onChange={e => {
                    const val = Number(e.target.value);
                    setMonthlyCharge(currency === "thb" ? val / rate : val);
                  }}
                />
                <span className="text-xs text-gray-400">/mo</span>
              </div>
              <div className="text-[10px] text-gray-400">Monthly billing to client (all years)</div>
            </label>

            {(y1Rev > 0 || y2Rev > 0) && (
              <div className="space-y-2 pt-1 border-t border-gray-100">
                {[
                  {
                    label: "📅 Year 1", cost: year1Cost, revenue: y1Rev, isYear1: true,
                    hint: "fee + subs + MA + monthly",
                    border: "#BFDBFE", bg: "#EFF6FF", hbg: "#DBEAFE", lc: "#1D4ED8",
                  },
                  {
                    label: "📈 Year 2+", cost: year2PlusCost, revenue: y2Rev, isYear1: false,
                    hint: "subs + MA + monthly",
                    border: "#BBF7D0", bg: "#F0FDF4", hbg: "#DCFCE7", lc: "#15803D",
                  },
                ].map((yr, i) => {
                  const profit = yr.revenue - yr.cost;
                  const margin = yr.revenue > 0 ? (profit / yr.revenue) * 100 : 0;
                  const isPos  = profit >= 0;
                  return (
                    <div key={i} className="rounded-xl border-2 overflow-hidden" style={{ borderColor: yr.border, background: yr.bg }}>
                      <div className="px-3 py-1.5 flex justify-between" style={{ background: yr.hbg }}>
                        <span className="text-[10px] font-bold" style={{ color: yr.lc }}>{yr.label}</span>
                        <span className="text-[9px]" style={{ color: yr.lc + "99" }}>{yr.hint}</span>
                      </div>
                      <div className="px-3 py-2 space-y-1">
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>Revenue /yr</span><span className="font-medium">{fmt(yr.revenue)}</span>
                        </div>
                        {/* Revenue breakdown */}
                        {yr.isYear1 && sellingPriceUSD > 0 && (
                          <div className="flex justify-between text-[10px] text-gray-400">
                            <span>↳ Project fee</span><span className="text-amber-500">+{fmt(sellingPriceUSD * 12)}</span>
                          </div>
                        )}
                        {subsRevenueAnnual > 0 && (
                          <div className="flex justify-between text-[10px] text-gray-400">
                            <span>↳ Subscriptions</span><span className="text-emerald-500">+{fmt(subsRevenueAnnual)}</span>
                          </div>
                        )}
                        {year2SellingPriceUSD > 0 && (
                          <div className="flex justify-between text-[10px] text-gray-400">
                            <span>↳ MA /yr</span><span className="text-indigo-500">+{fmt(year2SellingPriceUSD * 12)}</span>
                          </div>
                        )}
                        {monthlyChargeUSD > 0 && (
                          <div className="flex justify-between text-[10px] text-gray-400">
                            <span>↳ Monthly × 12</span><span className="text-green-500">+{fmt(monthlyChargeUSD * 12)}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-xs text-gray-500 border-t pt-1" style={{ borderColor: yr.border }}>
                          <span>Cost /yr</span><span>–{fmt(yr.cost)}</span>
                        </div>
                        <div className="flex justify-between items-center border-t pt-1" style={{ borderColor: yr.border }}>
                          <span className="text-sm font-bold" style={{ color: yr.lc }}>Profit</span>
                          <span className={`text-base font-bold ${isPos ? "text-green-600" : "text-red-500"}`}>
                            {isPos ? "+" : ""}{fmt(profit)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: yr.hbg }}>
                            <div className="h-full rounded-full" style={{
                              width: `${Math.min(100, Math.abs(margin))}%`,
                              background: isPos ? "#22C55E" : "#EF4444",
                            }} />
                          </div>
                          <span className={`text-xs font-bold w-12 text-right ${isPos ? "text-green-600" : "text-red-500"}`}>
                            {margin.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
