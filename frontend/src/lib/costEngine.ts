/**
 * Client-side cost engine — mirrors backend/src/cost/calculator.ts.
 * Used for instant UI updates without a round-trip.
 */
import type {
  CanvasNode, CanvasEdge, DiagramCost, NodeCost, SetupCost,
  BillingModel, AWSServiceType,
  EC2Config, S3Config, RDSConfig, LambdaConfig, VPCConfig, ALBConfig, CloudFrontConfig,
  BedrockConfig, EBSConfig, LightsailConfig, CognitoConfig,
  Route53Config, DynamoDBConfig, RedshiftConfig, GroupConfig, CustomServiceConfig,
  DepartmentRate,
} from "../types.ts";

// ── Pricing tables ────────────────────────────────────────────────────────

const REGION_MULT: Record<string, number> = {
  "us-east-1": 1.000, "us-east-2": 1.000, "us-west-1": 1.120, "us-west-2": 1.000,
  "eu-west-1": 1.080, "eu-central-1": 1.098, "ap-southeast-1": 1.130,
  "ap-southeast-2": 1.135, "ap-northeast-1": 1.150, "ap-south-1": 1.080, "sa-east-1": 1.340,
};

const EC2_HOURLY: Record<string, number> = {
  "t3.nano": 0.0052, "t3.micro": 0.0104, "t3.small": 0.0208, "t3.medium": 0.0416,
  "t3.large": 0.0832, "t3.xlarge": 0.1664, "t3.2xlarge": 0.3328,
  "m5.large": 0.096, "m5.xlarge": 0.192, "m5.2xlarge": 0.384, "m5.4xlarge": 0.768,
  "c5.large": 0.085, "c5.xlarge": 0.17, "c5.2xlarge": 0.34, "c5.4xlarge": 0.68,
  "r5.large": 0.126, "r5.xlarge": 0.252, "r5.2xlarge": 0.504,
};

const RDS_HOURLY: Record<string, number> = {
  "db.t3.micro": 0.017, "db.t3.small": 0.034, "db.t3.medium": 0.068,
  "db.t3.large": 0.136, "db.r5.large": 0.24, "db.r5.xlarge": 0.48,
  "db.m5.large": 0.171, "db.m5.xlarge": 0.342,
};

const BILLING_FACTOR: Record<BillingModel, number> = {
  ondemand: 1.0, reserved1yr: 0.6, reserved3yr: 0.4, spot: 0.3,
};

const EBS_PRICE: Record<string, number> = {
  gp3: 0.08, gp2: 0.10, io1: 0.125, io2: 0.125, st1: 0.045, sc1: 0.025,
};
const EBS_IOPS_PRICE: Record<string, number> = { io1: 0.065, io2: 0.065 };

const BEDROCK_PRICING: Record<string, { input: number; output: number }> = {
  "claude-3-haiku":  { input: 0.00025,  output: 0.00125 },
  "claude-3-sonnet": { input: 0.003,    output: 0.015   },
  "claude-3-opus":   { input: 0.015,    output: 0.075   },
  "titan-text":      { input: 0.0002,   output: 0.0006  },
};

const LIGHTSAIL_MONTHLY: Record<string, number> = {
  nano: 3.5, micro: 5, small: 10, medium: 20, large: 40, xlarge: 80, "2xlarge": 160,
};

const REDSHIFT_HOURLY: Record<string, number> = {
  "dc2.large": 0.25, "dc2.8xlarge": 4.80,
  "ra3.xlplus": 1.086, "ra3.4xlarge": 3.26, "ra3.16xlarge": 13.04,
};

function regionMult(region: string) { return REGION_MULT[region] ?? 1.0; }

// ── Main export ───────────────────────────────────────────────────────────

