import React, { useMemo, useState } from "react";
import {
  Grid, Plus, Search, Pencil, Trash2, Eye, X, Check,
  Thermometer, ShieldAlert, MapPin, Navigation, Layers, AlertCircle, Loader2
} from "lucide-react";
import {
  useMasterDataList,
  useMasterDataCreate,
  useMasterDataUpdate,
  useMasterDataDelete,
} from "@/hooks/useMasterDataApi";

const ZONES_RESOURCE = "/master-data/zones";
const LOCATIONS_RESOURCE = "/master-data/locations";

interface ZoneRecord {
  id: number;
  code: string;
  name: string;
  zone_type: string | null;
  temperature_controlled: boolean;
  temperature_min_c: number | null;
  temperature_max_c: number | null;
  gps_lat: number | null;
  gps_lng: number | null;
  capacity_units: number | null;
  occupancy_pct: number;
  status: string;
}

interface LocationRecord {
  id: number;
  code: string;
  zone_id: number | null;
  x_coordinate: number | null;
  y_coordinate: number | null;
  location_type: string | null;
  status: string;
}

const typeColor: Record<string, string> = {
  "Pick": "bg-blue-50 text-blue-700", "Reserve": "bg-slate-100 text-slate-700",
  "Bulk": "bg-purple-50 text-purple-700", "Hazmat": "bg-red-50 text-red-700",
  "Cold Storage": "bg-cyan-50 text-cyan-700", "QC Hold": "bg-amber-50 text-amber-700",
  "Staging": "bg-green-50 text-green-700", "Pick Face": "bg-blue-50 text-blue-700", "Dock": "bg-amber-50 text-amber-700",
};

const occupancyColor = (pct: number) => pct >= 95 ? "#EF4444" : pct >= 75 ? "#F59E0B" : pct >= 50 ? "#3B82F6" : "#10B981";

const emptyForm = {
  code: "", name: "", zone_type: "Pick", temperature_controlled: false, temperature_min_c: "", temperature_max_c: "",
  gps_lat: "", gps_lng: "", capacity_units: "", occupancy_pct: "0", status: "Active",
};

