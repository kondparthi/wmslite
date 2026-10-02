import React from "react";
import { Settings, Database, Globe, Users, Link, ShieldCheck, Building2, Bell, QrCode } from "lucide-react";

const tabs = [
  { id: "system",       label: "System Settings",   icon: Settings },
  { id: "warehouse",    label: "Warehouse Config",   icon: Building2 },
  { id: "masterdata",   label: "Master Data Config", icon: Database },
  { id: "localization", label: "Localization",       icon: Globe },
  { id: "users",        label: "Users & Roles",      icon: Users },
  { id: "integrations", label: "Integrations",       icon: Link },
  { id: "notifications",label: "Notifications",      icon: Bell },
  { id: "barcodes",     label: "Bar Code Configs",   icon: QrCode },
  { id: "audit",        label: "Audit & Security",   icon: ShieldCheck },
];

interface AdminConfigTabsNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function AdminConfigTabsNav({ activeTab, onTabChange }: AdminConfigTabsNavProps) {
  return (
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
}