export function calculateDiagramCost(
  nodes: CanvasNode[],
  edges: CanvasEdge[],
  billingModel: BillingModel,
  departmentRates: DepartmentRate[] = []
): DiagramCost {
  const perNode: NodeCost[] = nodes
    .filter((n) => n.type !== "sticky_note" && n.type !== "group" && n.type !== "textbox" && n.type !== "circle")
    .map((n) => nodeC(n, billingModel, departmentRates));

  const edgeCosts = edges.map((e) => {
    const src = nodes.find((n) => n.id === e.source);
    const tgt = nodes.find((n) => n.id === e.target);
    const gb = e.dataTransferGbPerMonth ?? 0;
    let cost = 0;
    if (src && tgt) {
      if (src.region !== tgt.region) cost = gb * 0.02;
      else if (src.availabilityZone && tgt.availabilityZone && src.availabilityZone !== tgt.availabilityZone) cost = gb * 0.01;
    }
    return { edgeId: e.id, gb, cost };
  });

  const xferTotal = edgeCosts.reduce((s, e) => s + e.cost, 0);
  const nodeTotal = perNode.reduce((s, n) => s + n.monthly, 0);
  const totalMonthly = nodeTotal + xferTotal;

  // One-time setup costs from group nodes
  const setupCosts: SetupCost[] = nodes
    .filter((n) => n.type === "group")
    .map((n) => {
      const c = n.data.config as GroupConfig;
      return { nodeId: n.id, label: n.data.label, groupType: c.groupType, amountUSD: c.setupCostUSD ?? 0 };
    })
    .filter((s) => s.amountUSD > 0);

  return {
    total: { monthly: totalMonthly, yearly: totalMonthly * 12 },
    perNode,
    dataTransfer: { monthly: xferTotal, details: edgeCosts },
    billingModel,
    setupCosts,
  };
}

// ── Per-node cost ─────────────────────────────────────────────────────────

