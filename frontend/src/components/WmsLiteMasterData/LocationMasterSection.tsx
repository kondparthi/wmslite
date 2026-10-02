import React, { useMemo, useState } from "react";
import { MapPin, Plus, Search, FileDown, FileUp, Pencil, Trash2, Info, X, Check, Loader2 } from "lucide-react";
import {
  useMasterDataList,
  useMasterDataCreate,
  useMasterDataUpdate,
  useMasterDataDelete,
} from "@/hooks/useMasterDataApi";

const LOCATIONS_RESOURCE = "/master-data/locations";
const ZONES_RESOURCE = "/master-data/zones";

interface LocationRecord {
  id: number;
  code: string;
  description: string | null;
  zone_id: number | null;
  aisle: string | null;
  rack: string | null;
  level: string | null;
  bin: string | null;
  x_coordinate: number | null;
  y_coordinate: number | null;
  z_coordinate: number | null;
  location_type: string | null;
  status: string;
}

interface ZoneRecord {
  id: number;
  code: string;
  name: string;
}

const typeBadge: Record<string, string> = {
  "Pick Face": "bg-blue-50 text-blue-700",
  "Reserve": "bg-slate-100 text-slate-700",
  "Staging": "bg-green-50 text-green-700",
  "Bulk": "bg-purple-50 text-purple-700",
  "Dock": "bg-amber-50 text-amber-700",
  "QC Hold": "bg-red-50 text-red-700",
};

const emptyForm = {
  code: "", description: "", zone_id: "", aisle: "", rack: "", level: "", bin: "",
  x_coordinate: "", y_coordinate: "", z_coordinate: "", location_type: "Pick Face", status: "Active",
};

