import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";

import { useCanvasStore } from "../../store/canvasStore.ts";
import { calculateDiagramCost } from "../../lib/costEngine.ts";
import { fmtUSD, fmtTHB } from "../../lib/utils.ts";
import { AdditionalCostsTab } from "./AdditionalCostsTab.tsx";
import { SubscribeTab } from "./SubscribeTab.tsx";
import { SummaryTab } from "./SummaryTab.tsx";
import { subMonthly } from "./SubscribeTab.tsx";
import type { BillingModel, AdditionalCostItem, GroupBillingType } from "../../types.ts";

type Tab = "breakdown" | "additional" | "subscribe" | "summary";

const BILLING_LABELS: Record<BillingModel, string> = {
  ondemand:    "On-Demand",
  reserved1yr: "Reserved 1yr",
  reserved3yr: "Reserved 3yr",
  spot:        "Spot",
};

const SERVICE_COLORS: Record<string, string> = {
  ec2: "#FF9900", s3: "#3F8624", rds: "#1D6FCA", lambda: "#E7157B",
  vpc: "#8C4FFF", alb: "#FF4F8B", cloudfront: "#FF7300",
  elasticache: "#C7131F", custom: "#475569",
  bedrock: "#7A3FBF", ebs: "#7AA116", lightsail: "#0CA4DA",
  cognito: "#BF4040", route53: "#8C4FFF", dynamodb: "#1D6FCA",
  redshift: "#8B1A1A", sqs: "#FF4F8B", apigateway: "#A020F0",
  default: "#94A3B8",
};

const GROUP_COLORS: Record<string, string> = {
  infrastructure: "#F97316", external: "#8C4FFF",
  implementation: "#3B82F6", custom: "#94A3B8",
};

function monthlyRecurring(item: AdditionalCostItem): number {
  if (item.billingPeriod === "one-time") return 0;
  const base = item.billingPeriod === "yearly" ? item.amountUSD / 12 : item.amountUSD;
  return base * (1 - (item.discount ?? 0) / 100);
}

function oneTimeAmount(item: AdditionalCostItem): number {
  if (item.billingPeriod !== "one-time") return 0;
  return item.amountUSD * (1 - (item.discount ?? 0) / 100);
}

