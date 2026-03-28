import { useState } from "react";
import { X, Settings, PanelLeftClose } from "lucide-react";
import { AwsIcon } from "./AwsIcon.tsx";
import { TOOLBAR_TABS } from "../lib/defaultConfigs.ts";
import { useCanvasStore } from "../store/canvasStore.ts";
import type { AWSServiceType, GroupType } from "../types.ts";

const GROUP_TYPES: Record<string, GroupType> = {
  group: "infrastructure",
};

interface Props {
  onDragStart: (e: React.DragEvent, type: AWSServiceType) => void;
  onHide: () => void;
}

const TAB_COLORS: Record<string, string> = {
  generic: "#64748B",
  aws:     "#FF9900",
  line:    "#10B981",
  api:     "#8B5CF6",
};

export function Toolbar({ onDragStart, onHide }: Props) {
  const [activeTab, setActiveTab] = useState<string>("generic");
  const [showRates, setShowRates] = useState(false);
  const { departmentRates, setDepartmentRates } = useCanvasStore();

  const currentTab = TOOLBAR_TABS.find(t => t.id === activeTab) ?? TOOLBAR_TABS[0];
  const activeColor = TAB_COLORS[activeTab] ?? "#64748B";

  return (
    <div
      className="bg-white border-r border-gray-100 flex flex-col shadow-sm shrink-0"
      style={{ width: 220 }}
    >
      {/* Tab bar + hide button */}
      <div className="flex items-center border-b border-gray-100 shrink-0">
        {TOOLBAR_TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            title={tab.label}
            className="relative flex items-center justify-center px-3 py-2.5 transition-colors border-b-2 text-base leading-none"
            style={
              activeTab === tab.id
                ? { borderBottomColor: TAB_COLORS[tab.id], background: TAB_COLORS[tab.id] + "15" }
                : { borderBottomColor: "transparent", color: "#9CA3AF" }
            }
          >
            {tab.id === "generic" ? "⬜" : tab.id === "aws" ? "☁" : tab.id === "line" ? "💬" : "🔌"}
          </button>
        ))}
        <div className="flex-1" />
        <button
          onClick={onHide}
          title="Hide sidebar"
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <PanelLeftClose size={15} />
        </button>
      </div>

      {/* Active tab label */}
      <div
        className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest shrink-0"
        style={{ color: activeColor }}
      >
        {currentTab.label}
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="flex flex-col gap-0.5 px-2 pb-2">
          {currentTab.sections.map(section => (
            <div key={section.label}>
              <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest px-1 pt-2 pb-1">
                {section.label}
              </div>
              {section.items.map(s => (
                <button
                  key={s.type}
                  draggable
                  onDragStart={e => onDragStart(e, s.type)}
                  title={s.description}
                  className="flex items-center gap-2 rounded-lg cursor-grab active:scale-95 transition-all border border-transparent hover:border-gray-200 hover:bg-gray-50 group text-left w-full px-2 py-1.5"
                >
                  <span className="shrink-0 group-hover:scale-110 transition-transform">
                    <AwsIcon type={s.type} size={26} groupType={GROUP_TYPES[s.type]} />
                  </span>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-gray-800 leading-tight truncate">{s.label}</div>
                    <div className="text-[10px] text-gray-400 leading-tight truncate">{s.description}</div>
                  </div>
                </button>
              ))}
            </div>
          ))}
        </div>

        {/* Department rates editor — Line and API tabs */}
        {(activeTab === "line" || activeTab === "api") && (
          <div className="border-t border-gray-100 mx-2 mt-1 pt-2 pb-3">
            <button
              className="flex items-center gap-1 text-[9px] font-bold text-gray-400 uppercase tracking-widest px-1 pb-1 w-full hover:text-gray-600"
              onClick={() => setShowRates(v => !v)}
            >
              <Settings size={9} />
              Manday Rates
              <span className="ml-auto">{showRates ? "▲" : "▼"}</span>
            </button>
            {showRates && (
              <div className="flex flex-col gap-1">
                {departmentRates.map((rate, i) => (
                  <div key={rate.id} className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: rate.color }} />
                    <span className="text-[10px] text-gray-600 w-12 truncate">{rate.name}</span>
                    <input
                      type="number"
                      className="flex-1 text-[10px] border border-gray-200 rounded px-1 py-0.5 text-right nodrag nopan"
                      value={rate.ratePerManday}
                      min={0}
                      step={500}
                      onChange={e => {
                        const updated = [...departmentRates];
                        updated[i] = { ...rate, ratePerManday: parseInt(e.target.value) || 0 };
                        setDepartmentRates(updated);
                      }}
                    />
                    <span className="text-[9px] text-gray-400">฿</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
