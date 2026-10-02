import React, { useMemo, useState } from "react";
import {
  Factory, Plus, Search, FileDown, FileUp, Eye, Pencil,
  Trash2, X, Check, Phone, Mail, Loader2, AlertCircle
} from "lucide-react";
import {
  useMasterDataList,
  useMasterDataCreate,
  useMasterDataUpdate,
  useMasterDataDelete,
} from "@/hooks/useMasterDataApi";

const SUPPLIERS_RESOURCE = "/master-data/suppliers";

interface SupplierRecord {
  id: number;
  code: string;
  name: string;
  address_line1: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  country: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  status: string;
}

const emptyForm = {
  code: "", name: "", address_line1: "", city: "", state: "", zip_code: "", country: "",
  contact_name: "", contact_email: "", contact_phone: "", status: "Active",
};

const SupplierSection = () => {
  const { data: suppliers = [], isLoading } = useMasterDataList<SupplierRecord>(SUPPLIERS_RESOURCE);
  const createSupplier = useMasterDataCreate<SupplierRecord>(SUPPLIERS_RESOURCE);
  const updateSupplier = useMasterDataUpdate<SupplierRecord>(SUPPLIERS_RESOURCE);
  const deleteSupplier = useMasterDataDelete(SUPPLIERS_RESOURCE);

  const [search, setSearch] = useState("");
  const [countryFilter, setCountryFilter] = useState("All Countries");
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });

  const countries = useMemo(() => Array.from(new Set(suppliers.map(s => s.country).filter(Boolean))) as string[], [suppliers]);

  const filtered = useMemo(() => suppliers.filter(s => {
    const matchSearch = s.code.toLowerCase().includes(search.toLowerCase()) || s.name.toLowerCase().includes(search.toLowerCase());
    const matchCountry = countryFilter === "All Countries" || s.country === countryFilter;
    return matchSearch && matchCountry;
  }), [suppliers, search, countryFilter]);

  const detail = suppliers.find(s => s.id === selected);

  const openAdd = () => { setForm({ ...emptyForm }); setShowForm(true); setEditMode(false); };
  const openEdit = (s: SupplierRecord) => {
    setSelected(s.id);
    setForm({
      code: s.code, name: s.name, address_line1: s.address_line1 ?? "", city: s.city ?? "",
      state: s.state ?? "", zip_code: s.zip_code ?? "", country: s.country ?? "",
      contact_name: s.contact_name ?? "", contact_email: s.contact_email ?? "", contact_phone: s.contact_phone ?? "",
      status: s.status,
    });
    setEditMode(true); setShowForm(false);
  };

  const toPayload = () => ({ ...form, address_line1: form.address_line1 || null, city: form.city || null, state: form.state || null, zip_code: form.zip_code || null, country: form.country || null, contact_name: form.contact_name || null, contact_email: form.contact_email || null, contact_phone: form.contact_phone || null });

  const handleCreate = () => {
    if (!form.code || !form.name) return;
    createSupplier.mutate(toPayload(), { onSuccess: () => { setShowForm(false); setSaved(true); setTimeout(() => setSaved(false), 2000); } });
  };
  const handleSaveEdit = () => {
    if (!detail) return;
    updateSupplier.mutate({ id: detail.id, payload: toPayload() }, { onSuccess: () => { setEditMode(false); setSaved(true); setTimeout(() => setSaved(false), 2000); } });
  };
  const handleDelete = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Delete this supplier?")) return;
    deleteSupplier.mutate(id, { onSuccess: () => { if (selected === id) setSelected(null); } });
  };

  return (
    <section className="grid grid-cols-1 lg:grid-cols-3 gap-4" id="supplier-section">
      <div className="lg:col-span-2 bg-white rounded-xl border border-neutral-200">
        <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold text-neutral-900 flex items-center gap-2">
              <Factory size={14} className="text-[#009FE3]" /> Supplier Master
            </h2>
            <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{isLoading ? "loading…" : `${suppliers.length} suppliers`}</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 border border-neutral-200 rounded-lg px-3 py-1.5 bg-neutral-50">
              <Search size={12} className="text-neutral-400" />
              <input className="bg-transparent text-xs placeholder-neutral-400 focus:outline-none w-28" placeholder="Search supplier..." value={search} onChange={e => setSearch(e.target.value)} type="text" />
            </div>
            <select className="text-xs border border-neutral-200 rounded-lg px-2 py-1.5 text-neutral-600 bg-white focus:outline-none focus:border-[#009FE3]" value={countryFilter} onChange={e => setCountryFilter(e.target.value)}>
              <option>All Countries</option>
              {countries.map(c => <option key={c}>{c}</option>)}
            </select>
            <button onClick={openAdd} className="flex items-center gap-1.5 px-3 py-1.5 text-white rounded-lg text-xs hover:opacity-90" style={{ background: "#009FE3" }}>
              <Plus size={12} /> Add Supplier
            </button>
            <button className="flex items-center gap-1.5 px-3 py-1.5 border border-neutral-200 text-neutral-700 rounded-lg text-xs hover:bg-neutral-50"><FileUp size={12} /> Import</button>
            <button className="flex items-center gap-1.5 px-3 py-1.5 border border-neutral-200 text-neutral-700 rounded-lg text-xs hover:bg-neutral-50"><FileDown size={12} /> Export</button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-neutral-50 border-b border-neutral-100">
                <th className="text-left py-2.5 px-3 text-neutral-500">Code</th>
                <th className="text-left py-2.5 px-3 text-neutral-500">Name</th>
                <th className="text-left py-2.5 px-3 text-neutral-500">Country</th>
                <th className="text-left py-2.5 px-3 text-neutral-500">Contact</th>
                <th className="text-left py-2.5 px-3 text-neutral-500">Phone</th>
                <th className="text-left py-2.5 px-3 text-neutral-500">Status</th>
                <th className="text-left py-2.5 px-3 text-neutral-500">Act.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-50">
              {isLoading ? (
                <tr><td colSpan={7} className="py-8 text-center text-xs text-neutral-400"><Loader2 size={14} className="inline animate-spin mr-1.5" />Loading suppliers…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="py-8 text-center text-xs text-neutral-400">No suppliers match the current filters.</td></tr>
              ) : filtered.map(s => (
                <tr key={s.id} className={`hover:bg-blue-50/30 cursor-pointer transition-colors ${selected === s.id ? "bg-blue-50/40" : ""}`} onClick={() => { setSelected(s.id); setShowForm(false); setEditMode(false); }}>
                  <td className="py-2.5 px-3 font-medium text-neutral-900">{s.code}</td>
                  <td className="py-2.5 px-3 text-neutral-700">{s.name}</td>
                  <td className="py-2.5 px-3 text-neutral-600">{s.country}</td>
                  <td className="py-2.5 px-3 text-neutral-700">{s.contact_name}</td>
                  <td className="py-2.5 px-3 text-neutral-600">{s.contact_phone}</td>
                  <td className="py-2.5 px-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.status === "Active" ? "bg-emerald-50 text-emerald-700" : "bg-neutral-100 text-neutral-500"}`}>{s.status}</span></td>
                  <td className="py-2.5 px-3">
                    <div className="flex gap-1.5">
                      <button onClick={e => { e.stopPropagation(); setSelected(s.id); setShowForm(false); }} className="text-neutral-400 hover:text-[#009FE3]"><Eye size={12} /></button>
                      <button onClick={e => { e.stopPropagation(); openEdit(s); }} className="text-neutral-400 hover:text-amber-500"><Pencil size={12} /></button>
                      <button onClick={e => handleDelete(s.id, e)} className="text-neutral-400 hover:text-red-500"><Trash2 size={12} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 border-t border-neutral-100">
          <span className="text-xs text-neutral-400">Showing {filtered.length} of {suppliers.length} suppliers</span>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {showForm ? (
          <div className="bg-white rounded-xl border border-neutral-200">
            <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-neutral-900 flex items-center gap-2"><Plus size={13} className="text-[#009FE3]" /> Add Supplier</h3>
              <button onClick={() => setShowForm(false)} className="text-neutral-400 hover:text-neutral-600"><X size={14} /></button>
            </div>
            <div className="p-5 space-y-3">
              <div><label className="block text-xs text-neutral-600 mb-1">Supplier Code *</label><input className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-xs bg-neutral-50 focus:outline-none focus:border-[#009FE3]" placeholder="SUP-001" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} /></div>
              <div><label className="block text-xs text-neutral-600 mb-1">Supplier Name *</label><input className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#009FE3]" placeholder="Company name..." value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs text-neutral-600 mb-1">City</label><input className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-xs focus:outline-none" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} /></div>
                <div><label className="block text-xs text-neutral-600 mb-1">Country</label><input className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-xs focus:outline-none" value={form.country} onChange={e => setForm({ ...form, country: e.target.value })} /></div>
              </div>
              <div><label className="block text-xs text-neutral-600 mb-1">Address</label><input className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-xs focus:outline-none" value={form.address_line1} onChange={e => setForm({ ...form, address_line1: e.target.value })} /></div>
              <div><label className="block text-xs text-neutral-600 mb-1">Contact Person</label><input className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-xs focus:outline-none" value={form.contact_name} onChange={e => setForm({ ...form, contact_name: e.target.value })} /></div>
              <div><label className="block text-xs text-neutral-600 mb-1 flex items-center gap-1"><Mail size={11} /> Email</label><input className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-xs focus:outline-none" type="email" value={form.contact_email} onChange={e => setForm({ ...form, contact_email: e.target.value })} /></div>
              <div><label className="block text-xs text-neutral-600 mb-1 flex items-center gap-1"><Phone size={11} /> Phone</label><input className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-xs focus:outline-none" type="tel" value={form.contact_phone} onChange={e => setForm({ ...form, contact_phone: e.target.value })} /></div>
              {createSupplier.isError && <p className="text-xs text-red-600">{(createSupplier.error as Error).message}</p>}
              <div className="flex gap-2 pt-1">
                <button onClick={handleCreate} disabled={createSupplier.isPending} className="flex-1 py-2 text-white rounded-lg text-xs flex items-center justify-center gap-1.5 hover:opacity-90 disabled:opacity-60" style={{ background: "#009FE3" }}>
                  {createSupplier.isPending ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Save Supplier
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
              <div><label className="block text-xs text-neutral-600 mb-1">Supplier Name</label>
                <input disabled={!editMode} className={`w-full border rounded-lg px-3 py-2 text-xs focus:outline-none ${editMode ? "border-[#009FE3]" : "border-neutral-200 bg-neutral-50 text-neutral-700"}`} value={editMode ? form.name : detail.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs text-neutral-600 mb-1">City</label>
                  <input disabled={!editMode} className={`w-full border rounded-lg px-3 py-2 text-xs focus:outline-none ${editMode ? "border-[#009FE3]" : "border-neutral-200 bg-neutral-50 text-neutral-700"}`} value={editMode ? form.city : detail.city ?? ""} onChange={e => setForm({ ...form, city: e.target.value })} />
                </div>
                <div><label className="block text-xs text-neutral-600 mb-1">Country</label>
                  <input disabled={!editMode} className={`w-full border rounded-lg px-3 py-2 text-xs focus:outline-none ${editMode ? "border-[#009FE3]" : "border-neutral-200 bg-neutral-50 text-neutral-700"}`} value={editMode ? form.country : detail.country ?? ""} onChange={e => setForm({ ...form, country: e.target.value })} />
                </div>
              </div>
              <div><label className="block text-xs text-neutral-600 mb-1">Contact Person</label>
                <input disabled={!editMode} className={`w-full border rounded-lg px-3 py-2 text-xs focus:outline-none ${editMode ? "border-[#009FE3]" : "border-neutral-200 bg-neutral-50 text-neutral-700"}`} value={editMode ? form.contact_name : detail.contact_name ?? ""} onChange={e => setForm({ ...form, contact_name: e.target.value })} />
              </div>
              <div><label className="block text-xs text-neutral-600 mb-1 flex items-center gap-1"><Mail size={11} /> Email</label>
                <input disabled={!editMode} className={`w-full border rounded-lg px-3 py-2 text-xs focus:outline-none ${editMode ? "border-[#009FE3]" : "border-neutral-200 bg-neutral-50 text-neutral-700"}`} value={editMode ? form.contact_email : detail.contact_email ?? ""} onChange={e => setForm({ ...form, contact_email: e.target.value })} type="email" />
              </div>
              <div><label className="block text-xs text-neutral-600 mb-1 flex items-center gap-1"><Phone size={11} /> Phone</label>
                <input disabled={!editMode} className={`w-full border rounded-lg px-3 py-2 text-xs focus:outline-none ${editMode ? "border-[#009FE3]" : "border-neutral-200 bg-neutral-50 text-neutral-700"}`} value={editMode ? form.contact_phone : detail.contact_phone ?? ""} onChange={e => setForm({ ...form, contact_phone: e.target.value })} type="tel" />
              </div>
              {saved && (
                <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <Check size={12} className="text-emerald-600" /><span className="text-xs text-emerald-700">Supplier saved successfully!</span>
                </div>
              )}
              {updateSupplier.isError && <p className="text-xs text-red-600">{(updateSupplier.error as Error).message}</p>}
              <div className="flex gap-2 pt-1">
                {editMode ? (
                  <>
                    <button onClick={handleSaveEdit} disabled={updateSupplier.isPending} className="flex-1 py-2 text-white rounded-lg text-xs flex items-center justify-center gap-1.5 hover:opacity-90 disabled:opacity-60" style={{ background: "#009FE3" }}>
                      {updateSupplier.isPending ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Save Changes
                    </button>
                    <button onClick={() => setEditMode(false)} className="flex-1 py-2 border border-neutral-200 text-neutral-700 rounded-lg text-xs hover:bg-neutral-50">Cancel</button>
                  </>
                ) : (
                  <button onClick={() => openEdit(detail)} className="flex-1 py-2 text-white rounded-lg text-xs hover:opacity-90" style={{ background: "#009FE3" }}>Edit Supplier</button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-neutral-200 p-8 text-center text-xs text-neutral-400">
            Select a supplier from the table, or click "Add Supplier" to create one.
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3">
          <AlertCircle size={14} className="text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs font-semibold text-blue-700">Basic Supplier Master</p>
            <p className="text-xs text-blue-600 mt-0.5">Per project scope, this module covers contact/address details only — no vendor rating or PO management.</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SupplierSection;
