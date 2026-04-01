import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { useCanvasStore } from "../../store/canvasStore.ts";
import { calculateDiagramCost } from "../../lib/costEngine.ts";
import { fmtUSD, fmtTHB } from "../../lib/utils.ts";
import type { GroupType } from "../../types.ts";

const REGIONS = [
  "us-east-1", "us-east-2", "us-west-1", "us-west-2",
  "eu-west-1", "eu-central-1", "ap-southeast-1", "ap-southeast-2",
  "ap-northeast-1", "ap-south-1", "sa-east-1",
];

const INSTANCE_TYPES = [
  "t3.nano","t3.micro","t3.small","t3.medium","t3.large","t3.xlarge","t3.2xlarge",
  "m5.large","m5.xlarge","m5.2xlarge","m5.4xlarge",
  "c5.large","c5.xlarge","c5.2xlarge","c5.4xlarge",
  "r5.large","r5.xlarge","r5.2xlarge",
];

const RDS_CLASSES = [
  "db.t3.micro","db.t3.small","db.t3.medium","db.t3.large",
  "db.r5.large","db.r5.xlarge","db.r5.2xlarge","db.m5.large","db.m5.xlarge",
];

const REDSHIFT_NODES = ["dc2.large","dc2.8xlarge","ra3.xlplus","ra3.4xlarge","ra3.16xlarge"];
const LIGHTSAIL_PLANS = ["nano","micro","small","medium","large","xlarge","2xlarge"];
const BEDROCK_MODELS = ["claude-3-haiku","claude-3-sonnet","claude-3-opus","titan-text"];

const DEFAULT_RATE = 35;

// ── Pricing info tooltip ───────────────────────────────────────────────────

function InfoTooltip({ content }: { content: React.ReactNode }) {
  const [show, setShow] = useState(false);
  return (
    <span className="relative inline-flex items-center ml-1.5">
      <button
        className="w-4 h-4 rounded-full bg-gray-100 hover:bg-blue-100 text-gray-400 hover:text-blue-500 text-[10px] font-bold flex items-center justify-center transition-colors"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onClick={(e) => e.preventDefault()}
      >
        ?
      </button>
      {show && (
        <div className="absolute left-5 top-0 z-50 w-64 bg-white border border-gray-200 rounded-xl shadow-2xl p-3 text-xs pointer-events-none">
          {content}
        </div>
      )}
    </span>
  );
}

