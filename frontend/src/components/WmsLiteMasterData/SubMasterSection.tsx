import React, { useState } from "react";
import {
  UserCircle, Layers, Plus, Pencil, Trash2, X, Check, MapPin, Loader2
} from "lucide-react";
import {
  useMasterDataList,
  useMasterDataCreate,
  useMasterDataDelete,
} from "@/hooks/useMasterDataApi";

const OWNERS_RESOURCE = "/master-data/material-owners";
const ASSIGNED_RESOURCE = "/master-data/assigned-locations";
const MATERIALS_RESOURCE = "/master-data/materials";
const LOCATIONS_RESOURCE = "/master-data/locations";
const ZONES_RESOURCE = "/master-data/zones";

interface OwnerRecord { id: number; code: string; name: string; status: string; }
interface AssignedRecord { id: number; material_id: number; location_id: number; min_qty: number; max_qty: number; status: string; }
interface MaterialRecord { id: number; sku: string; }
interface LocationRecord { id: number; code: string; zone_id: number | null; }
interface ZoneRecord { id: number; code: string; name: string; zone_type: string | null; occupancy_pct: number; }

const SubMasterSection = () => {
  const { data: owners = [], isLoading: ownersLoading } = useMasterDataList<OwnerRecord>(OWNERS_RESOURCE);
  const { data: assigned = [], isLoading: assignedLoading } = useMasterDataList<AssignedRecord>(ASSIGNED_RESOURCE);
  const { data: materials = [] } = useMasterDataList<MaterialRecord>(MATERIALS_RESOURCE);
  const { data: locations = [] } = useMasterDataList<LocationRecord>(LOCATIONS_RESOURCE);
  const { data: zones = [] } = useMasterDataList<ZoneRecord>(ZONES_RESOURCE);

  const createOwner = useMasterDataCreate<OwnerRecord>(OWNERS_RESOURCE);
  const deleteOwner = useMasterDataDelete(OWNERS_RESOURCE);
  const createAssigned = useMasterDataCreate<AssignedRecord>(ASSIGNED_RESOURCE);
  const deleteAssigned = useMasterDataDelete(ASSIGNED_RESOURCE);

  const [showOwnerForm, setShowOwnerForm] = useState(false);
  const [newOwner, setNewOwner] = useState({ code: "", name: "" });

  const [showAsnForm, setShowAsnForm] = useState(false);
  const [newAsn, setNewAsn] = useState({ material_id: "", location_id: "", min_qty: "", max_qty: "" });

  const skuFor = (id: number) => materials.find(m => m.id === id)?.sku ?? `#${id}`;
  const locCodeFor = (id: number) => locations.find(l => l.id === id)?.code ?? `#${id}`;
  const zoneNameFor = (locId: number) => {
    const loc = locations.find(l => l.id === locId);
    return zones.find(z => z.id === loc?.zone_id)?.name ?? "—";
  };
  const locCountFor = (zoneId: number) => locations.filter(l => l.zone_id === zoneId).length;

  const addOwner = () => {
    if (!newOwner.code || !newOwner.name) return;
    createOwner.mutate({ code: newOwner.code, name: newOwner.name, status: "Active" }, {
      onSuccess: () => { setNewOwner({ code: "", name: "" }); setShowOwnerForm(false); },
    });
  };

  const addAssigned = () => {
    if (!newAsn.material_id || !newAsn.location_id) return;
    createAssigned.mutate({
      material_id: Number(newAsn.material_id), location_id: Number(newAsn.location_id),
      min_qty: Number(newAsn.min_qty) || 0, max_qty: Number(newAsn.max_qty) || 0, status: "Active",
    }, { onSuccess: () => { setNewAsn({ material_id: "", location_id: "", min_qty: "", max_qty: "" }); setShowAsnForm(false); } });
  };

  return (
    <section className="space-y-4" id="sub-master-section">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* ── Material Owner ───────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-neutral-200">
          <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-neutral-900 flex items-center gap-2">
              <UserCircle size={14} className="text-[#009FE3]" /> Material Owner
            </h2>
            <button onClick={() => setShowOwnerForm(v => !v)} className="flex items-center gap-1.5 px-3 py-1.5 text-white rounded-lg text-xs hover:opacity-90" style={{ background: "#009FE3" }}>
              <Plus size={11} /> Add
            </button>
          </div>

          {showOwnerForm && (
            <div className="px-5 py-3 border-b border-neutral-100 bg-blue-50/30 space-y-2">
              <input className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#009FE3]" placeholder="Owner code *" value={newOwner.code} onChange={e => setNewOwner({ ...newOwner, code: e.target.value })} type="text" />
              <input className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#009FE3]" placeholder="Owner name *" value={newOwner.name} onChange={e => setNewOwner({ ...newOwner, name: e.target.value })} type="text" />
              <div className="flex gap-2">
                <button onClick={addOwner} disabled={createOwner.isPending} className="flex-1 px-3 py-2 text-white rounded-lg text-xs flex items-center justify-center gap-1 hover:opacity-90 disabled:opacity-60" style={{ background: "#009FE3" }}>
                  {createOwner.isPending ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />} Save
                </button>
                <button onClick={() => setShowOwnerForm(false)} className="px-3 py-2 border border-neutral-200 text-neutral-600 rounded-lg text-xs hover:bg-neutral-50"><X size={11} /></button>
              </div>
              {createOwner.isError && <p className="text-xs text-red-600">{(createOwner.error as Error).message}</p>}
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-100">
                  <th className="text-left py-2.5 px-3 text-neutral-500">Code</th>
                  <th className="text-left py-2.5 px-3 text-neutral-500">Name</th>
                  <th className="text-left py-2.5 px-3 text-neutral-500">Status</th>
                  <th className="text-left py-2.5 px-3 text-neutral-500">Act</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50">
                {ownersLoading ? (
                  <tr><td colSpan={4} className="py-6 text-center text-xs text-neutral-400"><Loader2 size={12} className="inline animate-spin mr-1" />Loading…</td></tr>
                ) : owners.map(o => (
                  <tr key={o.id} className="hover:bg-neutral-50">
                    <td className="py-2.5 px-3 text-neutral-900 font-medium">{o.code}</td>
                    <td className="py-2.5 px-3 text-neutral-700">{o.name}</td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${o.status === "Active" ? "bg-emerald-50 text-emerald-700" : "bg-neutral-100 text-neutral-500"}`}>{o.status}</span>
                    </td>
                    <td className="py-2.5 px-3">
                      <button onClick={() => deleteOwner.mutate(o.id)} className="text-neutral-400 hover:text-red-500"><Trash2 size={12} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3 border-t border-neutral-100">
            <span className="text-xs text-neutral-400">{owners.length} owners total</span>
          </div>
        </div>

        {/* ── Assigned Locations ────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-neutral-200">
          <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-neutral-900 flex items-center gap-2">
              <MapPin size={14} className="text-[#009FE3]" /> Assigned Locations
            </h2>
            <button onClick={() => setShowAsnForm(v => !v)} className="flex items-center gap-1.5 px-3 py-1.5 text-white rounded-lg text-xs hover:opacity-90" style={{ background: "#009FE3" }}>
              <Plus size={11} /> Add
            </button>
          </div>

          {showAsnForm && (
            <div className="px-5 py-3 border-b border-neutral-100 bg-blue-50/30 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <select className="border border-neutral-200 rounded-lg px-2 py-2 text-xs bg-white focus:outline-none focus:border-[#009FE3]" value={newAsn.material_id} onChange={e => setNewAsn({ ...newAsn, material_id: e.target.value })}>
                  <option value="">SKU *</option>
                  {materials.map(m => <option key={m.id} value={m.id}>{m.sku}</option>)}
                </select>
                <select className="border border-neutral-200 rounded-lg px-2 py-2 text-xs bg-white focus:outline-none focus:border-[#009FE3]" value={newAsn.location_id} onChange={e => setNewAsn({ ...newAsn, location_id: e.target.value })}>
                  <option value="">Location *</option>
                  {locations.map(l => <option key={l.id} value={l.id}>{l.code}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input className="border border-neutral-200 rounded-lg px-2 py-2 text-xs focus:outline-none" placeholder="Min Qty" type="number" value={newAsn.min_qty} onChange={e => setNewAsn({ ...newAsn, min_qty: e.target.value })} />
                <input className="border border-neutral-200 rounded-lg px-2 py-2 text-xs focus:outline-none" placeholder="Max Qty" type="number" value={newAsn.max_qty} onChange={e => setNewAsn({ ...newAsn, max_qty: e.target.value })} />
              </div>
              <div className="flex gap-2">
                <button onClick={addAssigned} disabled={createAssigned.isPending} className="flex-1 py-2 text-white rounded-lg text-xs flex items-center justify-center gap-1 hover:opacity-90 disabled:opacity-60" style={{ background: "#009FE3" }}>
                  {createAssigned.isPending ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />} Assign
                </button>
                <button onClick={() => setShowAsnForm(false)} className="px-3 py-2 border border-neutral-200 text-neutral-600 rounded-lg text-xs hover:bg-neutral-50"><X size={11} /></button>
              </div>
              {createAssigned.isError && <p className="text-xs text-red-600">{(createAssigned.error as Error).message}</p>}
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-100">
                  <th className="text-left py-2.5 px-3 text-neutral-500">SKU</th>
                  <th className="text-left py-2.5 px-3 text-neutral-500">Location</th>
                  <th className="text-left py-2.5 px-3 text-neutral-500">Zone</th>
                  <th className="text-right py-2.5 px-3 text-neutral-500">Min/Max</th>
                  <th className="text-left py-2.5 px-3 text-neutral-500">Status</th>
                  <th className="text-left py-2.5 px-3 text-neutral-500">Act</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50">
                {assignedLoading ? (
                  <tr><td colSpan={6} className="py-6 text-center text-xs text-neutral-400"><Loader2 size={12} className="inline animate-spin mr-1" />Loading…</td></tr>
                ) : assigned.map(a => (
                  <tr key={a.id} className="hover:bg-neutral-50">
                    <td className="py-2.5 px-3 font-medium text-neutral-900">{skuFor(a.material_id)}</td>
                    <td className="py-2.5 px-3 text-neutral-700">{locCodeFor(a.location_id)}</td>
                    <td className="py-2.5 px-3 text-neutral-600">{zoneNameFor(a.location_id)}</td>
                    <td className="py-2.5 px-3 text-right text-neutral-700">{a.min_qty} / {a.max_qty}</td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${a.status === "Active" ? "bg-emerald-50 text-emerald-700" : "bg-neutral-100 text-neutral-500"}`}>{a.status}</span>
                    </td>
                    <td className="py-2.5 px-3">
                      <button onClick={() => deleteAssigned.mutate(a.id)} className="text-neutral-400 hover:text-red-500"><Trash2 size={12} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3 border-t border-neutral-100">
            <span className="text-xs text-neutral-400">{assigned.filter(a => a.status === "Active").length} active assignments</span>
          </div>
        </div>

        {/* ── Zone / Area Master (read-only summary — full CRUD on the Zone/Area tab) ── */}
        <div className="bg-white rounded-xl border border-neutral-200">
          <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-neutral-900 flex items-center gap-2">
              <Layers size={14} className="text-[#009FE3]" /> Zone / Area Master
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-100">
                  <th className="text-left py-2.5 px-3 text-neutral-500">Code</th>
                  <th className="text-left py-2.5 px-3 text-neutral-500">Name</th>
                  <th className="text-left py-2.5 px-3 text-neutral-500">Type</th>
                  <th className="text-right py-2.5 px-3 text-neutral-500">Locs</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50">
                {zones.map(z => (
                  <tr key={z.id} className="hover:bg-neutral-50">
                    <td className="py-2.5 px-3 font-medium text-neutral-900">{z.code}</td>
                    <td className="py-2.5 px-3 text-neutral-700">{z.name}</td>
                    <td className="py-2.5 px-3 text-neutral-600">{z.zone_type}</td>
                    <td className="py-2.5 px-3 text-right text-neutral-700">{locCountFor(z.id)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3 border-t border-neutral-100">
            <span className="text-xs text-neutral-400">{zones.length} zones configured — manage on the Zone/Area tab</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SubMasterSection;