function nodeC(node: CanvasNode, billing: BillingModel, departmentRates: DepartmentRate[]): NodeCost {
  const r = node.region ?? "us-east-1";
  const rm = regionMult(r);
  const bf = BILLING_FACTOR[billing];

  if (node.type === "ec2") {
    const c = node.data.config as EC2Config;
    const TENANCY_MULT: Record<string, number> = { shared: 1.0, dedicated: 1.1, host: 2.0 };
    const tenancyMult = TENANCY_MULT[c.tenancy ?? "shared"] ?? 1.0;
    // costPerHourOverride replaces the fully-computed hourly rate (no extra multipliers applied)
    const h = c.costPerHourOverride !== undefined
      ? c.costPerHourOverride
      : (EC2_HOURLY[c.instanceType] ?? 0.10) * rm * bf * tenancyMult;
    const compute = h * c.utilizationHours;
    const ebs = c.ebsVolumeGb * (EBS_PRICE[c.ebsType] ?? 0.08);
    const perInst = compute + ebs;
    let monthly = perInst * c.count;
    let monthlyMin: number | undefined, monthlyMax: number | undefined;
    if (c.autoScaling?.enabled) {
      monthly = perInst * c.autoScaling.desiredCapacity;
      monthlyMin = perInst * c.autoScaling.minCapacity;
      monthlyMax = perInst * c.autoScaling.maxCapacity;
    }
    return mk(node, "ec2", monthly, { compute: compute * c.count, ebs: ebs * c.count }, monthlyMin, monthlyMax);
  }

  if (node.type === "s3") {
    const c = node.data.config as S3Config;
    const STORAGE_PRICE: Record<string, number> = {
      Standard: 0.023, IntelligentTiering: 0.023, Glacier: 0.004, GlacierDeepArchive: 0.00099,
    };
    const storage = c.storageGb * (STORAGE_PRICE[c.storageClass] ?? 0.023);
    const gets = (c.getRequests / 1000) * 0.0004;
    const puts = (c.putRequests / 1000) * 0.005;
    const xfer = tieredEgress(c.dataTransferOutGb);
    return mk(node, "s3", storage + gets + puts + xfer, { storage, requests: gets + puts, transfer: xfer });
  }

  if (node.type === "rds") {
    const c = node.data.config as RDSConfig;
    const h = (RDS_HOURLY[c.instanceClass] ?? 0.10) * rm * bf;
    const inst = h * 730 * (c.multiAz ? 2 : 1);
    const storage = c.storageGb * (EBS_PRICE[c.storageType] ?? 0.10);
    let monthlyMin: number | undefined, monthlyMax: number | undefined;
    if (c.autoScaling?.enabled) {
      const base = h * 730 * (c.multiAz ? 2 : 1);
      const d = c.autoScaling.desiredCapacity || 1;
      monthlyMin = (base * c.autoScaling.minCapacity / d) + storage;
      monthlyMax = (base * c.autoScaling.maxCapacity / d) + storage;
    }
    return mk(node, "rds", inst + storage, { instance: inst, storage }, monthlyMin, monthlyMax);
  }

  if (node.type === "lambda") {
    const c = node.data.config as LambdaConfig;
    const reqCost = Math.max(0, c.invocationsPerMonth - 1_000_000) * 0.0000002;
    const gbSec = (c.invocationsPerMonth * c.avgDurationMs) / 1000 / 1024 * c.memorySizeMb;
    const computeCost = Math.max(0, gbSec - 400_000) * 0.0000166667;
    return mk(node, "lambda", reqCost + computeCost, { requests: reqCost, compute: computeCost });
  }

  if (node.type === "vpc") {
    const c = node.data.config as VPCConfig;
    const nat = 0.045 * 730 * c.natGatewayCount + c.natDataProcessedGb * 0.045;
    const vpn = c.vpnConnectionCount * 0.05 * 730;
    return mk(node, "vpc", nat + vpn, { nat, vpn });
  }

  if (node.type === "alb") {
    const c = node.data.config as ALBConfig;
    const monthly = 0.008 * 730 + c.dataProcessedGb * 0.008;
    return mk(node, "alb", monthly, { lcu: monthly });
  }

  if (node.type === "cloudfront") {
    const c = node.data.config as CloudFrontConfig;
    const monthly = c.dataTransferOutGb * 0.0085 + (c.httpRequestsMillions + c.httpsRequestsMillions) * 0.01;
    return mk(node, "cloudfront", monthly, { transfer: monthly });
  }

  if (node.type === "custom") {
    const c = node.data.config as CustomServiceConfig;
    const billingType = c.billingType ?? "monthly";
    if (billingType === "onetime_setup") {
      // One-time cost — not included in monthly recurring
      return mk(node, "custom", 0, {});
    }
    if (billingType === "subscribe") {
      // Yearly subscription — amortised to monthly equivalent
      const monthly = (c.totalCostUSD ?? 0) / 12;
      return mk(node, "custom", monthly, { subscribe: monthly });
    }
    if (billingType === "rounding_bill") {
      // Periodic payment every N years — amortised to monthly equivalent
      const yrs = Math.max(1, c.intervalYears ?? 3);
      const monthly = (c.totalCostUSD ?? 0) / (yrs * 12);
      return mk(node, "custom", monthly, { rounding: monthly });
    }
    // monthly (default): pay per request + per hour
    const requestCost = (c.costPerRequest ?? 0) * (c.requestsPerMonth ?? 0);
    const hourCost    = (c.costPerHour ?? 0) * (c.hoursPerMonth ?? 0);
    return mk(node, "custom", requestCost + hourCost, { requests: requestCost, hours: hourCost });
  }

  // ── New services ──────────────────────────────────────────────────────────

  if (node.type === "bedrock") {
    const c = node.data.config as BedrockConfig;
    const p = BEDROCK_PRICING[c.model] ?? BEDROCK_PRICING["claude-3-haiku"];
    const input  = c.inputTokensK  * p.input;
    const output = c.outputTokensK * p.output;
    return mk(node, "bedrock", input + output, { input, output });
  }

  if (node.type === "ebs") {
    const c = node.data.config as EBSConfig;
    const storage = c.sizeGb * (EBS_PRICE[c.volumeType] ?? 0.08);
    const iopsPrice = EBS_IOPS_PRICE[c.volumeType];
    const iops = iopsPrice && c.provisionedIops ? c.provisionedIops * iopsPrice : 0;
    return mk(node, "ebs", storage + iops, { storage, iops });
  }

  if (node.type === "lightsail") {
    const c = node.data.config as LightsailConfig;
    const monthly = LIGHTSAIL_MONTHLY[c.plan] ?? 10;
    return mk(node, "lightsail", monthly, { instance: monthly });
  }

  if (node.type === "cognito") {
    const c = node.data.config as CognitoConfig;
    const monthly = cognitoCost(c.mauCount, c.advancedSecurity);
    return mk(node, "cognito", monthly, { mau: monthly });
  }

  if (node.type === "route53") {
    const c = node.data.config as Route53Config;
    const zones  = Math.min(c.hostedZoneCount, 25) * 0.50 + Math.max(0, c.hostedZoneCount - 25) * 0.10;
    const queries = c.queriesMillions * 0.40;
    const hc     = c.healthCheckCount * 0.50;
    return mk(node, "route53", zones + queries + hc, { zones, queries, healthChecks: hc });
  }

  if (node.type === "dynamodb") {
    const c = node.data.config as DynamoDBConfig;
    const storage = c.storageGb * 0.25;
    let rw = 0;
    if (c.mode === "on-demand") {
      rw = c.readRequestMillions * 0.25 + c.writeRequestMillions * 1.25;
    } else {
      rw = c.readCapacityUnits * 0.00013 * 730 + c.writeCapacityUnits * 0.00065 * 730;
    }
    return mk(node, "dynamodb", storage + rw, { storage, readWrite: rw });
  }

  if (node.type === "redshift") {
    const c = node.data.config as RedshiftConfig;
    const h = (REDSHIFT_HOURLY[c.nodeType] ?? 0.25) * bf;
    const monthly = h * c.nodeCount * c.utilizationHours;
    return mk(node, "redshift", monthly, { compute: monthly });
  }

  // elasticache, sqs, apigateway — approximate costs
  if (node.type === "elasticache") {
    const c = node.data.config as any;
    const CACHE_HOURLY: Record<string, number> = {
      "cache.t3.micro": 0.017, "cache.t3.small": 0.034, "cache.t3.medium": 0.068,
      "cache.r6g.large": 0.166, "cache.r6g.xlarge": 0.332,
    };
    const monthly = (CACHE_HOURLY[c.nodeType] ?? 0.034) * rm * bf * 730 * (c.nodeCount ?? 1);
    return mk(node, "elasticache", monthly, { compute: monthly });
  }

  if (node.type === "sqs") {
    const c = node.data.config as any;
    const requests = c.requests ?? 1_000_000;
    const free = 1_000_000;
    const billable = Math.max(0, requests - free);
    const monthly = (billable / 1_000_000) * 0.40;
    return mk(node, "sqs", monthly, { requests: monthly });
  }

  if (node.type === "apigateway") {
    const c = node.data.config as any;
    const monthly = ((c.callsPerMonth ?? 1_000_000) / 1_000_000) * 3.50 + (c.dataTransferGb ?? 10) * 0.09;
    return mk(node, "apigateway", monthly, { calls: monthly });
  }

  // Line nodes — cost = manday * department rate (THB / 35 to USD)
  const LINE_TYPES = ["line_image","line_button","line_carousel","line_quick_reply",
    "line_flex_message","line_rich_menu","line_custom_payload",
    "line_api_call","line_ai_agent","line_intent","line_dialog"];
  if (LINE_TYPES.includes(node.type)) {
    const c = node.data.config as any;
    const rate = departmentRates.find(d => d.name === c.department)?.ratePerManday ?? 10000;
    const monthly = (c.manday ?? 1) * rate / 35;
    return mk(node, node.type as AWSServiceType, monthly, { manday: monthly });
  }

  // API nodes — cost = manday * department rate
  const API_TYPES = ["api_rest","api_grpc","api_mcp"];
  if (API_TYPES.includes(node.type)) {
    const c = node.data.config as any;
    const rate = departmentRates.find(d => d.name === c.department)?.ratePerManday ?? 10000;
    const monthly = (c.manday ?? 1) * rate / 35;
    return mk(node, node.type as AWSServiceType, monthly, { manday: monthly });
  }

  return mk(node, node.type as AWSServiceType, 0, {});
}

