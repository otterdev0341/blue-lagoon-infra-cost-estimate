import { useMemo, useState } from "react";
import { useCanvasStore } from "../../store/canvasStore.ts";
import { calculateDiagramCost } from "../../lib/costEngine.ts";
import { fmtUSD, fmtTHB } from "../../lib/utils.ts";
import { AdditionalCostsTab } from "./AdditionalCostsTab.tsx";
import { SubscribeTab } from "./SubscribeTab.tsx";
import { SummaryTab } from "./SummaryTab.tsx";
import { subMonthly } from "./SubscribeTab.tsx";
import type { BillingModel, AdditionalCostItem } from "../../types.ts";

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
  const { nodes, edges, billingModel, setBillingModel, additionalCosts, subscriptions } = useCanvasStore();
  const [tab, setTab] = useState<Tab>("breakdown");
  const [exchangeRate, setExchangeRate] = useState(35);

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
  const totalInfra       = cost.perNode.filter(n => n.serviceType !== "custom" && !API_LINE_TYPES.has(n.serviceType)).reduce((s, n) => s + n.monthly, 0) + cost.dataTransfer.monthly;
  const totalApiLine     = cost.perNode.filter(n => API_LINE_TYPES.has(n.serviceType)).reduce((s, n) => s + n.monthly, 0);
  const totalExternal    = cost.perNode.filter(n => n.serviceType === "custom").reduce((s, n) => s + n.monthly, 0);
  const totalAddRecurring = additionalCosts.reduce((s, c) => s + monthlyRecurring(c), 0);
  const totalAddOneTime   = additionalCosts.reduce((s, c) => s + oneTimeAmount(c), 0);
  const totalSubs        = subscriptions.reduce((s, sub) => s + subMonthly(sub), 0);
  const totalMonthly     = totalInfra + totalApiLine + totalExternal + totalAddRecurring + totalSubs;

  const totalSetupGroups  = cost.setupCosts.reduce((s, c) => s + c.amountUSD, 0);
  const totalOneTime      = totalSetupGroups + totalAddOneTime;

  const totalSavingsNode = cost.perNode.reduce((s, n) => s + ((n.baseMonthly ?? n.monthly) - n.monthly), 0);
  const totalSavingsAdd  = additionalCosts.reduce((s, c) => {
    const base = c.billingPeriod === "yearly" ? c.amountUSD / 12 : c.billingPeriod === "one-time" ? c.amountUSD : c.amountUSD;
    return s + base * ((c.discount ?? 0) / 100);
  }, 0);
  const totalSavings = totalSavingsNode + totalSavingsAdd;

  const nodeGroupMap = useMemo(() => {
    const m: Record<string, string> = {};
    nodes.filter(n => n.type === "group").forEach(g => {
      nodes.filter(n => n.parentId === g.id).forEach(child => { m[child.id] = g.data.label; });
    });
    return m;
  }, [nodes]);

  const TAB_DEFS: { key: Tab; label: string; badge?: number }[] = [
    { key: "breakdown",  label: "Breakdown" },
    { key: "additional", label: "Costs",      badge: additionalCosts.length || undefined },
    { key: "subscribe",  label: "Subscribe",  badge: subscriptions.length  || undefined },
    { key: "summary",    label: "Summary" },
  ];

  return (
    <div className="w-72 bg-white border-l border-gray-100 flex flex-col h-full shadow-xl">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="px-4 pt-4 pb-3 border-b border-gray-100 space-y-2">
        <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Total Cost</div>
        <div className="space-y-1">
          {/* Big total = recurring + dev */}
          <div className="text-2xl font-bold text-gray-900 leading-tight">
            {fmtTHB((totalInfra + totalExternal + totalAddRecurring + totalSubs + totalApiLine) * exchangeRate)}
          </div>
          {/* Two lines: recurring vs dev */}
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-gray-400">🏗 Recurring /mo</span>
            <span className="font-semibold text-orange-500">
              {fmtTHB((totalInfra + totalExternal + totalAddRecurring + totalSubs) * exchangeRate)}
            </span>
          </div>
          {totalApiLine > 0 && (
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-gray-400">🔗 Dev cost</span>
              <span className="font-semibold text-sky-500">
                {fmtTHB(totalApiLine * exchangeRate)}
              </span>
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
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Service Breakdown</div>

              {cost.perNode.map((n) => {
                const pct   = totalMonthly > 0 ? (n.monthly / totalMonthly) * 100 : 0;
                const color = SERVICE_COLORS[n.serviceType] ?? SERVICE_COLORS.default;
                const hasDis = (n.discountPct ?? 0) > 0;
                const groupLabel = nodeGroupMap[n.nodeId];
                return (
                  <div key={n.nodeId} className="space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-sm text-gray-700 truncate">{n.label}</div>
                        {groupLabel && <div className="text-[10px] text-gray-400">in {groupLabel}</div>}
                        {hasDis && (
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-gray-400 line-through">{fmt(n.baseMonthly ?? n.monthly)}</span>
                            <span className="text-[10px] bg-green-100 text-green-700 rounded px-1 font-medium">-{n.discountPct}%</span>
                          </div>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-sm font-semibold text-gray-900">{fmt(n.monthly)}</div>
                        <div className="text-[10px] text-gray-400">{fmtUSD(n.monthly)}</div>
                      </div>
                    </div>
                    {n.monthlyMin !== undefined && n.monthlyMax !== undefined && (
                      <div className="text-[10px] text-gray-400">{fmt(n.monthlyMin)} – {fmt(n.monthlyMax)} (ASG)</div>
                    )}
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
                      </div>
                      <span className="text-[10px] text-gray-400 w-9 text-right">{pct.toFixed(1)}%</span>
                    </div>
                  </div>
                );
              })}

              {/* Subscriptions in breakdown */}
              {subscriptions.length > 0 && (
                <>
                  <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider pt-1 border-t border-gray-100">
                    Subscriptions
                  </div>
                  {subscriptions.map((sub) => {
                    const m = subMonthly(sub);
                    const pct = totalMonthly > 0 ? (m / totalMonthly) * 100 : 0;
                    return (
                      <div key={sub.id} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <div>
                            <span className="text-gray-700">{sub.service}</span>
                            {sub.plan && <span className="text-gray-400 text-xs"> · {sub.plan}</span>}
                          </div>
                          <span className="font-semibold text-gray-900">{fmt(m)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-indigo-400" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-[10px] text-gray-400 w-9 text-right">{pct.toFixed(1)}%</span>
                        </div>
                      </div>
                    );
                  })}
                </>
              )}

              {/* Data transfer */}
              {cost.dataTransfer.monthly > 0 && (
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Data Transfer</span>
                    <div className="text-right">
                      <div className="font-semibold text-gray-900">{fmt(cost.dataTransfer.monthly)}</div>
                      <div className="text-[10px] text-gray-400">{fmtUSD(cost.dataTransfer.monthly)}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* One-time section */}
              {(cost.setupCosts.length > 0 || totalAddOneTime > 0) && (
                <>
                  <div className="text-[10px] font-semibold text-amber-500 uppercase tracking-wider pt-1 border-t border-gray-100">
                    One-time / Setup
                  </div>
                  {cost.setupCosts.map((s) => (
                    <div key={s.nodeId} className="flex justify-between items-center text-sm">
                      <div>
                        <div className="text-gray-700 truncate">{s.label}</div>
                        <div className="text-[10px]" style={{ color: GROUP_COLORS[s.groupType] ?? "#94A3B8" }}>
                          {s.groupType} group
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-semibold text-amber-700">{fmt(s.amountUSD)}</div>
                        <div className="text-[10px] text-gray-400">{fmtUSD(s.amountUSD)}</div>
                      </div>
                    </div>
                  ))}
                  {additionalCosts.filter(c => c.billingPeriod === "one-time").map((c) => (
                    <div key={c.id} className="flex justify-between text-sm">
                      <span className="text-gray-700 truncate flex-1">{c.label || c.category}</span>
                      <div className="text-right shrink-0">
                        <div className="font-semibold text-amber-700">{fmt(oneTimeAmount(c))}</div>
                        <div className="text-[10px] text-gray-400">{fmtUSD(oneTimeAmount(c))}</div>
                      </div>
                    </div>
                  ))}
                </>
              )}

              {cost.perNode.length === 0 && additionalCosts.length === 0 && subscriptions.length === 0 && (
                <div className="text-center text-gray-400 text-sm py-8">
                  Drop services or add<br />costs to begin
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Monthly (THB)</span>
                <span className="font-semibold text-gray-800">{fmtTHB(totalMonthly * exchangeRate)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Yearly (THB)</span>
                <span className="font-semibold text-gray-800">{fmtTHB(totalMonthly * 12 * exchangeRate)}</span>
              </div>
              <div className="flex justify-between text-xs text-gray-400">
                <span>Monthly (USD)</span>
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
