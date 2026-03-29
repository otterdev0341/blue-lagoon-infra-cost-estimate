import { useState, useMemo } from "react";
import { ChevronDown, ChevronUp, Maximize2, X } from "lucide-react";
import { useCanvasStore } from "../../store/canvasStore.ts";
import { calculateDiagramCost } from "../../lib/costEngine.ts";
import { fmtTHB, fmtUSD } from "../../lib/utils.ts";
import { subMonthly } from "./SubscribeTab.tsx";
import type { AdditionalCostItem, GroupBillingType } from "../../types.ts";

type Currency = "thb" | "usd";

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

// ── Collapsible row ─────────────────────────────────────────────────────────

interface RowProps {
  icon: string;
  title: string;
  subtitle: string;
  primary: string;
  secondary?: string;
  color: string;
  badge?: string;
  items?: { label: string; amount: string }[];
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
      </button>
      {open && canExpand && (
        <div className="border-t px-3 py-2 space-y-1 bg-white" style={{ borderColor: color + "25" }}>
          {items!.map((it, i) => (
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

// ── Year 1 payment card ─────────────────────────────────────────────────────

interface Year1CardProps {
  monthlyAnnual:  number;   // recurringUSD × 12
  yearlyPayment:  number;   // yearly groups × 12
  onetimePayment: number;   // onetime groups + dev + one-time add
  fmt: (usd: number) => string;
  fmtAlt: (usd: number) => string;
}
function Year1Card({ monthlyAnnual, yearlyPayment, onetimePayment, fmt, fmtAlt }: Year1CardProps) {
  const total = monthlyAnnual + yearlyPayment + onetimePayment;
  return (
    <div className="rounded-xl overflow-hidden" style={{ background: "#0F172A" }}>
      <div className="px-4 pt-3 pb-1">
        <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
          📅 Year 1 — Total to Pay
        </div>
        {monthlyAnnual > 0 && (
          <div className="flex justify-between items-center py-1 border-b border-white/5">
            <span className="text-xs text-slate-400">Monthly recurring × 12</span>
            <span className="text-xs font-semibold text-blue-300">{fmt(monthlyAnnual)}</span>
          </div>
        )}
        {yearlyPayment > 0 && (
          <div className="flex justify-between items-center py-1 border-b border-white/5">
            <span className="text-xs text-slate-400">Yearly payments</span>
            <span className="text-xs font-semibold text-indigo-300">{fmt(yearlyPayment)}</span>
          </div>
        )}
        {onetimePayment > 0 && (
          <div className="flex justify-between items-center py-1 border-b border-white/5">
            <span className="text-xs text-slate-400">One-time setup</span>
            <span className="text-xs font-semibold text-amber-300">{fmt(onetimePayment)}</span>
          </div>
        )}
      </div>
      <div className="px-4 py-3 flex justify-between items-center" style={{ background: "#1E293B" }}>
        <span className="text-sm font-bold text-white">Year 1 Total</span>
        <div className="text-right">
          <div className="text-xl font-bold text-white">{fmt(total)}</div>
          <div className="text-[10px] text-slate-400">{fmtAlt(total)}</div>
        </div>
      </div>
    </div>
  );
}

// ── 3-year profit column (fullscreen) ───────────────────────────────────────

interface ThreeYearProps {
  sellingPriceUSD:  number;
  setSellingPrice:  (v: number) => void;
  year1Cost:        number;
  year2PlusCost:    number;
  currency:         Currency;
  rate:             number;
  fmt:              (usd: number) => string;
  fmtAlt:           (usd: number) => string;
}
function ThreeYearTable({
  sellingPriceUSD, setSellingPrice,
  year1Cost, year2PlusCost,
  currency, rate, fmt, fmtAlt,
}: ThreeYearProps) {
  const annualRevenue = sellingPriceUSD * 12;
  const years = [
    { label: "Year 1", hint: "incl. one-time",  cost: year1Cost },
    { label: "Year 2", hint: "recurring only",   cost: year2PlusCost },
    { label: "Year 3", hint: "recurring only",   cost: year2PlusCost },
  ];
  return (
    <div className="space-y-6">
      {/* Selling price input */}
      <div>
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Selling Price to Client</div>
        <div className="flex items-center gap-2">
          <span className="text-lg text-gray-400">{currency === "thb" ? "฿" : "$"}</span>
          <input
            type="number" min={0} step={1000}
            className="flex-1 border-2 border-gray-200 rounded-xl px-4 py-2.5 text-xl font-bold focus:outline-none focus:border-blue-400"
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
          <span className="text-sm text-gray-400 whitespace-nowrap">/yr</span>
        </div>
        {annualRevenue > 0 && (
          <div className="text-xs text-gray-400 mt-1 ml-7">{fmtAlt(annualRevenue)} annually</div>
        )}
      </div>

      {/* 3-year grid */}
      <div className="grid grid-cols-3 gap-4">
        {years.map((yr, i) => {
          const profit = annualRevenue - yr.cost;
          const margin = annualRevenue > 0 ? (profit / annualRevenue) * 100 : 0;
          const isPos  = profit >= 0;
          const borderColor = i === 0 ? "#BFDBFE" : "#BBF7D0";
          const bgColor     = i === 0 ? "#EFF6FF" : "#F0FDF4";
          const headerBg    = i === 0 ? "#DBEAFE" : "#DCFCE7";
          const labelColor  = i === 0 ? "#1D4ED8" : "#15803D";
          return (
            <div key={i} className="rounded-2xl border-2 overflow-hidden flex flex-col"
              style={{ borderColor, background: bgColor }}>
              {/* Header */}
              <div className="px-4 py-2.5 flex justify-between items-center"
                style={{ background: headerBg }}>
                <span className="text-sm font-bold" style={{ color: labelColor }}>{yr.label}</span>
                <span className="text-[10px]" style={{ color: labelColor + "99" }}>{yr.hint}</span>
              </div>
              {/* Body */}
              <div className="px-4 py-3 flex-1 space-y-2">
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Revenue /yr</span>
                  <span className="font-medium text-gray-700">{annualRevenue > 0 ? fmt(annualRevenue) : "—"}</span>
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Cost /yr</span>
                  <span className="font-medium text-red-400">–{fmt(yr.cost)}</span>
                </div>
                <div className="border-t pt-2" style={{ borderColor }}>
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs font-semibold" style={{ color: labelColor }}>Profit</span>
                    <span className={`text-base font-bold ${isPos ? "text-green-600" : "text-red-500"}`}>
                      {isPos ? "+" : ""}{annualRevenue > 0 ? fmt(profit) : "—"}
                    </span>
                  </div>
                  {annualRevenue > 0 && (
                    <>
                      <div className="flex items-center gap-2 mt-1.5">
                        <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: headerBg }}>
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

      {/* Cost reference */}
      <div className="rounded-xl bg-gray-50 border border-gray-200 p-4 text-xs text-gray-500 space-y-1">
        <div className="font-semibold text-gray-600 mb-1.5">Cost reference</div>
        <div className="flex justify-between">
          <span>Year 1 cost (incl. one-time)</span>
          <span className="font-medium text-gray-700">{fmt(year1Cost)}</span>
        </div>
        <div className="flex justify-between">
          <span>Year 2+ cost (recurring)</span>
          <span className="font-medium text-gray-700">{fmt(year2PlusCost)}</span>
        </div>
      </div>
    </div>
  );
}

// ── Cost breakdown column (fullscreen left) ─────────────────────────────────

interface CostColumnProps {
  groupBreakdowns: { id: string; label: string; billingType: GroupBillingType; total: number; services: any[] }[];
  ungroupedNodes:  any[];
  ungroupedUSD:    number;
  addUSD:          number;
  subsUSD:         number;
  devUSD:          number;
  additionalCosts: AdditionalCostItem[];
  subscriptions:   any[];
  monthlyAnnual:   number;
  yearlyPayment:   number;
  onetimePayment:  number;
  fmt:  (usd: number) => string;
  fmtAlt: (usd: number) => string;
  periodLabel: string;
  f: number;
}
function CostColumn({
  groupBreakdowns, ungroupedNodes, ungroupedUSD,
  addUSD, subsUSD, devUSD,
  additionalCosts, subscriptions,
  monthlyAnnual, yearlyPayment, onetimePayment,
  fmt, fmtAlt, periodLabel, f,
}: CostColumnProps) {
  return (
    <div className="space-y-3">
      <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 pb-1">Cost Breakdown</div>

      {groupBreakdowns.map(g => {
        const bColor = BILLING_COLORS[g.billingType];
        const bLabel = BILLING_LABELS[g.billingType];
        const displayAmt = g.billingType === "onetime" ? g.total : g.billingType === "yearly" ? g.total * 12 : g.total * f;
        const suffix = g.billingType === "onetime" ? "" : g.billingType === "yearly" ? "/yr" : `/${periodLabel}`;
        return (
          <Row key={g.id} icon="📦" title={g.label} color={bColor} badge={bLabel}
            subtitle={`${g.services.length} service${g.services.length !== 1 ? "s" : ""}`}
            primary={fmt(displayAmt) + suffix} secondary={fmtAlt(displayAmt) + suffix}
            items={g.services.map((n: any) => ({ label: n.label, amount: fmt(n.monthly * f) }))}
          />
        );
      })}

      {ungroupedNodes.length > 0 && (
        <Row icon="🔧" title="Ungrouped" color="#94A3B8"
          subtitle={`${ungroupedNodes.length} service${ungroupedNodes.length !== 1 ? "s" : ""}`}
          primary={fmt(ungroupedUSD * f)} secondary={fmtAlt(ungroupedUSD * f)}
          items={ungroupedNodes.map((n: any) => ({ label: n.label, amount: fmt(n.monthly * f) }))}
        />
      )}

      {additionalCosts.filter(c => c.billingPeriod !== "one-time").length > 0 && (
        <Row icon="📋" title="Additional Costs" color="#0EA5E9"
          subtitle={`${additionalCosts.filter(c => c.billingPeriod !== "one-time").length} items`}
          primary={fmt(addUSD * f)} secondary={fmtAlt(addUSD * f)}
          items={additionalCosts.filter(c => c.billingPeriod !== "one-time").map(c => ({
            label: c.label || c.category, amount: fmt(recurringMonthly(c) * f),
          }))}
        />
      )}

      {subscriptions.length > 0 && (
        <Row icon="🔄" title="Subscriptions" color="#6366F1"
          subtitle={subscriptions.map((s: any) => s.service).join(", ")}
          primary={fmt(subsUSD * f)} secondary={fmtAlt(subsUSD * f)}
          items={subscriptions.map((s: any) => ({
            label: `${s.service}${s.plan ? ` · ${s.plan}` : ""}`,
            amount: fmt(subMonthly(s) * f),
          }))}
        />
      )}

      {devUSD > 0 && (
        <Row icon="🔗" title="Dev Cost" color="#0EA5E9" badge="manday"
          subtitle="Ungrouped API & LINE nodes"
          primary={fmt(devUSD)} secondary={fmtAlt(devUSD)} items={[]}
        />
      )}

      <Year1Card
        monthlyAnnual={monthlyAnnual}
        yearlyPayment={yearlyPayment}
        onetimePayment={onetimePayment}
        fmt={fmt} fmtAlt={fmtAlt}
      />
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────────

export function SummaryTab({ rate }: { rate: number }) {
  const {
    nodes, edges, billingModel,
    additionalCosts, subscriptions,
    sellingPriceUSD, setSellingPrice,
  } = useCanvasStore();

  const [currency,    setCurrency]    = useState<Currency>("thb");
  const [fullscreen,  setFullscreen]  = useState(false);
  const [grandOpen,   setGrandOpen]   = useState(true);

  const cost = calculateDiagramCost(nodes, edges, billingModel);

  const fmt    = (usd: number) => currency === "thb" ? fmtTHB(usd * rate) : fmtUSD(usd);
  const fmtAlt = (usd: number) => currency === "thb" ? fmtUSD(usd) : fmtTHB(usd * rate);

  // ── Dev nodes (ungrouped only) ────────────────────────────────────────────
  const devNodes = cost.perNode.filter(n => {
    if (!API_LINE_TYPES.has(n.serviceType)) return false;
    const nd = nodes.find(x => x.id === n.nodeId);
    return !nd?.parentId;
  });
  const devUSD = devNodes.reduce((s, n) => s + n.monthly, 0);

  // ── Groups ────────────────────────────────────────────────────────────────
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

  // ── Ungrouped (non-dev) ───────────────────────────────────────────────────
  const ungroupedNodes = useMemo(() =>
    cost.perNode.filter(n => {
      if (API_LINE_TYPES.has(n.serviceType)) return false;
      const nd = nodes.find(x => x.id === n.nodeId);
      return !nd?.parentId;
    }),
  [cost.perNode, nodes]);
  const ungroupedUSD = ungroupedNodes.reduce((s, n) => s + n.monthly, 0);

  // ── Costs ─────────────────────────────────────────────────────────────────
  const addUSD     = additionalCosts.reduce((s, c) => s + recurringMonthly(c), 0);
  const subsUSD    = subscriptions.reduce((s, sub) => s + subMonthly(sub), 0);
  const oneTimeAdd = additionalCosts.reduce((s, c) => s + oneTimeAmount(c), 0);
  const oneTimeSetupGroups = cost.setupCosts.reduce((s, c) => s + c.amountUSD, 0);

  // recurringUSD = everything truly monthly (monthly groups + ungrouped + add + subs)
  const recurringUSD =
    monthlyGroups.reduce((s, g) => s + g.total, 0) +
    ungroupedUSD + cost.dataTransfer.monthly + addUSD + subsUSD;

  // Year 1 payment buckets
  const monthlyAnnual  = recurringUSD * 12;
  const yearlyPayment  = yearlyGroups.reduce((s, g) => s + g.total * 12, 0);
  const onetimePayment =
    onetimeGroups.reduce((s, g) => s + g.total, 0) +
    devUSD + oneTimeAdd + oneTimeSetupGroups;

  const year1Cost     = monthlyAnnual + yearlyPayment + onetimePayment;
  const year2PlusCost = monthlyAnnual + yearlyPayment;

  const isEmpty = groupBreakdowns.length === 0 && ungroupedNodes.length === 0 &&
    additionalCosts.length === 0 && subscriptions.length === 0 && devUSD === 0;

  // ── Fullscreen view ───────────────────────────────────────────────────────
  if (fullscreen) {
    return (
      <div className="fixed inset-0 z-[9999] bg-white flex flex-col overflow-hidden">
        {/* Topbar */}
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
              addUSD={addUSD}
              subsUSD={subsUSD}
              devUSD={devUSD}
              additionalCosts={additionalCosts}
              subscriptions={subscriptions}
              monthlyAnnual={monthlyAnnual}
              yearlyPayment={yearlyPayment}
              onetimePayment={onetimePayment}
              fmt={fmt}
              fmtAlt={fmtAlt}
              periodLabel="mo"
              f={1}
            />
          </div>

          {/* Right — Revenue */}
          <div className="overflow-y-auto px-6 py-5">
            <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 pb-3">Revenue & Profit (3-Year)</div>
            <ThreeYearTable
              sellingPriceUSD={sellingPriceUSD}
              setSellingPrice={setSellingPrice}
              year1Cost={year1Cost}
              year2PlusCost={year2PlusCost}
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

  // ── Normal panel view ─────────────────────────────────────────────────────
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
          const displayAmt = g.billingType === "onetime" ? g.total : g.billingType === "yearly" ? g.total * 12 : g.total;
          const suffix = g.billingType === "onetime" ? "" : g.billingType === "yearly" ? "/yr" : "/mo";
          return (
            <Row key={g.id} icon="📦" title={g.label} color={bColor} badge={bLabel}
              subtitle={`${g.services.length} service${g.services.length !== 1 ? "s" : ""}`}
              primary={fmt(displayAmt) + suffix} secondary={fmtAlt(displayAmt) + suffix}
              items={g.services.map((n: any) => ({ label: n.label, amount: fmt(n.monthly) + "/mo" }))}
            />
          );
        })}

        {/* Ungrouped */}
        {ungroupedNodes.length > 0 && (
          <Row icon="🔧" title="Ungrouped" color="#94A3B8"
            subtitle={`${ungroupedNodes.length} service${ungroupedNodes.length !== 1 ? "s" : ""}`}
            primary={fmt(ungroupedUSD) + "/mo"} secondary={fmtAlt(ungroupedUSD) + "/mo"}
            items={ungroupedNodes.map((n: any) => ({ label: n.label, amount: fmt(n.monthly) + "/mo" }))}
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

        {/* Subscriptions */}
        {subscriptions.length > 0 && (
          <Row icon="🔄" title="Subscriptions" color="#6366F1"
            subtitle={subscriptions.map((s: any) => s.service).join(", ")}
            primary={fmt(subsUSD) + "/mo"} secondary={fmtAlt(subsUSD) + "/mo"}
            items={subscriptions.map((s: any) => ({
              label: `${s.service}${s.plan ? ` · ${s.plan}` : ""}`,
              amount: fmt(subMonthly(s)) + "/mo",
            }))}
          />
        )}

        {/* Dev cost (ungrouped only) */}
        {devUSD > 0 && (
          <Row icon="🔗" title="Dev Cost" color="#0EA5E9" badge="manday"
            subtitle="Ungrouped API & LINE nodes"
            primary={fmt(devUSD)} secondary={fmtAlt(devUSD)} items={[]}
          />
        )}

        {/* ── Year 1 card ───────────────────────────────────────────────── */}
        {!isEmpty && (
          <Year1Card
            monthlyAnnual={monthlyAnnual}
            yearlyPayment={yearlyPayment}
            onetimePayment={onetimePayment}
            fmt={fmt} fmtAlt={fmtAlt}
          />
        )}

        {/* ── Grand Total (collapsible) ─────────────────────────────────── */}
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
                {monthlyGroups.map(g => (
                  <div key={g.id} className="flex items-center gap-2">
                    <span className="text-gray-400 text-xs flex-1 truncate">📦 {g.label}</span>
                    <span className="text-[9px] text-blue-400 shrink-0">monthly</span>
                    <span className="text-xs font-semibold text-blue-300 shrink-0">{fmt(g.total)}/mo</span>
                  </div>
                ))}
                {(ungroupedUSD > 0 || addUSD > 0 || subsUSD > 0) && (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400 text-xs flex-1 truncate">Other recurring</span>
                    <span className="text-xs font-semibold text-blue-300 shrink-0">{fmt(recurringUSD - monthlyGroups.reduce((s,g)=>s+g.total,0))}/mo</span>
                  </div>
                )}
                {recurringUSD > 0 && (
                  <div className="flex items-center gap-2 border-t border-white/10 pt-1">
                    <span className="text-gray-300 text-xs font-semibold flex-1">Recurring /mo</span>
                    <span className="text-sm font-bold text-orange-300">{fmt(recurringUSD)}</span>
                  </div>
                )}
                {yearlyGroups.length > 0 && (
                  <>
                    <div className="border-t border-white/10 pt-1">
                      {yearlyGroups.map(g => (
                        <div key={g.id} className="flex items-center gap-2 mb-1">
                          <span className="text-gray-400 text-xs flex-1 truncate">📦 {g.label}</span>
                          <span className="text-[9px] text-indigo-400 shrink-0">yearly</span>
                          <span className="text-xs font-semibold text-indigo-300 shrink-0">{fmt(g.total * 12)}/yr</span>
                        </div>
                      ))}
                      <div className="flex items-center gap-2">
                        <span className="text-gray-300 text-xs font-semibold flex-1">Yearly total</span>
                        <span className="text-sm font-bold text-indigo-300">{fmt(yearlyPayment)}/yr</span>
                      </div>
                    </div>
                  </>
                )}
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
                        <span className="text-gray-400 text-xs flex-1 truncate">🔗 Dev cost</span>
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

        {/* ── Revenue & Profit (panel compact) ─────────────────────────── */}
        <div className="rounded-xl border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 px-3 py-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wider flex items-center justify-between">
            <span>Revenue & Profit</span>
            <button onClick={() => setFullscreen(true)}
              className="text-[9px] text-blue-500 hover:text-blue-700 font-semibold flex items-center gap-1">
              <Maximize2 size={10} /> Full view
            </button>
          </div>
          <div className="px-3 py-3 space-y-3">
            <label className="text-xs text-gray-600 font-medium flex flex-col gap-1">
              {currency === "thb" ? "Selling price /yr (THB)" : "Selling price /yr (USD)"}
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

            {sellingPriceUSD > 0 && (
              <div className="space-y-2 pt-1 border-t border-gray-100">
                {[
                  { label: "📅 Year 1", cost: year1Cost, hint: "incl. one-time", border: "#BFDBFE", bg: "#EFF6FF", hbg: "#DBEAFE", lc: "#1D4ED8" },
                  { label: "📈 Year 2+", cost: year2PlusCost, hint: "recurring", border: "#BBF7D0", bg: "#F0FDF4", hbg: "#DCFCE7", lc: "#15803D" },
                ].map((yr, i) => {
                  const annualRevenue = sellingPriceUSD * 12;
                  const profit = annualRevenue - yr.cost;
                  const margin = annualRevenue > 0 ? (profit / annualRevenue) * 100 : 0;
                  const isPos  = profit >= 0;
                  return (
                    <div key={i} className="rounded-xl border-2 overflow-hidden" style={{ borderColor: yr.border, background: yr.bg }}>
                      <div className="px-3 py-1.5 flex justify-between" style={{ background: yr.hbg }}>
                        <span className="text-[10px] font-bold" style={{ color: yr.lc }}>{yr.label}</span>
                        <span className="text-[9px]" style={{ color: yr.lc + "99" }}>{yr.hint}</span>
                      </div>
                      <div className="px-3 py-2 space-y-1">
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>Revenue /yr</span><span>{fmt(annualRevenue)}</span>
                        </div>
                        <div className="flex justify-between text-xs text-gray-500">
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