// ── Helpers ───────────────────────────────────────────────────────────────

function mk(
  node: CanvasNode, type: AWSServiceType, computed: number,
  breakdown: Record<string, number>,
  computedMin?: number, computedMax?: number
): NodeCost {
  const base    = node.data.costOverride !== undefined ? node.data.costOverride : computed;
  const pct     = node.data.discount ?? 0;
  const monthly = base * (1 - pct / 100);
  const monthlyMin = computedMin !== undefined && node.data.costOverride === undefined
    ? computedMin * (1 - pct / 100) : undefined;
  const monthlyMax = computedMax !== undefined && node.data.costOverride === undefined
    ? computedMax * (1 - pct / 100) : undefined;
  return {
    nodeId: node.id, label: node.data.label, serviceType: type,
    monthly, yearly: monthly * 12,
    baseMonthly: base, discountPct: pct,
    monthlyMin, monthlyMax, breakdown,
  };
}

function cognitoCost(mau: number, advancedSecurity: boolean): number {
  const free = 10_000;
  let cost = 0;
  if (mau > free) {
    const t1 = Math.min(mau, 50_000) - free;
    const t2 = Math.max(0, Math.min(mau, 100_000) - 50_000);
    const t3 = Math.max(0, mau - 100_000);
    cost = t1 * 0.0055 + t2 * 0.0046 + t3 * 0.00325;
  }
  if (advancedSecurity) {
    cost += Math.min(mau, 50_000) * 0.05 + Math.max(0, mau - 50_000) * 0.01;
  }
  return cost;
}

function tieredEgress(gb: number): number {
  const tiers = [
    { max: 10_000, p: 0.09 }, { max: 50_000, p: 0.085 },
    { max: 150_000, p: 0.07 }, { max: Infinity, p: 0.05 },
  ];
  let rem = gb, cost = 0, prev = 0;
  for (const t of tiers) {
    const chunk = Math.min(rem, t.max - prev);
    if (chunk <= 0) break;
    cost += chunk * t.p;
    rem -= chunk;
    prev = t.max;
    if (rem <= 0) break;
  }
  return cost;
}
