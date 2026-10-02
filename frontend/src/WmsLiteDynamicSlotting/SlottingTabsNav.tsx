import React from "react";
import { Layers, Zap, Maximize, RefreshCcw, BarChart3 } from "lucide-react";

const tabs = [
  { value: "strategies",   label: "Slotting Strategies",  icon: Layers },
  { value: "velocity",     label: "Velocity Analysis",    icon: Zap },
  { value: "utilization",  label: "Storage Utilization",  icon: Maximize },
  { value: "reslotting",   label: "Re-slotting Tasks",    icon: RefreshCcw },
  { value: "optimization", label: "Optimization Reports", icon: BarChart3 },
];

interface SlottingTabsNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const SlottingTabsNav: React.FC<SlottingTabsNavProps> = ({ activeTab, onTabChange }) => (
  <div className="bg-white border-b border-slate-200">
    <div className="px-6 py-3 flex flex-wrap gap-2">
      {tabs.map(({ value, label, icon: Icon }) => {
        const isActive = activeTab === value;
        return (
          <button
            key={value}
            onClick={() => onTabChange(value)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all focus:outline-none border"
            style={
              isActive
                ? { background: "#009FE3", color: "#fff", borderColor: "#009FE3", boxShadow: "0 2px 8px rgba(0,159,227,0.25)" }
                : { background: "#F1F5F9", color: "#64748B", borderColor: "#E2EAF4" }
            }
          >
            <Icon size={12} style={{ color: isActive ? "#fff" : "#94A3B8" }} />
            {label}
          </button>
        );
      })}
    </div>
  </div>
);

export default SlottingTabsNav;