const PRICING_INFO: Record<string, React.ReactNode> = {
  ec2: (
    <div className="space-y-2">
      <div className="font-semibold text-gray-700">⏱ Billed per hour</div>
      <div className="text-gray-500 space-y-0.5">
        <div className="font-medium text-gray-600">Formula:</div>
        <div>hours × instance_rate + EBS storage</div>
      </div>
      <div className="text-gray-500 space-y-0.5 border-t border-gray-100 pt-1.5">
        <div>• t3.medium ~$0.042/hr · m5.large ~$0.096/hr</div>
        <div>• EBS gp3 $0.08/GB · gp2 $0.10/GB</div>
        <div>• Windows adds OS license surcharge</div>
        <div>• ASG estimate uses desired capacity</div>
      </div>
    </div>
  ),
  s3: (
    <div className="space-y-2">
      <div className="font-semibold text-gray-700">📦 Billed by storage + requests</div>
      <div className="text-gray-500 space-y-0.5">
        <div className="font-medium text-gray-600">Storage /GB/mo:</div>
        <div>• Standard $0.023 · Intelligent $0.023</div>
        <div>• Glacier $0.004 · Deep Archive $0.00099</div>
        <div className="font-medium text-gray-600 pt-1">Requests:</div>
        <div>• GET $0.0004/1K · PUT $0.005/1K</div>
        <div className="font-medium text-gray-600 pt-1">Data transfer out:</div>
        <div>• First 10TB $0.09/GB</div>
      </div>
    </div>
  ),
  rds: (
    <div className="space-y-2">
      <div className="font-semibold text-gray-700">⏱ Billed per hour + storage</div>
      <div className="text-gray-500 space-y-0.5">
        <div>• db.t3.medium ~$0.068/hr</div>
        <div>• db.r5.large ~$0.240/hr</div>
        <div>• Multi-AZ doubles instance cost</div>
        <div>• Storage: gp3 $0.115/GB/mo</div>
        <div>• Aurora pricing differs by engine</div>
      </div>
    </div>
  ),
  lambda: (
    <div className="space-y-2">
      <div className="font-semibold text-gray-700">📨 Billed per request + GB-sec</div>
      <div className="text-gray-500 space-y-0.5">
        <div className="font-medium text-gray-600">Formula:</div>
        <div>invocations × duration(s) × memory(GB)</div>
        <div className="font-medium text-gray-600 pt-1">Rates:</div>
        <div>• Requests: $0.20/million</div>
        <div>• Duration: $0.0000166667/GB-sec</div>
        <div className="font-medium text-gray-600 pt-1">Free tier/mo:</div>
        <div>• 1M requests + 400K GB-sec</div>
      </div>
    </div>
  ),
  vpc: (
    <div className="space-y-2">
      <div className="font-semibold text-gray-700">🔁 Billed by NAT + data processed</div>
      <div className="text-gray-500 space-y-0.5">
        <div>• NAT Gateway: $0.045/hr each</div>
        <div>• Data processed: $0.045/GB</div>
        <div>• VPN connection: $0.05/hr each</div>
        <div>• VPC itself has no hourly charge</div>
      </div>
    </div>
  ),
  alb: (
    <div className="space-y-2">
      <div className="font-semibold text-gray-700">⚖️ Billed per hour + LCU</div>
      <div className="text-gray-500 space-y-0.5">
        <div>• Fixed: $0.008/hr</div>
        <div>• LCU: $0.008/hr per unit</div>
        <div className="font-medium text-gray-600 pt-1">1 LCU ≈ (max of):</div>
        <div>• 25 new connections/sec</div>
        <div>• 3,000 active connections/min</div>
        <div>• 1 GB/hr data transfer</div>
      </div>
    </div>
  ),
  cloudfront: (
    <div className="space-y-2">
      <div className="font-semibold text-gray-700">🌍 Billed by data transfer + requests</div>
      <div className="text-gray-500 space-y-0.5">
        <div>• Data out: $0.0085/GB (first 10TB)</div>
        <div>• HTTP: $0.0075/10K requests</div>
        <div>• HTTPS: $0.0100/10K requests</div>
        <div className="font-medium text-gray-600 pt-1">Free tier/mo:</div>
        <div>• 1TB data out + 10M requests</div>
      </div>
    </div>
  ),
  elasticache: (
    <div className="space-y-2">
      <div className="font-semibold text-gray-700">⏱ Billed per node-hour</div>
      <div className="text-gray-500 space-y-0.5">
        <div>• cache.t3.micro ~$0.017/hr</div>
        <div>• cache.r6g.large ~$0.166/hr</div>
        <div>• Multi-AZ adds replica nodes</div>
        <div>• No separate storage charge</div>
      </div>
    </div>
  ),
  sqs: (
    <div className="space-y-2">
      <div className="font-semibold text-gray-700">📨 Billed per request</div>
      <div className="text-gray-500 space-y-0.5">
        <div>• First 1M requests/mo: free</div>
        <div>• Standard: $0.40/million</div>
        <div>• FIFO: $0.50/million</div>
        <div>• 64KB payload = 1 request</div>
      </div>
    </div>
  ),
  apigateway: (
    <div className="space-y-2">
      <div className="font-semibold text-gray-700">🔗 Billed per API call + data</div>
      <div className="text-gray-500 space-y-0.5">
        <div>• REST API: $3.50/million calls</div>
        <div>• HTTP API: $1.00/million calls</div>
        <div>• WebSocket: $1.00/million messages</div>
        <div>• First 1M calls/mo free (REST/HTTP)</div>
        <div>• Data out at standard rates</div>
      </div>
    </div>
  ),
  bedrock: (
    <div className="space-y-2">
      <div className="font-semibold text-gray-700">🧠 Billed per token</div>
      <div className="text-gray-500 space-y-0.5">
        <div className="font-medium text-gray-600">Per 1K tokens (input / output):</div>
        <div>• Haiku: $0.00025 / $0.00125</div>
        <div>• Sonnet: $0.003 / $0.015</div>
        <div>• Opus: $0.015 / $0.075</div>
        <div>• Titan Text: $0.0008 / $0.0008</div>
        <div className="pt-1">No free tier — pure pay-per-token</div>
      </div>
    </div>
  ),
  ebs: (
    <div className="space-y-2">
      <div className="font-semibold text-gray-700">💾 Billed per GB-month</div>
      <div className="text-gray-500 space-y-0.5">
        <div>• gp3: $0.08/GB/mo (default)</div>
        <div>• gp2: $0.10/GB/mo</div>
        <div>• io1: $0.125/GB + $0.065/IOPS/mo</div>
        <div>• io2: $0.125/GB + $0.065/IOPS/mo</div>
        <div>• st1 throughput: $0.045/GB/mo</div>
        <div>• sc1 cold: $0.025/GB/mo</div>
      </div>
    </div>
  ),
  lightsail: (
    <div className="space-y-2">
      <div className="font-semibold text-gray-700">📋 Flat monthly rate (all-in)</div>
      <div className="text-gray-500 space-y-0.5">
        <div>• nano $3.50 — 512MB RAM, 20GB SSD</div>
        <div>• micro $5 — 1GB RAM, 40GB SSD</div>
        <div>• small $10 — 2GB RAM, 60GB SSD</div>
        <div>• medium $20 — 4GB RAM, 80GB SSD</div>
        <div>• large $40 — 8GB RAM, 160GB SSD</div>
        <div>• xlarge $80 — 16GB RAM, 320GB SSD</div>
        <div className="pt-1">Includes bandwidth allowance per plan</div>
      </div>
    </div>
  ),
  cognito: (
    <div className="space-y-2">
      <div className="font-semibold text-gray-700">👤 Billed per MAU</div>
      <div className="text-gray-500 space-y-0.5">
        <div className="font-medium text-gray-600">MAU = user authenticates ≥1× in month</div>
        <div>• First 10,000 MAU: free</div>
        <div>• 10K–50K: $0.0055/MAU</div>
        <div>• 50K–100K: $0.0046/MAU</div>
        <div>• 100K+: $0.00325/MAU</div>
        <div>• Advanced security: +$0.05/MAU</div>
      </div>
    </div>
  ),
  route53: (
    <div className="space-y-2">
      <div className="font-semibold text-gray-700">🌐 Billed by zones + queries</div>
      <div className="text-gray-500 space-y-0.5">
        <div>• Hosted zone: $0.50/mo each</div>
        <div>• DNS queries: $0.40/million</div>
        <div>• Health check: $0.50/mo each</div>
        <div>• Latency/geo routing: $0.60/million</div>
        <div>• No free tier on hosted zones</div>
      </div>
    </div>
  ),
  dynamodb: (
    <div className="space-y-2">
      <div className="font-semibold text-gray-700">⚡ On-demand or Provisioned</div>
      <div className="text-gray-500 space-y-0.5">
        <div className="font-medium text-gray-600">On-demand (pay per request):</div>
        <div>• Read: $0.25/million RRU</div>
        <div>• Write: $1.25/million WRU</div>
        <div className="font-medium text-gray-600 pt-1">Provisioned (reserve capacity):</div>
        <div>• RCU: $0.0949/unit/mo</div>
        <div>• WCU: $0.4745/unit/mo</div>
        <div className="font-medium text-gray-600 pt-1">Storage: $0.25/GB/mo</div>
        <div>Free tier: 25 RCU + 25 WCU + 25GB</div>
      </div>
    </div>
  ),
  redshift: (
    <div className="space-y-2">
      <div className="font-semibold text-gray-700">⏱ Billed per node-hour</div>
      <div className="text-gray-500 space-y-0.5">
        <div className="font-medium text-gray-600">Formula: nodes × hours × rate</div>
        <div>• dc2.large: $0.25/hr/node</div>
        <div>• dc2.8xlarge: $4.80/hr/node</div>
        <div>• ra3.xlplus: $1.086/hr/node</div>
        <div>• ra3.4xlarge: $3.26/hr/node</div>
        <div>• ra3.16xlarge: $13.04/hr/node</div>
        <div>• ra3 storage billed separately per GB</div>
      </div>
    </div>
  ),
};

