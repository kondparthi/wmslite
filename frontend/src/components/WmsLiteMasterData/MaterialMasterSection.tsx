import React, { useMemo, useState } from "react";
import {
  Box, Plus, Search, FileDown, FileUp, Eye, Pencil, Trash2,
  X, Check, Tag, AlertCircle, Package, Loader2
} from "lucide-react";
import {
  useMasterDataList,
  useMasterDataCreate,
  useMasterDataUpdate,
  useMasterDataDelete,
} from "@/hooks/useMasterDataApi";

const MATERIALS_RESOURCE = "/master-data/materials";
const OWNERS_RESOURCE = "/master-data/material-owners";
const PACKKEYS_RESOURCE = "/master-data/material-packkeys";

interface MaterialRecord {
  id: number;
  sku: string;
  description: string;
  category: string | null;
  uom: string;
  weight: number | null;
  reorder_point: number | null;
  owner_id: number | null;
  lot_tracked: boolean;
  serial_tracked: boolean;
  expiry_tracked: boolean;
  hazardous: boolean;
  status: string;
}

interface OwnerRecord { id: number; code: string; name: string; }

interface PackkeyRecord {
  id: number;
  material_id: number;
  pack_uom: string;
  base_uom: string;
  conversion_qty: number;
  is_default: boolean;
  status: string;
}

const catColors: Record<string, string> = {
  Packaging: "bg-blue-50 text-blue-700",
  Equipment: "bg-purple-50 text-purple-700",
  PPE: "bg-green-50 text-green-700",
  Labels: "bg-amber-50 text-amber-700",
};

const emptyForm = {
  sku: "", description: "", category: "Packaging", uom: "EA", weight: "", reorder_point: "",
  owner_id: "", hazardous: false, lot_tracked: true, serial_tracked: false, expiry_tracked: false, status: "Active",
};
const emptyPack = { pack_uom: "", base_uom: "EA", conversion_qty: "", is_default: false };