const LocationMasterSection = () => {
  const { data: locations = [], isLoading } = useMasterDataList<LocationRecord>(LOCATIONS_RESOURCE);
  const { data: zones = [] } = useMasterDataList<ZoneRecord>(ZONES_RESOURCE);
  const createLocation = useMasterDataCreate<LocationRecord>(LOCATIONS_RESOURCE);
  const updateLocation = useMasterDataUpdate<LocationRecord>(LOCATIONS_RESOURCE);
  const deleteLocation = useMasterDataDelete(LOCATIONS_RESOURCE);

  const [search, setSearch] = useState("");
  const [zoneFilter, setZoneFilter] = useState("All Zones");
  const [typeFilter, setTypeFilter] = useState("All");
  const [selected, setSelected] = useState<number | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });

  const zoneName = (zoneId: number | null) => zones.find(z => z.id === zoneId)?.name ?? "—";

  const filtered = useMemo(() => locations.filter(l => {
    const matchSearch = l.code.toLowerCase().includes(search.toLowerCase()) ||
      (l.description ?? "").toLowerCase().includes(search.toLowerCase());
    const matchZone = zoneFilter === "All Zones" || zoneName(l.zone_id) === zoneFilter;
    const matchType = typeFilter === "All" || l.location_type === typeFilter ||
      (typeFilter === "Active" && l.status === "Active") || (typeFilter === "Inactive" && l.status === "Inactive");
    return matchSearch && matchZone && matchType;
  }), [locations, search, zoneFilter, typeFilter, zones]);

  const detail = locations.find(l => l.id === selected);

  const openAdd = () => { setForm({ ...emptyForm }); setShowAddForm(true); setEditMode(false); };

  const openEdit = (l: LocationRecord) => {
    setSelected(l.id);
    setForm({
      code: l.code, description: l.description ?? "", zone_id: l.zone_id ? String(l.zone_id) : "",
      aisle: l.aisle ?? "", rack: l.rack ?? "", level: l.level ?? "", bin: l.bin ?? "",
      x_coordinate: l.x_coordinate?.toString() ?? "", y_coordinate: l.y_coordinate?.toString() ?? "",
      z_coordinate: l.z_coordinate?.toString() ?? "", location_type: l.location_type ?? "Pick Face", status: l.status,
    });
    setEditMode(true);
    setShowAddForm(false);
  };

  const toPayload = () => ({
    code: form.code, description: form.description || null,
    zone_id: form.zone_id ? Number(form.zone_id) : null,
    aisle: form.aisle || null, rack: form.rack || null, level: form.level || null, bin: form.bin || null,
    x_coordinate: form.x_coordinate ? Number(form.x_coordinate) : null,
    y_coordinate: form.y_coordinate ? Number(form.y_coordinate) : null,
    z_coordinate: form.z_coordinate ? Number(form.z_coordinate) : null,
    location_type: form.location_type, status: form.status,
  });

  const handleCreate = () => {
    if (!form.code) return;
    createLocation.mutate(toPayload(), {
      onSuccess: () => { setShowAddForm(false); setSaved(true); setTimeout(() => setSaved(false), 2000); },
    });
  };

  const handleSaveEdit = () => {
    if (!detail) return;
    updateLocation.mutate({ id: detail.id, payload: toPayload() }, {
      onSuccess: () => { setEditMode(false); setSaved(true); setTimeout(() => setSaved(false), 2000); },
    });
  };

  const handleDelete = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Delete this location?")) return;
    deleteLocation.mutate(id, { onSuccess: () => { if (selected === id) setSelected(null); } });
  };

  return (
    <section className="grid grid-cols-1 lg:grid-cols-3 gap-4" id="location-master-section">
      {/* Location Master Table */}
      <div className="lg:col-span-2 bg-white rounded-xl border border-neutral-200">
        <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold text-neutral-900 flex items-center gap-2">
              <MapPin size={14} className="text-[#009FE3]" /> Location Master
            </h2>
            <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
              {isLoading ? "loading…" : `${locations.length} records`}
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 border border-neutral-200 rounded-lg px-3 py-1.5 bg-neutral-50">
              <Search size={12} className="text-neutral-400" />
              <input className="bg-transparent text-xs placeholder-neutral-400 focus:outline-none w-32" placeholder="Search locations..." value={search} onChange={e => setSearch(e.target.value)} type="text" />
            </div>
            <select className="text-xs border border-neutral-200 rounded-lg px-2 py-1.5 text-neutral-600 bg-white focus:outline-none focus:border-[#009FE3]" value={zoneFilter} onChange={e => setZoneFilter(e.target.value)}>
              <option>All Zones</option>
              {zones.map(z => <option key={z.id}>{z.name}</option>)}
            </select>
            <button onClick={openAdd} className="flex items-center gap-1.5 px-3 py-1.5 text-white rounded-lg text-xs hover:opacity-90" style={{ background: "#009FE3" }}>
              <Plus size={12} /> Add Location
            </button>
            <button className="flex items-center gap-1.5 px-3 py-1.5 border border-neutral-200 text-neutral-700 rounded-lg text-xs hover:bg-neutral-50"><FileUp size={12} /> Import</button>
            <button className="flex items-center gap-1.5 px-3 py-1.5 border border-neutral-200 text-neutral-700 rounded-lg text-xs hover:bg-neutral-50"><FileDown size={12} /> Export</button>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="px-5 py-3 border-b border-neutral-100 flex items-center gap-2 flex-wrap">
          <span className="text-xs text-neutral-500">Filter:</span>
          {["All", "Active", "Inactive", "Pick Face", "Reserve", "Staging", "Bulk", "Dock"].map(f => (
            <button key={f} onClick={() => setTypeFilter(f)}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${typeFilter === f ? "text-white border-transparent" : "border-neutral-200 text-neutral-600 hover:bg-neutral-50"}`}
              style={typeFilter === f ? { background: "#009FE3", borderColor: "#009FE3" } : {}}>
              {f}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-neutral-50 border-b border-neutral-100">
                <th className="text-left py-2.5 px-3 text-neutral-500">Location Code</th>
                <th className="text-left py-2.5 px-3 text-neutral-500">Description</th>
                <th className="text-left py-2.5 px-3 text-neutral-500">Zone</th>
                <th className="text-left py-2.5 px-3 text-neutral-500">XYZ</th>
                <th className="text-left py-2.5 px-3 text-neutral-500">Type</th>
                <th className="text-left py-2.5 px-3 text-neutral-500">Status</th>
                <th className="text-left py-2.5 px-3 text-neutral-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-50">
              {isLoading ? (
                <tr><td colSpan={7} className="py-8 text-center text-xs text-neutral-400"><Loader2 size={14} className="inline animate-spin mr-1.5" />Loading locations…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="py-8 text-center text-xs text-neutral-400">No locations match the current filters.</td></tr>
              ) : filtered.map(l => (
                <tr key={l.id}
                  className={`hover:bg-blue-50/30 cursor-pointer transition-colors ${selected === l.id ? "bg-blue-50/40" : ""}`}
                  onClick={() => { setSelected(l.id); setShowAddForm(false); setEditMode(false); }}
                >
                  <td className="py-2.5 px-3 font-medium text-neutral-900">{l.code}</td>
                  <td className="py-2.5 px-3 text-neutral-700">{l.description}</td>
                  <td className="py-2.5 px-3 text-neutral-600">{zoneName(l.zone_id)}</td>
                  <td className="py-2.5 px-3 text-neutral-500 font-mono">
                    {l.x_coordinate != null ? `${l.x_coordinate}, ${l.y_coordinate}, ${l.z_coordinate}` : "—"}
                  </td>
                  <td className="py-2.5 px-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${typeBadge[l.location_type ?? ""] || "bg-neutral-100 text-neutral-600"}`}>{l.location_type}</span></td>
                  <td className="py-2.5 px-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${l.status === "Active" ? "bg-emerald-50 text-emerald-700" : "bg-neutral-100 text-neutral-500"}`}>{l.status}</span>
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-1.5">
                      <button onClick={e => { e.stopPropagation(); openEdit(l); }} className="text-neutral-400 hover:text-amber-500"><Pencil size={12} /></button>
                      <button onClick={e => handleDelete(l.id, e)} className="text-neutral-400 hover:text-red-500"><Trash2 size={12} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-5 py-3 border-t border-neutral-100 flex items-center justify-between">
          <span className="text-xs text-neutral-400">Showing {filtered.length} of {locations.length} locations</span>
        </div>
      </div>

      {/* Side Panel */}
      <div className="flex flex-col gap-4">
        {showAddForm ? (
          /* ADD NEW LOCATION FORM */
          <div className="bg-white rounded-xl border border-neutral-200">
            <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-neutral-900 flex items-center gap-2">
                <Plus size={13} className="text-[#009FE3]" /> Add New Location
              </h3>
              <button onClick={() => setShowAddForm(false)} className="text-neutral-400 hover:text-neutral-600"><X size={14} /></button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="block text-xs text-neutral-600 mb-1">Location Code *</label>
                <input className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-xs bg-neutral-50 focus:outline-none focus:border-[#009FE3]" placeholder="A-01-01-A" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} type="text" />
              </div>
              <div>
                <label className="block text-xs text-neutral-600 mb-1">Description</label>
                <input className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#009FE3]" placeholder="Description..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} type="text" />
              </div>
              <div>
                <label className="block text-xs text-neutral-600 mb-1">Zone</label>
                <select className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-xs bg-white focus:outline-none focus:border-[#009FE3]" value={form.zone_id} onChange={e => setForm({ ...form, zone_id: e.target.value })}>
                  <option value="">— None —</option>
                  {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-4 gap-2">
                <div><label className="block text-xs text-neutral-600 mb-1">Aisle</label><input className="w-full border border-neutral-200 rounded-lg px-2 py-2 text-xs focus:outline-none focus:border-[#009FE3]" value={form.aisle} onChange={e => setForm({ ...form, aisle: e.target.value })} type="text" /></div>
                <div><label className="block text-xs text-neutral-600 mb-1">Rack</label><input className="w-full border border-neutral-200 rounded-lg px-2 py-2 text-xs focus:outline-none focus:border-[#009FE3]" value={form.rack} onChange={e => setForm({ ...form, rack: e.target.value })} type="text" /></div>
                <div><label className="block text-xs text-neutral-600 mb-1">Level</label><input className="w-full border border-neutral-200 rounded-lg px-2 py-2 text-xs focus:outline-none focus:border-[#009FE3]" value={form.level} onChange={e => setForm({ ...form, level: e.target.value })} type="text" /></div>
                <div><label className="block text-xs text-neutral-600 mb-1">Bin</label><input className="w-full border border-neutral-200 rounded-lg px-2 py-2 text-xs focus:outline-none focus:border-[#009FE3]" value={form.bin} onChange={e => setForm({ ...form, bin: e.target.value })} type="text" /></div>
              </div>
              <div>
                <label className="block text-xs text-neutral-600 mb-1">Location Type</label>
                <select className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-xs bg-white focus:outline-none focus:border-[#009FE3]" value={form.location_type} onChange={e => setForm({ ...form, location_type: e.target.value })}>
                  <option>Pick Face</option><option>Reserve</option><option>Staging</option><option>Bulk</option><option>Dock</option><option>QC Hold</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-neutral-600 mb-1">XYZ Coordinates <span className="text-neutral-400">(3D warehouse slotting)</span></label>
                <div className="grid grid-cols-3 gap-2">
                  <input className="w-full border border-neutral-200 rounded-lg px-2 py-2 text-xs focus:outline-none" placeholder="X" value={form.x_coordinate} onChange={e => setForm({ ...form, x_coordinate: e.target.value })} type="number" />
                  <input className="w-full border border-neutral-200 rounded-lg px-2 py-2 text-xs focus:outline-none" placeholder="Y" value={form.y_coordinate} onChange={e => setForm({ ...form, y_coordinate: e.target.value })} type="number" />
                  <input className="w-full border border-neutral-200 rounded-lg px-2 py-2 text-xs focus:outline-none" placeholder="Z" value={form.z_coordinate} onChange={e => setForm({ ...form, z_coordinate: e.target.value })} type="number" />
                </div>
              </div>
              {createLocation.isError && (
                <p className="text-xs text-red-600">{(createLocation.error as Error).message}</p>
              )}
              <div className="flex gap-2 pt-2">
                <button onClick={handleCreate} disabled={createLocation.isPending} className="flex-1 py-2 text-white rounded-lg text-xs flex items-center justify-center gap-1.5 hover:opacity-90 disabled:opacity-60" style={{ background: "#009FE3" }}>
                  {createLocation.isPending ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Save Location
                </button>
                <button onClick={() => setShowAddForm(false)} className="flex-1 py-2 border border-neutral-200 text-neutral-700 rounded-lg text-xs hover:bg-neutral-50">Cancel</button>
              </div>
            </div>
          </div>
        ) : detail ? (
          /* EDIT / VIEW PANEL */
          <div className="bg-white rounded-xl border border-neutral-200">
            <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-neutral-900 flex items-center gap-2">
                <Pencil size={13} className="text-[#009FE3]" /> {editMode ? "Edit Location" : "Location Details"}
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">{detail.code}</span>
                {!editMode && <button onClick={() => openEdit(detail)} className="text-xs px-2.5 py-1 text-white rounded-lg hover:opacity-90" style={{ background: "#009FE3" }}>Edit</button>}
              </div>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs text-neutral-600 mb-1">Description</label>
                <input disabled={!editMode} className={`w-full border rounded-lg px-3 py-2 text-xs text-neutral-900 focus:outline-none ${editMode ? "border-[#009FE3] bg-white" : "border-neutral-200 bg-neutral-50"}`} value={editMode ? form.description : detail.description ?? ""} onChange={e => setForm({ ...form, description: e.target.value })} type="text" />
              </div>
              <div>
                <label className="block text-xs text-neutral-600 mb-1">Zone</label>
                <select disabled={!editMode} className={`w-full border rounded-lg px-3 py-2 text-xs focus:outline-none ${editMode ? "border-[#009FE3] bg-white" : "border-neutral-200 bg-neutral-50 text-neutral-700"}`} value={editMode ? form.zone_id : (detail.zone_id ?? "")} onChange={e => setForm({ ...form, zone_id: e.target.value })}>
                  <option value="">— None —</option>
                  {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-4 gap-2">
                <div><label className="block text-xs text-neutral-600 mb-1">Aisle</label><input disabled={!editMode} className={`w-full border rounded-lg px-2 py-2 text-xs focus:outline-none ${editMode ? "border-[#009FE3]" : "border-neutral-200 bg-neutral-50"}`} value={editMode ? form.aisle : detail.aisle ?? ""} onChange={e => setForm({ ...form, aisle: e.target.value })} /></div>
                <div><label className="block text-xs text-neutral-600 mb-1">Rack</label><input disabled={!editMode} className={`w-full border rounded-lg px-2 py-2 text-xs focus:outline-none ${editMode ? "border-[#009FE3]" : "border-neutral-200 bg-neutral-50"}`} value={editMode ? form.rack : detail.rack ?? ""} onChange={e => setForm({ ...form, rack: e.target.value })} /></div>
                <div><label className="block text-xs text-neutral-600 mb-1">Level</label><input disabled={!editMode} className={`w-full border rounded-lg px-2 py-2 text-xs focus:outline-none ${editMode ? "border-[#009FE3]" : "border-neutral-200 bg-neutral-50"}`} value={editMode ? form.level : detail.level ?? ""} onChange={e => setForm({ ...form, level: e.target.value })} /></div>
                <div><label className="block text-xs text-neutral-600 mb-1">Bin</label><input disabled={!editMode} className={`w-full border rounded-lg px-2 py-2 text-xs focus:outline-none ${editMode ? "border-[#009FE3]" : "border-neutral-200 bg-neutral-50"}`} value={editMode ? form.bin : detail.bin ?? ""} onChange={e => setForm({ ...form, bin: e.target.value })} /></div>
              </div>
              <div>
                <label className="block text-xs text-neutral-600 mb-1">Location Type</label>
                <select disabled={!editMode} className={`w-full border rounded-lg px-3 py-2 text-xs focus:outline-none ${editMode ? "border-[#009FE3] bg-white" : "border-neutral-200 bg-neutral-50 text-neutral-700"}`} value={editMode ? form.location_type : detail.location_type ?? ""} onChange={e => setForm({ ...form, location_type: e.target.value })}>
                  <option>Pick Face</option><option>Reserve</option><option>Staging</option><option>Bulk</option><option>Dock</option><option>QC Hold</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-neutral-600 mb-1">XYZ Coordinates</label>
                <div className="grid grid-cols-3 gap-2">
                  <input disabled={!editMode} className={`w-full border rounded-lg px-2 py-2 text-xs focus:outline-none ${editMode ? "border-[#009FE3]" : "border-neutral-200 bg-neutral-50"}`} placeholder="X" value={editMode ? form.x_coordinate : detail.x_coordinate ?? ""} onChange={e => setForm({ ...form, x_coordinate: e.target.value })} type="number" />
                  <input disabled={!editMode} className={`w-full border rounded-lg px-2 py-2 text-xs focus:outline-none ${editMode ? "border-[#009FE3]" : "border-neutral-200 bg-neutral-50"}`} placeholder="Y" value={editMode ? form.y_coordinate : detail.y_coordinate ?? ""} onChange={e => setForm({ ...form, y_coordinate: e.target.value })} type="number" />
                  <input disabled={!editMode} className={`w-full border rounded-lg px-2 py-2 text-xs focus:outline-none ${editMode ? "border-[#009FE3]" : "border-neutral-200 bg-neutral-50"}`} placeholder="Z" value={editMode ? form.z_coordinate : detail.z_coordinate ?? ""} onChange={e => setForm({ ...form, z_coordinate: e.target.value })} type="number" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-neutral-600 mb-1">Status</label>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="lstatus" checked={(editMode ? form.status : detail.status) === "Active"} onChange={() => setForm({ ...form, status: "Active" })} className="accent-[#009FE3]" disabled={!editMode} /><span className="text-xs text-neutral-700">Active</span></label>
                  <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="lstatus" checked={(editMode ? form.status : detail.status) === "Inactive"} onChange={() => setForm({ ...form, status: "Inactive" })} className="accent-[#009FE3]" disabled={!editMode} /><span className="text-xs text-neutral-700">Inactive</span></label>
                </div>
              </div>
              {saved && (
                <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <Check size={12} className="text-emerald-600" />
                  <span className="text-xs text-emerald-700">Location saved successfully!</span>
                </div>
              )}
              {updateLocation.isError && (
                <p className="text-xs text-red-600">{(updateLocation.error as Error).message}</p>
              )}
              {editMode && (
                <div className="flex gap-2 pt-1">
                  <button onClick={handleSaveEdit} disabled={updateLocation.isPending} className="flex-1 py-2 text-white rounded-lg text-xs flex items-center justify-center gap-1.5 hover:opacity-90 disabled:opacity-60" style={{ background: "#009FE3" }}>
                    {updateLocation.isPending ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Save Changes
                  </button>
                  <button onClick={() => setEditMode(false)} className="flex-1 py-2 border border-neutral-200 text-neutral-700 rounded-lg text-xs hover:bg-neutral-50">Cancel</button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-neutral-200 p-8 text-center text-xs text-neutral-400">
            <Info size={16} className="mx-auto mb-2 text-neutral-300" />
            Select a location from the table, or click "Add Location" to create one.
          </div>
        )}
      </div>
    </section>
  );
};

export default LocationMasterSection;
