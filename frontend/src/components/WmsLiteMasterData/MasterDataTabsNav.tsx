import React, { useState } from "react";
import {
  MapPin, UserCheck, Box, Layers, Truck, Factory,
  Grid, Navigation, RefreshCw, Tag, FileText
} from "lucide-react";

const tabs = [
  { id: "location",  label: "Location Master",   icon: MapPin },
  { id: "owner",     label: "Material Owner",    icon: UserCheck },
  { id: "material",  label: "Material Master",   icon: Box },
  { id: "packkey",   label: "Material Packkey",  icon: Layers },
  { id: "shipto",    label: "Ship To / From",    icon: Truck },
  { id: "supplier",  label: "Supplier",          icon: Factory },
  { id: "zone",      label: "Zone / Area",       icon: Grid },
  { id: "assigned",  label: "Assigned Locations",icon: Navigation },
  { id: "replen",    label: "Replenishment",     icon: RefreshCw },
  { id: "lot",       label: "Outbound LOT",      icon: Tag },
  { id: "carrier",   label: "Carrier / Bill To", icon: FileText },
];

const MasterDataTabsNav = ({
  activeTab = "location",
  onTabChange,
}: {
  activeTab?: string;
  onTabChange?: (id: string) => void;
}) => {
  const [active, setActive] = useState(activeTab);

  const handleClick = (id: string) => {
    setActive(id);
    onTabChange?.(id);
  };

  return (
    <div className="bg-white border-b border-slate-200" id="master-data-tabs">
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

export default MasterDataTabsNav;