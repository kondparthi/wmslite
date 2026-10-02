import React from "react";
import {
  BarChart2, ArrowLeftRight, MoveRight, PauseCircle,
  SlidersHorizontal, ArrowUpDown, RefreshCw, Wrench, FileText
} from "lucide-react";

const tabs = [
  { id: "balance",      label: "Inventory Balance",  icon: BarChart2 },
  { id: "transactions", label: "Transactions",       icon: ArrowLeftRight },
  { id: "movement",     label: "Movement",           icon: MoveRight },
  { id: "hold",         label: "Hold",               icon: PauseCircle },
  { id: "adjustment",   label: "Adjustment",         icon: SlidersHorizontal },
  { id: "update",       label: "Update (Transfer)",  icon: ArrowUpDown },
  { id: "cycle-count",  label: "Cycle Count",        icon: RefreshCw },
  { id: "kitting",      label: "Kitting / VAS",      icon: Wrench },
  { id: "report",       label: "Summary Report",     icon: FileText },
];

interface InventoryTabsNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const InventoryTabsNav: React.FC<InventoryTabsNavProps> = ({ activeTab, setActiveTab }) => (
  <div className="bg-white border-b border-slate-200">
    <div className="px-6 py-3 flex flex-wrap gap-2">
      {tabs.map(({ id, label, icon: Icon }) => {
        const isActive = activeTab === id;
        return (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
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

export default InventoryTabsNav;