export function CostPanel() {
  const { nodes, edges, billingModel, setBillingModel, additionalCosts, subscriptions, exchangeRate, setExchangeRate } = useCanvasStore();
  const [tab, setTab]       = useState<Tab>("breakdown");
  const [expanded, setExpanded] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const cost = useMemo(
    () => calculateDiagramCost(nodes, edges, billingModel),
    [nodes, edges, billingModel]
  );

  const fmt = (usd: number) => fmtTHB(usd * exchangeRate);

  const API_LINE_TYPES = new Set([
    "api_rest","api_grpc","api_mcp",
    "line_image","line_button","line_carousel","line_quick_reply",
    "line_flex_message","line_rich_menu","line_custom_payload",
    "line_api_call","line_ai_agent","line_intent","line_dialog",
  ]);

  // ── Custom node helpers ─────────────────────────────────────────────────
  const customBillingType = (nodeId: string) => {
    const n = nodes.find(nd => nd.id === nodeId);
    return ((n?.data.config as any)?.billingType ?? "monthly") as string;
  };

  // Custom nodes grouped by billing type (looked up from raw nodes)
  const customOnetimeNodes  = useMemo(() => nodes.filter(n => n.type === "custom" && ((n.data.config as any).billingType ?? "monthly") === "onetime_setup"),  [nodes]);
  const customSubscribeNodes = useMemo(() => nodes.filter(n => n.type === "custom" && ((n.data.config as any).billingType ?? "monthly") === "subscribe"),      [nodes]);
  const customRoundingNodes  = useMemo(() => nodes.filter(n => n.type === "custom" && ((n.data.config as any).billingType ?? "monthly") === "rounding_bill"),  [nodes]);

  const customOnetimeCost = customOnetimeNodes.reduce((s, n) => s + ((n.data.config as any).totalCostUSD ?? 0), 0);

  // ── Cost totals ─────────────────────────────────────────────────────────
  const totalInfra        = cost.perNode.filter(n => n.serviceType !== "custom" && !API_LINE_TYPES.has(n.serviceType)).reduce((s, n) => s + n.monthly, 0) + cost.dataTransfer.monthly;
  // Only ungrouped dev nodes shown separately; grouped dev nodes are inside their group total
  const totalApiLine      = cost.perNode.filter(n => API_LINE_TYPES.has(n.serviceType) && !nodes.find(x => x.id === n.nodeId)?.parentId).reduce((s, n) => s + n.monthly, 0);
  // Only monthly-billed custom nodes contribute to recurring; subscribe/rounding are amortised by cost engine
  const totalExternal     = cost.perNode.filter(n => n.serviceType === "custom").reduce((s, n) => s + n.monthly, 0);
  const totalAddRecurring = additionalCosts.reduce((s, c) => s + monthlyRecurring(c), 0);
  const totalAddOneTime   = additionalCosts.reduce((s, c) => s + oneTimeAmount(c), 0);
  const totalSubs         = subscriptions.reduce((s, sub) => s + subMonthly(sub), 0);
  const totalMonthly      = totalInfra + totalApiLine + totalExternal + totalAddRecurring + totalSubs;

  const totalSetupGroups  = cost.setupCosts.reduce((s, c) => s + c.amountUSD, 0);
  const totalOneTime      = totalSetupGroups + totalAddOneTime + customOnetimeCost;

  const totalSavingsNode = cost.perNode.reduce((s, n) => s + ((n.baseMonthly ?? n.monthly) - n.monthly), 0);
  const totalSavingsAdd  = additionalCosts.reduce((s, c) => {
    const base = c.billingPeriod === "yearly" ? c.amountUSD / 12 : c.billingPeriod === "one-time" ? c.amountUSD : c.amountUSD;
    return s + base * ((c.discount ?? 0) / 100);
  }, 0);
  const totalSavings = totalSavingsNode + totalSavingsAdd;

  // ── Group breakdown ─────────────────────────────────────────────────────
  const groupBreakdowns = useMemo(() => {
    const groupNodes = nodes.filter(n => n.type === "group");
    return groupNodes.map(g => {
      const services = cost.perNode.filter(n => {
        const nd = nodes.find(x => x.id === n.nodeId);
        return nd?.parentId === g.id;
      });
      const billingType: GroupBillingType = (g.data.config as any)?.billingType ?? "monthly";
      return {
        id: g.id,
        label: g.data.label,
        billingType,
        total: services.reduce((s, n) => s + n.monthly, 0),
        services,
      };
    }).filter(g => g.services.length > 0);
  }, [nodes, cost.perNode]);

  const ungroupedNodes = useMemo(() =>
    cost.perNode.filter(n => {
      if (n.serviceType === "custom") return false; // custom has own section
      const nd = nodes.find(x => x.id === n.nodeId);
      return !nd?.parentId;
    }),
  [cost.perNode, nodes]);

  const toggleGroup = (id: string) =>
    setExpandedGroups(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const TAB_DEFS: { key: Tab; label: string; badge?: number }[] = [
    { key: "breakdown",  label: "Breakdown" },
    { key: "additional", label: "Costs",      badge: additionalCosts.length || undefined },
    { key: "subscribe",  label: "Subscribe",  badge: subscriptions.length  || undefined },
    { key: "summary",    label: "Summary" },
  ];

  return (
    <div
      className="bg-white border-l border-gray-100 flex flex-col h-full shadow-xl transition-all duration-200"
      style={{ width: expanded ? 480 : 288 }}
    >

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="px-4 pt-4 pb-3 border-b border-gray-100 space-y-2">
        <div className="flex items-center justify-between">
          <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Total Cost</div>
          <button
            onClick={() => setExpanded(v => !v)}
            title={expanded ? "Collapse panel" : "Expand panel"}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          >
            {expanded ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>
        <div className="space-y-1">
          <div className="text-2xl font-bold text-gray-900 leading-tight">
            {fmtTHB(totalMonthly * exchangeRate)}
          </div>
          {/* Per-group subtotals */}
          {groupBreakdowns.map(g => {
            const billingColor = g.billingType === "onetime" ? "#F59E0B" : g.billingType === "yearly" ? "#6366F1" : "#3B82F6";
            const billingLabel = g.billingType === "onetime" ? "one-time" : g.billingType === "yearly" ? "yearly" : "monthly";
            return (
              <div key={g.id} className="flex items-center justify-between text-[11px] gap-1">
                <span className="text-gray-400 truncate">{g.label}</span>
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-[9px] font-semibold px-1 py-0.5 rounded-full"
                    style={{ background: billingColor + "20", color: billingColor }}>
                    {billingLabel}
                  </span>
                  <span className="font-semibold text-gray-700">{fmtTHB(g.total * exchangeRate)}</span>
                </div>
              </div>
            );
          })}
          {ungroupedNodes.length > 0 && (
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-gray-400">Ungrouped</span>
              <span className="font-semibold text-gray-700">
                {fmtTHB(ungroupedNodes.reduce((s, n) => s + n.monthly, 0) * exchangeRate)}
              </span>
            </div>
          )}
          {totalAddRecurring > 0 && (
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-gray-400">Additional</span>
              <span className="font-semibold text-gray-700">{fmtTHB(totalAddRecurring * exchangeRate)}</span>
            </div>
          )}
          {totalSubs > 0 && (
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-gray-400">Subscriptions</span>
              <span className="font-semibold text-gray-700">{fmtTHB(totalSubs * exchangeRate)}</span>
            </div>
          )}
        </div>

        {totalOneTime > 0 && (
          <div className="flex items-center justify-between rounded-lg bg-amber-50 border border-amber-100 px-2.5 py-1.5">
            <span className="text-xs text-amber-700 font-medium">One-time total</span>
            <span className="text-sm font-bold text-amber-600">{fmt(totalOneTime)}</span>
          </div>
        )}

        {totalSavings > 0.01 && (
          <div className="flex items-center justify-between rounded-lg bg-green-50 border border-green-100 px-2.5 py-1.5">
            <span className="text-xs text-green-700 font-medium">Total discounts</span>
            <span className="text-sm font-bold text-green-600">–{fmt(totalSavings)}/mo</span>
          </div>
        )}

        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-400 whitespace-nowrap">1 USD =</span>
          <input type="number" min={1} step={0.5}
            className="border rounded px-2 py-0.5 text-xs w-20 focus:outline-none focus:ring-1 focus:ring-blue-300"
            value={exchangeRate}
            onChange={(e) => setExchangeRate(Math.max(1, Number(e.target.value)))} />
          <span className="text-[10px] text-gray-400">THB</span>
        </div>

        <select
          className="w-full border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
          value={billingModel}
          onChange={(e) => setBillingModel(e.target.value as BillingModel)}
        >
          {(Object.keys(BILLING_LABELS) as BillingModel[]).map((k) => (
            <option key={k} value={k}>{BILLING_LABELS[k]}</option>
          ))}
        </select>
      </div>

      {/* ── Tabs ───────────────────────────────────────────────────────── */}
      <div className="flex border-b border-gray-100 shrink-0">
        {TAB_DEFS.map((t) => (
          <button key={t.key}
            onClick={() => setTab(t.key)}
            className="flex-1 py-2 text-[11px] font-medium transition-colors relative"
            style={tab === t.key
              ? { color: "#1D6FCA", borderBottom: "2px solid #1D6FCA" }
              : { color: "#94A3B8" }}
          >
            {t.label}
            {t.badge ? (
              <span className="ml-0.5 text-[9px] bg-blue-100 text-blue-600 rounded-full px-1 py-0.5 font-bold">{t.badge}</span>
            ) : null}
          </button>
        ))}
      </div>

      {/* ── Tab content ────────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">

        {/* Breakdown tab */}
        {tab === "breakdown" && (
          <>
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">

              {/* ── Groups ────────────────────────────────────────────── */}
              {groupBreakdowns.length > 0 && (
                <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Groups</div>
              )}
              {groupBreakdowns.map(g => {
                const pct   = totalMonthly > 0 ? (g.total / totalMonthly) * 100 : 0;
                const open  = expandedGroups.has(g.id);
                return (
                  <div key={g.id} className="rounded-lg border border-gray-100 overflow-hidden">
                    <button
                      className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 transition-colors"
                      onClick={() => toggleGroup(g.id)}
                    >
                      <ChevronDown size={12} className="text-gray-400 shrink-0 transition-transform" style={{ transform: open ? "rotate(0deg)" : "rotate(-90deg)" }} />
                      <span className="flex-1 text-sm font-medium text-gray-800 text-left truncate">{g.label}</span>
                      <div className="text-right shrink-0">
                        <div className="text-sm font-semibold text-gray-900">{fmt(g.total)}</div>
                        <div className="text-[10px] text-gray-400">{fmtUSD(g.total)}/mo</div>
                      </div>
                    </button>
                    {/* Progress bar */}
                    <div className="px-3 pb-1.5 flex items-center gap-2">
                      <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-blue-400" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-[10px] text-gray-400 w-9 text-right">{pct.toFixed(1)}%</span>
                    </div>
                    {/* Expanded service list */}
                    {open && (
                      <div className="border-t border-gray-100 bg-gray-50 px-3 py-2 space-y-1.5">
                        {g.services.map(n => {
                          const color = SERVICE_COLORS[n.serviceType] ?? SERVICE_COLORS.default;
                          return (
                            <div key={n.nodeId} className="flex items-center gap-2 text-xs">
                              <div className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
                              <span className="flex-1 text-gray-600 truncate">{n.label}</span>
                              <span className="font-medium text-gray-700 shrink-0">{fmt(n.monthly)}/mo</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* ── Ungrouped services ─────────────────────────────────── */}
              {ungroupedNodes.length > 0 && (<>
                <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider pt-1 border-t border-gray-100">Ungrouped</div>
                {ungroupedNodes.map(n => {
                  const pct   = totalMonthly > 0 ? (n.monthly / totalMonthly) * 100 : 0;
                  const color = SERVICE_COLORS[n.serviceType] ?? SERVICE_COLORS.default;
                  return (
                    <div key={n.nodeId} className="space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <div className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
                          <span className="text-sm text-gray-700 truncate">{n.label}</span>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-sm font-semibold text-gray-900">{fmt(n.monthly)}</div>
                          <div className="text-[10px] text-gray-400">{fmtUSD(n.monthly)}/mo</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
                        </div>
                        <span className="text-[10px] text-gray-400 w-9 text-right">{pct.toFixed(1)}%</span>
                      </div>
                    </div>
                  );
                })}
              </>)}

              {/* ── Monthly external APIs ──────────────────────────────── */}
              {cost.perNode.filter(n => n.serviceType === "custom" && customBillingType(n.nodeId) === "monthly").length > 0 && (<>
                <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider pt-1 border-t border-gray-100">External APIs (monthly)</div>
                {cost.perNode.filter(n => n.serviceType === "custom" && customBillingType(n.nodeId) === "monthly").map(n => {
                  const pct = totalMonthly > 0 ? (n.monthly / totalMonthly) * 100 : 0;
                  return (
                    <div key={n.nodeId} className="space-y-1">
                      <div className="flex justify-between items-center gap-2">
                        <span className="text-sm text-gray-700 truncate">{n.label}</span>
                        <div className="text-right shrink-0">
                          <div className="text-sm font-semibold text-gray-900">{fmt(n.monthly)}</div>
                          <div className="text-[10px] text-gray-400">{fmtUSD(n.monthly)}/mo</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-slate-400" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-[10px] text-gray-400 w-9 text-right">{pct.toFixed(1)}%</span>
                      </div>
                    </div>
                  );
                })}
              </>)}

              {/* ── Data transfer ─────────────────────────────────────── */}
              {cost.dataTransfer.monthly > 0 && (
                <div className="flex justify-between items-center text-sm pt-1 border-t border-gray-100">
                  <span className="text-gray-500">🔀 Data Transfer</span>
                  <div className="text-right">
                    <div className="font-semibold text-gray-900">{fmt(cost.dataTransfer.monthly)}</div>
                    <div className="text-[10px] text-gray-400">{fmtUSD(cost.dataTransfer.monthly)}/mo</div>
                  </div>
                </div>
              )}

              {/* ── SaaS Subscriptions ────────────────────────────────── */}
              {(subscriptions.length > 0 || customSubscribeNodes.length > 0) && (<>
                <div className="text-[10px] font-semibold text-indigo-400 uppercase tracking-wider pt-1 border-t border-gray-100">
                  🔄 Yearly Subscribe
                </div>
                {subscriptions.map(sub => {
                  const m = subMonthly(sub);
                  return (
                    <div key={sub.id} className="flex justify-between items-center text-sm">
                      <div>
                        <span className="text-gray-700">{sub.service}</span>
                        {sub.plan && <span className="text-gray-400 text-xs"> · {sub.plan}</span>}
                        <div className="text-[10px] text-indigo-400">
                          {sub.billingPeriod === "yearly" ? "yearly · " : "monthly · "}{fmtUSD(sub.amountUSD)}/unit
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-semibold text-indigo-700">{fmt(m)}/mo</div>
                      </div>
                    </div>
                  );
                })}
                {customSubscribeNodes.map(n => {
                  const totalCostUSD = (n.data.config as any).totalCostUSD ?? 0;
                  return (
                    <div key={n.id} className="flex justify-between items-center text-sm">
                      <div>
                        <span className="text-gray-700">{n.data.label}</span>
                        <div className="text-[10px] text-indigo-400">custom · {fmtUSD(totalCostUSD)}/yr</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-semibold text-indigo-700">{fmt(totalCostUSD / 12)}/mo</div>
                      </div>
                    </div>
                  );
                })}
              </>)}

              {/* ── Periodic (rounding bill) ───────────────────────────── */}
              {customRoundingNodes.length > 0 && (<>
                <div className="text-[10px] font-semibold text-sky-400 uppercase tracking-wider pt-1 border-t border-gray-100">
                  🔁 Periodic Bill
                </div>
                {customRoundingNodes.map(n => {
                  const totalCostUSD = (n.data.config as any).totalCostUSD ?? 0;
                  const yrs = Math.max(1, (n.data.config as any).intervalYears ?? 3);
                  return (
                    <div key={n.id} className="flex justify-between items-center text-sm">
                      <div>
                        <span className="text-gray-700">{n.data.label}</span>
                        <div className="text-[10px] text-sky-400">{fmtUSD(totalCostUSD)} every {yrs}yr · amortised</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-semibold text-sky-700">{fmt(totalCostUSD / (yrs * 12))}/mo</div>
                      </div>
                    </div>
                  );
                })}
              </>)}

              {/* ── One-time / Setup ──────────────────────────────────── */}
              {totalOneTime > 0 && (<>
                <div className="text-[10px] font-semibold text-amber-500 uppercase tracking-wider pt-1 border-t border-gray-100">
                  📦 One-time / Setup
                </div>
                {cost.setupCosts.map(s => (
                  <div key={s.nodeId} className="flex justify-between items-center text-sm">
                    <div>
                      <div className="text-gray-700 truncate">{s.label}</div>
                      <div className="text-[10px]" style={{ color: GROUP_COLORS[s.groupType] ?? "#94A3B8" }}>{s.groupType} group</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-semibold text-amber-700">{fmt(s.amountUSD)}</div>
                      <div className="text-[10px] text-gray-400">{fmtUSD(s.amountUSD)}</div>
                    </div>
                  </div>
                ))}
                {customOnetimeNodes.map(n => {
                  const amt = (n.data.config as any).totalCostUSD ?? 0;
                  return (
                    <div key={n.id} className="flex justify-between items-center text-sm">
                      <div>
                        <div className="text-gray-700 truncate">{n.data.label}</div>
                        <div className="text-[10px] text-amber-400">custom · one-time</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-semibold text-amber-700">{fmt(amt)}</div>
                        <div className="text-[10px] text-gray-400">{fmtUSD(amt)}</div>
                      </div>
                    </div>
                  );
                })}
                {additionalCosts.filter(c => c.billingPeriod === "one-time").map(c => (
                  <div key={c.id} className="flex justify-between text-sm">
                    <span className="text-gray-700 truncate flex-1">{c.label || c.category}</span>
                    <div className="text-right shrink-0">
                      <div className="font-semibold text-amber-700">{fmt(oneTimeAmount(c))}</div>
                      <div className="text-[10px] text-gray-400">{fmtUSD(oneTimeAmount(c))}</div>
                    </div>
                  </div>
                ))}
              </>)}

              {groupBreakdowns.length === 0 && ungroupedNodes.length === 0 && cost.perNode.length === 0 && additionalCosts.length === 0 && subscriptions.length === 0 && (
                <div className="text-center text-gray-400 text-sm py-8">
                  Drop services or add<br />costs to begin
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Total (THB)</span>
                <span className="font-semibold text-gray-800">{fmtTHB(totalMonthly * exchangeRate)}</span>
              </div>
              <div className="flex justify-between text-xs text-gray-400">
                <span>Total (USD)</span>
                <span>{fmtUSD(totalMonthly)}</span>
              </div>
              {totalOneTime > 0 && (
                <div className="flex justify-between text-xs text-amber-600 font-semibold pt-0.5 border-t border-amber-100">
                  <span>One-time</span>
                  <span>{fmt(totalOneTime)}</span>
                </div>
              )}
              {totalSavings > 0.01 && (
                <div className="flex justify-between text-xs text-green-600 font-semibold pt-0.5 border-t border-green-100">
                  <span>Savings /mo</span>
                  <span>–{fmt(totalSavings)}</span>
                </div>
              )}
            </div>
          </>
        )}

        {tab === "additional" && <AdditionalCostsTab rate={exchangeRate} />}
        {tab === "subscribe"  && <SubscribeTab rate={exchangeRate} />}
        {tab === "summary"    && <SummaryTab rate={exchangeRate} />}
      </div>
    </div>
  );
}
