import { memo, useState } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Trash2, Settings, Copy } from "lucide-react";
import { useCanvasStore } from "../../store/canvasStore.ts";
import { fmtUSD, fmtTHB } from "../../lib/utils.ts";
import { AwsIcon } from "../AwsIcon.tsx";
import { NodeConfigPanel } from "../panels/NodeConfigPanel.tsx";
import type { AWSServiceType, CanvasNode } from "../../types.ts";

const SERVICE_COLORS: Record<string, string> = {
  ec2: "#FF9900", s3: "#3F8624", rds: "#1D6FCA", lambda: "#E7157B",
  vpc: "#8C4FFF", alb: "#FF4F8B", cloudfront: "#FF7300",
  elasticache: "#C7131F", sqs: "#FF4F8B", apigateway: "#A020F0",
  sticky_note: "#92400E", custom: "#475569",
  bedrock: "#7A3FBF", ebs: "#7AA116", lightsail: "#0CA4DA",
  cognito: "#BF4040", route53: "#8C4FFF", dynamodb: "#1D6FCA",
  redshift: "#8B1A1A",
};

interface ServiceNodeData {
  label: string;
  config: Record<string, unknown>;
  costOverride?: number;
  monthlyCost?: number;
  monthlyMin?: number;
  monthlyMax?: number;
  serviceType: AWSServiceType;
  region: string;
  availabilityZone?: string;
  hasAutoScaling?: boolean;
  isDifferentRegion?: boolean;
}

export const ServiceNode = memo(function ServiceNode({ id, data, selected }: NodeProps) {
  const d = data as unknown as ServiceNodeData;
  const [showConfig, setShowConfig] = useState(false);
  const { deleteNode, duplicateNode, setSelectedNode, exchangeRate } = useCanvasStore();
  const color = SERVICE_COLORS[d.serviceType] ?? "#888";

  return (
    <>
      <div
        className="relative min-w-[180px] rounded-lg bg-white shadow-md border-2 text-sm select-none"
        style={{ borderColor: d.isDifferentRegion ? "#8C4FFF" : color }}
        onClick={() => setSelectedNode(id)}
      >
        {/* Header */}
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-t-md"
          style={{ backgroundColor: color + "22" }}
        >
          <AwsIcon type={d.serviceType} size={22} />
          <span className="font-semibold text-gray-800 flex-1 truncate">{d.label}</span>
          <button
            className="opacity-40 hover:opacity-100 transition-opacity"
            onClick={(e) => { e.stopPropagation(); setShowConfig(true); }}
          >
            <Settings size={14} />
          </button>
          <button
            title="Duplicate (Ctrl+D)"
            className="opacity-40 hover:opacity-100 text-gray-500 hover:text-blue-500 transition-all"
            onClick={(e) => { e.stopPropagation(); duplicateNode(id); }}
          >
            <Copy size={13} />
          </button>
          <button
            className="opacity-40 hover:opacity-100 text-red-500 transition-opacity"
            onClick={(e) => { e.stopPropagation(); deleteNode(id); }}
          >
            <Trash2 size={14} />
          </button>
        </div>

        {/* Body */}
        <div className="px-3 py-2 space-y-1">
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <span>📍</span>
            <span>{d.region}{d.availabilityZone ? ` · ${d.availabilityZone}` : ""}</span>
            {d.isDifferentRegion && (
              <span className="ml-1 px-1 rounded text-purple-700 bg-purple-100 text-[10px] font-medium">cross-region</span>
            )}
          </div>

          {(d.config as any)?.description && (
            <div className="text-[11px] text-gray-400 italic leading-tight">
              {(d.config as any).description}
            </div>
          )}

          {d.hasAutoScaling && (
            <div className="text-xs text-blue-600 font-medium">
              ⚖️ ASG: {(d.config as any).autoScaling?.minCapacity ?? "?"} → {(d.config as any).autoScaling?.desiredCapacity ?? "?"} → {(d.config as any).autoScaling?.maxCapacity ?? "?"}
            </div>
          )}

          {/* Cost badge */}
          {d.monthlyCost !== undefined && (
            <div className="mt-1 pt-1 border-t border-gray-100">
              <div className="font-semibold text-gray-900">
                {fmtUSD(d.monthlyCost)}
                <span className="text-gray-400 font-normal text-xs">/mo</span>
              </div>
              <div className="text-[10px] text-gray-400">{fmtTHB(d.monthlyCost * exchangeRate)}</div>
              {d.monthlyMin !== undefined && d.monthlyMax !== undefined && (
                <div className="text-[10px] text-gray-400">
                  {fmtUSD(d.monthlyMin)} – {fmtUSD(d.monthlyMax)} (ASG)
                </div>
              )}
            </div>
          )}
        </div>

        {/* Selection ring */}
        {selected && (
          <div className="absolute inset-0 rounded-lg ring-2 ring-blue-400 ring-offset-1 pointer-events-none" />
        )}
      </div>

      <Handle type="target" position={Position.Left} className="!w-3 !h-3 !bg-gray-400" />
      <Handle type="source" position={Position.Right} className="!w-3 !h-3 !bg-gray-400" />
      <Handle type="target" position={Position.Top} className="!w-3 !h-3 !bg-gray-400" />
      <Handle type="source" position={Position.Bottom} className="!w-3 !h-3 !bg-gray-400" />

      {showConfig && (
        <NodeConfigPanel nodeId={id} onClose={() => setShowConfig(false)} />
      )}
    </>
  );
});
