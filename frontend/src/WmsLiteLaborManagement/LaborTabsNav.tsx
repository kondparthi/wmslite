import React, { useState } from "react";
import { Clock, Users, TrendingUp, CalendarCheck, UserCheck, FileText } from "lucide-react";

const tabs = [
  { value: "tracking",    label: "Labor Tracking",  icon: Clock },
  { value: "employee",    label: "Employee Master", icon: Users },
  { value: "performance", label: "Performance",     icon: TrendingUp },
  { value: "attendance",  label: "Attendance",      icon: CalendarCheck },
  { value: "allocation",  label: "Allocation",      icon: UserCheck },
  { value: "productivity",label: "Productivity",    icon: FileText },
];

interface LaborTabsNavProps {
  activeTab?: string;
  onTabChange?: (v: string) => void;
}

const LaborTabsNav = ({ activeTab = "tracking", onTabChange }: LaborTabsNavProps) => {
  const [active, setActive] = useState(activeTab);

  const handleClick = (v: string) => {
    setActive(v);
    onTabChange?.(v);
  };

  return (
    <div className="bg-white border-b border-slate-200">
      <div className="px-6 py-3 flex flex-wrap gap-2">
        {tabs.map(({ value, label, icon: Icon }) => {
          const isActive = active === value;
          return (
            <button
              key={value}
              onClick={() => handleClick(value)}
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
};

export default LaborTabsNav;