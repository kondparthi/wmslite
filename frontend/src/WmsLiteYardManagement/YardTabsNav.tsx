import React from "react";
import { Truck, Navigation, DoorOpen, ClipboardList, BarChart3 } from "lucide-react";

const tabs = [
  { id: "gate",     label: "Gate Management",   icon: Truck },
  { id: "tracking", label: "Yard Inventory",     icon: Navigation },
  { id: "docks",    label: "Dock & Doors",       icon: DoorOpen },
  { id: "shunter",  label: "Shunter Workflows",  icon: ClipboardList },
  { id: "reports",  label: "Yard Analytics",     icon: BarChart3 },
];

interface YardTabsNavProps {
  activeTab: string;
  onTabChange: (id: string) => void;
}

const YardTabsNav: React.FC<YardTabsNavProps> = ({ activeTab, onTabChange }) => (
  <div className="bg-white border-b border-slate-200">
    <div className="px-6 py-3 flex flex-wrap gap-2">
      {tabs.map(({ id, label, icon: Icon }) => {
        const isActive = activeTab === id;
        return (
          <button
            key={id}
            onClick={() => onTabChange(id)}
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

export default YardTabsNav;