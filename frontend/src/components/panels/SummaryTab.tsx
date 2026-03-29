import { useState, useMemo } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useCanvasStore } from "../../store/canvasStore.ts";
import { calculateDiagramCost } from "../../lib/costEngine.ts";
import { fmtTHB, fmtUSD } from "../../lib/utils.ts";
import { subMonthly } from "./SubscribeTab.tsx";
import type { AdditionalCostItem, GroupBillingType } from "../../types.ts";

type Period   = "monthly" | "yearly";
type Currency = "thb" | "usd";

function periodFactor(p: Period): number { return p === "yearly" ? 12 : 1; }

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

// ── Grand total card (extracted to avoid IIFE useState) ─────────────────────

interface GrandTotalProps {
  groups:          { id: string; label: string; total: number; billingType: GroupBillingType }[];
  ungroupedUSD:    number;
  dataTransferUSD: number;
  addUSD:          number;
  subsUSD:         number;
  devUSD:          number;
  oneTimeTotal:    number;
  f:               number;
  periodLabel:     string;
  fmt:             (usd: number) => string;
  fmtAlt:          (usd: number) => string;
}

function GrandTotalCard({
  groups, ungroupedUSD, dataTransferUSD, addUSD, subsUSD, devUSD, oneTimeTotal,
  f, periodLabel, fmt, fmtAlt,
}: GrandTotalProps) {
  const [open, setOpen] = useState(true);

  const recurringGroups = groups.filter(g => g.billingType === "monthly");
  const yearlyGroups    = groups.filter(g => g.billingType === "yearly");
  const onetimeGroups   = groups.filter(g => g.billingType === "onetime");

  // Recurring total: monthly groups + ungrouped + data transfer + additional + subs
  const recurringUSD =
    recurringGroups.reduce((s, g) => s + g.total, 0) +
    ungroupedUSD + dataTransferUSD + addUSD + subsUSD;
  // Yearly groups: full cost per year (not amortised)
  const yearlyGroupsUSD = yearlyGroups.reduce((s, g) => s + g.total * 12, 0);
  // One-time: onetime groups + dev + legacy one-time
  const onetimeTotal = onetimeGroups.reduce((s, g) => s + g.total, 0) + devUSD + oneTimeTotal;

  // Display total per period: recurring*f + (yearly shown as /yr always) + onetime (flat)
  const recurringDisplay = recurringUSD * f;

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
              {fmt(recurringDisplay)}
            </div>
          )}
        </div>
        {open
          ? <ChevronUp   size={14} className="text-gray-500 shrink-0" />
          : <ChevronDown size={14} className="text-gray-500 shrink-0" />}
      </button>

      {open && (
        <div className="px-4 pb-3 space-y-1.5 border-t border-white/10 pt-2">

          {/* Monthly groups */}
          {recurringGroups.map(g => (
            <div key={g.id} className="flex items-center gap-2">
              <span className="text-gray-400 text-xs min-w-0 flex-1 truncate">📦 {g.label}</span>
              <span className="text-[9px] text-blue-400 shrink-0">monthly</span>
              <span className="font-semibold text-blue-300 text-xs shrink-0 whitespace-nowrap">
                {fmt(g.total * f)}
              </span>
            </div>
          ))}
          {ungroupedUSD > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-xs min-w-0 flex-1 truncate">🔧 Ungrouped</span>
              <span className="text-[9px] text-blue-400 shrink-0">monthly</span>
              <span className="font-semibold text-blue-300 text-xs shrink-0 whitespace-nowrap">
                {fmt(ungroupedUSD * f)}
              </span>
            </div>
          )}
          {addUSD > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-xs min-w-0 flex-1 truncate">📋 Additional</span>
              <span className="font-semibold text-blue-300 text-xs shrink-0 whitespace-nowrap">
                {fmt(addUSD * f)}
              </span>
            </div>
          )}
          {subsUSD > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-xs min-w-0 flex-1 truncate">🔄 Subscriptions</span>
              <span className="font-semibold text-blue-300 text-xs shrink-0 whitespace-nowrap">
                {fmt(subsUSD * f)}
              </span>
            </div>
          )}

          {/* Recurring subtotal */}
          {(recurringGroups.length > 0 || ungroupedUSD > 0 || addUSD > 0 || subsUSD > 0) && (
            <div className="flex items-center gap-2 border-t border-white/10 pt-1.5">
              <span className="text-gray-300 text-xs font-semibold flex-1">Recurring /{periodLabel}</span>
              <span className="font-bold text-orange-300 text-sm shrink-0 whitespace-nowrap">
                {fmt(recurringDisplay)}
              </span>
            </div>
          )}

          {/* Yearly groups */}
          {yearlyGroups.length > 0 && (
            <>
              <div className="border-t border-white/10 pt-1.5">
                {yearlyGroups.map(g => (
                  <div key={g.id} className="flex items-center gap-2 mb-1">
                    <span className="text-gray-400 text-xs min-w-0 flex-1 truncate">📦 {g.label}</span>
                    <span className="text-[9px] text-indigo-400 shrink-0">yearly</span>
                    <span className="font-semibold text-indigo-300 text-xs shrink-0 whitespace-nowrap">
                      {fmt(g.total * 12)}/yr
                    </span>
                  </div>
                ))}
                <div className="flex items-center gap-2">
                  <span className="text-gray-300 text-xs font-semibold flex-1">Yearly total</span>
                  <span className="font-bold text-indigo-300 text-sm shrink-0 whitespace-nowrap">
                    {fmt(yearlyGroupsUSD)}/yr
                  </span>
                </div>
              </div>
            </>
          )}

          {/* One-time groups */}
          {(onetimeGroups.length > 0 || devUSD > 0 || oneTimeTotal > 0) && (
            <div className="border-t border-white/10 pt-1.5 space-y-1">
              {onetimeGroups.map(g => (
                <div key={g.id} className="flex items-center gap-2">
                  <span className="text-gray-400 text-xs min-w-0 flex-1 truncate">📦 {g.label}</span>
                  <span className="text-[9px] text-amber-400 shrink-0">one-time</span>
                  <span className="font-semibold text-amber-300 text-xs shrink-0 whitespace-nowrap">
                    {fmt(g.total)}
                  </span>
                </div>
              ))}
              {devUSD > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 text-xs min-w-0 flex-1 truncate">🔗 Dev cost</span>
                  <span className="font-semibold text-amber-300 text-xs shrink-0 whitespace-nowrap">
                    {fmt(devUSD)}
                  </span>
                </div>
              )}
              {oneTimeTotal > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 text-xs min-w-0 flex-1 truncate">📦 One-time setup</span>
                  <span className="font-semibold text-amber-300 text-xs shrink-0 whitespace-nowrap">
                    {fmt(oneTimeTotal)}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <span className="text-gray-300 text-xs font-semibold flex-1">One-time total</span>
                <span className="font-bold text-amber-300 text-sm shrink-0 whitespace-nowrap">
                  {fmt(onetimeTotal)}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
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

  const [period,   setPeriod]   = useState<Period>("monthly");
  const [currency, setCurrency] = useState<Currency>("thb");

  const cost = calculateDiagramCost(nodes, edges, billingModel);
  const f    = periodFactor(period);

  const fmt    = (usd: number) => currency === "thb" ? fmtTHB(usd * rate) : fmtUSD(usd);
  const fmtAlt = (usd: number) => currency === "thb" ? fmtUSD(usd) : fmtTHB(usd * rate);

  // ── Dev nodes — only ungrouped ones (grouped dev nodes are in their group total) ──
  const devNodes = cost.perNode.filter(n => {
    if (!API_LINE_TYPES.has(n.serviceType)) return false;
    const nd = nodes.find(x => x.id === n.nodeId);
    return !nd?.parentId; // skip if already inside a group
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
        id:          g.id,
        label:       g.data.label as string,
        billingType,
        total:       services.reduce((s, n) => s + n.monthly, 0),
        services,
      };
    }).filter(g => g.services.length > 0);
  }, [nodes, cost.perNode]);

  // ── Ungrouped (non-dev, no parent) ────────────────────────────────────────
  const ungroupedNodes = useMemo(() =>
    cost.perNode.filter(n => {
      if (API_LINE_TYPES.has(n.serviceType)) return false; // dev has own row
      const nd = nodes.find(x => x.id === n.nodeId);
      return !nd?.parentId;
    }),
  [cost.perNode, nodes]);
  const ungroupedUSD = ungroupedNodes.reduce((s, n) => s + n.monthly, 0);

  // ── Other totals ──────────────────────────────────────────────────────────
  const addUSD       = additionalCosts.reduce((s, c) => s + recurringMonthly(c), 0);
  const subsUSD      = subscriptions.reduce((s, sub) => s + subMonthly(sub), 0);
  const oneTimeSetup = cost.setupCosts.reduce((s, c) => s + c.amountUSD, 0);
  const oneTimeAdd   = additionalCosts.reduce((s, c) => s + oneTimeAmount(c), 0);
  const oneTimeTotal = oneTimeSetup + oneTimeAdd;

  // recurringUSD = only monthly groups + ungrouped + data transfer + additional + subs
  const recurringUSD =
    groupBreakdowns.filter(g => g.billingType === "monthly").reduce((s, g) => s + g.total, 0) +
    ungroupedUSD + cost.dataTransfer.monthly + addUSD + subsUSD;

  const periodLabel = period === "yearly" ? "yr" : "mo";

  // ── Revenue & Profit ──────────────────────────────────────────────────────
  const annualRevenue = sellingPriceUSD * 12;
  const year1Cost     = recurringUSD * 12 + devUSD + oneTimeTotal;
  const year1Profit   = annualRevenue - year1Cost;
  const year1Margin   = annualRevenue > 0 ? (year1Profit / annualRevenue) * 100 : 0;
  const year2Cost     = recurringUSD * 12;
  const year2Profit   = annualRevenue - year2Cost;
  const year2Margin   = annualRevenue > 0 ? (year2Profit / annualRevenue) * 100 : 0;

  const isEmpty =
    groupBreakdowns.length === 0 && ungroupedNodes.length === 0 &&
    additionalCosts.length === 0 && subscriptions.length === 0 && devUSD === 0;

  return (
    <div className="flex flex-col h-full">

      {/* ── Controls ──────────────────────────────────────────────────────── */}
      <div className="px-4 pt-3 pb-2 border-b border-gray-100">
        <div className="flex gap-2">
          <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs font-medium flex-1">
            {(["monthly", "yearly"] as Period[]).map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                className="flex-1 py-1.5 transition-colors"
                style={period === p
                  ? { background: "#1D6FCA", color: "white" }
                  : { background: "white", color: "#64748B" }}>
                {p === "monthly" ? "Monthly" : "Yearly"}
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

      {/* ── Content ───────────────────────────────────────────────────────── */}
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
          // onetime: show flat total; yearly: total×12/yr; monthly: total×f
          const displayAmt =
            g.billingType === "onetime" ? g.total :
            g.billingType === "yearly"  ? g.total * 12 :
            g.total * f;
          const suffix =
            g.billingType === "onetime" ? "" :
            g.billingType === "yearly"  ? "/yr" :
            `/${periodLabel}`;
          return (
            <Row key={g.id} icon="📦" title={g.label} color={bColor}
              badge={bLabel}
              subtitle={`${g.services.length} service${g.services.length !== 1 ? "s" : ""}`}
              primary={fmt(displayAmt) + suffix}
              secondary={fmtAlt(displayAmt) + suffix}
              items={g.services.map(n => ({ label: n.label, amount: fmt(n.monthly * f) }))}
            />
          );
        })}

        {/* Ungrouped services */}
        {ungroupedNodes.length > 0 && (
          <Row icon="🔧" title="Ungrouped" color="#94A3B8"
            subtitle={`${ungroupedNodes.length} service${ungroupedNodes.length !== 1 ? "s" : ""}`}
            primary={fmt(ungroupedUSD * f)} secondary={fmtAlt(ungroupedUSD * f)}
            items={ungroupedNodes.map(n => ({ label: n.label, amount: fmt(n.monthly * f) }))}
          />
        )}

        {/* Data transfer */}
        {cost.dataTransfer.monthly > 0 && (
          <Row icon="🔀" title="Data Transfer" color="#64748B"
            subtitle="Network costs"
            primary={fmt(cost.dataTransfer.monthly * f)}
            secondary={fmtAlt(cost.dataTransfer.monthly * f)}
            items={[]}
          />
        )}

        {/* Additional costs */}
        {additionalCosts.filter(c => c.billingPeriod !== "one-time").length > 0 && (
          <Row icon="📋" title="Additional Costs" color="#0EA5E9"
            subtitle={`${additionalCosts.filter(c => c.billingPeriod !== "one-time").length} item${additionalCosts.filter(c => c.billingPeriod !== "one-time").length !== 1 ? "s" : ""}`}
            primary={fmt(addUSD * f)} secondary={fmtAlt(addUSD * f)}
            items={additionalCosts.filter(c => c.billingPeriod !== "one-time").map(c => ({
              label:  c.label || c.category,
              amount: fmt(recurringMonthly(c) * f),
            }))}
          />
        )}

        {/* Subscriptions */}
        {subscriptions.length > 0 && (
          <Row icon="🔄" title="Subscriptions" color="#6366F1"
            subtitle={subscriptions.map(s => s.service).join(", ")}
            primary={fmt(subsUSD * f)} secondary={fmtAlt(subsUSD * f)}
            items={subscriptions.map(s => ({
              label:  `${s.service}${s.plan ? ` · ${s.plan}` : ""}`,
              amount: fmt(subMonthly(s) * f),
            }))}
          />
        )}

        {/* Dev cost (manday) */}
        {devUSD > 0 && (
          <Row icon="🔗" title="Dev Cost" color="#0EA5E9"
            badge="manday"
            subtitle={devNodes.map(n => n.label).join(", ") || "API & LINE nodes"}
            primary={fmt(devUSD)}
            secondary={fmtAlt(devUSD)}
            items={devNodes.map(n => ({ label: n.label, amount: fmt(n.monthly) }))}
          />
        )}

        {/* One-time setup */}
        {oneTimeTotal > 0 && (
          <Row icon="📦" title="One-time Setup" color="#F59E0B"
            subtitle="Paid once at project start"
            primary={fmt(oneTimeTotal)} secondary={fmtAlt(oneTimeTotal)}
            items={[
              ...cost.setupCosts.map(s => ({ label: s.label, amount: fmt(s.amountUSD) })),
              ...additionalCosts.filter(c => c.billingPeriod === "one-time").map(c => ({
                label: c.label || c.category, amount: fmt(oneTimeAmount(c)),
              })),
            ]}
          />
        )}

        {/* Grand total */}
        {!isEmpty && (
          <GrandTotalCard
            groups={groupBreakdowns}
            ungroupedUSD={ungroupedUSD}
            dataTransferUSD={cost.dataTransfer.monthly}
            addUSD={addUSD}
            subsUSD={subsUSD}
            devUSD={devUSD}
            oneTimeTotal={oneTimeTotal}
            f={f}
            periodLabel={periodLabel}
            fmt={fmt}
            fmtAlt={fmtAlt}
          />
        )}

        {/* ── Revenue & Profit ─────────────────────────────────────────── */}
        <div className="rounded-xl border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 px-3 py-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
            Revenue & Profit
          </div>
          <div className="px-3 py-3 space-y-3">

            {/* Selling price input */}
            <label className="text-xs text-gray-600 font-medium flex flex-col gap-1">
              {currency === "thb"
                ? `Selling price to client (THB/${periodLabel})`
                : `Selling price to client (USD/${periodLabel})`}
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
                  onChange={e => {
                    const val = Number(e.target.value);
                    setSellingPrice(currency === "thb" ? val / rate / f : val / f);
                  }}
                />
              </div>
            </label>

            {sellingPriceUSD > 0 && (
              <div className="space-y-3 pt-1 border-t border-gray-100">

                {/* Annual revenue */}
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
                    <span className="text-[9px] text-blue-500">incl. dev + one-time</span>
                  </div>
                  <div className="px-3 py-2 space-y-1">
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Recurring /yr</span>
                      <span className="whitespace-nowrap">–{fmt(recurringUSD * 12)}</span>
                    </div>
                    {devUSD > 0 && (
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>Dev cost</span>
                        <span className="whitespace-nowrap">–{fmt(devUSD)}</span>
                      </div>
                    )}
                    {oneTimeTotal > 0 && (
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>One-time setup</span>
                        <span className="whitespace-nowrap">–{fmt(oneTimeTotal)}</span>
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
                    <div className="flex items-center gap-2 pt-0.5">
                      <span className="text-[10px] text-gray-400 shrink-0">Margin</span>
                      <div className="flex-1 h-1.5 bg-blue-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all"
                          style={{
                            width:      `${Math.min(100, Math.abs(year1Margin))}%`,
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
                    <div className="border-t border-green-200 pt-1.5 flex justify-between items-center">
                      <span className="text-sm font-bold text-green-700">Profit</span>
                      <div className="text-right">
                        <span className={`text-base font-bold whitespace-nowrap ${year2Profit >= 0 ? "text-green-600" : "text-red-500"}`}>
                          {year2Profit >= 0 ? "+" : ""}{fmt(year2Profit)}
                        </span>
                        <div className="text-[10px] text-gray-400 whitespace-nowrap">{fmtAlt(year2Profit)}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pt-0.5">
                      <span className="text-[10px] text-gray-400 shrink-0">Margin</span>
                      <div className="flex-1 h-1.5 bg-green-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all"
                          style={{
                            width:      `${Math.min(100, Math.abs(year2Margin))}%`,
                            background: year2Margin >= 0 ? "#22C55E" : "#EF4444",
                          }} />
                      </div>
                      <span className={`text-xs font-bold shrink-0 ${year2Margin >= 0 ? "text-green-600" : "text-red-500"}`}>
                        {year2Margin.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>

              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