const ZoneAreaSection = () => {
  const { data: zones = [], isLoading } = useMasterDataList<ZoneRecord>(ZONES_RESOURCE);
  const { data: locations = [] } = useMasterDataList<LocationRecord>(LOCATIONS_RESOURCE);
  const createZone = useMasterDataCreate<ZoneRecord>(ZONES_RESOURCE);
  const updateZone = useMasterDataUpdate<ZoneRecord>(ZONES_RESOURCE);
  const deleteZone = useMasterDataDelete(ZONES_RESOURCE);

  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [activeView, setActiveView] = useState<"detail" | "map">("detail");
  const [hoveredLoc, setHoveredLoc] = useState<number | null>(null);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });

  const detail = zones.find(z => z.id === selected);
  const mapLocations = useMemo(() => selected ? locations.filter(l => l.zone_id === selected && l.x_coordinate != null) : [], [locations, selected]);

  const openAdd = () => { setForm({ ...emptyForm }); setShowForm(true); setEditMode(false); };
  const openEdit = (z: ZoneRecord) => {
    setSelected(z.id);
    setForm({
      code: z.code, name: z.name, zone_type: z.zone_type ?? "Pick", temperature_controlled: z.temperature_controlled,
      temperature_min_c: z.temperature_min_c?.toString() ?? "", temperature_max_c: z.temperature_max_c?.toString() ?? "",
      gps_lat: z.gps_lat?.toString() ?? "", gps_lng: z.gps_lng?.toString() ?? "", capacity_units: z.capacity_units?.toString() ?? "",
      occupancy_pct: z.occupancy_pct.toString(), status: z.status,
    });
    setEditMode(true); setShowForm(false); setActiveView("detail");
  };

  const toPayload = () => ({
    code: form.code, name: form.name, zone_type: form.zone_type, temperature_controlled: form.temperature_controlled,
    temperature_min_c: form.temperature_min_c ? Number(form.temperature_min_c) : null,
    temperature_max_c: form.temperature_max_c ? Number(form.temperature_max_c) : null,
    gps_lat: form.gps_lat ? Number(form.gps_lat) : null, gps_lng: form.gps_lng ? Number(form.gps_lng) : null,
    capacity_units: form.capacity_units ? Number(form.capacity_units) : null,
    occupancy_pct: Number(form.occupancy_pct) || 0, status: form.status,
  });

  const handleCreate = () => {
    if (!form.code || !form.name) return;
    createZone.mutate(toPayload(), { onSuccess: () => { setShowForm(false); setSaved(true); setTimeout(() => setSaved(false), 2000); } });
  };
  const handleSaveEdit = () => {
    if (!detail) return;
    updateZone.mutate({ id: detail.id, payload: toPayload() }, { onSuccess: () => { setEditMode(false); setSaved(true); setTimeout(() => setSaved(false), 2000); } });
  };
  const handleDelete = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Delete this zone?")) return;
    deleteZone.mutate(id, { onSuccess: () => { if (selected === id) setSelected(null); } });
  };

  const locCountFor = (zoneId: number) => locations.filter(l => l.zone_id === zoneId).length;

  return (
    <section className="space-y-4" id="zone-section">
      {/* Utilization Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {zones.filter(z => z.status === "Active").slice(0, 4).map(z => (
          <div key={z.id} className="bg-white rounded-xl border border-neutral-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-neutral-700">{z.code}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeColor[z.zone_type ?? ""] || "bg-neutral-100 text-neutral-600"}`}>{z.zone_type}</span>
            </div>
            <p className="text-xs text-neutral-500 mb-2">{locCountFor(z.id)} locations</p>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-neutral-500">Occupancy</span>
              <span className="font-semibold" style={{ color: occupancyColor(z.occupancy_pct) }}>{z.occupancy_pct}%</span>
            </div>
            <div className="w-full bg-neutral-100 rounded-full h-1.5">
              <div className="h-1.5 rounded-full transition-all" style={{ width: `${z.occupancy_pct}%`, background: occupancyColor(z.occupancy_pct) }}></div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Zone Table */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-neutral-200">
          <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-sm font-semibold text-neutral-900 flex items-center gap-2">
              <Grid size={14} className="text-[#009FE3]" /> Zones & Areas
            </h2>
            <button onClick={openAdd} className="flex items-center gap-1.5 px-3 py-1.5 text-white rounded-lg text-xs hover:opacity-90" style={{ background: "#009FE3" }}>
              <Plus size={12} /> Add Zone
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-100">
                  <th className="text-left py-2.5 px-3 text-neutral-500">Zone Code</th>
                  <th className="text-left py-2.5 px-3 text-neutral-500">Name</th>
                  <th className="text-left py-2.5 px-3 text-neutral-500">Type</th>
                  <th className="text-left py-2.5 px-3 text-neutral-500">Locations</th>
                  <th className="text-left py-2.5 px-3 text-neutral-500">Occupied</th>
                  <th className="text-left py-2.5 px-3 text-neutral-500">Status</th>
                  <th className="text-left py-2.5 px-3 text-neutral-500">Act.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50">
                {isLoading ? (
                  <tr><td colSpan={7} className="py-8 text-center text-xs text-neutral-400"><Loader2 size={14} className="inline animate-spin mr-1.5" />Loading zones…</td></tr>
                ) : zones.map(z => (
                  <tr key={z.id}
                    className={`hover:bg-blue-50/30 cursor-pointer transition-colors ${selected === z.id ? "bg-blue-50/40" : ""}`}
                    onClick={() => { setSelected(z.id); setShowForm(false); setActiveView("detail"); setEditMode(false); }}
                  >
                    <td className="py-2.5 px-3 font-medium text-neutral-900">{z.code}</td>
                    <td className="py-2.5 px-3 text-neutral-700 flex items-center gap-1.5">
                      {z.temperature_controlled && <Thermometer size={10} className="text-cyan-500 flex-shrink-0" />}
                      {z.name}
                    </td>
                    <td className="py-2.5 px-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${typeColor[z.zone_type ?? ""] || ""}`}>{z.zone_type}</span></td>
                    <td className="py-2.5 px-3 text-neutral-700">{locCountFor(z.id)}</td>
                    <td className="py-2.5 px-3"><span className="font-semibold" style={{ color: occupancyColor(z.occupancy_pct) }}>{z.occupancy_pct}%</span></td>
                    <td className="py-2.5 px-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${z.status === "Active" ? "bg-emerald-50 text-emerald-700" : "bg-neutral-100 text-neutral-500"}`}>{z.status}</span></td>
                    <td className="py-2.5 px-3">
                      <div className="flex gap-1.5">
                        <button onClick={e => { e.stopPropagation(); setSelected(z.id); setActiveView("map"); setShowForm(false); }} className="text-neutral-400 hover:text-[#009FE3]"><Eye size={12} /></button>
                        <button onClick={e => { e.stopPropagation(); openEdit(z); }} className="text-neutral-400 hover:text-amber-500"><Pencil size={12} /></button>
                        <button onClick={e => handleDelete(z.id, e)} className="text-neutral-400 hover:text-red-500"><Trash2 size={12} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3 border-t border-neutral-100">
            <span className="text-xs text-neutral-400">Showing {zones.length} zones</span>
          </div>
        </div>

        {/* Side Panel */}
        <div className="flex flex-col gap-4">
          {showForm ? (
            <div className="bg-white rounded-xl border border-neutral-200">
              <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-neutral-900 flex items-center gap-2"><Plus size={13} className="text-[#009FE3]" /> Add Zone</h3>
                <button onClick={() => setShowForm(false)} className="text-neutral-400 hover:text-neutral-600"><X size={14} /></button>
              </div>
              <div className="p-5 space-y-3">
                <div><label className="block text-xs text-neutral-600 mb-1">Zone Code *</label><input className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-xs bg-neutral-50 focus:outline-none focus:border-[#009FE3]" placeholder="ZN-A" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} /></div>
                <div><label className="block text-xs text-neutral-600 mb-1">Zone Name *</label><input className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#009FE3]" placeholder="Descriptive name..." value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
                <div><label className="block text-xs text-neutral-600 mb-1">Zone Type *</label>
                  <select className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-xs bg-white focus:outline-none focus:border-[#009FE3]" value={form.zone_type} onChange={e => setForm({ ...form, zone_type: e.target.value })}>
                    <option>Pick</option><option>Reserve</option><option>Bulk</option><option>Hazmat</option><option>Cold Storage</option><option>QC Hold</option><option>Staging</option>
                  </select>
                </div>
                <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" className="rounded accent-[#009FE3]" checked={form.temperature_controlled} onChange={e => setForm({ ...form, temperature_controlled: e.target.checked })} /><span className="text-xs text-neutral-700">Temperature Controlled</span></label>
                {form.temperature_controlled && (
                  <div className="grid grid-cols-2 gap-2">
                    <input className="border border-neutral-200 rounded-lg px-2 py-2 text-xs focus:outline-none" placeholder="Min °C" type="number" value={form.temperature_min_c} onChange={e => setForm({ ...form, temperature_min_c: e.target.value })} />
                    <input className="border border-neutral-200 rounded-lg px-2 py-2 text-xs focus:outline-none" placeholder="Max °C" type="number" value={form.temperature_max_c} onChange={e => setForm({ ...form, temperature_max_c: e.target.value })} />
                  </div>
                )}
                <div><label className="block text-xs text-neutral-600 mb-1">GPS Coordinates</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input className="border border-neutral-200 rounded-lg px-2 py-2 text-xs focus:outline-none" placeholder="Latitude" type="number" step="0.0001" value={form.gps_lat} onChange={e => setForm({ ...form, gps_lat: e.target.value })} />
                    <input className="border border-neutral-200 rounded-lg px-2 py-2 text-xs focus:outline-none" placeholder="Longitude" type="number" step="0.0001" value={form.gps_lng} onChange={e => setForm({ ...form, gps_lng: e.target.value })} />
                  </div>
                </div>
                <div><label className="block text-xs text-neutral-600 mb-1">Capacity (units)</label><input className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-xs focus:outline-none" type="number" value={form.capacity_units} onChange={e => setForm({ ...form, capacity_units: e.target.value })} /></div>
                {createZone.isError && <p className="text-xs text-red-600">{(createZone.error as Error).message}</p>}
                <div className="flex gap-2 pt-1">
                  <button onClick={handleCreate} disabled={createZone.isPending} className="flex-1 py-2 text-white rounded-lg text-xs flex items-center justify-center gap-1.5 hover:opacity-90 disabled:opacity-60" style={{ background: "#009FE3" }}>
                    {createZone.isPending ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Save Zone
                  </button>
                  <button onClick={() => setShowForm(false)} className="flex-1 py-2 border border-neutral-200 text-neutral-700 rounded-lg text-xs hover:bg-neutral-50">Cancel</button>
                </div>
              </div>
            </div>
          ) : detail ? (
            <div className="bg-white rounded-xl border border-neutral-200">
              <div className="px-5 pt-4 pb-0 border-b border-neutral-100">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-neutral-900">{detail.code}</h3>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${typeColor[detail.zone_type ?? ""] || ""}`}>{detail.zone_type}</span>
                </div>
                <div className="flex gap-0">
                  {[["detail", "Details"], ["map", "📍 Location Map"]].map(([v, l]) => (
                    <button key={v} onClick={() => { setActiveView(v as any); setEditMode(false); }}
                      className={`text-xs px-4 py-2 border-b-2 transition-colors ${activeView === v ? "border-[#009FE3] font-semibold" : "border-transparent text-neutral-500 hover:text-neutral-700"}`}
                      style={activeView === v ? { color: "#009FE3" } : {}}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              {activeView === "detail" ? (
                <div className="p-5 space-y-3">
                  <div><label className="block text-xs text-neutral-600 mb-1">Zone Name</label>
                    <input disabled={!editMode} className={`w-full border rounded-lg px-3 py-2 text-xs focus:outline-none ${editMode ? "border-[#009FE3]" : "border-neutral-200 bg-neutral-50 text-neutral-700"}`} value={editMode ? form.name : detail.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                  </div>
                  <div><label className="block text-xs text-neutral-600 mb-1">GPS Coordinates</label>
                    <div className="grid grid-cols-2 gap-2">
                      <input disabled={!editMode} className={`border rounded-lg px-2 py-2 text-xs focus:outline-none ${editMode ? "border-[#009FE3]" : "border-neutral-200 bg-neutral-50"}`} value={editMode ? form.gps_lat : detail.gps_lat ?? ""} onChange={e => setForm({ ...form, gps_lat: e.target.value })} />
                      <input disabled={!editMode} className={`border rounded-lg px-2 py-2 text-xs focus:outline-none ${editMode ? "border-[#009FE3]" : "border-neutral-200 bg-neutral-50"}`} value={editMode ? form.gps_lng : detail.gps_lng ?? ""} onChange={e => setForm({ ...form, gps_lng: e.target.value })} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1"><span className="text-neutral-500">Occupancy</span><span className="font-semibold" style={{ color: occupancyColor(detail.occupancy_pct) }}>{detail.occupancy_pct}%</span></div>
                    <div className="w-full bg-neutral-100 rounded-full h-2"><div className="h-2 rounded-full" style={{ width: `${detail.occupancy_pct}%`, background: occupancyColor(detail.occupancy_pct) }}></div></div>
                  </div>
                  <div className="flex justify-between text-xs"><span className="text-neutral-500">Total Locations</span><span className="font-medium text-neutral-900">{locCountFor(detail.id)}</span></div>
                  {saved && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg">
                      <Check size={12} className="text-emerald-600" /><span className="text-xs text-emerald-700">Zone saved successfully!</span>
                    </div>
                  )}
                  {updateZone.isError && <p className="text-xs text-red-600">{(updateZone.error as Error).message}</p>}
                  <div className="flex gap-2 pt-1">
                    {editMode ? (
                      <>
                        <button onClick={handleSaveEdit} disabled={updateZone.isPending} className="flex-1 py-2 text-white rounded-lg text-xs flex items-center justify-center gap-1.5 hover:opacity-90 disabled:opacity-60" style={{ background: "#009FE3" }}>
                          {updateZone.isPending ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Save Zone
                        </button>
                        <button onClick={() => setEditMode(false)} className="flex-1 py-2 border border-neutral-200 text-neutral-700 rounded-lg text-xs hover:bg-neutral-50">Cancel</button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => openEdit(detail)} className="flex-1 py-2 text-white rounded-lg text-xs hover:opacity-90" style={{ background: "#009FE3" }}>Edit Zone</button>
                        <button onClick={() => setActiveView("map")} className="flex-1 py-2 border border-neutral-200 text-neutral-700 rounded-lg text-xs hover:bg-neutral-50 flex items-center justify-center gap-1"><MapPin size={11} /> View Map</button>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                /* LOCATION MAP VIEW — plots real Location records via their XYZ coordinates */
                <div className="p-5 space-y-3">
                  <p className="text-xs font-semibold text-neutral-800 flex items-center gap-1.5"><Navigation size={13} className="text-[#009FE3]" /> Location Map — {detail.code}</p>
                  <div className="relative bg-slate-50 border border-neutral-200 rounded-xl overflow-hidden" style={{ height: 240 }}>
                    {mapLocations.map(loc => {
                      const color = loc.status === "Inactive" ? "#d1d5db" : "#10B981";
                      const isHovered = hoveredLoc === loc.id;
                      const left = Math.min(90, Math.max(2, (loc.x_coordinate ?? 0) * 4));
                      const top = Math.min(85, Math.max(2, (loc.y_coordinate ?? 0) * 4));
                      return (
                        <div key={loc.id} className="absolute cursor-pointer transition-transform"
                          style={{ left: `${left}%`, top: `${top}%`, transform: isHovered ? "scale(1.6)" : "scale(1)" }}
                          onMouseEnter={() => setHoveredLoc(loc.id)} onMouseLeave={() => setHoveredLoc(null)}>
                          <div className="w-5 h-5 rounded border-2 border-white shadow-sm flex items-center justify-center" style={{ background: color }} />
                          {isHovered && (
                            <div className="absolute z-10 bg-white border border-neutral-200 rounded-lg p-2 shadow-lg text-xs w-40" style={{ top: -60, left: -60 }}>
                              <p className="font-semibold text-neutral-900">{loc.code}</p>
                              <p className="text-neutral-500">{loc.location_type}</p>
                              <span className={`text-xs ${loc.status === "Active" ? "text-emerald-600" : "text-neutral-400"}`}>{loc.status}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {mapLocations.length === 0 && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                        <Layers size={24} className="text-neutral-300 mb-2" />
                        <p className="text-xs text-neutral-400">No locations with XYZ coordinates in this zone yet.</p>
                      </div>
                    )}
                  </div>
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {mapLocations.map(loc => (
                      <div key={loc.id} className="flex items-center justify-between px-3 py-2 bg-neutral-50 rounded-lg text-xs hover:bg-blue-50/30 cursor-pointer"
                        onMouseEnter={() => setHoveredLoc(loc.id)} onMouseLeave={() => setHoveredLoc(null)}>
                        <span className="font-medium text-neutral-900">{loc.code}</span>
                        <span className={`px-1.5 py-0.5 rounded text-xs ${typeColor[loc.location_type ?? ""] || "bg-neutral-100 text-neutral-600"}`}>{loc.location_type}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-neutral-200 p-8 text-center text-xs text-neutral-400">
              Select a zone, or click "Add Zone" to create one.
            </div>
          )}

          {zones.some(z => z.occupancy_pct >= 90) && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex gap-3">
              <AlertCircle size={14} className="text-red-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-semibold text-red-700">Zone(s) Near Capacity</p>
                <p className="text-xs text-red-600 mt-0.5">{zones.filter(z => z.occupancy_pct >= 90).map(z => z.code).join(", ")} at 90%+ occupancy. Consider overflow or space optimization.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default ZoneAreaSection;
