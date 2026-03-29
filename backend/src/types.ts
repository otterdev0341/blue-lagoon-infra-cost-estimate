export type AWSServiceType =
  | "ec2" | "s3" | "rds" | "lambda" | "vpc" | "alb" | "cloudfront"
  | "elasticache" | "eks" | "sqs" | "sns" | "apigateway" | "sticky_note";

export type BillingModel = "ondemand" | "reserved1yr" | "reserved3yr" | "spot";

// ─── Node configs ─────────────────────────────────────────────────────────────

export interface AutoScalingConfig {
  enabled: boolean;
  minCapacity: number;
  desiredCapacity: number;
  maxCapacity: number;
  policy:
    | { type: "cpu"; threshold: number; cooldownSeconds: number }
    | { type: "memory"; threshold: number; cooldownSeconds: number }
    | { type: "requests"; requestsPerTarget: number }
    | { type: "schedule"; scaleOutCron: string; scaleInCron: string; scaleOutCapacity: number };
}

export interface EC2Config {
  instanceType: string;
  count: number;
  operatingSystem: "Linux" | "Windows" | "RHEL";
  utilizationHours: number;
  ebsVolumeGb: number;
  ebsType: "gp3" | "gp2" | "io1" | "st1" | "sc1";
  autoScaling?: AutoScalingConfig;
}

export interface S3Config {
  storageGb: number;
  storageClass: "Standard" | "IntelligentTiering" | "Glacier" | "GlacierDeepArchive";
  getRequests: number;
  putRequests: number;
  dataTransferOutGb: number;
}

export interface RDSConfig {
  engine: "mysql" | "postgres" | "aurora-mysql" | "aurora-postgres" | "sqlserver";
  instanceClass: string;
  multiAz: boolean;
  storageGb: number;
  storageType: "gp2" | "gp3" | "io1";
  iops?: number;
  autoScaling?: AutoScalingConfig;
}

export interface LambdaConfig {
  invocationsPerMonth: number;
  avgDurationMs: number;
  memorySizeMb: number;
}

export interface VPCConfig {
  natGatewayCount: number;
  natDataProcessedGb: number;
  vpnConnectionCount: number;
}

export interface ALBConfig {
  dataProcessedGb: number;
  newConnectionsPerSec: number;
  activeConnections: number;
  ruleLookups: number;
}

export interface CloudFrontConfig {
  dataTransferOutGb: number;
  httpRequestsMillions: number;
  httpsRequestsMillions: number;
}

export interface ElastiCacheConfig {
  engine: "redis" | "memcached";
  nodeType: string;
  nodeCount: number;
}

export interface StickyNoteConfig {
  content: string; // tiptap JSON string
  color: string;
}

export type NodeConfig =
  | EC2Config | S3Config | RDSConfig | LambdaConfig | VPCConfig
  | ALBConfig | CloudFrontConfig | ElastiCacheConfig | StickyNoteConfig;

// ─── Canvas primitives ────────────────────────────────────────────────────────

export interface CanvasNode {
  id: string;
  type: AWSServiceType;
  position: { x: number; y: number };
  region: string;
  availabilityZone?: string;
  data: {
    label: string;
    config: NodeConfig;
    costOverride?: number;
  };
  style?: Record<string, unknown>;
  parentId?: string; // for VPC group container
}

export interface CanvasEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  dataTransferGbPerMonth?: number;
}

export interface StickyNote {
  id: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  color: string;
  content: string;
  linkedNodeId?: string;
  zIndex: number;
}

// ─── Diagram ──────────────────────────────────────────────────────────────────

export interface Diagram {
  id: string;
  name: string;
  description?: string;
  region: string;
  billingModel: BillingModel;
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  stickyNotes: StickyNote[];
  departmentRates?: { id: string; name: string; ratePerManday: number; color: string }[];
  additionalCosts?: unknown[];
  subscriptions?: unknown[];
  sellingPriceUSD?: number;
  year2SellingPriceUSD?: number;
  isTemplate?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DiagramSnapshot {
  id: string;
  diagramId: string;
  label?: string;
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  stickyNotes: StickyNote[];
  createdAt: string;
}

// ─── Pricing ─────────────────────────────────────────────────────────────────

export interface PricingCacheEntry {
  service: string;
  region: string;
  data: unknown;
  fetchedAt: string;
}

// ─── Cost ─────────────────────────────────────────────────────────────────────

export interface NodeCost {
  nodeId: string;
  label: string;
  serviceType: AWSServiceType;
  monthly: number;
  yearly: number;
  monthlyMin?: number; // ASG best-case
  monthlyMax?: number; // ASG worst-case
  breakdown: Record<string, number>; // e.g. { compute: 45, ebs: 8 }
}

export interface DiagramCost {
  total: { monthly: number; yearly: number };
  perNode: NodeCost[];
  dataTransfer: { monthly: number; details: { edgeId: string; gb: number; cost: number }[] };
  billingModel: BillingModel;
}
