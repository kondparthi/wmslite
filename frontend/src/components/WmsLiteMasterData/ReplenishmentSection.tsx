import React, { useMemo, useState } from "react";
import {
  RefreshCw, Plus, Search, Pencil, Trash2, X, Check, AlertTriangle, Loader2, Info
} from "lucide-react";
import {
  useMasterDataList,
  useMasterDataCreate,
  useMasterDataUpdate,
  useMasterDataDelete,
} from "@/hooks/useMasterDataApi";

const RULES_RESOURCE = "/master-data/replenishment-rules";
const MATERIALS_RESOURCE = "/master-data/materials";
const LOCATIONS_RESOURCE = "/master-data/locations";

interface RuleRecord {
  id: number;
  material_id: number;
  location_id: number | null;
  min_qty: number;
  max_qty: number;
  reorder_point: number | null;
  status: string;
}
interface MaterialRecord { id: number; sku: string; description: string; }
interface LocationRecord { id: number; code: string; }

const emptyForm = { material_id: "", location_id: "", min_qty: "", max_qty: "", reorder_point: "", status: "Active" };

const ReplenishmentSection = () => {
  const { data: rules = [], isLoading } = useMasterDataList<RuleRecord>(RULES_RESOURCE);
  const { data: materials = [] } = useMasterDataList<MaterialRecord>(MATERIALS_RESOURCE);
  const { data: locations = [] } = useMasterDataList<LocationRecord>(LOCATIONS_RESOURCE);
  const createRule = useMasterDataCreate<RuleRecord>(RULES_RESOURCE);
  const updateRule = useMasterDataUpdate<RuleRecord>(RULES_RESOURCE);
  const deleteRule = useMasterDataDelete(RULES_RESOURCE);

  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });

  const skuFor = (id: number) => materials.find(m => m.id === id)?.sku ?? `#${id}`;
  const locCodeFor = (id: number | null) => locations.find(l => l.id === id)?.code ?? "—";

  const filtered = useMemo(() => rules.filter(r => skuFor(r.material_id).toLowerCase().includes(search.toLowerCase())), [rules, search, materials]);
  const detail = rules.find(r => r.id === selected);

  const belowMin = (r: RuleRecord) => r.reorder_point != null && r.min_qty > 0; // flag rules with a reorder point set
  const criticalCount = rules.filter(r => r.status === "Active" && r.min_qty > 0).length;

  const openAdd = () => { setForm({ ...emptyForm }); setShowForm(true); setEditMode(false); };
  const openEdit = (r: RuleRecord) => {
    setSelected(r.id);
    setForm({
      material_id: String(r.material_id), location_id: r.location_id ? String(r.location_id) : "",
      min_qty: String(r.min_qty), max_qty: String(r.max_qty), reorder_point: r.reorder_point?.toString() ?? "", status: r.status,
    });
    setEditMode(true); setShowForm(false);
  };

  const toPayload = () => ({
    material_id: Number(form.material_id), location_id: form.location_id ? Number(form.location_id) : null,
    min_qty: Number(form.min_qty) || 0, max_qty: Number(form.max_qty) || 0,
    reorder_point: form.reorder_point ? Number(form.reorder_point) : null, status: form.status,
  });

  const handleCreate = () => {
    if (!form.material_id) return;
    createRule.mutate(toPayload(), { onSuccess: () => { setShowForm(false); setSaved(true); setTimeout(() => setSaved(false), 2000); } });
  };
  const handleSaveEdit = () => {
    if (!detail) return;
    updateRule.mutate({ id: detail.id, payload: toPayload() }, { onSuccess: () => { setEditMode(false); setSaved(true); setTimeout(() => setSaved(false), 2000); } });
  };
  const handleDelete = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Delete this replenishment rule?")) return;
    deleteRule.mutate(id, { onSuccess: () => { if (selected === id) setSelected(null); } });
  };

  return (
    <section className="space-y-4" id="replenishment-section">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {[
          { label: "Total Rules", value: rules.length, color: "text-neutral-700", bg: "bg-white", icon: <RefreshCw size={14} className="text-[#009FE3]" /> },
          { label: "Active", value: rules.filter(r => r.status === "Active").length, color: "text-emerald-600", bg: "bg-emerald-50", icon: <Check size={14} className="text-emerald-500" /> },
          { label: "With Reorder Point", value: rules.filter(r => r.reorder_point != null).length, color: "text-amber-600", bg: "bg-amber-50", icon: <AlertTriangle size={14} className="text-amber-500" /> },
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
            <h2 className="text-sm font-semibold text-neutral-900 flex items-center gap-2"><RefreshCw size={14} className="text-[#009FE3]" /> Replenishment Rules</h2>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 border border-neutral-200 rounded-lg px-3 py-1.5 bg-neutral-50">
                <Search size={12} className="text-neutral-400" />
                <input className="bg-transparent text-xs placeholder-neutral-400 focus:outline-none w-28" placeholder="Search SKU..." value={search} onChange={e => setSearch(e.target.value)} type="text" />
              </div>
              <button onClick={openAdd} className="flex items-center gap-1.5 px-3 py-1.5 text-white rounded-lg text-xs hover:opacity-90" style={{ background: "#009FE3" }}>
                <Plus size={12} /> Add Rule
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-100">
                  <th className="text-left py-2.5 px-3 text-neutral-500">SKU</th>
                  <th className="text-left py-2.5 px-3 text-neutral-500">Location</th>
                  <th className="text-right py-2.5 px-3 text-neutral-500">Min</th>
                  <th className="text-right py-2.5 px-3 text-neutral-500">Max</th>
                  <th className="text-right py-2.5 px-3 text-neutral-500">Reorder Pt.</th>
                  <th className="text-left py-2.5 px-3 text-neutral-500">Status</th>
                  <th className="text-left py-2.5 px-3 text-neutral-500">Act.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50">
                {isLoading ? (
                  <tr><td colSpan={7} className="py-8 text-center text-xs text-neutral-400"><Loader2 size={14} className="inline animate-spin mr-1.5" />Loading rules…</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={7} className="py-8 text-center text-xs text-neutral-400">No rules match your search.</td></tr>
                ) : filtered.map(r => (
                  <tr key={r.id} className={`hover:bg-blue-50/30 cursor-pointer transition-colors ${selected === r.id ? "bg-blue-50/40" : ""}`} onClick={() => { setSelected(r.id); setShowForm(false); setEditMode(false); }}>
                    <td className="py-2.5 px-3 font-medium text-neutral-900">{skuFor(r.material_id)}</td>
                    <td className="py-2.5 px-3 text-neutral-600">{locCodeFor(r.location_id)}</td>
                    <td className="py-2.5 px-3 text-right text-neutral-700">{r.min_qty}</td>
                    <td className="py-2.5 px-3 text-right text-neutral-700">{r.max_qty}</td>
                    <td className="py-2.5 px-3 text-right text-neutral-700">{r.reorder_point ?? "—"}</td>
                    <td className="py-2.5 px-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${r.status === "Active" ? "bg-emerald-50 text-emerald-700" : "bg-neutral-100 text-neutral-500"}`}>{r.status}</span></td>
                    <td className="py-2.5 px-3">
                      <div className="flex gap-1.5">
                        <button onClick={e => { e.stopPropagation(); openEdit(r); }} className="text-neutral-400 hover:text-amber-500"><Pencil size={12} /></button>
                        <button onClick={e => handleDelete(r.id, e)} className="text-neutral-400 hover:text-red-500"><Trash2 size={12} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3 border-t border-neutral-100">
            <span className="text-xs text-neutral-400">Showing {filtered.length} of {rules.length} rules</span>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {showForm ? (
            <div className="bg-white rounded-xl border border-neutral-200">
              <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-neutral-900 flex items-center gap-2"><Plus size={13} className="text-[#009FE3]" /> Add Replenishment Rule</h3>
                <button onClick={() => setShowForm(false)} className="text-neutral-400 hover:text-neutral-600"><X size={14} /></button>
              </div>
              <div className="p-5 space-y-3">
                <div><label className="block text-xs text-neutral-600 mb-1">SKU *</label>
                  <select className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-xs bg-white focus:outline-none focus:border-[#009FE3]" value={form.material_id} onChange={e => setForm({ ...form, material_id: e.target.value })}>
                    <option value="">— Select material —</option>
                    {materials.map(m => <option key={m.id} value={m.id}>{m.sku} — {m.description}</option>)}
                  </select>
                </div>
                <div><label className="block text-xs text-neutral-600 mb-1">Location</label>
                  <select className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-xs bg-white focus:outline-none focus:border-[#009FE3]" value={form.location_id} onChange={e => setForm({ ...form, location_id: e.target.value })}>
                    <option value="">— None —</option>
                    {locations.map(l => <option key={l.id} value={l.id}>{l.code}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div><label className="block text-xs text-neutral-600 mb-1">Min Qty</label><input className="w-full border border-neutral-200 rounded-lg px-2 py-2 text-xs focus:outline-none" type="number" value={form.min_qty} onChange={e => setForm({ ...form, min_qty: e.target.value })} /></div>
                  <div><label className="block text-xs text-neutral-600 mb-1">Max Qty</label><input className="w-full border border-neutral-200 rounded-lg px-2 py-2 text-xs focus:outline-none" type="number" value={form.max_qty} onChange={e => setForm({ ...form, max_qty: e.target.value })} /></div>
                  <div><label className="block text-xs text-neutral-600 mb-1">Reorder Pt.</label><input className="w-full border border-neutral-200 rounded-lg px-2 py-2 text-xs focus:outline-none" type="number" value={form.reorder_point} onChange={e => setForm({ ...form, reorder_point: e.target.value })} /></div>
                </div>
                {createRule.isError && <p className="text-xs text-red-600">{(createRule.error as Error).message}</p>}
                <div className="flex gap-2 pt-1">
                  <button onClick={handleCreate} disabled={createRule.isPending} className="flex-1 py-2 text-white rounded-lg text-xs flex items-center justify-center gap-1.5 hover:opacity-90 disabled:opacity-60" style={{ background: "#009FE3" }}>
                    {createRule.isPending ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Save Rule
                  </button>
                  <button onClick={() => setShowForm(false)} className="flex-1 py-2 border border-neutral-200 text-neutral-700 rounded-lg text-xs hover:bg-neutral-50">Cancel</button>
                </div>
              </div>
            </div>
          ) : detail ? (
            <div className="bg-white rounded-xl border border-neutral-200">
              <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-neutral-900">{skuFor(detail.material_id)}</h3>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${detail.status === "Active" ? "bg-emerald-50 text-emerald-700" : "bg-neutral-100 text-neutral-500"}`}>{detail.status}</span>
              </div>
              <div className="p-5 space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <div><label className="block text-xs text-neutral-600 mb-1">Min Qty</label><input disabled={!editMode} className={`w-full border rounded-lg px-2 py-2 text-xs focus:outline-none ${editMode ? "border-[#009FE3]" : "border-neutral-200 bg-neutral-50"}`} value={editMode ? form.min_qty : detail.min_qty} onChange={e => setForm({ ...form, min_qty: e.target.value })} type="number" /></div>
                  <div><label className="block text-xs text-neutral-600 mb-1">Max Qty</label><input disabled={!editMode} className={`w-full border rounded-lg px-2 py-2 text-xs focus:outline-none ${editMode ? "border-[#009FE3]" : "border-neutral-200 bg-neutral-50"}`} value={editMode ? form.max_qty : detail.max_qty} onChange={e => setForm({ ...form, max_qty: e.target.value })} type="number" /></div>
                  <div><label className="block text-xs text-neutral-600 mb-1">Reorder Pt.</label><input disabled={!editMode} className={`w-full border rounded-lg px-2 py-2 text-xs focus:outline-none ${editMode ? "border-[#009FE3]" : "border-neutral-200 bg-neutral-50"}`} value={editMode ? form.reorder_point : detail.reorder_point ?? ""} onChange={e => setForm({ ...form, reorder_point: e.target.value })} type="number" /></div>
                </div>
                <div className="flex justify-between text-xs"><span className="text-neutral-500">Location</span><span className="font-medium text-neutral-900">{locCodeFor(detail.location_id)}</span></div>
                {saved && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg">
                    <Check size={12} className="text-emerald-600" /><span className="text-xs text-emerald-700">Rule saved successfully!</span>
                  </div>
                )}
                {updateRule.isError && <p className="text-xs text-red-600">{(updateRule.error as Error).message}</p>}
                <div className="flex gap-2 pt-1">
                  {editMode ? (
                    <>
                      <button onClick={handleSaveEdit} disabled={updateRule.isPending} className="flex-1 py-2 text-white rounded-lg text-xs flex items-center justify-center gap-1.5 hover:opacity-90 disabled:opacity-60" style={{ background: "#009FE3" }}>
                        {updateRule.isPending ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Save Changes
                      </button>
                      <button onClick={() => setEditMode(false)} className="flex-1 py-2 border border-neutral-200 text-neutral-700 rounded-lg text-xs hover:bg-neutral-50">Cancel</button>
                    </>
                  ) : (
                    <button onClick={() => openEdit(detail)} className="flex-1 py-2 text-white rounded-lg text-xs hover:opacity-90" style={{ background: "#009FE3" }}>Edit Rule</button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-neutral-200 p-8 text-center text-xs text-neutral-400">
              Select a rule, or click "Add Rule" to create one.
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3">
            <Info size={14} className="text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-semibold text-blue-700">Min/Max Rules Only</p>
              <p className="text-xs text-blue-600 mt-0.5">Per project scope, no demand forecasting. Live "current quantity" and trigger history will appear once the Inventory module is wired in.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ReplenishmentSection;
