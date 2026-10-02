import React, { useMemo, useState } from "react";
import {
  Truck, Plus, Search, Pencil, Trash2, X, Check, Phone, Loader2, AlertCircle
} from "lucide-react";
import {
  useMasterDataList,
  useMasterDataCreate,
  useMasterDataUpdate,
  useMasterDataDelete,
} from "@/hooks/useMasterDataApi";

const CARRIERS_RESOURCE = "/master-data/carriers";

interface CarrierRecord {
  id: number;
  code: string;
  scac: string | null;
  name: string;
  mode: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  status: string;
}

const modePill = (mode: string | null) => {
  const map: Record<string, string> = {
    LTL: "bg-blue-50 text-blue-700 border border-blue-200",
    FTL: "bg-violet-50 text-violet-700 border border-violet-200",
    Air: "bg-sky-50 text-sky-700 border border-sky-200",
    Ocean: "bg-teal-50 text-teal-700 border border-teal-200",
    Parcel: "bg-amber-50 text-amber-700 border border-amber-200",
  };
  return map[mode ?? ""] ?? "bg-gray-100 text-gray-600";
};

const emptyForm = { code: "", scac: "", name: "", mode: "LTL", contact_name: "", contact_phone: "", status: "Active" };

const MaterialCarrierSection = () => {
  const { data: carriers = [], isLoading } = useMasterDataList<CarrierRecord>(CARRIERS_RESOURCE);
  const createCarrier = useMasterDataCreate<CarrierRecord>(CARRIERS_RESOURCE);
  const updateCarrier = useMasterDataUpdate<CarrierRecord>(CARRIERS_RESOURCE);
  const deleteCarrier = useMasterDataDelete(CARRIERS_RESOURCE);

  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });

  const filtered = useMemo(() => carriers.filter(c =>
    c.code.toLowerCase().includes(search.toLowerCase()) || c.name.toLowerCase().includes(search.toLowerCase())
  ), [carriers, search]);

  const detail = carriers.find(c => c.id === selected);

  const openAdd = () => { setForm({ ...emptyForm }); setShowForm(true); setEditMode(false); };
  const openEdit = (c: CarrierRecord) => {
    setSelected(c.id);
    setForm({ code: c.code, scac: c.scac ?? "", name: c.name, mode: c.mode ?? "LTL", contact_name: c.contact_name ?? "", contact_phone: c.contact_phone ?? "", status: c.status });
    setEditMode(true); setShowForm(false);
  };

  const toPayload = () => ({ ...form, scac: form.scac || null, contact_name: form.contact_name || null, contact_phone: form.contact_phone || null });

  const handleCreate = () => {
    if (!form.code || !form.name) return;
    createCarrier.mutate(toPayload(), { onSuccess: () => { setShowForm(false); setSaved(true); setTimeout(() => setSaved(false), 2000); } });
  };
  const handleSaveEdit = () => {
    if (!detail) return;
    updateCarrier.mutate({ id: detail.id, payload: toPayload() }, { onSuccess: () => { setEditMode(false); setSaved(true); setTimeout(() => setSaved(false), 2000); } });
  };
  const handleDelete = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Delete this carrier?")) return;
    deleteCarrier.mutate(id, { onSuccess: () => { if (selected === id) setSelected(null); } });
  };

  return (
    <section className="grid grid-cols-1 lg:grid-cols-3 gap-4" id="carrier-section">
      <div className="lg:col-span-2 bg-white rounded-xl border border-neutral-200">
        <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold text-neutral-900 flex items-center gap-2">
              <Truck size={14} className="text-[#009FE3]" /> Carrier / Bill To
            </h2>
            <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{isLoading ? "loading…" : `${carriers.length} carriers`}</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 border border-neutral-200 rounded-lg px-3 py-1.5 bg-neutral-50">
              <Search size={12} className="text-neutral-400" />
              <input className="bg-transparent text-xs placeholder-neutral-400 focus:outline-none w-28" placeholder="Search carrier..." value={search} onChange={e => setSearch(e.target.value)} type="text" />
            </div>
            <button onClick={openAdd} className="flex items-center gap-1.5 px-3 py-1.5 text-white rounded-lg text-xs hover:opacity-90" style={{ background: "#009FE3" }}>
              <Plus size={12} /> Add Carrier
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-neutral-50 border-b border-neutral-100">
                <th className="text-left py-2.5 px-3 text-neutral-500">Code</th>
                <th className="text-left py-2.5 px-3 text-neutral-500">SCAC</th>
                <th className="text-left py-2.5 px-3 text-neutral-500">Name</th>
                <th className="text-left py-2.5 px-3 text-neutral-500">Mode</th>
                <th className="text-left py-2.5 px-3 text-neutral-500">Contact</th>
                <th className="text-left py-2.5 px-3 text-neutral-500">Status</th>
                <th className="text-left py-2.5 px-3 text-neutral-500">Act.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-50">
              {isLoading ? (
                <tr><td colSpan={7} className="py-8 text-center text-xs text-neutral-400"><Loader2 size={14} className="inline animate-spin mr-1.5" />Loading carriers…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="py-8 text-center text-xs text-neutral-400">No carriers match the current search.</td></tr>
              ) : filtered.map(c => (
                <tr key={c.id} className={`hover:bg-blue-50/30 cursor-pointer transition-colors ${selected === c.id ? "bg-blue-50/40" : ""}`} onClick={() => { setSelected(c.id); setShowForm(false); setEditMode(false); }}>
                  <td className="py-2.5 px-3 font-medium text-neutral-900">{c.code}</td>
                  <td className="py-2.5 px-3 text-neutral-600 font-mono">{c.scac}</td>
                  <td className="py-2.5 px-3 text-neutral-700">{c.name}</td>
                  <td className="py-2.5 px-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${modePill(c.mode)}`}>{c.mode}</span></td>
                  <td className="py-2.5 px-3 text-neutral-700">{c.contact_name}</td>
                  <td className="py-2.5 px-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${c.status === "Active" ? "bg-emerald-50 text-emerald-700" : "bg-neutral-100 text-neutral-500"}`}>{c.status}</span></td>
                  <td className="py-2.5 px-3">
                    <div className="flex gap-1.5">
                      <button onClick={e => { e.stopPropagation(); openEdit(c); }} className="text-neutral-400 hover:text-amber-500"><Pencil size={12} /></button>
                      <button onClick={e => handleDelete(c.id, e)} className="text-neutral-400 hover:text-red-500"><Trash2 size={12} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 border-t border-neutral-100">
          <span className="text-xs text-neutral-400">Showing {filtered.length} of {carriers.length} carriers</span>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {showForm ? (
          <div className="bg-white rounded-xl border border-neutral-200">
            <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-neutral-900 flex items-center gap-2"><Plus size={13} className="text-[#009FE3]" /> Add Carrier</h3>
              <button onClick={() => setShowForm(false)} className="text-neutral-400 hover:text-neutral-600"><X size={14} /></button>
            </div>
            <div className="p-5 space-y-3">
              <div><label className="block text-xs text-neutral-600 mb-1">Carrier Code *</label><input className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-xs bg-neutral-50 focus:outline-none focus:border-[#009FE3]" placeholder="CARR-01" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} /></div>
              <div><label className="block text-xs text-neutral-600 mb-1">Carrier Name *</label><input className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#009FE3]" placeholder="e.g. FedEx Freight" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs text-neutral-600 mb-1">SCAC Code</label><input className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-xs focus:outline-none" placeholder="e.g. FXFE" value={form.scac} onChange={e => setForm({ ...form, scac: e.target.value })} /></div>
                <div><label className="block text-xs text-neutral-600 mb-1">Mode</label>
                  <select className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-xs bg-white focus:outline-none focus:border-[#009FE3]" value={form.mode} onChange={e => setForm({ ...form, mode: e.target.value })}>
                    <option>LTL</option><option>FTL</option><option>Parcel</option><option>Air</option><option>Ocean</option>
                  </select>
                </div>
              </div>
              <div><label className="block text-xs text-neutral-600 mb-1">Contact Person</label><input className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-xs focus:outline-none" value={form.contact_name} onChange={e => setForm({ ...form, contact_name: e.target.value })} /></div>
              <div><label className="block text-xs text-neutral-600 mb-1 flex items-center gap-1"><Phone size={11} /> Phone</label><input className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-xs focus:outline-none" type="tel" value={form.contact_phone} onChange={e => setForm({ ...form, contact_phone: e.target.value })} /></div>
              {createCarrier.isError && <p className="text-xs text-red-600">{(createCarrier.error as Error).message}</p>}
              <div className="flex gap-2 pt-1">
                <button onClick={handleCreate} disabled={createCarrier.isPending} className="flex-1 py-2 text-white rounded-lg text-xs flex items-center justify-center gap-1.5 hover:opacity-90 disabled:opacity-60" style={{ background: "#009FE3" }}>
                  {createCarrier.isPending ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Save Carrier
                </button>
                <button onClick={() => setShowForm(false)} className="flex-1 py-2 border border-neutral-200 text-neutral-700 rounded-lg text-xs hover:bg-neutral-50">Cancel</button>
              </div>
            </div>
          </div>
        ) : detail ? (
          <div className="bg-white rounded-xl border border-neutral-200">
            <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-neutral-900">{detail.name}</h3>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${detail.status === "Active" ? "bg-emerald-50 text-emerald-700" : "bg-neutral-100 text-neutral-500"}`}>{detail.status}</span>
            </div>
            <div className="p-5 space-y-3">
              <div><label className="block text-xs text-neutral-600 mb-1">Carrier Name</label>
                <input disabled={!editMode} className={`w-full border rounded-lg px-3 py-2 text-xs focus:outline-none ${editMode ? "border-[#009FE3]" : "border-neutral-200 bg-neutral-50 text-neutral-700"}`} value={editMode ? form.name : detail.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs text-neutral-600 mb-1">SCAC</label><input disabled={!editMode} className={`w-full border rounded-lg px-3 py-2 text-xs focus:outline-none ${editMode ? "border-[#009FE3]" : "border-neutral-200 bg-neutral-50"}`} value={editMode ? form.scac : detail.scac ?? ""} onChange={e => setForm({ ...form, scac: e.target.value })} /></div>
                <div><label className="block text-xs text-neutral-600 mb-1">Mode</label>
                  <select disabled={!editMode} className={`w-full border rounded-lg px-3 py-2 text-xs focus:outline-none ${editMode ? "border-[#009FE3] bg-white" : "border-neutral-200 bg-neutral-50 text-neutral-700"}`} value={editMode ? form.mode : detail.mode ?? ""} onChange={e => setForm({ ...form, mode: e.target.value })}>
                    <option>LTL</option><option>FTL</option><option>Parcel</option><option>Air</option><option>Ocean</option>
                  </select>
                </div>
              </div>
              <div><label className="block text-xs text-neutral-600 mb-1">Contact Person</label><input disabled={!editMode} className={`w-full border rounded-lg px-3 py-2 text-xs focus:outline-none ${editMode ? "border-[#009FE3]" : "border-neutral-200 bg-neutral-50 text-neutral-700"}`} value={editMode ? form.contact_name : detail.contact_name ?? ""} onChange={e => setForm({ ...form, contact_name: e.target.value })} /></div>
              <div><label className="block text-xs text-neutral-600 mb-1 flex items-center gap-1"><Phone size={11} /> Phone</label><input disabled={!editMode} className={`w-full border rounded-lg px-3 py-2 text-xs focus:outline-none ${editMode ? "border-[#009FE3]" : "border-neutral-200 bg-neutral-50 text-neutral-700"}`} value={editMode ? form.contact_phone : detail.contact_phone ?? ""} onChange={e => setForm({ ...form, contact_phone: e.target.value })} type="tel" /></div>
              {saved && (
                <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <Check size={12} className="text-emerald-600" /><span className="text-xs text-emerald-700">Carrier saved successfully!</span>
                </div>
              )}
              {updateCarrier.isError && <p className="text-xs text-red-600">{(updateCarrier.error as Error).message}</p>}
              <div className="flex gap-2 pt-1">
                {editMode ? (
                  <>
                    <button onClick={handleSaveEdit} disabled={updateCarrier.isPending} className="flex-1 py-2 text-white rounded-lg text-xs flex items-center justify-center gap-1.5 hover:opacity-90 disabled:opacity-60" style={{ background: "#009FE3" }}>
                      {updateCarrier.isPending ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Save Changes
                    </button>
                    <button onClick={() => setEditMode(false)} className="flex-1 py-2 border border-neutral-200 text-neutral-700 rounded-lg text-xs hover:bg-neutral-50">Cancel</button>
                  </>
                ) : (
                  <button onClick={() => openEdit(detail)} className="flex-1 py-2 text-white rounded-lg text-xs hover:opacity-90" style={{ background: "#009FE3" }}>Edit Carrier</button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-neutral-200 p-8 text-center text-xs text-neutral-400">
            Select a carrier, or click "Add Carrier" to create one.
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3">
          <AlertCircle size={14} className="text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs font-semibold text-blue-700">Basic Carrier Master</p>
            <p className="text-xs text-blue-600 mt-0.5">Per project scope, this module covers carrier identification and contact only — no contracts or performance ratings.</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default MaterialCarrierSection;
