import React from "react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBox, faIndustry, faLayerGroup, faMapPin, faTruck, faUserTie } from '@fortawesome/free-solid-svg-icons';
import { useMasterDataList } from "@/hooks/useMasterDataApi";

const MasterDataSummarySection = () => {
  const { data: locations = [] } = useMasterDataList<unknown>("/master-data/locations");
  const { data: materials = [] } = useMasterDataList<unknown>("/master-data/materials");
  const { data: suppliers = [] } = useMasterDataList<unknown>("/master-data/suppliers");
  const { data: zones = [] } = useMasterDataList<unknown>("/master-data/zones");
  const { data: carriers = [] } = useMasterDataList<unknown>("/master-data/carriers");
  const { data: owners = [] } = useMasterDataList<unknown>("/master-data/material-owners");

  const cards = [
    { icon: faMapPin, value: locations.length, label: "Locations" },
    { icon: faBox, value: materials.length, label: "Materials" },
    { icon: faIndustry, value: suppliers.length, label: "Suppliers" },
    { icon: faLayerGroup, value: zones.length, label: "Zones / Areas" },
    { icon: faTruck, value: carriers.length, label: "Carriers" },
    { icon: faUserTie, value: owners.length, label: "Material Owners" },
  ];

  return (
    <section className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3" id="master-data-summary">
      {cards.map(c => (
        <div key={c.label} className="bg-white rounded-xl border border-neutral-200 p-4 flex flex-col gap-2">
          <div className="w-8 h-8 bg-neutral-100 rounded-lg flex items-center justify-center">
            <FontAwesomeIcon icon={c.icon} className="text-neutral-700 text-sm" />
          </div>
          <p className="text-2xl text-neutral-900">{c.value}</p>
          <p className="text-xs text-neutral-500">{c.label}</p>
        </div>
      ))}
    </section>
  );
};

export default MasterDataSummarySection;