interface Props { nodeId: string; onClose: () => void; }

export function NodeConfigPanel({ nodeId, onClose }: Props) {
  const { nodes, edges, billingModel, updateNodeConfig, updateNodeMeta, updateNodeRegion } = useCanvasStore();
  const node = nodes.find((n) => n.id === nodeId);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  if (!node) return null;

  const cfg = node.data.config as any;
  const isGroup = node.type === "group";

  const costResult = calculateDiagramCost(nodes, edges, billingModel);
  const nodeCost = costResult.perNode.find((c) => c.nodeId === nodeId);
  const monthly = nodeCost?.monthly ?? 0;
  const base = nodeCost?.baseMonthly ?? monthly;
  const discountPct = node.data.discount ?? 0;
  const savings = base - monthly;

  // ── Helpers ───────────────────────────────────────────────────────────────

  const field = (label: string, children: React.ReactNode) => (
    <label className="flex flex-col gap-1 text-xs text-gray-600">
      <span className="font-medium">{label}</span>
      {children}
    </label>
  );

  const inp = (key: string, type = "text", opts?: { min?: number; step?: number; max?: number }) => (
    <input
      type={type}
      className="border rounded px-2 py-1 text-sm w-full focus:outline-none focus:ring-1 focus:ring-blue-400"
      value={cfg[key] ?? ""}
      onChange={(e) => updateNodeConfig(nodeId, { [key]: type === "number" ? Number(e.target.value) : e.target.value } as any)}
      {...opts}
    />
  );

  const sel = (key: string, options: string[]) => {
    const listId = `datalist-${nodeId}-${key}`;
    return (
      <>
        <input
          list={listId}
          className="border rounded px-2 py-1 text-sm w-full focus:outline-none focus:ring-1 focus:ring-blue-400"
          value={(cfg[key] as string) ?? options[0]}
          onChange={(e) => updateNodeConfig(nodeId, { [key]: e.target.value } as any)}
          placeholder={options[0]}
        />
        <datalist id={listId}>
          {options.map((o) => <option key={o} value={o} />)}
        </datalist>
      </>
    );
  };

  const chk = (key: string, label: string) => (
    <label className="flex items-center gap-2 text-sm cursor-pointer">
      <input type="checkbox" checked={!!cfg[key]}
        onChange={(e) => updateNodeConfig(nodeId, { [key]: e.target.checked } as any)}
        className="w-4 h-4" />
      {label}
    </label>
  );

  const sectionTitle = (t: string) => (
    <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider pt-1">{t}</div>
  );

  return (
    <div
      ref={panelRef}
      className="absolute left-full ml-3 top-0 z-50 w-80 bg-white rounded-xl shadow-2xl border border-gray-100 p-4 space-y-3 nodrag nopan nowheel"
      style={{ maxHeight: "85vh", overflowY: "auto" }}
      onWheel={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-800 capitalize">
          {node.type === "group" ? `${cfg.groupType ?? "Group"} Group` : `${node.type.replace("_", " ")} Config`}
        </h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={16} /></button>
      </div>

      {/* Cost preview — not for groups or sticky notes */}
      {!isGroup && node.type !== "sticky_note" && (
        <div className="rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 px-3 py-2.5 space-y-1">
          <div className="flex items-end justify-between">
            <div>
              <div className="text-[10px] text-blue-500 font-semibold uppercase tracking-wide">Estimated cost</div>
              <div className="text-xl font-bold text-gray-900">
                {fmtTHB(monthly * DEFAULT_RATE)}
                <span className="text-xs font-normal text-gray-400 ml-1">/mo</span>
              </div>
              <div className="text-xs text-gray-400">{fmtUSD(monthly)} · {fmtTHB(monthly * 12 * DEFAULT_RATE)}/yr</div>
            </div>
            {savings > 0.001 && (
              <div className="text-right">
                <div className="text-[10px] text-green-500 font-semibold">Discount {discountPct}%</div>
                <div className="text-sm font-semibold text-green-600">–{fmtTHB(savings * DEFAULT_RATE)}</div>
                <div className="text-[10px] text-gray-400">was {fmtUSD(base)}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Identity ─────────────────────────────────────────────────────── */}
      {sectionTitle("Identity")}

      {field("Label",
        <input type="text"
          className="border rounded px-2 py-1 text-sm w-full focus:outline-none focus:ring-1 focus:ring-blue-400"
          value={node.data.label}
          onChange={(e) => updateNodeMeta(nodeId, { label: e.target.value })}
        />
      )}

      {/* Description — for all AWS nodes and non-group/sticky nodes */}
      {!isGroup && node.type !== "sticky_note" && (
        field("Description",
          <textarea
            rows={2}
            placeholder="Add a description…"
            className="border rounded px-2 py-1 text-sm w-full focus:outline-none focus:ring-1 focus:ring-blue-400 resize-none"
            value={(cfg.description as string) ?? ""}
            onChange={(e) => updateNodeConfig(nodeId, { description: e.target.value } as any)}
          />
        )
      )}

      {/* Region/AZ — not for groups */}
      {!isGroup && (<>
        {field("Region",
          <>
            <input
              list="datalist-regions"
              className="border rounded px-2 py-1 text-sm w-full focus:outline-none focus:ring-1 focus:ring-blue-400"
              value={node.region}
              onChange={(e) => updateNodeRegion(nodeId, e.target.value)}
              placeholder="e.g. ap-southeast-1"
            />
            <datalist id="datalist-regions">
              {REGIONS.map((r) => <option key={r} value={r} />)}
            </datalist>
          </>
        )}
        {field("Availability Zone (optional)",
          <input type="text" placeholder="e.g. ap-southeast-1a"
            className="border rounded px-2 py-1 text-sm w-full focus:outline-none focus:ring-1 focus:ring-blue-400"
            value={node.availabilityZone ?? ""}
            onChange={(e) => updateNodeRegion(nodeId, node.region, e.target.value || undefined)}
          />
        )}
      </>)}

      {/* ── Group config ──────────────────────────────────────────────────── */}
      {isGroup && (<>
        <hr className="border-gray-100" />
        {sectionTitle("Group Settings")}
        {field("Group Type",
          <select className="border rounded px-2 py-1 text-sm w-full focus:outline-none focus:ring-1 focus:ring-blue-400"
            value={cfg.groupType ?? "infrastructure"}
            onChange={(e) => updateNodeConfig(nodeId, { groupType: e.target.value as GroupType } as any)}
          >
            <option value="infrastructure">Infrastructure</option>
            <option value="external">External Services</option>
            <option value="implementation">Implementation</option>
            <option value="custom">Custom</option>
          </select>
        )}
        {field("One-time Setup Cost (USD)",
          <div className="flex gap-1 items-center">
            <span className="text-xs text-gray-400">$</span>
            <input type="number" min={0} step={100}
              className="border rounded px-2 py-1 text-sm flex-1 focus:outline-none focus:ring-1 focus:ring-blue-400"
              placeholder="0"
              value={cfg.setupCostUSD ?? ""}
              onChange={(e) => updateNodeConfig(nodeId, { setupCostUSD: e.target.value === "" ? 0 : Number(e.target.value) } as any)}
            />
          </div>
        )}
        {(cfg.setupCostUSD ?? 0) > 0 && (
          <div className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded px-2 py-1">
            One-time: {fmtTHB(cfg.setupCostUSD * DEFAULT_RATE)} · {fmtUSD(cfg.setupCostUSD)}
          </div>
        )}
      </>)}

      {/* ── Pricing override — not for groups / sticky notes ─────────────── */}
      {!isGroup && node.type !== "sticky_note" && (<>
        <hr className="border-gray-100" />
        {sectionTitle("Pricing Override")}

        {field("Manual cost (USD/mo) — overrides computed",
          <div className="flex gap-2 items-center">
            <input type="number" min={0} step={0.01}
              className="border rounded px-2 py-1 text-sm flex-1 focus:outline-none focus:ring-1 focus:ring-blue-400"
              placeholder="Leave blank to use computed"
              value={node.data.costOverride ?? ""}
              onChange={(e) => {
                const v = e.target.value;
                updateNodeMeta(nodeId, { costOverride: v === "" ? null : Number(v) });
              }}
            />
            {node.data.costOverride !== undefined && (
              <button className="text-xs text-red-400 hover:text-red-600 whitespace-nowrap"
                onClick={() => updateNodeMeta(nodeId, { costOverride: null })}>
                Clear
              </button>
            )}
          </div>
        )}

        {field("Discount (%)",
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <input type="range" min={0} max={100} step={1}
                className="flex-1 accent-blue-500"
                value={discountPct}
                onChange={(e) => updateNodeMeta(nodeId, { discount: Number(e.target.value) })}
              />
              <input type="number" min={0} max={100} step={1}
                className="border rounded px-2 py-1 text-sm w-16 text-center focus:outline-none focus:ring-1 focus:ring-blue-400"
                value={discountPct}
                onChange={(e) => updateNodeMeta(nodeId, { discount: Math.min(100, Math.max(0, Number(e.target.value))) })}
              />
              <span className="text-xs text-gray-400">%</span>
            </div>
            {discountPct > 0 && (
              <div className="text-[10px] text-green-600">
                Saves {fmtTHB(savings * DEFAULT_RATE)}/mo · {fmtTHB(savings * 12 * DEFAULT_RATE)}/yr
              </div>
            )}
          </div>
        )}
      </>)}

      {/* ── Service Configuration ─────────────────────────────────────────── */}
      {!isGroup && node.type !== "sticky_note" && (
        <hr className="border-gray-100" />
      )}
      {!isGroup && node.type !== "sticky_note" && sectionTitle("Service Configuration")}

      {/* EC2 */}
      {node.type === "ec2" && (<>
        {field("Instance Type", sel("instanceType", INSTANCE_TYPES))}
        {field("Count", inp("count", "number", { min: 1 }))}
        {field("OS", sel("operatingSystem", ["Linux", "Windows", "RHEL"]))}
        {field("Tenancy",
          <select
            className="border rounded px-2 py-1 text-sm w-full focus:outline-none focus:ring-1 focus:ring-blue-400"
            value={(cfg as any).tenancy ?? "shared"}
            onChange={(e) => updateNodeConfig(nodeId, { tenancy: e.target.value } as any)}
          >
            <option value="shared">Shared (standard)</option>
            <option value="dedicated">Dedicated Instance (+10%)</option>
            <option value="host">Dedicated Host (×2.0)</option>
          </select>
        )}
        {field("Utilization Hours/mo", inp("utilizationHours", "number", { min: 1 }))}
        {field("EBS Volume (GB)", inp("ebsVolumeGb", "number", { min: 1 }))}
        {field("EBS Type", sel("ebsType", ["gp3", "gp2", "io1", "st1", "sc1"]))}
        {field("Hourly Rate Override (USD/hr)",
          <input
            type="number" min={0} step={0.001}
            className="border rounded px-2 py-1 text-sm w-full focus:outline-none focus:ring-1 focus:ring-blue-400"
            value={(cfg as any).costPerHourOverride ?? ""}
            placeholder="Auto (from instance type)"
            onChange={(e) => {
              const v = e.target.value;
              updateNodeConfig(nodeId, { costPerHourOverride: v === "" ? undefined : Number(v) } as any);
            }}
          />
        )}
        <hr className="border-gray-100" />
        {sectionTitle("Auto Scaling")}
        {chk("autoScaling.enabled", "Enable ASG")}
        {cfg.autoScaling?.enabled && (<>
          {field("Min", <input type="number" min={1} className="border rounded px-2 py-1 text-sm w-full" value={cfg.autoScaling?.minCapacity ?? 1} onChange={(e) => updateNodeConfig(nodeId, { autoScaling: { ...cfg.autoScaling, minCapacity: Number(e.target.value) } } as any)} />)}
          {field("Desired", <input type="number" min={1} className="border rounded px-2 py-1 text-sm w-full" value={cfg.autoScaling?.desiredCapacity ?? 2} onChange={(e) => updateNodeConfig(nodeId, { autoScaling: { ...cfg.autoScaling, desiredCapacity: Number(e.target.value) } } as any)} />)}
          {field("Max", <input type="number" min={1} className="border rounded px-2 py-1 text-sm w-full" value={cfg.autoScaling?.maxCapacity ?? 6} onChange={(e) => updateNodeConfig(nodeId, { autoScaling: { ...cfg.autoScaling, maxCapacity: Number(e.target.value) } } as any)} />)}
          {field("Policy", <select className="border rounded px-2 py-1 text-sm w-full" value={cfg.autoScaling?.policyType ?? "cpu"} onChange={(e) => updateNodeConfig(nodeId, { autoScaling: { ...cfg.autoScaling, policyType: e.target.value } } as any)}>
            <option value="cpu">CPU</option><option value="memory">Memory</option>
            <option value="requests">Requests</option><option value="schedule">Schedule</option>
          </select>)}
        </>)}
      </>)}

      {/* S3 */}
      {node.type === "s3" && (<>
        {field("Storage (GB)", inp("storageGb", "number", { min: 0 }))}
        {field("Storage Class", sel("storageClass", ["Standard", "IntelligentTiering", "Glacier", "GlacierDeepArchive"]))}
        {field("GET Requests/mo", inp("getRequests", "number", { min: 0 }))}
        {field("PUT Requests/mo", inp("putRequests", "number", { min: 0 }))}
        {field("Data Transfer Out (GB)", inp("dataTransferOutGb", "number", { min: 0 }))}
      </>)}

      {/* RDS */}
      {node.type === "rds" && (<>
        {field("Engine", sel("engine", ["mysql", "postgres", "aurora-mysql", "aurora-postgres", "sqlserver"]))}
        {field("Instance Class", sel("instanceClass", RDS_CLASSES))}
        {chk("multiAz", "Multi-AZ")}
        {field("Storage (GB)", inp("storageGb", "number", { min: 20 }))}
        {field("Storage Type", sel("storageType", ["gp3", "gp2", "io1"]))}
      </>)}

      {/* Lambda */}
      {node.type === "lambda" && (<>
        {field("Invocations/mo", inp("invocationsPerMonth", "number", { min: 0 }))}
        {field("Avg Duration (ms)", inp("avgDurationMs", "number", { min: 1 }))}
        {field("Memory (MB)", sel("memorySizeMb", ["128","256","512","1024","2048","3008"]))}
      </>)}

      {/* VPC */}
      {node.type === "vpc" && (<>
        {field("NAT Gateways", inp("natGatewayCount", "number", { min: 0 }))}
        {field("NAT Data Processed (GB/mo)", inp("natDataProcessedGb", "number", { min: 0 }))}
        {field("VPN Connections", inp("vpnConnectionCount", "number", { min: 0 }))}
      </>)}

      {/* ALB */}
      {node.type === "alb" && (<>
        {field("Data Processed (GB/mo)", inp("dataProcessedGb", "number", { min: 0 }))}
        {field("New Connections/sec", inp("newConnectionsPerSec", "number", { min: 0 }))}
      </>)}

      {/* CloudFront */}
      {node.type === "cloudfront" && (<>
        {field("Data Transfer Out (GB/mo)", inp("dataTransferOutGb", "number", { min: 0 }))}
        {field("HTTP Requests (millions)", inp("httpRequestsMillions", "number", { min: 0, step: 0.1 }))}
        {field("HTTPS Requests (millions)", inp("httpsRequestsMillions", "number", { min: 0, step: 0.1 }))}
      </>)}

      {/* Bedrock */}
      {node.type === "bedrock" && (<>
        {field("Model", sel("model", BEDROCK_MODELS))}
        {field("Input Tokens/mo (thousands)", inp("inputTokensK", "number", { min: 0 }))}
        {field("Output Tokens/mo (thousands)", inp("outputTokensK", "number", { min: 0 }))}
        <div className="text-[10px] text-gray-400 bg-purple-50 rounded px-2 py-1">
          Haiku: $0.00025/$0.00125 · Sonnet: $0.003/$0.015 · Opus: $0.015/$0.075 per 1K tokens (in/out)
        </div>
      </>)}

      {/* EBS */}
      {node.type === "ebs" && (<>
        {field("Volume Type", sel("volumeType", ["gp3","gp2","io1","io2","st1","sc1"]))}
        {field("Size (GB)", inp("sizeGb", "number", { min: 1 }))}
        {(cfg.volumeType === "io1" || cfg.volumeType === "io2") &&
          field("Provisioned IOPS", inp("provisionedIops", "number", { min: 100, step: 100 }))
        }
        <div className="text-[10px] text-gray-400 bg-green-50 rounded px-2 py-1">
          gp3: $0.08/GB · gp2: $0.10/GB · io1/2: $0.125/GB + $0.065/IOPS
        </div>
      </>)}

      {/* Lightsail */}
      {node.type === "lightsail" && (<>
        {field("Plan", sel("plan", LIGHTSAIL_PLANS))}
        <div className="text-[10px] text-gray-400 bg-sky-50 rounded px-2 py-1">
          nano $3.5 · micro $5 · small $10 · medium $20 · large $40 · xlarge $80 /mo
        </div>
      </>)}

      {/* Cognito */}
      {node.type === "cognito" && (<>
        {field("Monthly Active Users (MAU)", inp("mauCount", "number", { min: 0 }))}
        {chk("advancedSecurity", "Advanced Security (+$0.05/MAU)")}
        <div className="text-[10px] text-gray-400 bg-red-50 rounded px-2 py-1">
          First 10K MAU free · 10K–50K: $0.0055 · 50K–100K: $0.0046 · 100K+: $0.00325
        </div>
      </>)}

      {/* Route 53 */}
      {node.type === "route53" && (<>
        {field("Hosted Zones", inp("hostedZoneCount", "number", { min: 1 }))}
        {field("Queries/mo (millions)", inp("queriesMillions", "number", { min: 0, step: 0.1 }))}
        {field("Health Checks", inp("healthCheckCount", "number", { min: 0 }))}
        <div className="text-[10px] text-gray-400 bg-violet-50 rounded px-2 py-1">
          Zone: $0.50/mo · Queries: $0.40/M · Health check: $0.50/mo
        </div>
      </>)}

      {/* DynamoDB */}
      {node.type === "dynamodb" && (<>
        {field("Billing Mode", sel("mode", ["on-demand","provisioned"]))}
        {field("Storage (GB)", inp("storageGb", "number", { min: 0 }))}
        {cfg.mode === "on-demand" ? (<>
          {field("Read Requests/mo (millions)", inp("readRequestMillions", "number", { min: 0, step: 0.1 }))}
          {field("Write Requests/mo (millions)", inp("writeRequestMillions", "number", { min: 0, step: 0.1 }))}
          <div className="text-[10px] text-gray-400 bg-blue-50 rounded px-2 py-1">
            On-demand: $0.25/M reads · $1.25/M writes · $0.25/GB storage
          </div>
        </>) : (<>
          {field("Read Capacity Units (RCU)", inp("readCapacityUnits", "number", { min: 1 }))}
          {field("Write Capacity Units (WCU)", inp("writeCapacityUnits", "number", { min: 1 }))}
          <div className="text-[10px] text-gray-400 bg-blue-50 rounded px-2 py-1">
            Provisioned: $0.0949/RCU/mo · $0.4745/WCU/mo · $0.25/GB storage
          </div>
        </>)}
      </>)}

      {/* Redshift */}
      {node.type === "redshift" && (<>
        {field("Node Type", sel("nodeType", REDSHIFT_NODES))}
        {field("Node Count", inp("nodeCount", "number", { min: 1 }))}
        {field("Utilization Hours/mo", inp("utilizationHours", "number", { min: 1 }))}
        <div className="text-[10px] text-gray-400 bg-red-50 rounded px-2 py-1">
          dc2.large $0.25/hr · dc2.8xlarge $4.80/hr · ra3.xlplus $1.09/hr · ra3.4xlarge $3.26/hr
        </div>
      </>)}

      {/* Custom / External Service */}
      {node.type === "custom" && (() => {
        const billingType = (cfg.billingType as string) ?? "monthly";
        const BILLING_OPTIONS: { value: string; label: string; desc: string; color: string }[] = [
          { value: "monthly",      label: "Monthly",        desc: "Recurring — pay per request or hour",   color: "#3B82F6" },
          { value: "onetime_setup",label: "One-time Setup", desc: "Pay only once at project start",        color: "#F59E0B" },
          { value: "subscribe",    label: "Subscribe",      desc: "Yearly — pay every year",               color: "#8B5CF6" },
          { value: "rounding_bill",label: "Rounding Bill",  desc: "Pay every N years (e.g. licence renewal)", color: "#0EA5E9" },
        ];
        const current = BILLING_OPTIONS.find(o => o.value === billingType) ?? BILLING_OPTIONS[0];
        return (
          <>
            {field("What is this service?",
              <textarea rows={2}
                className="border rounded px-2 py-1 text-sm w-full resize-none focus:outline-none focus:ring-1 focus:ring-blue-400"
                placeholder="e.g. Stripe payment API, SendGrid email…"
                value={cfg.description ?? ""}
                onChange={(e) => updateNodeConfig(nodeId, { description: e.target.value } as any)}
              />
            )}

            {/* Billing type selector */}
            <div className="space-y-1.5">
              <span className="text-xs font-medium text-gray-600">Billing Type</span>
              <div className="grid grid-cols-2 gap-1.5">
                {BILLING_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => updateNodeConfig(nodeId, { billingType: opt.value } as any)}
                    className="text-left rounded-lg border px-2.5 py-2 transition-all"
                    style={billingType === opt.value
                      ? { borderColor: opt.color, background: opt.color + "15", color: opt.color }
                      : { borderColor: "#E5E7EB", background: "white", color: "#6B7280" }}
                  >
                    <div className="text-xs font-semibold leading-tight">{opt.label}</div>
                    <div className="text-[9px] leading-tight mt-0.5 opacity-70">{opt.desc}</div>
                  </button>
                ))}
              </div>
              <div className="text-[10px] px-2 py-1 rounded" style={{ background: current.color + "12", color: current.color }}>
                {billingType === "monthly"       && "Cost = (requests × rate) + (hours × rate) per month"}
                {billingType === "onetime_setup" && "Cost shown as one-time upfront payment at project start"}
                {billingType === "subscribe"     && "Cost = total ÷ 12 monthly equivalent · paid yearly"}
                {billingType === "rounding_bill" && "Cost = total ÷ (N years × 12) monthly equivalent"}
              </div>
            </div>

            {/* Monthly fields */}
            {billingType === "monthly" && (<>
              <div className="rounded-lg bg-blue-50 border border-blue-100 px-3 py-2 space-y-2">
                <div className="text-[10px] font-semibold text-blue-500 uppercase tracking-wide">Cost by Request</div>
                {field("Cost per request (USD)", inp("costPerRequest", "number", { min: 0, step: 0.000001 }))}
                {field("Requests per month", inp("requestsPerMonth", "number", { min: 0 }))}
              </div>
              <div className="rounded-lg bg-purple-50 border border-purple-100 px-3 py-2 space-y-2">
                <div className="text-[10px] font-semibold text-purple-500 uppercase tracking-wide">Cost by Hour</div>
                {field("Cost per hour (USD)", inp("costPerHour", "number", { min: 0, step: 0.001 }))}
                {field("Hours per month", inp("hoursPerMonth", "number", { min: 0, max: 744 }))}
              </div>
            </>)}

            {/* One-time setup */}
            {billingType === "onetime_setup" && (
              <div className="rounded-lg bg-amber-50 border border-amber-100 px-3 py-2 space-y-2">
                <div className="text-[10px] font-semibold text-amber-600 uppercase tracking-wide">One-time Amount</div>
                {field("Total cost (USD)", inp("totalCostUSD", "number", { min: 0, step: 1 }))}
                <div className="text-[10px] text-amber-500">
                  {((cfg.totalCostUSD as number) ?? 0) > 0
                    ? `฿${((cfg.totalCostUSD as number) * DEFAULT_RATE).toLocaleString()} · $${(cfg.totalCostUSD as number).toFixed(2)}`
                    : "Enter amount above"}
                </div>
              </div>
            )}

            {/* Subscribe (yearly) */}
            {billingType === "subscribe" && (
              <div className="rounded-lg bg-purple-50 border border-purple-100 px-3 py-2 space-y-2">
                <div className="text-[10px] font-semibold text-purple-600 uppercase tracking-wide">Yearly Subscription</div>
                {field("Cost per year (USD)", inp("totalCostUSD", "number", { min: 0, step: 1 }))}
                <div className="text-[10px] text-purple-500">
                  {((cfg.totalCostUSD as number) ?? 0) > 0
                    ? `≈ $${((cfg.totalCostUSD as number) / 12).toFixed(2)}/mo · ฿${((cfg.totalCostUSD as number) / 12 * DEFAULT_RATE).toLocaleString()}/mo`
                    : "Enter yearly amount above"}
                </div>
              </div>
            )}

            {/* Rounding bill (every N years) */}
            {billingType === "rounding_bill" && (
              <div className="rounded-lg bg-sky-50 border border-sky-100 px-3 py-2 space-y-2">
                <div className="text-[10px] font-semibold text-sky-600 uppercase tracking-wide">Periodic Payment</div>
                {field("Total cost (USD)", inp("totalCostUSD", "number", { min: 0, step: 1 }))}
                {field("Pay every N years", inp("intervalYears", "number", { min: 1, step: 1 }))}
                {((cfg.totalCostUSD as number) ?? 0) > 0 && (() => {
                  const yrs = Math.max(1, (cfg.intervalYears as number) ?? 3);
                  const mo = (cfg.totalCostUSD as number) / (yrs * 12);
                  return (
                    <div className="text-[10px] text-sky-500">
                      ≈ ${mo.toFixed(2)}/mo · ฿{(mo * DEFAULT_RATE).toLocaleString()}/mo (amortised)
                    </div>
                  );
                })()}
              </div>
            )}
          </>
        );
      })()}
    </div>
  );
}