const MaterialMasterSection = () => {
  const { data: materials = [], isLoading } = useMasterDataList<MaterialRecord>(MATERIALS_RESOURCE);
  const { data: owners = [] } = useMasterDataList<OwnerRecord>(OWNERS_RESOURCE);
  const { data: allPacks = [] } = useMasterDataList<PackkeyRecord>(PACKKEYS_RESOURCE);
  const createMaterial = useMasterDataCreate<MaterialRecord>(MATERIALS_RESOURCE);
  const updateMaterial = useMasterDataUpdate<MaterialRecord>(MATERIALS_RESOURCE);
  const createPack = useMasterDataCreate<PackkeyRecord>(PACKKEYS_RESOURCE);
  const deletePack = useMasterDataDelete(PACKKEYS_RESOURCE);

  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("All Categories");
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [activeView, setActiveView] = useState<"detail" | "packkey">("detail");
  const [showAddPack, setShowAddPack] = useState(false);
  const [newPack, setNewPack] = useState({ ...emptyPack });
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });

  const ownerName = (ownerId: number | null) => owners.find(o => o.id === ownerId)?.name ?? "—";

  const filtered = useMemo(() => materials.filter(m => {
    const matchSearch = m.sku.toLowerCase().includes(search.toLowerCase()) || m.description.toLowerCase().includes(search.toLowerCase());
    const matchCat = catFilter === "All Categories" || m.category === catFilter;
    return matchSearch && matchCat;
  }), [materials, search, catFilter]);

  const detail = materials.find(m => m.id === selected);
  const packs = selected ? allPacks.filter(p => p.material_id === selected) : [];

  const openAdd = () => { setForm({ ...emptyForm }); setShowForm(true); setEditMode(false); };

  const openEdit = (m: MaterialRecord) => {
    setSelected(m.id);
    setForm({
      sku: m.sku, description: m.description, category: m.category ?? "Packaging", uom: m.uom,
      weight: m.weight?.toString() ?? "", reorder_point: m.reorder_point?.toString() ?? "",
      owner_id: m.owner_id ? String(m.owner_id) : "", hazardous: m.hazardous,
      lot_tracked: m.lot_tracked, serial_tracked: m.serial_tracked, expiry_tracked: m.expiry_tracked, status: m.status,
    });
    setEditMode(true); setShowForm(false); setActiveView("detail");
  };

  const toPayload = () => ({
    sku: form.sku, description: form.description, category: form.category, uom: form.uom,
    weight: form.weight ? Number(form.weight) : null, reorder_point: form.reorder_point ? Number(form.reorder_point) : null,
    owner_id: form.owner_id ? Number(form.owner_id) : null, hazardous: form.hazardous,
    lot_tracked: form.lot_tracked, serial_tracked: form.serial_tracked, expiry_tracked: form.expiry_tracked, status: form.status,
  });

  const handleCreate = () => {
    if (!form.sku || !form.description) return;
    createMaterial.mutate(toPayload(), {
      onSuccess: () => { setShowForm(false); setSaved(true); setTimeout(() => setSaved(false), 2000); },
    });
  };

  const handleSaveEdit = () => {
    if (!detail) return;
    updateMaterial.mutate({ id: detail.id, payload: toPayload() }, {
      onSuccess: () => { setEditMode(false); setSaved(true); setTimeout(() => setSaved(false), 2000); },
    });
  };

  const handleAddPack = () => {
    if (!selected || !newPack.pack_uom || !newPack.conversion_qty) return;
    createPack.mutate({ ...newPack, material_id: selected, conversion_qty: Number(newPack.conversion_qty) }, {
      onSuccess: () => { setShowAddPack(false); setNewPack({ ...emptyPack }); },
    });
  };

  return (
    <section className="grid grid-cols-1 lg:grid-cols-3 gap-4" id="material-master-section">
      {/* Table */}
      <div className="lg:col-span-2 bg-white rounded-xl border border-neutral-200">
        <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold text-neutral-900 flex items-center gap-2">
              <Box size={14} className="text-[#009FE3]" /> Material Master
            </h2>
            <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{isLoading ? "loading…" : `${materials.length} records`}</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 border border-neutral-200 rounded-lg px-3 py-1.5 bg-neutral-50">
              <Search size={12} className="text-neutral-400" />
              <input className="bg-transparent text-xs placeholder-neutral-400 focus:outline-none w-32" placeholder="Search SKU or name..." value={search} onChange={e => setSearch(e.target.value)} type="text" />
            </div>
            <select className="text-xs border border-neutral-200 rounded-lg px-2 py-1.5 text-neutral-600 bg-white focus:outline-none focus:border-[#009FE3]" value={catFilter} onChange={e => setCatFilter(e.target.value)}>
              <option>All Categories</option>
              <option>Packaging</option><option>Equipment</option><option>PPE</option><option>Labels</option>
            </select>
            <button onClick={openAdd} className="flex items-center gap-1.5 px-3 py-1.5 text-white rounded-lg text-xs hover:opacity-90" style={{ background: "#009FE3" }}>
              <Plus size={12} /> Add Material
            </button>
            <button className="flex items-center gap-1.5 px-3 py-1.5 border border-neutral-200 text-neutral-700 rounded-lg text-xs hover:bg-neutral-50"><FileUp size={12} /> Import</button>
            <button className="flex items-center gap-1.5 px-3 py-1.5 border border-neutral-200 text-neutral-700 rounded-lg text-xs hover:bg-neutral-50"><FileDown size={12} /> Export</button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-neutral-50 border-b border-neutral-100">
                <th className="text-left py-2.5 px-3 text-neutral-500">SKU</th>
                <th className="text-left py-2.5 px-3 text-neutral-500">Material Name</th>
                <th className="text-left py-2.5 px-3 text-neutral-500">Category</th>
                <th className="text-left py-2.5 px-3 text-neutral-500">UOM</th>
                <th className="text-left py-2.5 px-3 text-neutral-500">Weight(kg)</th>
                <th className="text-left py-2.5 px-3 text-neutral-500">Owner</th>
                <th className="text-left py-2.5 px-3 text-neutral-500">Reorder</th>
                <th className="text-left py-2.5 px-3 text-neutral-500">Status</th>
                <th className="text-left py-2.5 px-3 text-neutral-500">Act.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-50">
              {isLoading ? (
                <tr><td colSpan={9} className="py-8 text-center text-xs text-neutral-400"><Loader2 size={14} className="inline animate-spin mr-1.5" />Loading materials…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={9} className="py-8 text-center text-xs text-neutral-400">No materials match the current filters.</td></tr>
              ) : filtered.map(m => (
                <tr key={m.id}
                  className={`hover:bg-blue-50/30 cursor-pointer transition-colors ${selected === m.id ? "bg-blue-50/40" : ""}`}
                  onClick={() => { setSelected(m.id); setShowForm(false); setActiveView("detail"); setEditMode(false); }}
                >
                  <td className="py-2.5 px-3 font-medium text-neutral-900">{m.sku}</td>
                  <td className="py-2.5 px-3 text-neutral-700">{m.description}</td>
                  <td className="py-2.5 px-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${catColors[m.category ?? ""] || "bg-neutral-100 text-neutral-700"}`}>{m.category}</span></td>
                  <td className="py-2.5 px-3 text-neutral-600">{m.uom}</td>
                  <td className="py-2.5 px-3 text-neutral-700">{m.weight}</td>
                  <td className="py-2.5 px-3 text-neutral-600">{ownerName(m.owner_id)}</td>
                  <td className="py-2.5 px-3 text-neutral-700">{m.reorder_point}</td>
                  <td className="py-2.5 px-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${m.status === "Active" ? "bg-emerald-50 text-emerald-700" : "bg-neutral-100 text-neutral-500"}`}>{m.status}</span>
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="flex gap-1.5">
                      <button onClick={e => { e.stopPropagation(); setSelected(m.id); setActiveView("detail"); setShowForm(false); }} className="text-neutral-400 hover:text-[#009FE3]"><Eye size={12} /></button>
                      <button onClick={e => { e.stopPropagation(); openEdit(m); }} className="text-neutral-400 hover:text-amber-500"><Pencil size={12} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 border-t border-neutral-100">
          <span className="text-xs text-neutral-400">Showing {filtered.length} of {materials.length} materials</span>
        </div>
      </div>

      {/* Side Panel */}
      <div className="flex flex-col gap-4">
        {showForm ? (
          /* ADD FORM */
          <div className="bg-white rounded-xl border border-neutral-200">
            <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-neutral-900 flex items-center gap-2"><Plus size={13} className="text-[#009FE3]" /> Add Material</h3>
              <button onClick={() => setShowForm(false)} className="text-neutral-400 hover:text-neutral-600"><X size={14} /></button>
            </div>
            <div className="p-5 space-y-3">
              <div><label className="block text-xs text-neutral-600 mb-1">SKU *</label><input className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-xs bg-neutral-50 focus:outline-none focus:border-[#009FE3]" placeholder="SKU-1001" value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })} type="text" /></div>
              <div><label className="block text-xs text-neutral-600 mb-1">Material Name *</label><input className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#009FE3]" placeholder="Description..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} type="text" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs text-neutral-600 mb-1">Category</label>
                  <select className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-xs bg-white focus:outline-none focus:border-[#009FE3]" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                    <option>Packaging</option><option>Equipment</option><option>PPE</option><option>Labels</option>
                  </select>
                </div>
                <div><label className="block text-xs text-neutral-600 mb-1">UOM</label>
                  <select className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-xs bg-white focus:outline-none focus:border-[#009FE3]" value={form.uom} onChange={e => setForm({ ...form, uom: e.target.value })}>
                    <option>EA</option><option>CS</option><option>PL</option><option>RL</option><option>PR</option><option>PK</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs text-neutral-600 mb-1">Weight (kg)</label><input className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-xs focus:outline-none" placeholder="0.00" value={form.weight} onChange={e => setForm({ ...form, weight: e.target.value })} type="number" step="0.01" /></div>
                <div><label className="block text-xs text-neutral-600 mb-1">Reorder Point</label><input className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-xs focus:outline-none" placeholder="0" value={form.reorder_point} onChange={e => setForm({ ...form, reorder_point: e.target.value })} type="number" /></div>
              </div>
              <div><label className="block text-xs text-neutral-600 mb-1">Material Owner</label>
                <select className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-xs bg-white focus:outline-none focus:border-[#009FE3]" value={form.owner_id} onChange={e => setForm({ ...form, owner_id: e.target.value })}>
                  <option value="">— None —</option>
                  {owners.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-1.5 cursor-pointer"><input type="radio" name="haz" checked={form.hazardous} onChange={() => setForm({ ...form, hazardous: true })} className="accent-[#009FE3]" /><span className="text-xs text-neutral-700">Hazardous</span></label>
                <label className="flex items-center gap-1.5 cursor-pointer"><input type="radio" name="haz" checked={!form.hazardous} onChange={() => setForm({ ...form, hazardous: false })} className="accent-[#009FE3]" /><span className="text-xs text-neutral-700">Non-Hazardous</span></label>
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <label className="flex items-center gap-1.5 cursor-pointer"><input type="checkbox" className="rounded accent-[#009FE3]" checked={form.lot_tracked} onChange={e => setForm({ ...form, lot_tracked: e.target.checked })} /><span className="text-xs text-neutral-700">Lot Tracked</span></label>
                <label className="flex items-center gap-1.5 cursor-pointer"><input type="checkbox" className="rounded accent-[#009FE3]" checked={form.serial_tracked} onChange={e => setForm({ ...form, serial_tracked: e.target.checked })} /><span className="text-xs text-neutral-700">Serial Tracked</span></label>
                <label className="flex items-center gap-1.5 cursor-pointer"><input type="checkbox" className="rounded accent-[#009FE3]" checked={form.expiry_tracked} onChange={e => setForm({ ...form, expiry_tracked: e.target.checked })} /><span className="text-xs text-neutral-700">Expiry</span></label>
              </div>
              {createMaterial.isError && <p className="text-xs text-red-600">{(createMaterial.error as Error).message}</p>}
              <div className="flex gap-2 pt-2">
                <button onClick={handleCreate} disabled={createMaterial.isPending} className="flex-1 py-2 text-white rounded-lg text-xs flex items-center justify-center gap-1.5 hover:opacity-90 disabled:opacity-60" style={{ background: "#009FE3" }}>
                  {createMaterial.isPending ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Save Material
                </button>
                <button onClick={() => setShowForm(false)} className="flex-1 py-2 border border-neutral-200 text-neutral-700 rounded-lg text-xs hover:bg-neutral-50">Cancel</button>
              </div>
            </div>
          </div>
        ) : detail ? (
          /* DETAIL / EDIT PANEL */
          <div className="bg-white rounded-xl border border-neutral-200">
            <div className="px-5 pt-4 pb-0 border-b border-neutral-100">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-neutral-900 flex items-center gap-2"><Tag size={13} className="text-[#009FE3]" /> {detail.sku}</h3>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${detail.status === "Active" ? "bg-emerald-50 text-emerald-700" : "bg-neutral-100 text-neutral-500"}`}>{detail.status}</span>
              </div>
              <div className="flex gap-0">
                {[["detail", "Details"], ["packkey", "Pack Keys"]].map(([v, l]) => (
                  <button key={v} onClick={() => { setActiveView(v as any); setShowAddPack(false); }}
                    className={`text-xs px-4 py-2 border-b-2 transition-colors ${activeView === v ? "border-[#009FE3] font-semibold" : "border-transparent text-neutral-500 hover:text-neutral-700"}`}
                    style={activeView === v ? { color: "#009FE3" } : {}}>
                    {l}
                  </button>
                ))}
              </div>
            </div>

            {activeView === "detail" ? (
              <div className="p-5 space-y-3">
                <div><label className="block text-xs text-neutral-600 mb-1">Material Name</label>
                  <input disabled={!editMode} className={`w-full border rounded-lg px-3 py-2 text-xs focus:outline-none ${editMode ? "border-[#009FE3]" : "border-neutral-200 bg-neutral-50 text-neutral-700"}`} value={editMode ? form.description : detail.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-xs text-neutral-600 mb-1">Category</label>
                    <select disabled={!editMode} className={`w-full border rounded-lg px-3 py-2 text-xs focus:outline-none ${editMode ? "border-[#009FE3] bg-white" : "border-neutral-200 bg-neutral-50 text-neutral-700"}`} value={editMode ? form.category : detail.category ?? ""} onChange={e => setForm({ ...form, category: e.target.value })}>
                      <option>Packaging</option><option>Equipment</option><option>PPE</option><option>Labels</option>
                    </select>
                  </div>
                  <div><label className="block text-xs text-neutral-600 mb-1">UOM</label>
                    <select disabled={!editMode} className={`w-full border rounded-lg px-3 py-2 text-xs focus:outline-none ${editMode ? "border-[#009FE3] bg-white" : "border-neutral-200 bg-neutral-50 text-neutral-700"}`} value={editMode ? form.uom : detail.uom} onChange={e => setForm({ ...form, uom: e.target.value })}>
                      <option>EA</option><option>CS</option><option>PL</option><option>RL</option><option>PR</option><option>PK</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-xs text-neutral-600 mb-1">Weight (kg)</label>
                    <input disabled={!editMode} className={`w-full border rounded-lg px-3 py-2 text-xs focus:outline-none ${editMode ? "border-[#009FE3]" : "border-neutral-200 bg-neutral-50"}`} value={editMode ? form.weight : detail.weight ?? ""} onChange={e => setForm({ ...form, weight: e.target.value })} type="number" step="0.01" />
                  </div>
                  <div><label className="block text-xs text-neutral-600 mb-1">Reorder Pt.</label>
                    <input disabled={!editMode} className={`w-full border rounded-lg px-3 py-2 text-xs focus:outline-none ${editMode ? "border-[#009FE3]" : "border-neutral-200 bg-neutral-50"}`} value={editMode ? form.reorder_point : detail.reorder_point ?? ""} onChange={e => setForm({ ...form, reorder_point: e.target.value })} type="number" />
                  </div>
                </div>
                <div><label className="block text-xs text-neutral-600 mb-1">Material Owner</label>
                  <select disabled={!editMode} className={`w-full border rounded-lg px-3 py-2 text-xs focus:outline-none ${editMode ? "border-[#009FE3] bg-white" : "border-neutral-200 bg-neutral-50 text-neutral-700"}`} value={editMode ? form.owner_id : (detail.owner_id ?? "")} onChange={e => setForm({ ...form, owner_id: e.target.value })}>
                    <option value="">— None —</option>
                    {owners.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                  </select>
                </div>
                <div className="border-t border-neutral-100 pt-3 space-y-2">
                  <p className="text-xs font-medium text-neutral-700">Tracking Flags</p>
                  {([["Lot Tracked", detail.lot_tracked], ["Serial Tracked", detail.serial_tracked], ["Expiry Tracked", detail.expiry_tracked], ["Hazardous", detail.hazardous]] as const).map(([k, v]) => (
                    <div key={k} className="flex justify-between text-xs">
                      <span className="text-neutral-500">{k}</span>
                      <span className={`font-medium ${v ? "text-[#009FE3]" : "text-neutral-400"}`}>{v ? "Yes" : "No"}</span>
                    </div>
                  ))}
                </div>
                {saved && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg">
                    <Check size={12} className="text-emerald-600" /><span className="text-xs text-emerald-700">Material saved successfully!</span>
                  </div>
                )}
                {updateMaterial.isError && <p className="text-xs text-red-600">{(updateMaterial.error as Error).message}</p>}
                <div className="flex gap-2 pt-1">
                  {editMode ? (
                    <>
                      <button onClick={handleSaveEdit} disabled={updateMaterial.isPending} className="flex-1 py-2 text-white rounded-lg text-xs flex items-center justify-center gap-1.5 hover:opacity-90 disabled:opacity-60" style={{ background: "#009FE3" }}>
                        {updateMaterial.isPending ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Save Changes
                      </button>
                      <button onClick={() => setEditMode(false)} className="flex-1 py-2 border border-neutral-200 text-neutral-700 rounded-lg text-xs hover:bg-neutral-50">Cancel</button>
                    </>
                  ) : (
                    <button onClick={() => openEdit(detail)} className="flex-1 py-2 text-white rounded-lg text-xs hover:opacity-90" style={{ background: "#009FE3" }}>Edit Material</button>
                  )}
                </div>
              </div>
            ) : (
              /* PACK KEYS TAB */
              <div className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-neutral-700">Pack Key Definitions</p>
                  <button onClick={() => setShowAddPack(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-white rounded-lg text-xs hover:opacity-90" style={{ background: "#009FE3" }}>
                    <Plus size={11} /> Add Pack Key
                  </button>
                </div>
                {packs.length === 0 ? (
                  <div className="text-center py-6">
                    <Package size={28} className="mx-auto text-neutral-300 mb-2" />
                    <p className="text-xs text-neutral-400">No pack keys defined yet.</p>
                    <button onClick={() => setShowAddPack(true)} className="mt-3 text-xs px-4 py-2 text-white rounded-lg hover:opacity-90" style={{ background: "#009FE3" }}>Define First Pack Key</button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {packs.map(p => (
                      <div key={p.id} className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg border border-neutral-200">
                        <div>
                          <p className="text-xs font-semibold text-neutral-900">{p.pack_uom} {p.is_default && <span className="text-[#009FE3]">(default)</span>}</p>
                          <p className="text-xs text-neutral-500 mt-0.5">1 {p.pack_uom} = {p.conversion_qty} {p.base_uom}</p>
                        </div>
                        <div className="flex gap-1.5">
                          <button onClick={() => deletePack.mutate(p.id)} className="text-neutral-400 hover:text-red-500"><Trash2 size={12} /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {showAddPack && (
                  <div className="border border-[#009FE3] rounded-lg p-4 space-y-3 bg-blue-50/30">
                    <p className="text-xs font-semibold text-neutral-800">New Pack Key</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div><label className="block text-xs text-neutral-600 mb-1">Pack UOM *</label><input className="w-full border border-neutral-200 rounded-lg px-2 py-2 text-xs focus:outline-none focus:border-[#009FE3]" placeholder="CS" value={newPack.pack_uom} onChange={e => setNewPack({ ...newPack, pack_uom: e.target.value })} /></div>
                      <div><label className="block text-xs text-neutral-600 mb-1">Base UOM</label>
                        <select className="w-full border border-neutral-200 rounded-lg px-2 py-2 text-xs bg-white focus:outline-none focus:border-[#009FE3]" value={newPack.base_uom} onChange={e => setNewPack({ ...newPack, base_uom: e.target.value })}>
                          <option>EA</option><option>CS</option><option>PL</option><option>BX</option><option>RL</option>
                        </select>
                      </div>
                    </div>
                    <div><label className="block text-xs text-neutral-600 mb-1">Conversion Qty (1 pack = N base units)</label><input className="w-full border border-neutral-200 rounded-lg px-2 py-2 text-xs focus:outline-none focus:border-[#009FE3]" placeholder="20" type="number" value={newPack.conversion_qty} onChange={e => setNewPack({ ...newPack, conversion_qty: e.target.value })} /></div>
                    <label className="flex items-center gap-1.5 cursor-pointer"><input type="checkbox" className="rounded accent-[#009FE3]" checked={newPack.is_default} onChange={e => setNewPack({ ...newPack, is_default: e.target.checked })} /><span className="text-xs text-neutral-700">Default pack key</span></label>
                    {createPack.isError && <p className="text-xs text-red-600">{(createPack.error as Error).message}</p>}
                    <div className="flex gap-2">
                      <button onClick={handleAddPack} disabled={createPack.isPending} className="flex-1 py-2 text-white rounded-lg text-xs flex items-center justify-center gap-1 hover:opacity-90 disabled:opacity-60" style={{ background: "#009FE3" }}>
                        {createPack.isPending ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />} Save
                      </button>
                      <button onClick={() => setShowAddPack(false)} className="flex-1 py-2 border border-neutral-200 text-neutral-700 rounded-lg text-xs hover:bg-neutral-50">Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-neutral-200 p-8 text-center text-xs text-neutral-400">
            Select a material from the table, or click "Add Material" to create one.
          </div>
        )}

        {/* Low stock warning */}
        {materials.some(m => m.reorder_point != null) && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
            <AlertCircle size={15} className="text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-semibold text-amber-700">Reorder Point Tracking Active</p>
              <p className="text-xs text-amber-600 mt-0.5">Materials with a reorder point are ready for Replenishment Rules once inventory levels are wired in.</p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default MaterialMasterSection;
