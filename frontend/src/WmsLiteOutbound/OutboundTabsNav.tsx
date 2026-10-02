import React, { useState } from "react";
import {
  ShoppingBag, Layers, GitBranch, Waves, HandIcon, Package2,
  Truck, PackageOpen, Send, ClipboardList, CalendarCheck, BarChart2
} from "lucide-react";

const tabs = [
  { value: "orders",       label: "Shipment Orders",       icon: ShoppingBag },
  { value: "strategies",   label: "Allocation Strategies", icon: GitBranch },
  { value: "allocation",   label: "Allocation",            icon: Layers },
  { value: "wave",         label: "Wave Planning",         icon: Waves },
  { value: "picking",      label: "Picking",               icon: HandIcon },
  { value: "unallocated",  label: "Unpicked / Unallocated",icon: Package2 },
  { value: "load",         label: "Load & Unload",         icon: Truck },
  { value: "packing",      label: "Pack / Unpack",         icon: PackageOpen },
  { value: "shipping",     label: "Ship",                  icon: Send },
  { value: "tasks",        label: "Task Management",       icon: ClipboardList },
  { value: "appointments", label: "Appointments",          icon: CalendarCheck },
  { value: "reports",      label: "Reports",               icon: BarChart2 },
];

interface OutboundTabsNavProps {
  activeTab?: string;
  onTabChange?: (v: string) => void;
}

const OutboundTabsNav = ({ activeTab = "orders", onTabChange }: OutboundTabsNavProps) => {
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

export default OutboundTabsNav;