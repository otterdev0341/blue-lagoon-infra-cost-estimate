import type { AWSServiceType, NodeConfig } from "../types.ts";

export const DEFAULT_CONFIGS: Record<AWSServiceType, NodeConfig> = {
  ec2: {
    instanceType: "t3.medium",
    count: 1,
    operatingSystem: "Linux",
    utilizationHours: 730,
    ebsVolumeGb: 30,
    ebsType: "gp3",
  },
  s3: {
    storageGb: 100,
    storageClass: "Standard",
    getRequests: 100000,
    putRequests: 10000,
    dataTransferOutGb: 10,
  },
  rds: {
    engine: "mysql",
    instanceClass: "db.t3.medium",
    multiAz: false,
    storageGb: 100,
    storageType: "gp3",
  },
  lambda: {
    invocationsPerMonth: 1000000,
    avgDurationMs: 200,
    memorySizeMb: 128,
  },
  vpc: {
    natGatewayCount: 1,
    natDataProcessedGb: 100,
    vpnConnectionCount: 0,
  },
  alb: {
    dataProcessedGb: 100,
    newConnectionsPerSec: 100,
    activeConnections: 1000,
    ruleLookups: 1000000,
  },
  cloudfront: {
    dataTransferOutGb: 100,
    httpRequestsMillions: 1,
    httpsRequestsMillions: 1,
  },
  elasticache: { engine: "redis", nodeType: "cache.t3.micro", nodeCount: 1 } as any,
  sqs: { requests: 1000000, payloadKb: 64, type: "standard" } as any,
  apigateway: { callsPerMonth: 1000000, dataTransferGb: 10 } as any,
  sticky_note: { content: "", color: "#FEF08A" },
  custom: {
    description: "External API call",
    region: "External",
    billingType: "monthly",
    costPerRequest: 0.000001,
    requestsPerMonth: 1000000,
    costPerHour: 0,
    hoursPerMonth: 0,
    totalCostUSD: 0,
    intervalYears: 3,
  },

  // ── New services ─────────────────────────────────────────────────────────
  bedrock: {
    model: "claude-3-haiku",
    inputTokensK: 1000,
    outputTokensK: 500,
  },
  ebs: {
    volumeType: "gp3",
    sizeGb: 100,
    provisionedIops: 3000,
  },
  lightsail: {
    plan: "small",
  },
  cognito: {
    mauCount: 10000,
    advancedSecurity: false,
  },
  route53: {
    hostedZoneCount: 1,
    queriesMillions: 1,
    healthCheckCount: 1,
  },
  dynamodb: {
    mode: "on-demand",
    readCapacityUnits: 5,
    writeCapacityUnits: 5,
    readRequestMillions: 1,
    writeRequestMillions: 0.5,
    storageGb: 10,
  },
  redshift: {
    nodeType: "dc2.large",
    nodeCount: 2,
    utilizationHours: 730,
  },
  group: {
    groupType: "line",
    setupCostUSD: 0,
  },
  textbox:  { content: "", bgColor: "#FFFFFF" },
  circle:   { content: "", bgColor: "#DBEAFE" },
  req_note: { content: "", bgColor: "#F5F3FF" },
  line_image:          { subtype: "image",          manday: 1, department: "Dev",    description: "" },
  line_button:         { subtype: "button",         manday: 1, department: "Dev",    description: "" },
  line_carousel:       { subtype: "carousel",       manday: 2, department: "Dev",    description: "" },
  line_quick_reply:    { subtype: "quick_reply",    manday: 1, department: "Dev",    description: "" },
  line_flex_message:   { subtype: "flex_message",   manday: 2, department: "Dev",    description: "" },
  line_rich_menu:      { subtype: "rich_menu",      manday: 3, department: "Design", description: "" },
  line_custom_payload: { subtype: "custom_payload", manday: 1, department: "Dev",    description: "" },
  line_api_call:       { subtype: "api_call",       manday: 1, department: "Dev",    description: "" },
  line_ai_agent:       { subtype: "ai_agent",       manday: 3, department: "Dev",    description: "" },
  line_intent:         { subtype: "intent",         manday: 1, department: "Dev",    description: "" },
  line_dialog:         { subtype: "dialog",         manday: 2, department: "Dev",    description: "" },
  api_rest:    { protocol: "rest",    manday: 1, department: "Dev", description: "", endpoint: "", method: "GET" },
  api_grpc:    { protocol: "grpc",    manday: 1, department: "Dev", description: "", endpoint: "" },
  api_mcp:     { protocol: "mcp",     manday: 1, department: "Dev", description: "", endpoint: "" },
  api_jolt:    { protocol: "jolt",    manday: 2, department: "Dev", description: "", endpoint: "" },
  api_adapter: { protocol: "adapter", manday: 1, department: "Dev", description: "", endpoint: "" },
  api_llm:     { protocol: "llm",     manday: 3, department: "Dev", description: "", endpoint: "" },

  // Flowchart shapes
  fc_start:      { content: "Start",   bgColor: "#D1FAE5", subtype: "start" },
  fc_process:    { content: "Process", bgColor: "#DBEAFE", subtype: "process" },
  fc_decision:   { content: "Decision?", bgColor: "#FEF9C3", subtype: "decision" },
  fc_io:         { content: "Input / Output", bgColor: "#F3E8FF", subtype: "io" },
  fc_document:   { content: "Document", bgColor: "#FFF7ED", subtype: "document" },
  fc_subprocess: { content: "Sub-process", bgColor: "#EFF6FF", subtype: "subprocess" },
};

