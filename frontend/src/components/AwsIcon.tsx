/**
 * AWS-style service icons — SVG, no external package needed.
 * Colors match the official AWS architecture icon palette.
 */
import type { AWSServiceType, GroupType } from "../types.ts";

interface Props {
  type: AWSServiceType;
  size?: number;
  groupType?: GroupType;
}

const GROUP_COLORS: Record<GroupType, string> = {
  infrastructure: "#F97316",
  external:       "#8C4FFF",
  implementation: "#3B82F6",
  custom:         "#94A3B8",
  generic:        "#64748B",
  line:           "#22C55E",
  api:            "#10B981",
};

export function AwsIcon({ type, size = 32, groupType }: Props) {
  const s = size;

  switch (type) {
    case "ec2":
      return (
        <svg width={s} height={s} viewBox="0 0 40 40" fill="none">
          <rect width="40" height="40" rx="8" fill="#FF9900"/>
          <rect x="8" y="10" width="24" height="18" rx="2" fill="white" fillOpacity=".9"/>
          <rect x="11" y="13" width="18" height="3" rx="1" fill="#FF9900"/>
          <rect x="11" y="18" width="18" height="1.5" rx=".75" fill="#FF9900" fillOpacity=".5"/>
          <rect x="11" y="21" width="12" height="1.5" rx=".75" fill="#FF9900" fillOpacity=".5"/>
          <rect x="14" y="28" width="12" height="2" rx="1" fill="white" fillOpacity=".7"/>
        </svg>
      );
    case "s3":
      return (
        <svg width={s} height={s} viewBox="0 0 40 40" fill="none">
          <rect width="40" height="40" rx="8" fill="#3F8624"/>
          <ellipse cx="20" cy="13" rx="10" ry="4" fill="white" fillOpacity=".9"/>
          <path d="M10 13v14c0 2.2 4.5 4 10 4s10-1.8 10-4V13" fill="white" fillOpacity=".2" stroke="white" strokeOpacity=".9" strokeWidth="1.5"/>
          <ellipse cx="20" cy="27" rx="10" ry="4" fill="white" fillOpacity=".15" stroke="white" strokeOpacity=".9" strokeWidth="1.5"/>
        </svg>
      );
    case "rds":
      return (
        <svg width={s} height={s} viewBox="0 0 40 40" fill="none">
          <rect width="40" height="40" rx="8" fill="#1D6FCA"/>
          <ellipse cx="20" cy="12" rx="10" ry="3.5" fill="white" fillOpacity=".9"/>
          <rect x="10" y="12" width="20" height="14" fill="white" fillOpacity=".15"/>
          <ellipse cx="20" cy="26" rx="10" ry="3.5" fill="white" fillOpacity=".9"/>
          <ellipse cx="20" cy="19" rx="10" ry="3.5" fill="white" fillOpacity=".5"/>
          <path d="M10 12v14M30 12v14" stroke="white" strokeOpacity=".9" strokeWidth="1.5"/>
        </svg>
      );
    case "lambda":
      return (
        <svg width={s} height={s} viewBox="0 0 40 40" fill="none">
          <rect width="40" height="40" rx="8" fill="#E7157B"/>
          <text x="20" y="28" textAnchor="middle" fill="white" fontSize="22" fontFamily="Georgia, serif" fontStyle="italic">λ</text>
        </svg>
      );
    case "vpc":
      return (
        <svg width={s} height={s} viewBox="0 0 40 40" fill="none">
          <rect width="40" height="40" rx="8" fill="#8C4FFF"/>
          <rect x="8" y="8" width="24" height="24" rx="3" stroke="white" strokeWidth="2" strokeDasharray="4 2" fill="none"/>
          <circle cx="20" cy="20" r="5" fill="white" fillOpacity=".9"/>
          <path d="M20 12v3M20 25v3M12 20h3M25 20h3" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      );
    case "alb":
      return (
        <svg width={s} height={s} viewBox="0 0 40 40" fill="none">
          <rect width="40" height="40" rx="8" fill="#FF4F8B"/>
          <circle cx="20" cy="14" r="4" fill="white" fillOpacity=".9"/>
          <circle cx="12" cy="27" r="3" fill="white" fillOpacity=".7"/>
          <circle cx="28" cy="27" r="3" fill="white" fillOpacity=".7"/>
          <path d="M20 18l-8 6M20 18l8 6" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      );
    case "cloudfront":
      return (
        <svg width={s} height={s} viewBox="0 0 40 40" fill="none">
          <rect width="40" height="40" rx="8" fill="#FF7300"/>
          <circle cx="20" cy="20" r="11" stroke="white" strokeWidth="1.8" fill="none"/>
          <ellipse cx="20" cy="20" rx="5" ry="11" stroke="white" strokeWidth="1.4" fill="none"/>
          <path d="M9 20h22" stroke="white" strokeWidth="1.4"/>
          <path d="M10 15h20M10 25h20" stroke="white" strokeWidth="1" strokeOpacity=".6"/>
        </svg>
      );
    case "elasticache":
      return (
        <svg width={s} height={s} viewBox="0 0 40 40" fill="none">
          <rect width="40" height="40" rx="8" fill="#C7131F"/>
          <path d="M20 9l9 5v12l-9 5-9-5V14z" stroke="white" strokeWidth="1.8" fill="white" fillOpacity=".15"/>
          <path d="M11 14l9 5 9-5M20 19v11" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      );
    case "sqs":
      return (
        <svg width={s} height={s} viewBox="0 0 40 40" fill="none">
          <rect width="40" height="40" rx="8" fill="#FF4F8B"/>
          <rect x="8" y="14" width="24" height="5" rx="2.5" fill="white" fillOpacity=".9"/>
          <rect x="8" y="21" width="18" height="5" rx="2.5" fill="white" fillOpacity=".6"/>
          <path d="M29 23.5l4-2-4-2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      );
    case "apigateway":
      return (
        <svg width={s} height={s} viewBox="0 0 40 40" fill="none">
          <rect width="40" height="40" rx="8" fill="#A020F0"/>
          <rect x="8" y="17" width="16" height="6" rx="3" fill="white" fillOpacity=".9"/>
          <path d="M24 20h8M28 17l4 3-4 3" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      );

    // ── New services ───────────────────────────────────────────────────────

    case "bedrock":
      return (
        <svg width={s} height={s} viewBox="0 0 40 40" fill="none">
          <rect width="40" height="40" rx="8" fill="#7A3FBF"/>
          {/* Brain/neural network */}
          <circle cx="20" cy="15" r="6" stroke="white" strokeWidth="1.6" fill="none"/>
          <circle cx="20" cy="15" r="2" fill="white" fillOpacity=".9"/>
          <path d="M20 21v4M16 29h8" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
          <path d="M14 13l-3-3M26 13l3-3M14 17l-3 3M26 17l3 3" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeOpacity=".7"/>
        </svg>
      );

    case "ebs":
      return (
        <svg width={s} height={s} viewBox="0 0 40 40" fill="none">
          <rect width="40" height="40" rx="8" fill="#7AA116"/>
          {/* Hard drive stack */}
          <rect x="9" y="11" width="22" height="7" rx="2" fill="white" fillOpacity=".9"/>
          <rect x="9" y="20" width="22" height="7" rx="2" fill="white" fillOpacity=".6"/>
          <circle cx="26" cy="14.5" r="1.5" fill="#7AA116"/>
          <circle cx="26" cy="23.5" r="1.5" fill="#7AA116" fillOpacity=".6"/>
          <rect x="11" y="13" width="10" height="3" rx="1.5" fill="#7AA116" fillOpacity=".4"/>
        </svg>
      );

    case "lightsail":
      return (
        <svg width={s} height={s} viewBox="0 0 40 40" fill="none">
          <rect width="40" height="40" rx="8" fill="#0CA4DA"/>
          {/* Rocket / simple server */}
          <path d="M20 8c0 0 8 4 8 14H12c0-10 8-14 8-14z" fill="white" fillOpacity=".9"/>
          <rect x="16" y="22" width="8" height="6" rx="1" fill="white" fillOpacity=".7"/>
          <path d="M16 28l-3 4M24 28l3 4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeOpacity=".6"/>
          <circle cx="20" cy="17" r="2.5" fill="#0CA4DA"/>
        </svg>
      );

    case "cognito":
      return (
        <svg width={s} height={s} viewBox="0 0 40 40" fill="none">
          <rect width="40" height="40" rx="8" fill="#BF4040"/>
          {/* Person + shield */}
          <circle cx="20" cy="13" r="5" fill="white" fillOpacity=".9"/>
          <path d="M10 30c0-5.5 4.5-9 10-9s10 3.5 10 9" fill="white" fillOpacity=".6"/>
          <path d="M20 25l-4 2v4l4 2 4-2v-4z" fill="white" fillOpacity=".9"/>
          <path d="M17 30l2 2 4-4" stroke="#BF4040" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      );

    case "route53":
      return (
        <svg width={s} height={s} viewBox="0 0 40 40" fill="none">
          <rect width="40" height="40" rx="8" fill="#8C4FFF"/>
          {/* Globe with DNS hint */}
          <circle cx="20" cy="20" r="11" stroke="white" strokeWidth="1.8" fill="none"/>
          <path d="M9 20h22M20 9v22" stroke="white" strokeWidth="1.2" strokeOpacity=".7"/>
          <ellipse cx="20" cy="20" rx="5.5" ry="11" stroke="white" strokeWidth="1.2" fill="none" strokeOpacity=".7"/>
          <path d="M11.5 14h17M11.5 26h17" stroke="white" strokeWidth="1" strokeOpacity=".5"/>
        </svg>
      );

    case "dynamodb":
      return (
        <svg width={s} height={s} viewBox="0 0 40 40" fill="none">
          <rect width="40" height="40" rx="8" fill="#1D6FCA"/>
          {/* DDB lightning bolt + table */}
          <path d="M22 9l-6 11h5l-3 11 9-13h-6z" fill="white" fillOpacity=".9"/>
          <rect x="8" y="30" width="24" height="2.5" rx="1.25" fill="white" fillOpacity=".4"/>
        </svg>
      );

    case "redshift":
      return (
        <svg width={s} height={s} viewBox="0 0 40 40" fill="none">
          <rect width="40" height="40" rx="8" fill="#8B1A1A"/>
          {/* Warehouse / columns */}
          <path d="M8 30l12-20 12 20H8z" fill="white" fillOpacity=".15" stroke="white" strokeWidth="1.5"/>
          <rect x="15" y="18" width="3" height="12" rx="1" fill="white" fillOpacity=".9"/>
          <rect x="19" y="14" width="3" height="16" rx="1" fill="white" fillOpacity=".7"/>
          <rect x="23" y="21" width="3" height="9" rx="1" fill="white" fillOpacity=".5"/>
        </svg>
      );

    case "group": {
      const color = GROUP_COLORS[groupType ?? "infrastructure"];
      return (
        <svg width={s} height={s} viewBox="0 0 40 40" fill="none">
          <rect width="40" height="40" rx="8" fill={color} fillOpacity=".15"/>
          <rect x="2" y="2" width="36" height="36" rx="6" stroke={color} strokeWidth="2.5" strokeDasharray="5 3" fill="none"/>
          <rect x="8" y="13" width="11" height="9" rx="2" fill={color} fillOpacity=".5"/>
          <rect x="21" y="13" width="11" height="9" rx="2" fill={color} fillOpacity=".3"/>
          <rect x="8" y="24" width="24" height="5" rx="2" fill={color} fillOpacity=".2"/>
        </svg>
      );
    }

    case "sticky_note":
      return (
        <svg width={s} height={s} viewBox="0 0 40 40" fill="none">
          <rect width="40" height="40" rx="8" fill="#92400E"/>
          <rect x="9" y="9" width="22" height="22" rx="2" fill="#FEF08A"/>
          <path d="M31 22l-9 9H9v-9h22z" fill="#FCD34D"/>
          <path d="M31 22l-9 9v-9h9z" fill="#F59E0B"/>
          <rect x="13" y="14" width="14" height="1.5" rx=".75" fill="#92400E" fillOpacity=".4"/>
          <rect x="13" y="17" width="10" height="1.5" rx=".75" fill="#92400E" fillOpacity=".3"/>
        </svg>
      );
    case "custom":
      return (
        <svg width={s} height={s} viewBox="0 0 40 40" fill="none">
          <rect width="40" height="40" rx="8" fill="#475569"/>
          <circle cx="20" cy="20" r="9" stroke="white" strokeWidth="1.8" fill="none"/>
          <path d="M20 15v5l3 3" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
          <circle cx="20" cy="20" r="1.5" fill="white"/>
        </svg>
      );
    case "textbox":
      return (
        <svg width={s} height={s} viewBox="0 0 40 40" fill="none">
          <rect width="40" height="40" rx="8" fill="#64748B"/>
          <rect x="8" y="10" width="24" height="20" rx="3" fill="white" fillOpacity=".9"/>
          <rect x="12" y="16" width="8" height="2" rx="1" fill="#64748B"/>
          <line x1="12" y1="20" x2="28" y2="20" stroke="#64748B" strokeWidth="1.5" strokeOpacity=".4"/>
          <line x1="12" y1="24" x2="22" y2="24" stroke="#64748B" strokeWidth="1.5" strokeOpacity=".3"/>
          <rect x="12" y="14" width="2" height="8" rx="1" fill="#64748B"/>
        </svg>
      );
    case "circle":
      return (
        <svg width={s} height={s} viewBox="0 0 40 40" fill="none">
          <rect width="40" height="40" rx="8" fill="#6366F1"/>
          <circle cx="20" cy="20" r="12" fill="white" fillOpacity=".9" stroke="white" strokeWidth="1.5"/>
          <line x1="14" y1="18" x2="26" y2="18" stroke="#6366F1" strokeWidth="1.5" strokeOpacity=".5"/>
          <line x1="14" y1="22" x2="22" y2="22" stroke="#6366F1" strokeWidth="1.5" strokeOpacity=".3"/>
        </svg>
      );
    case "req_note":
      return (
        <svg width={s} height={s} viewBox="0 0 40 40" fill="none">
          <rect width="40" height="40" rx="8" fill="#7C3AED"/>
          <rect x="8" y="8" width="24" height="24" rx="3" fill="white" fillOpacity=".9"/>
          {/* # heading mark */}
          <rect x="12" y="12" width="3" height="8" rx="1" fill="#7C3AED" fillOpacity=".7"/>
          <rect x="12" y="15.5" width="6" height="1.5" rx=".75" fill="#7C3AED" fillOpacity=".7"/>
          <rect x="17" y="13" width="8" height="2" rx="1" fill="#7C3AED" fillOpacity=".7"/>
          {/* body lines */}
          <rect x="12" y="23" width="16" height="1.5" rx=".75" fill="#7C3AED" fillOpacity=".35"/>
          <rect x="12" y="26" width="11" height="1.5" rx=".75" fill="#7C3AED" fillOpacity=".25"/>
        </svg>
      );
    case "line_image":
      return (
        <svg width={s} height={s} viewBox="0 0 40 40" fill="none">
          <rect width="40" height="40" rx="8" fill="#10B981"/>
          <rect x="8" y="11" width="24" height="18" rx="2" fill="white" fillOpacity=".9"/>
          <circle cx="14" cy="17" r="2.5" fill="#10B981" fillOpacity=".7"/>
          <path d="M8 25l8-6 5 4 4-3 7 5" stroke="#10B981" strokeWidth="1.5" strokeLinejoin="round" fill="none"/>
        </svg>
      );
    case "line_button":
      return (
        <svg width={s} height={s} viewBox="0 0 40 40" fill="none">
          <rect width="40" height="40" rx="8" fill="#3B82F6"/>
          <rect x="9" y="16" width="22" height="8" rx="4" fill="white" fillOpacity=".9"/>
          <rect x="13" y="18.5" width="14" height="3" rx="1.5" fill="#3B82F6" fillOpacity=".5"/>
        </svg>
      );
    case "line_carousel":
      return (
        <svg width={s} height={s} viewBox="0 0 40 40" fill="none">
          <rect width="40" height="40" rx="8" fill="#8B5CF6"/>
          <rect x="4" y="12" width="14" height="16" rx="2" fill="white" fillOpacity=".5"/>
          <rect x="13" y="10" width="14" height="20" rx="2" fill="white" fillOpacity=".9"/>
          <rect x="22" y="12" width="14" height="16" rx="2" fill="white" fillOpacity=".5"/>
        </svg>
      );
    case "line_quick_reply":
      return (
        <svg width={s} height={s} viewBox="0 0 40 40" fill="none">
          <rect width="40" height="40" rx="8" fill="#06B6D4"/>
          <rect x="5" y="22" width="12" height="7" rx="3.5" fill="white" fillOpacity=".9"/>
          <rect x="19" y="22" width="16" height="7" rx="3.5" fill="white" fillOpacity=".7"/>
          <rect x="8" y="13" width="24" height="7" rx="2" fill="white" fillOpacity=".5"/>
        </svg>
      );
    case "line_flex_message":
      return (
        <svg width={s} height={s} viewBox="0 0 40 40" fill="none">
          <rect width="40" height="40" rx="8" fill="#F59E0B"/>
          <rect x="8" y="8" width="10" height="12" rx="2" fill="white" fillOpacity=".9"/>
          <rect x="22" y="8" width="10" height="5" rx="2" fill="white" fillOpacity=".9"/>
          <rect x="22" y="15" width="10" height="5" rx="2" fill="white" fillOpacity=".6"/>
          <rect x="8" y="22" width="24" height="10" rx="2" fill="white" fillOpacity=".5"/>
        </svg>
      );
    case "line_rich_menu":
      return (
        <svg width={s} height={s} viewBox="0 0 40 40" fill="none">
          <rect width="40" height="40" rx="8" fill="#EF4444"/>
          <rect x="7" y="9" width="26" height="14" rx="2" fill="white" fillOpacity=".9"/>
          <rect x="7" y="25" width="8" height="6" rx="1.5" fill="white" fillOpacity=".9"/>
          <rect x="16" y="25" width="8" height="6" rx="1.5" fill="white" fillOpacity=".7"/>
          <rect x="25" y="25" width="8" height="6" rx="1.5" fill="white" fillOpacity=".5"/>
        </svg>
      );
    case "line_custom_payload":
      return (
        <svg width={s} height={s} viewBox="0 0 40 40" fill="none">
          <rect width="40" height="40" rx="8" fill="#6B7280"/>
          <rect x="10" y="9" width="20" height="22" rx="2" fill="white" fillOpacity=".9"/>
          <path d="M14 15h12M14 19h8M14 23h10" stroke="#6B7280" strokeWidth="1.5" strokeLinecap="round" strokeOpacity=".5"/>
          <path d="M25 26l4 4M29 26l-4 4" stroke="#6B7280" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      );
    case "line_api_call":
      return (
        <svg width={s} height={s} viewBox="0 0 40 40" fill="none">
          <rect width="40" height="40" rx="8" fill="#0EA5E9"/>
          <rect x="7" y="16" width="14" height="8" rx="2" fill="white" fillOpacity=".9"/>
          <rect x="19" y="16" width="14" height="8" rx="2" fill="white" fillOpacity=".6"/>
          <path d="M17 20h6M20 17l3 3-3 3" stroke="#0EA5E9" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      );
    case "line_ai_agent":
      return (
        <svg width={s} height={s} viewBox="0 0 40 40" fill="none">
          <rect width="40" height="40" rx="8" fill="#7C3AED"/>
          <circle cx="20" cy="18" r="7" stroke="white" strokeWidth="1.8" fill="none"/>
          <circle cx="20" cy="18" r="2.5" fill="white" fillOpacity=".9"/>
          <path d="M15 30h10M20 25v5" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
          <path d="M13 14l-2-2M27 14l2-2" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeOpacity=".6"/>
        </svg>
      );
    case "line_intent":
      return (
        <svg width={s} height={s} viewBox="0 0 40 40" fill="none">
          <rect width="40" height="40" rx="8" fill="#EC4899"/>
          <circle cx="20" cy="20" r="10" stroke="white" strokeWidth="1.8" fill="none"/>
          <circle cx="20" cy="20" r="5" stroke="white" strokeWidth="1.5" fill="none"/>
          <circle cx="20" cy="20" r="2" fill="white"/>
        </svg>
      );
    case "line_dialog":
      return (
        <svg width={s} height={s} viewBox="0 0 40 40" fill="none">
          <rect width="40" height="40" rx="8" fill="#14B8A6"/>
          <rect x="7" y="10" width="18" height="12" rx="3" fill="white" fillOpacity=".9"/>
          <path d="M7 22l4 4v-4" fill="white" fillOpacity=".9"/>
          <rect x="15" y="20" width="18" height="10" rx="3" fill="white" fillOpacity=".6"/>
          <path d="M33 30l-4 4v-4" fill="white" fillOpacity=".6"/>
        </svg>
      );
    case "api_rest":
      return (
        <svg width={s} height={s} viewBox="0 0 40 40" fill="none">
          <rect width="40" height="40" rx="8" fill="#0EA5E9"/>
          <text x="20" y="24" textAnchor="middle" fill="white" fontSize="10" fontFamily="monospace" fontWeight="bold">REST</text>
          <rect x="6" y="28" width="28" height="2" rx="1" fill="white" fillOpacity=".3"/>
        </svg>
      );
    case "api_grpc":
      return (
        <svg width={s} height={s} viewBox="0 0 40 40" fill="none">
          <rect width="40" height="40" rx="8" fill="#8B5CF6"/>
          <text x="20" y="24" textAnchor="middle" fill="white" fontSize="10" fontFamily="monospace" fontWeight="bold">gRPC</text>
          <rect x="6" y="28" width="28" height="2" rx="1" fill="white" fillOpacity=".3"/>
        </svg>
      );
    case "api_mcp":
      return (
        <svg width={s} height={s} viewBox="0 0 40 40" fill="none">
          <rect width="40" height="40" rx="8" fill="#10B981"/>
          <text x="20" y="24" textAnchor="middle" fill="white" fontSize="10" fontFamily="monospace" fontWeight="bold">MCP</text>
          <rect x="6" y="28" width="28" height="2" rx="1" fill="white" fillOpacity=".3"/>
        </svg>
      );
    case "api_jolt":
      return (
        <svg width={s} height={s} viewBox="0 0 40 40" fill="none">
          <rect width="40" height="40" rx="8" fill="#F97316"/>
          <path d="M12 14h6l-4 6h6l-8 6 2-6h-5z" fill="white" fillOpacity=".9"/>
          <path d="M22 14h6M22 20h5M22 26h6" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      );
    case "api_adapter":
      return (
        <svg width={s} height={s} viewBox="0 0 40 40" fill="none">
          <rect width="40" height="40" rx="8" fill="#64748B"/>
          <rect x="6" y="16" width="10" height="8" rx="2" fill="white" fillOpacity=".9"/>
          <rect x="24" y="16" width="10" height="8" rx="2" fill="white" fillOpacity=".6"/>
          <path d="M16 20h8" stroke="white" strokeWidth="2" strokeLinecap="round"/>
          <circle cx="20" cy="20" r="3" fill="white" fillOpacity=".9"/>
        </svg>
      );
    case "api_llm":
      return (
        <svg width={s} height={s} viewBox="0 0 40 40" fill="none">
          <rect width="40" height="40" rx="8" fill="#7C3AED"/>
          <circle cx="20" cy="16" r="6" stroke="white" strokeWidth="1.8" fill="none"/>
          <circle cx="20" cy="16" r="2" fill="white"/>
          <path d="M14 28c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="white" strokeWidth="1.8" strokeLinecap="round" fill="none"/>
          <path d="M26 23l2-2 2 2" stroke="white" strokeWidth="1.2" strokeLinecap="round"/>
        </svg>
      );
    case "fc_start":
      return (
        <svg width={s} height={s} viewBox="0 0 40 40" fill="none">
          <rect width="40" height="40" rx="8" fill="#059669"/>
          <rect x="6" y="13" width="28" height="14" rx="7" fill="white" fillOpacity=".9"/>
          <rect x="12" y="18" width="16" height="4" rx="2" fill="#059669" fillOpacity=".4"/>
        </svg>
      );
    case "fc_process":
      return (
        <svg width={s} height={s} viewBox="0 0 40 40" fill="none">
          <rect width="40" height="40" rx="8" fill="#2563EB"/>
          <rect x="7" y="11" width="26" height="18" rx="3" fill="white" fillOpacity=".9"/>
          <rect x="11" y="16" width="18" height="2.5" rx="1.25" fill="#2563EB" fillOpacity=".4"/>
          <rect x="11" y="21" width="12" height="2.5" rx="1.25" fill="#2563EB" fillOpacity=".3"/>
        </svg>
      );
    case "fc_decision":
      return (
        <svg width={s} height={s} viewBox="0 0 40 40" fill="none">
          <rect width="40" height="40" rx="8" fill="#D97706"/>
          <polygon points="20,8 34,20 20,32 6,20" fill="white" fillOpacity=".9"/>
          <text x="20" y="24" textAnchor="middle" fill="#D97706" fontSize="9" fontFamily="sans-serif" fontWeight="bold">?</text>
        </svg>
      );
    case "fc_io":
      return (
        <svg width={s} height={s} viewBox="0 0 40 40" fill="none">
          <rect width="40" height="40" rx="8" fill="#7C3AED"/>
          <polygon points="12,11 34,11 28,29 6,29" fill="white" fillOpacity=".9"/>
          <rect x="13" y="17" width="14" height="2" rx="1" fill="#7C3AED" fillOpacity=".4"/>
          <rect x="11" y="22" width="14" height="2" rx="1" fill="#7C3AED" fillOpacity=".3"/>
        </svg>
      );
    case "fc_document":
      return (
        <svg width={s} height={s} viewBox="0 0 40 40" fill="none">
          <rect width="40" height="40" rx="8" fill="#EA580C"/>
          <path d="M7,10 H33 V28 Q28,23 24,28 Q20,33 16,28 Q12,23 7,28 Z" fill="white" fillOpacity=".9"/>
          <rect x="11" y="15" width="18" height="2" rx="1" fill="#EA580C" fillOpacity=".4"/>
          <rect x="11" y="20" width="12" height="2" rx="1" fill="#EA580C" fillOpacity=".3"/>
        </svg>
      );
    case "fc_subprocess":
      return (
        <svg width={s} height={s} viewBox="0 0 40 40" fill="none">
          <rect width="40" height="40" rx="8" fill="#0284C7"/>
          <rect x="7" y="11" width="26" height="18" rx="3" fill="white" fillOpacity=".9"/>
          <line x1="13" y1="11" x2="13" y2="29" stroke="#0284C7" strokeWidth="1.5"/>
          <line x1="27" y1="11" x2="27" y2="29" stroke="#0284C7" strokeWidth="1.5"/>
          <rect x="15" y="16" width="10" height="2.5" rx="1.25" fill="#0284C7" fillOpacity=".4"/>
          <rect x="15" y="21" width="7" height="2.5" rx="1.25" fill="#0284C7" fillOpacity=".3"/>
        </svg>
      );
    default:
      return (
        <svg width={s} height={s} viewBox="0 0 40 40" fill="none">
          <rect width="40" height="40" rx="8" fill="#94A3B8"/>
          <text x="20" y="26" textAnchor="middle" fill="white" fontSize="14" fontFamily="sans-serif" fontWeight="bold">?</text>
        </svg>
      );
  }
}
