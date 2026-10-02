import React, { useMemo, useState } from "react";
import {
  Tag, Plus, Search, Pencil, Trash2, X, Check, AlertTriangle, Clock, Loader2, Info
} from "lucide-react";
import {
  useMasterDataList,
  useMasterDataCreate,
  useMasterDataUpdate,
  useMasterDataDelete,
} from "@/hooks/useMasterDataApi";

const LOTS_RESOURCE = "/master-data/outbound-lots";
const MATERIALS_RESOURCE = "/master-data/materials";

interface LotRecord {
  id: number;
  lot_number: string;
  material_id: number;
  total_qty: number;
  remaining_qty: number;
  mfg_date: string | null;
  exp_date: string | null;
  status: string;
  attribute_template: string | null;
}
interface MaterialRecord { id: number; sku: string; description: string; }

const statusColor: Record<string, string> = {
  Active: "bg-emerald-50 text-emerald-700",
  Critical: "bg-red-50 text-red-700",
  Quarantine: "bg-amber-50 text-amber-700",
  Expired: "bg-neutral-100 text-neutral-500",
};

const emptyForm = { lot_number: "", material_id: "", total_qty: "", remaining_qty: "", mfg_date: "", exp_date: "", status: "Active", attribute_template: "" };

const OutboundLotSection = () => {
  const { data: lots = [], isLoading } = useMasterDataList<LotRecord>(LOTS_RESOURCE);
  const { data: materials = [] } = useMasterDataList<MaterialRecord>(MATERIALS_RESOURCE);
  const createLot = useMasterDataCreate<LotRecord>(LOTS_RESOURCE);
  const updateLot = useMasterDataUpdate<LotRecord>(LOTS_RESOURCE);
  const deleteLot = useMasterDataDelete(LOTS_RESOURCE);

  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });

  const skuFor = (id: number) => materials.find(m => m.id === id)?.sku ?? `#${id}`;

  const filtered = useMemo(() => lots.filter(l =>
    l.lot_number.toLowerCase().includes(search.toLowerCase()) || skuFor(l.material_id).toLowerCase().includes(search.toLowerCase())
  ), [lots, search, materials]);
  const detail = lots.find(l => l.id === selected);

  const openAdd = () => { setForm({ ...emptyForm }); setShowForm(true); setEditMode(false); };
  const openEdit = (l: LotRecord) => {
    setSelected(l.id);
    setForm({
      lot_number: l.lot_number, material_id: String(l.material_id), total_qty: String(l.total_qty), remaining_qty: String(l.remaining_qty),
      mfg_date: l.mfg_date ? l.mfg_date.slice(0, 10) : "", exp_date: l.exp_date ? l.exp_date.slice(0, 10) : "",
      status: l.status, attribute_template: l.attribute_template ?? "",
    });
    setEditMode(true); setShowForm(false);
  };

  const toPayload = () => ({
    lot_number: form.lot_number, material_id: Number(form.material_id),
    total_qty: Number(form.total_qty) || 0, remaining_qty: Number(form.remaining_qty) || 0,
    mfg_date: form.mfg_date || null, exp_date: form.exp_date || null, status: form.status,
    attribute_template: form.attribute_template || null,
  });

  const handleCreate = () => {
    if (!form.lot_number || !form.material_id) return;
    createLot.mutate(toPayload(), { onSuccess: () => { setShowForm(false); setSaved(true); setTimeout(() => setSaved(false), 2000); } });
  };
  const handleSaveEdit = () => {
    if (!detail) return;
    updateLot.mutate({ id: detail.id, payload: toPayload() }, { onSuccess: () => { setEditMode(false); setSaved(true); setTimeout(() => setSaved(false), 2000); } });
  };
  const handleDelete = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Delete this LOT?")) return;
    deleteLot.mutate(id, { onSuccess: () => { if (selected === id) setSelected(null); } });
  };

  return (
    <section className="space-y-4" id="outbound-lot-section">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total LOTs", value: lots.length, color: "text-neutral-700", bg: "bg-white", icon: <Tag size={14} className="text-[#009FE3]" /> },
          { label: "Active", value: lots.filter(l => l.status === "Active").length, color: "text-emerald-600", bg: "bg-emerald-50", icon: <Check size={14} className="text-emerald-500" /> },
          { label: "Quarantine", value: lots.filter(l => l.status === "Quarantine").length, color: "text-amber-600", bg: "bg-amber-50", icon: <Clock size={14} className="text-amber-500" /> },
          { label: "Expired", value: lots.filter(l => l.status === "Expired").length, color: "text-neutral-500", bg: "bg-neutral-50", icon: <AlertTriangle size={14} className="text-neutral-400" /> },
        ].map(k => (
          <div key={k.label} className={`${k.bg} rounded-xl border border-neutral-200 p-4 flex items-center gap-3`}>
            <div className="p-2 bg-white rounded-lg border border-neutral-200">{k.icon}</div>
            <div><p className={`text-lg font-bold ${k.color}`}>{k.value}</p><p className="text-xs text-neutral-500">{k.label}</p></div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-xl border border-neutral-200">
          <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-sm font-semibold text-neutral-900 flex items-center gap-2"><Tag size={14} className="text-[#009FE3]" /> LOT Master</h2>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 border border-neutral-200 rounded-lg px-3 py-1.5 bg-neutral-50">
                <Search size={12} className="text-neutral-400" />
                <input className="bg-transparent text-xs placeholder-neutral-400 focus:outline-none w-28" placeholder="Search LOT or SKU..." value={search} onChange={e => setSearch(e.target.value)} type="text" />
              </div>
              <button onClick={openAdd} className="flex items-center gap-1.5 px-3 py-1.5 text-white rounded-lg text-xs hover:opacity-90" style={{ background: "#009FE3" }}>
                <Plus size={12} /> Add LOT
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-100">
                  <th className="text-left py-2.5 px-3 text-neutral-500">LOT #</th>
                  <th className="text-left py-2.5 px-3 text-neutral-500">SKU</th>
                  <th className="text-right py-2.5 px-3 text-neutral-500">Total</th>
                  <th className="text-right py-2.5 px-3 text-neutral-500">Remaining</th>
                  <th className="text-left py-2.5 px-3 text-neutral-500">Mfg</th>
                  <th className="text-left py-2.5 px-3 text-neutral-500">Exp</th>
                  <th className="text-left py-2.5 px-3 text-neutral-500">Status</th>
                  <th className="text-left py-2.5 px-3 text-neutral-500">Act.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50">
                {isLoading ? (
                  <tr><td colSpan={8} className="py-8 text-center text-xs text-neutral-400"><Loader2 size={14} className="inline animate-spin mr-1.5" />Loading LOTs…</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={8} className="py-8 text-center text-xs text-neutral-400">No LOTs match your search.</td></tr>
                ) : filtered.map(l => (
                  <tr key={l.id} className={`hover:bg-blue-50/30 cursor-pointer transition-colors ${selected === l.id ? "bg-blue-50/40" : ""}`} onClick={() => { setSelected(l.id); setShowForm(false); setEditMode(false); }}>
                    <td className="py-2.5 px-3 font-medium text-neutral-900">{l.lot_number}</td>
                    <td className="py-2.5 px-3 text-neutral-700">{skuFor(l.material_id)}</td>
                    <td className="py-2.5 px-3 text-right text-neutral-700">{l.total_qty}</td>
                    <td className="py-2.5 px-3 text-right text-neutral-700">{l.remaining_qty}</td>
                    <td className="py-2.5 px-3 text-neutral-600">{l.mfg_date?.slice(0, 10) ?? "—"}</td>
                    <td className="py-2.5 px-3 text-neutral-600">{l.exp_date?.slice(0, 10) ?? "—"}</td>
                    <td className="py-2.5 px-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor[l.status] || "bg-neutral-100 text-neutral-500"}`}>{l.status}</span></td>
                    <td className="py-2.5 px-3">
                      <div className="flex gap-1.5">
                        <button onClick={e => { e.stopPropagation(); openEdit(l); }} className="text-neutral-400 hover:text-amber-500"><Pencil size={12} /></button>
                        <button onClick={e => handleDelete(l.id, e)} className="text-neutral-400 hover:text-red-500"><Trash2 size={12} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3 border-t border-neutral-100">
            <span className="text-xs text-neutral-400">Showing {filtered.length} of {lots.length} LOTs</span>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {showForm ? (
            <div className="bg-white rounded-xl border border-neutral-200">
              <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-neutral-900 flex items-center gap-2"><Plus size={13} className="text-[#009FE3]" /> Add LOT</h3>
                <button onClick={() => setShowForm(false)} className="text-neutral-400 hover:text-neutral-600"><X size={14} /></button>
              </div>
              <div className="p-5 space-y-3">
                <div><label className="block text-xs text-neutral-600 mb-1">LOT Number *</label><input className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-xs bg-neutral-50 focus:outline-none focus:border-[#009FE3]" placeholder="LOT-2026-001" value={form.lot_number} onChange={e => setForm({ ...form, lot_number: e.target.value })} /></div>
                <div><label className="block text-xs text-neutral-600 mb-1">SKU *</label>
                  <select className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-xs bg-white focus:outline-none focus:border-[#009FE3]" value={form.material_id} onChange={e => setForm({ ...form, material_id: e.target.value })}>
                    <option value="">— Select material —</option>
                    {materials.map(m => <option key={m.id} value={m.id}>{m.sku} — {m.description}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div><label className="block text-xs text-neutral-600 mb-1">Total Qty</label><input className="w-full border border-neutral-200 rounded-lg px-2 py-2 text-xs focus:outline-none" type="number" value={form.total_qty} onChange={e => setForm({ ...form, total_qty: e.target.value })} /></div>
                  <div><label className="block text-xs text-neutral-600 mb-1">Remaining Qty</label><input className="w-full border border-neutral-200 rounded-lg px-2 py-2 text-xs focus:outline-none" type="number" value={form.remaining_qty} onChange={e => setForm({ ...form, remaining_qty: e.target.value })} /></div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div><label className="block text-xs text-neutral-600 mb-1">Mfg Date</label><input className="w-full border border-neutral-200 rounded-lg px-2 py-2 text-xs focus:outline-none" type="date" value={form.mfg_date} onChange={e => setForm({ ...form, mfg_date: e.target.value })} /></div>
                  <div><label className="block text-xs text-neutral-600 mb-1">Exp Date</label><input className="w-full border border-neutral-200 rounded-lg px-2 py-2 text-xs focus:outline-none" type="date" value={form.exp_date} onChange={e => setForm({ ...form, exp_date: e.target.value })} /></div>
                </div>
                <div><label className="block text-xs text-neutral-600 mb-1">Status</label>
                  <select className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-xs bg-white focus:outline-none focus:border-[#009FE3]" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                    <option>Active</option><option>Quarantine</option><option>Critical</option><option>Expired</option>
                  </select>
                </div>
                {createLot.isError && <p className="text-xs text-red-600">{(createLot.error as Error).message}</p>}
                <div className="flex gap-2 pt-1">
                  <button onClick={handleCreate} disabled={createLot.isPending} className="flex-1 py-2 text-white rounded-lg text-xs flex items-center justify-center gap-1.5 hover:opacity-90 disabled:opacity-60" style={{ background: "#009FE3" }}>
                    {createLot.isPending ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Save LOT
                  </button>
                  <button onClick={() => setShowForm(false)} className="flex-1 py-2 border border-neutral-200 text-neutral-700 rounded-lg text-xs hover:bg-neutral-50">Cancel</button>
                </div>
              </div>
            </div>
          ) : detail ? (
            <div className="bg-white rounded-xl border border-neutral-200">
              <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-neutral-900">{detail.lot_number}</h3>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor[detail.status] || "bg-neutral-100 text-neutral-500"}`}>{detail.status}</span>
              </div>
              <div className="p-5 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div><label className="block text-xs text-neutral-600 mb-1">Total Qty</label><input disabled={!editMode} className={`w-full border rounded-lg px-2 py-2 text-xs focus:outline-none ${editMode ? "border-[#009FE3]" : "border-neutral-200 bg-neutral-50"}`} value={editMode ? form.total_qty : detail.total_qty} onChange={e => setForm({ ...form, total_qty: e.target.value })} type="number" /></div>
                  <div><label className="block text-xs text-neutral-600 mb-1">Remaining Qty</label><input disabled={!editMode} className={`w-full border rounded-lg px-2 py-2 text-xs focus:outline-none ${editMode ? "border-[#009FE3]" : "border-neutral-200 bg-neutral-50"}`} value={editMode ? form.remaining_qty : detail.remaining_qty} onChange={e => setForm({ ...form, remaining_qty: e.target.value })} type="number" /></div>
                </div>
                <div className="flex justify-between text-xs"><span className="text-neutral-500">SKU</span><span className="font-medium text-neutral-900">{skuFor(detail.material_id)}</span></div>
                <div className="flex justify-between text-xs"><span className="text-neutral-500">Mfg / Exp</span><span className="font-medium text-neutral-900">{detail.mfg_date?.slice(0, 10) ?? "—"} / {detail.exp_date?.slice(0, 10) ?? "—"}</span></div>
                {saved && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg">
                    <Check size={12} className="text-emerald-600" /><span className="text-xs text-emerald-700">LOT saved successfully!</span>
                  </div>
                )}
                {updateLot.isError && <p className="text-xs text-red-600">{(updateLot.error as Error).message}</p>}
                <div className="flex gap-2 pt-1">
                  {editMode ? (
                    <>
                      <button onClick={handleSaveEdit} disabled={updateLot.isPending} className="flex-1 py-2 text-white rounded-lg text-xs flex items-center justify-center gap-1.5 hover:opacity-90 disabled:opacity-60" style={{ background: "#009FE3" }}>
                        {updateLot.isPending ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Save Changes
                      </button>
                      <button onClick={() => setEditMode(false)} className="flex-1 py-2 border border-neutral-200 text-neutral-700 rounded-lg text-xs hover:bg-neutral-50">Cancel</button>
                    </>
                  ) : (
                    <button onClick={() => openEdit(detail)} className="flex-1 py-2 text-white rounded-lg text-xs hover:opacity-90" style={{ background: "#009FE3" }}>Edit LOT</button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-neutral-200 p-8 text-center text-xs text-neutral-400">
              Select a LOT, or click "Add LOT" to create one.
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3">
            <Info size={14} className="text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-semibold text-blue-700">LOT Master Data</p>
              <p className="text-xs text-blue-600 mt-0.5">Outbound shipment history will appear here once the Outbound module is wired in.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default OutboundLotSection;