export const SERVICE_LABELS: Record<AWSServiceType, string> = {
  ec2:         "EC2",
  s3:          "S3",
  rds:         "RDS",
  lambda:      "Lambda",
  vpc:         "VPC",
  alb:         "Load Balancer",
  cloudfront:  "CloudFront",
  elasticache: "ElastiCache",
  sqs:         "SQS",
  apigateway:  "API Gateway",
  sticky_note: "Sticky Note",
  custom:      "Custom Service",
  bedrock:     "Bedrock",
  ebs:         "EBS",
  lightsail:   "Lightsail",
  cognito:     "Cognito",
  route53:     "Route 53",
  dynamodb:    "DynamoDB",
  redshift:    "Redshift",
  group:       "Group",
  textbox:             "Text Box",
  circle:              "Circle",
  req_note:            "Requirement",
  line_image:          "Image",
  line_button:         "Button",
  line_carousel:       "Carousel",
  line_quick_reply:    "Quick Reply",
  line_flex_message:   "Flex Message",
  line_rich_menu:      "Rich Menu",
  line_custom_payload: "Custom Payload",
  line_api_call:       "API Call",
  line_ai_agent:       "AI Agent",
  line_intent:         "Intent",
  line_dialog:         "Dialog",
  api_rest:    "REST API",
  api_grpc:    "gRPC",
  api_mcp:     "MCP",
  api_jolt:    "Jolt Converter",
  api_adapter: "Adapter",
  api_llm:     "LLM",
  fc_start:      "Start / End",
  fc_process:    "Process",
  fc_decision:   "Decision",
  fc_io:         "Input / Output",
  fc_document:   "Document",
  fc_subprocess: "Sub-process",
};

// ── Toolbar section definitions ───────────────────────────────────────────

export interface ServiceDef {
  type: AWSServiceType;
  label: string;
  description: string;
}

export interface ToolbarSection {
  label: string;
  items: ServiceDef[];
}

export interface ToolbarTab {
  id: "generic" | "aws" | "line" | "api";
  label: string;
  sections: ToolbarSection[];
}

