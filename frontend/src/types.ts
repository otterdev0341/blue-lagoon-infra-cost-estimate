export type AWSServiceType =
  | "ec2" | "s3" | "rds" | "lambda" | "vpc" | "alb" | "cloudfront"
  | "elasticache" | "sqs" | "apigateway" | "sticky_note" | "custom"
  | "bedrock" | "ebs" | "lightsail" | "cognito" | "route53" | "dynamodb" | "redshift"
  | "group"
  | "textbox" | "circle" | "req_note"
  | "line_image" | "line_button" | "line_carousel" | "line_quick_reply"
  | "line_flex_message" | "line_rich_menu" | "line_custom_payload"
  | "line_api_call" | "line_ai_agent" | "line_intent" | "line_dialog"
  | "api_rest" | "api_grpc" | "api_mcp"
  | "api_jolt" | "api_adapter" | "api_llm"
  | "fc_start" | "fc_process" | "fc_decision" | "fc_io" | "fc_document" | "fc_subprocess";

export type BillingModel = "ondemand" | "reserved1yr" | "reserved3yr" | "spot";

export interface AutoScalingConfig {
  enabled: boolean;
  minCapacity: number;
  desiredCapacity: number;
  maxCapacity: number;
  policyType: "cpu" | "memory" | "requests" | "schedule";
  threshold?: number;
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

export interface StickyNoteConfig {
  content: string;
  color: string;
}

export interface CustomServiceConfig {
  description: string;
  region: string;
  costPerRequest?: number;
  requestsPerMonth?: number;
  costPerHour?: number;
  hoursPerMonth?: number;
}

// ── New services ───────────────────────────────────────────────────────────

export type BedrockModel = "claude-3-haiku" | "claude-3-sonnet" | "claude-3-opus" | "titan-text";

export interface BedrockConfig {
  model: BedrockModel;
  inputTokensK: number;   // thousands per month
  outputTokensK: number;  // thousands per month
}

export interface EBSConfig {
  volumeType: "gp3" | "gp2" | "io1" | "io2" | "st1" | "sc1";
  sizeGb: number;
  provisionedIops?: number;  // for io1/io2
}

export type LightsailPlan = "nano" | "micro" | "small" | "medium" | "large" | "xlarge" | "2xlarge";

export interface LightsailConfig {
  plan: LightsailPlan;
}

export interface CognitoConfig {
  mauCount: number;
  advancedSecurity: boolean;
}

export interface Route53Config {
  hostedZoneCount: number;
  queriesMillions: number;
  healthCheckCount: number;
}

export interface DynamoDBConfig {
  mode: "provisioned" | "on-demand";
  readCapacityUnits: number;
  writeCapacityUnits: number;
  readRequestMillions: number;
  writeRequestMillions: number;
  storageGb: number;
}

export type RedshiftNodeType = "dc2.large" | "dc2.8xlarge" | "ra3.xlplus" | "ra3.4xlarge" | "ra3.16xlarge";

export interface RedshiftConfig {
  nodeType: RedshiftNodeType;
  nodeCount: number;
  utilizationHours: number;
}

export type GroupType = "infrastructure" | "external" | "implementation" | "custom" | "generic" | "line" | "api";

export interface GroupConfig {
  groupType: GroupType;
  setupCostUSD?: number;  // one-time cost
  bgColor?: string;       // custom background color override
}

export interface TextboxConfig {
  content: string;
  bgColor: string;
}

export interface ReqNoteConfig {
  content: string;
  bgColor: string;
}

export interface CircleConfig {
  content: string;
  bgColor: string;
}

export type LineNodeSubtype = "image" | "button" | "carousel" | "quick_reply"
  | "flex_message" | "rich_menu" | "custom_payload"
  | "api_call" | "ai_agent" | "intent" | "dialog";

export interface LineNodeConfig {
  subtype: LineNodeSubtype;
  manday: number;
  department: string;
  description?: string;
  createdBy?: string;
  reviewedBy?: string;
}

export type APIProtocol = "rest" | "grpc" | "mcp" | "jolt" | "adapter" | "llm";

export type FlowchartSubtype = "start" | "process" | "decision" | "io" | "document" | "subprocess";

export interface FlowchartConfig {
  content: string;
  bgColor: string;
  subtype: FlowchartSubtype;
}

export interface APINodeConfig {
  protocol: APIProtocol;
  manday: number;
  department: string;
  description?: string;
  endpoint?: string;
  method?: string;
  createdBy?: string;
  reviewedBy?: string;
}

export interface DepartmentRate {
  id: string;
  name: string;
  ratePerManday: number;  // THB per manday
  color: string;
}

// ── Union ─────────────────────────────────────────────────────────────────

export type NodeConfig =
  | EC2Config | S3Config | RDSConfig | LambdaConfig
  | VPCConfig | ALBConfig | CloudFrontConfig | StickyNoteConfig | CustomServiceConfig
  | BedrockConfig | EBSConfig | LightsailConfig | CognitoConfig
  | Route53Config | DynamoDBConfig | RedshiftConfig | GroupConfig
  | TextboxConfig | CircleConfig | LineNodeConfig | APINodeConfig | FlowchartConfig;

export interface CanvasNode {
  id: string;
  type: AWSServiceType;
  position: { x: number; y: number };
  region: string;
  availabilityZone?: string;
  parentId?: string;
  extent?: "parent";
  data: {
    label: string;
    config: NodeConfig;
    costOverride?: number;
    discount?: number;
  };
  style?: Record<string, unknown>;
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

export interface NodeCost {
  nodeId: string;
  label: string;
  serviceType: AWSServiceType;
  monthly: number;
  yearly: number;
  baseMonthly?: number;
  discountPct?: number;
  monthlyMin?: number;
  monthlyMax?: number;
  breakdown: Record<string, number>;
}

export interface SetupCost {
  nodeId: string;
  label: string;
  groupType: GroupType;
  amountUSD: number;
}

export type AdditionalCostCategory = "rd" | "devops" | "maintain" | "other";

export interface AdditionalCostItem {
  id: string;
  category: AdditionalCostCategory;
  label: string;
  amountUSD: number;
  billingPeriod: "monthly" | "yearly" | "one-time";
  discount?: number;
}

export type SubscriptionCategory = "devtools" | "monitoring" | "communication" | "security" | "saas" | "other";

export interface SubscriptionItem {
  id: string;
  service: string;
  plan: string;
  category: SubscriptionCategory;
  amountUSD: number;        // per unit (or total if unitCount is absent)
  unitLabel?: string;       // e.g. "per user"
  unitCount?: number;
  billingPeriod: "monthly" | "yearly";
  discount?: number;
}

export interface DiagramCost {
  total: { monthly: number; yearly: number };
  perNode: NodeCost[];
  dataTransfer: { monthly: number; details: { edgeId: string; gb: number; cost: number }[] };
  billingModel: BillingModel;
  setupCosts: SetupCost[];
}
