import React, { useState } from "react";
import {
  Package, CheckCircle, Navigation, Truck, ShoppingCart,
  CalendarCheck, ClipboardList, BarChart2, FileText, Tag
} from "lucide-react";

const tabs = [
  { id: "asn",           label: "ASN",                icon: FileText },
  { id: "receive",       label: "Receive by WebUI",   icon: CheckCircle },
  { id: "putaway-strat", label: "Putaway Strategy",   icon: Navigation },
  { id: "putaway-web",   label: "Putaway by WebUI",   icon: Truck },
  { id: "po",            label: "Purchase Order",     icon: ShoppingCart },
  { id: "appointment",   label: "Inbound Appointment",icon: CalendarCheck },
  { id: "tasks",         label: "Task Management",    icon: ClipboardList },
  { id: "labels",        label: "Label Generation",   icon: Tag },
  { id: "report",        label: "Inbound Report",     icon: BarChart2 },
  { id: "summary",       label: "Summary Report",     icon: Package },
];

interface InboundTabsNavProps {
  activeTab?: string;
  onTabChange?: (id: string) => void;
}

const InboundTabsNav = ({ activeTab = "asn", onTabChange }: InboundTabsNavProps) => {
  const [active, setActive] = useState(activeTab);

  const handleClick = (id: string) => {
    setActive(id);
    onTabChange?.(id);
  };

  return (
    <div className="bg-white border-b border-slate-200" id="inbound-tabs">
      <div className="px-6 py-3 flex flex-wrap gap-2">
        {tabs.map(({ id, label, icon: Icon }) => {
          const isActive = active === id;
          return (
            <button
              key={id}
              onClick={() => handleClick(id)}
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

export default InboundTabsNav;