export const TOOLBAR_TABS: ToolbarTab[] = [
  {
    id: "generic",
    label: "Generic",
    sections: [
      {
        label: "Canvas",
        items: [
          { type: "group",       label: "Group",       description: "Container for related nodes" },
          { type: "sticky_note", label: "Sticky Note", description: "Add an annotation" },
          { type: "textbox",     label: "Text Box",    description: "Free text with custom background" },
          { type: "circle",      label: "Circle",      description: "Circle shape with text" },
          { type: "req_note",    label: "Requirement", description: "Markdown requirement / user story" },
        ],
      },
      {
        label: "Flowchart",
        items: [
          { type: "fc_start",      label: "Start / End",    description: "Terminal — start or end of flow" },
          { type: "fc_process",    label: "Process",        description: "Process or action step" },
          { type: "fc_decision",   label: "Decision",       description: "Yes / No branch point" },
          { type: "fc_io",         label: "Input / Output", description: "Data input or output" },
          { type: "fc_document",   label: "Document",       description: "Document or report output" },
          { type: "fc_subprocess", label: "Sub-process",    description: "Predefined sub-process" },
        ],
      },
    ],
  },
  {
    id: "aws",
    label: "AWS",
    sections: [
      {
        label: "Compute",
        items: [
          { type: "ec2",       label: "EC2",       description: "Virtual servers in the cloud" },
          { type: "lambda",    label: "Lambda",    description: "Serverless function compute" },
          { type: "lightsail", label: "Lightsail", description: "Simple VPS — fixed monthly price" },
        ],
      },
      {
        label: "Storage",
        items: [
          { type: "s3",  label: "S3",  description: "Scalable object storage" },
          { type: "ebs", label: "EBS", description: "Block storage volumes" },
        ],
      },
      {
        label: "Database",
        items: [
          { type: "rds",         label: "RDS",         description: "Managed relational database" },
          { type: "dynamodb",    label: "DynamoDB",    description: "Serverless NoSQL key-value store" },
          { type: "redshift",    label: "Redshift",    description: "Petabyte-scale data warehouse" },
          { type: "elasticache", label: "ElastiCache", description: "In-memory Redis / Memcached" },
        ],
      },
      {
        label: "Networking",
        items: [
          { type: "vpc",        label: "VPC",        description: "Isolated virtual network + NAT" },
          { type: "alb",        label: "ALB",        description: "Application load balancer" },
          { type: "cloudfront", label: "CloudFront", description: "Global CDN & edge delivery" },
          { type: "route53",    label: "Route 53",   description: "DNS & health routing" },
        ],
      },
      {
        label: "Security",
        items: [
          { type: "cognito", label: "Cognito", description: "User auth & identity (MAU-based)" },
        ],
      },
      {
        label: "AI / ML",
        items: [
          { type: "bedrock", label: "Bedrock", description: "Foundation models — Claude, Titan" },
          { type: "custom",  label: "Custom",  description: "External API or third-party service" },
        ],
      },
      {
        label: "Messaging",
        items: [
          { type: "sqs",        label: "SQS",         description: "Managed message queue" },
          { type: "apigateway", label: "API Gateway", description: "REST / HTTP / WebSocket APIs" },
        ],
      },
    ],
  },
  {
    id: "line",
    label: "Line",
    sections: [
      {
        label: "Message Types",
        items: [
          { type: "line_image",          label: "Image",          description: "Image message component" },
          { type: "line_button",         label: "Button",         description: "Button template message" },
          { type: "line_carousel",       label: "Carousel",       description: "Carousel template message" },
          { type: "line_quick_reply",    label: "Quick Reply",    description: "Quick reply buttons" },
          { type: "line_flex_message",   label: "Flex Message",   description: "Custom flex layout message" },
          { type: "line_rich_menu",      label: "Rich Menu",      description: "Persistent bottom menu" },
          { type: "line_custom_payload", label: "Custom Payload", description: "Custom JSON payload" },
        ],
      },
      {
        label: "Logic",
        items: [
          { type: "line_api_call",  label: "API Call",  description: "External API call node" },
          { type: "line_ai_agent",  label: "AI Agent",  description: "AI/LLM agent node" },
          { type: "line_intent",    label: "Intent",    description: "User intent recognition" },
          { type: "line_dialog",    label: "Dialog",    description: "Conversation dialog node" },
        ],
      },
    ],
  },
  {
    id: "api",
    label: "API",
    sections: [
      {
        label: "Protocols",
        items: [
          { type: "api_rest",  label: "REST",  description: "RESTful HTTP API endpoint" },
          { type: "api_grpc",  label: "gRPC",  description: "gRPC service definition" },
          { type: "api_mcp",   label: "MCP",   description: "Model Context Protocol endpoint" },
        ],
      },
      {
        label: "Middleware",
        items: [
          { type: "api_jolt",    label: "Jolt",    description: "JSON-to-JSON Jolt transformation" },
          { type: "api_adapter", label: "Adapter", description: "Protocol or format adapter" },
          { type: "api_llm",     label: "LLM",     description: "LLM / AI model call node" },
        ],
      },
    ],
  },
];

// Keep backward compat — flatten all AWS sections
export const TOOLBAR_SECTIONS: ToolbarSection[] = TOOLBAR_TABS.find(t => t.id === "aws")!.sections;
