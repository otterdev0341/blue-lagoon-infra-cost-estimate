import type {
  CanvasNode, CanvasEdge, DiagramCost, NodeCost, EC2Config, S3Config,
  RDSConfig, LambdaConfig, VPCConfig, BillingModel,
} from "../types.ts";
import {
  ec2HourlyPrice, ebsMonthlyPrice, s3MonthlyPrice, rdsMonthlyPrice,
  lambdaMonthlyPrice, natGatewayMonthlyPrice, dataTransferCost,
  type RegionCode,
} from "../pricing/staticPrices.ts";

export function calculateDiagramCost(
  nodes: CanvasNode[],
  edges: CanvasEdge[],
  billingModel: BillingModel
): DiagramCost {
  const perNode: NodeCost[] = nodes
    .filter((n) => n.type !== "sticky_note")
    .map((n) => calculateNodeCost(n, billingModel));

  const edgeCosts = edges.map((e) => {
    const source = nodes.find((n) => n.id === e.source);
    const target = nodes.find((n) => n.id === e.target);
    const gb = e.dataTransferGbPerMonth ?? 0;
    const cost = dataTransferCost(
      gb,
      source?.region ?? "us-east-1",
      target?.region ?? "us-east-1",
      source?.availabilityZone,
      target?.availabilityZone
    );
    return { edgeId: e.id, gb, cost };
  });

  const transferTotal = edgeCosts.reduce((s, e) => s + e.cost, 0);
  const nodeTotal = perNode.reduce((s, n) => s + n.monthly, 0);
  const totalMonthly = nodeTotal + transferTotal;

  return {
    total: { monthly: totalMonthly, yearly: totalMonthly * 12 },
    perNode,
    dataTransfer: { monthly: transferTotal, details: edgeCosts },
    billingModel,
  };
}

function calculateNodeCost(node: CanvasNode, billingModel: BillingModel): NodeCost {
  const region = (node.region ?? "us-east-1") as RegionCode;

  if (node.type === "ec2") {
    const cfg = node.data.config as EC2Config;
    const hourly = ec2HourlyPrice(cfg.instanceType, region, billingModel);
    const compute = hourly * cfg.utilizationHours;
    const ebs = ebsMonthlyPrice(cfg.ebsVolumeGb, cfg.ebsType);

    let monthly = (compute + ebs) * cfg.count;
    let monthlyMin: number | undefined;
    let monthlyMax: number | undefined;

    if (cfg.autoScaling?.enabled) {
      const perInstance = compute + ebs;
      monthly = perInstance * cfg.autoScaling.desiredCapacity;
      monthlyMin = perInstance * cfg.autoScaling.minCapacity;
      monthlyMax = perInstance * cfg.autoScaling.maxCapacity;
    }

    return {
      nodeId: node.id, label: node.data.label, serviceType: "ec2",
      monthly, yearly: monthly * 12, monthlyMin, monthlyMax,
      breakdown: { compute: compute * (cfg.autoScaling?.desiredCapacity ?? cfg.count), ebs: ebs * (cfg.autoScaling?.desiredCapacity ?? cfg.count) },
    };
  }

  if (node.type === "s3") {
    const cfg = node.data.config as S3Config;
    const monthly = s3MonthlyPrice(cfg.storageGb, cfg.storageClass, cfg.getRequests, cfg.putRequests, cfg.dataTransferOutGb);
    return { nodeId: node.id, label: node.data.label, serviceType: "s3", monthly, yearly: monthly * 12, breakdown: { storage: cfg.storageGb * 0.023 } };
  }

  if (node.type === "rds") {
    const cfg = node.data.config as RDSConfig;
    const monthly = rdsMonthlyPrice(cfg.instanceClass, cfg.multiAz, cfg.storageGb, cfg.storageType, billingModel, region);
    return { nodeId: node.id, label: node.data.label, serviceType: "rds", monthly, yearly: monthly * 12, breakdown: { instance: monthly * 0.85, storage: monthly * 0.15 } };
  }

  if (node.type === "lambda") {
    const cfg = node.data.config as LambdaConfig;
    const monthly = lambdaMonthlyPrice(cfg.invocationsPerMonth, cfg.avgDurationMs, cfg.memorySizeMb);
    return { nodeId: node.id, label: node.data.label, serviceType: "lambda", monthly, yearly: monthly * 12, breakdown: { compute: monthly } };
  }

  if (node.type === "vpc") {
    const cfg = node.data.config as VPCConfig;
    const monthly = natGatewayMonthlyPrice(cfg.natGatewayCount, cfg.natDataProcessedGb) + cfg.vpnConnectionCount * 0.05 * 730;
    return { nodeId: node.id, label: node.data.label, serviceType: "vpc", monthly, yearly: monthly * 12, breakdown: { nat: monthly } };
  }

  if (node.type === "alb") {
    // ALB: $0.008/LCU-hour. Simplified: flat per hour + data
    const monthly = 0.008 * 730 + (node.data.config as any).dataProcessedGb * 0.008;
    return { nodeId: node.id, label: node.data.label, serviceType: "alb", monthly, yearly: monthly * 12, breakdown: { lcu: monthly } };
  }

  if (node.type === "cloudfront") {
    const cfg = node.data.config as any;
    const monthly = cfg.dataTransferOutGb * 0.0085 + (cfg.httpRequestsMillions + cfg.httpsRequestsMillions) * 0.0100;
    return { nodeId: node.id, label: node.data.label, serviceType: "cloudfront", monthly, yearly: monthly * 12, breakdown: { transfer: monthly } };
  }

  // fallback: $0
  return { nodeId: node.id, label: node.data.label, serviceType: node.type, monthly: 0, yearly: 0, breakdown: {} };
}
