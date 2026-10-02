import React, { useState } from "react";
import {
  Route, Plus, Search, Pencil, Trash2, Eye, X, Check,
  AlertCircle, Settings, ArrowUpDown, ToggleLeft, Loader2,
} from "lucide-react";
import {
  useMasterDataList, useMasterDataCreate, useMasterDataUpdate, useMasterDataDelete,
} from "@/hooks/useMasterDataApi";

const BRAND = "#009FE3";
const STRATEGIES_RESOURCE = "/operations/putaway-strategies";

interface Strategy {
  id: number;
  name: string;
  priority: number;
  zone: string | null;
  rule_type: string;
  condition_text: string | null;
  status: string;
  usage_count: number;
}

const zones = ["Zone A", "Zone B", "Zone C", "Zone D", "All"];
const rules = ["SKU-Based", "Expiry-Based", "Proximity", "Capacity", "Class-Based", "Temp-Controlled", "Velocity-Based"];

const emptyForm = { name: "", priority: "1", zone: "Zone A", rule_type: "SKU-Based", condition_text: "", status: "Active" };

const PutawayStrategySection = () => {
  const { data, isLoading } = useMasterDataList<Strategy>(STRATEGIES_RESOURCE);
  const createStrategy = useMasterDataCreate<Strategy>(STRATEGIES_RESOURCE);
  const updateStrategy = useMasterDataUpdate<Strategy>(STRATEGIES_RESOURCE);
  const deleteStrategy = useMasterDataDelete(STRATEGIES_RESOURCE);
  const strategies = data ?? [];

  const [selected, setSelected] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Strategy | null>(null);
  const [filterStatus, setFilterStatus] = useState("All");
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);

  const filtered = strategies.filter(s =>
    (filterStatus === "All" || s.status === filterStatus) &&
    s.name.toLowerCase().includes(search.toLowerCase())
  );
  const detail = strategies.find(s => s.id === selected);

  const openNew = () => { setEditTarget(null); setForm(emptyForm); setError(null); setShowForm(true); };
  const openEdit = (s: Strategy) => {
    setEditTarget(s);
    setForm({ name: s.name, priority: String(s.priority), zone: s.zone || "Zone A", rule_type: s.rule_type, condition_text: s.condition_text || "", status: s.status });
    setError(null);
    setShowForm(true);
  };

  const handleSave = async () => {
    setError(null);
    if (!form.name) { setError("Strategy name is required."); return; }
    const payload = { name: form.name, priority: Number(form.priority) || 1, zone: form.zone, rule_type: form.rule_type, condition_text: form.condition_text || null, status: form.status };
    try {
      if (editTarget) {
        await updateStrategy.mutateAsync({ id: editTarget.id, payload });
      } else {
        await createStrategy.mutateAsync({ ...payload, usage_count: 0 });
      }
      setShowForm(false);
      setEditTarget(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save strategy.");
    }
  };

  const handleDelete = (id: number) => {
    deleteStrategy.mutate(id);
    if (selected === id) setSelected(null);
  };
  const toggleStatus = (s: Strategy) => {
    updateStrategy.mutate({ id: s.id, payload: { status: s.status === "Active" ? "Inactive" : "Active" } });
  };

  return (
    <section className="space-y-4" id="putaway-strategy-section">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Strategies", value: strategies.length, color: BRAND },
          { label: "Active", value: strategies.filter(s => s.status === "Active").length, color: "#10B981" },
          { label: "Inactive", value: strategies.filter(s => s.status === "Inactive").length, color: "#F59E0B" },
          { label: "Total Usages", value: strategies.reduce((a, s) => a + (s.usage_count || 0), 0), color: "#8B5CF6" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-xl border border-neutral-200 px-5 py-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${color}18` }}>
              <span className="text-base font-bold" style={{ color }}>{value}</span>
            </div>
            <p className="text-xs text-neutral-500">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-xl border border-neutral-200">
          <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-sm font-semibold text-neutral-900 flex items-center gap-2">
              <Route size={14} style={{ color: BRAND }} /> Putaway Strategies
            </h2>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 border border-neutral-200 rounded-lg px-3 py-1.5 bg-neutral-50">
                <Search size={12} className="text-neutral-400" />
                <input className="bg-transparent text-xs text-neutral-700 placeholder-neutral-400 focus:outline-none w-28"
                  placeholder="Search strategy..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <select className="text-xs border border-neutral-200 rounded-lg px-2 py-1.5 text-neutral-600 bg-white focus:outline-none"
                value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                <option>All</option><option>Active</option><option>Inactive</option>
              </select>
              <button onClick={openNew}
                className="flex items-center gap-1.5 px-3 py-1.5 text-white rounded-lg text-xs hover:opacity-90 transition-opacity"
                style={{ background: BRAND }}>
                <Plus size={12} /> Add Strategy
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-100">
                  <th className="text-left py-2.5 px-3 text-neutral-500">Name</th>
                  <th className="text-left py-2.5 px-3 text-neutral-500">
                    <span className="flex items-center gap-1"><ArrowUpDown size={10} /> Priority</span>
                  </th>
                  <th className="text-left py-2.5 px-3 text-neutral-500">Zone</th>
                  <th className="text-left py-2.5 px-3 text-neutral-500">Rule Type</th>
                  <th className="text-left py-2.5 px-3 text-neutral-500">Uses</th>
                  <th className="text-left py-2.5 px-3 text-neutral-500">Status</th>
                  <th className="text-left py-2.5 px-3 text-neutral-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50">
                {isLoading ? (
                  <tr><td colSpan={7} className="text-center py-8 text-neutral-400"><Loader2 className="h-4 w-4 animate-spin inline mr-2" />Loading strategies...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-8 text-neutral-400">No strategies found.</td></tr>
                ) : filtered.map(s => (
                  <tr key={s.id}
                    className={`hover:bg-blue-50/20 cursor-pointer transition-colors ${selected === s.id ? "bg-blue-50/40" : ""}`}
                    style={selected === s.id ? { borderLeft: `3px solid ${BRAND}` } : {}}
                    onClick={() => setSelected(s.id)}>
                    <td className="py-2.5 px-3 text-neutral-800">{s.name}</td>
                    <td className="py-2.5 px-3">
                      <span className="w-6 h-6 flex items-center justify-center rounded text-xs font-bold text-white" style={{ background: BRAND }}>{s.priority}</span>
                    </td>
                    <td className="py-2.5 px-3 text-neutral-600">{s.zone || "—"}</td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded text-xs" style={{ background: "#009FE315", color: BRAND }}>{s.rule_type}</span>
                    </td>
                    <td className="py-2.5 px-3 text-neutral-600">{s.usage_count}</td>
                    <td className="py-2.5 px-3">
                      <button onClick={e => { e.stopPropagation(); toggleStatus(s); }}
                        className="px-2 py-0.5 rounded text-xs font-medium transition-colors"
                        style={s.status === "Active" ? { background: "#009FE320", color: BRAND } : { background: "#F3F4F6", color: "#9CA3AF" }}>
                        {s.status}
                      </button>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-1.5">
                        <button onClick={e => { e.stopPropagation(); setSelected(s.id); }}
                          className="text-neutral-400 hover:text-[#009FE3] transition-colors"><Eye size={12} /></button>
                        <button onClick={e => { e.stopPropagation(); openEdit(s); }}
                          className="text-neutral-400 hover:text-amber-500 transition-colors"><Pencil size={12} /></button>
                        <button onClick={e => { e.stopPropagation(); handleDelete(s.id); }}
                          className="text-neutral-400 hover:text-red-600 transition-colors"><Trash2 size={12} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3 border-t border-neutral-100 flex items-center justify-between">
            <span className="text-xs text-neutral-400">Showing {filtered.length} of {strategies.length} strategies</span>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {showForm ? (
            <div className="bg-white rounded-xl border border-neutral-200">
              <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-neutral-900 flex items-center gap-2">
                  <Settings size={13} style={{ color: BRAND }} />
                  {editTarget ? "Edit Strategy" : "New Strategy"}
                </h3>
                <button onClick={() => setShowForm(false)} className="text-neutral-400 hover:text-neutral-700"><X size={14} /></button>
              </div>
              <div className="p-5 space-y-3">
                <div>
                  <label className="block text-xs text-neutral-600 mb-1">Strategy Name *</label>
                  <input className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-xs focus:outline-none"
                    placeholder="e.g. FEFO Putaway" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-neutral-600 mb-1">Priority (1 = highest)</label>
                    <input type="number" min="1" max="99" className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-xs focus:outline-none"
                      value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-xs text-neutral-600 mb-1">Status</label>
                    <select className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-xs bg-white focus:outline-none"
                      value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                      <option>Active</option><option>Inactive</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-neutral-600 mb-1">Zone</label>
                  <select className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-xs bg-white focus:outline-none"
                    value={form.zone} onChange={e => setForm(f => ({ ...f, zone: e.target.value }))}>
                    {zones.map(z => <option key={z}>{z}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-neutral-600 mb-1">Rule Type</label>
                  <select className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-xs bg-white focus:outline-none"
                    value={form.rule_type} onChange={e => setForm(f => ({ ...f, rule_type: e.target.value }))}>
                    {rules.map(r => <option key={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-neutral-600 mb-1">Condition / Trigger</label>
                  <textarea className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-xs focus:outline-none resize-none" rows={3}
                    placeholder="Describe when this strategy applies..."
                    value={form.condition_text} onChange={e => setForm(f => ({ ...f, condition_text: e.target.value }))} />
                </div>
                {error && <p className="text-xs text-red-600">{error}</p>}
                <div className="flex gap-2 pt-1">
                  <button onClick={handleSave} disabled={createStrategy.isPending || updateStrategy.isPending}
                    className="flex-1 py-2 text-white rounded-lg text-xs hover:opacity-90 flex items-center justify-center gap-1.5 transition-opacity disabled:opacity-60"
                    style={{ background: BRAND }}>
                    {(createStrategy.isPending || updateStrategy.isPending) ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                    {editTarget ? "Save Changes" : "Create Strategy"}
                  </button>
                  <button onClick={() => setShowForm(false)}
                    className="flex-1 py-2 border border-neutral-200 text-neutral-700 rounded-lg text-xs hover:bg-neutral-50">Cancel</button>
                </div>
              </div>
            </div>
          ) : detail ? (
            <div className="bg-white rounded-xl border border-neutral-200">
              <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-neutral-900">{detail.name}</h3>
                <span className="px-2 py-0.5 rounded text-xs font-medium"
                  style={detail.status === "Active" ? { background: "#009FE320", color: BRAND } : { background: "#F3F4F6", color: "#9CA3AF" }}>
                  {detail.status}
                </span>
              </div>
              <div className="p-5 space-y-3">
                {[
                  ["Priority Level", detail.priority],
                  ["Target Zone", detail.zone || "—"],
                  ["Rule Type", detail.rule_type],
                  ["Usage Count", `${detail.usage_count} times`],
                ].map(([k, v]) => (
                  <div key={k as string} className="flex justify-between text-xs">
                    <span className="text-neutral-500">{k}</span>
                    <span className="text-neutral-900 font-medium">{v}</span>
                  </div>
                ))}
                <div>
                  <p className="text-xs text-neutral-500 mb-1">Condition / Trigger</p>
                  <p className="text-xs text-neutral-700 bg-neutral-50 rounded-lg px-3 py-2">{detail.condition_text || "—"}</p>
                </div>
                <div className="flex gap-2 pt-2">
                  <button onClick={() => openEdit(detail)}
                    className="flex-1 py-2 text-white rounded-lg text-xs hover:opacity-90 flex items-center justify-center gap-1.5 transition-opacity"
                    style={{ background: BRAND }}>
                    <Pencil size={11} /> Edit
                  </button>
                  <button onClick={() => toggleStatus(detail)}
                    className="flex-1 py-2 border border-neutral-200 text-neutral-700 rounded-lg text-xs hover:bg-neutral-50 flex items-center justify-center gap-1.5">
                    <ToggleLeft size={11} /> Toggle Status
                  </button>
                </div>
                <button onClick={() => handleDelete(detail.id)}
                  className="w-full py-2 border border-red-200 text-red-600 rounded-lg text-xs hover:bg-red-50 flex items-center justify-center gap-1.5 transition-colors">
                  <Trash2 size={11} /> Delete Strategy
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-neutral-200 p-8 text-center">
              <Route size={28} className="text-neutral-300 mx-auto mb-2" />
              <p className="text-xs text-neutral-400">Select a strategy to view details</p>
            </div>
          )}

          <div className="rounded-xl p-4 text-white" style={{ background: BRAND }}>
            <p className="text-xs font-semibold mb-1.5 flex items-center gap-2"><AlertCircle size={12} /> Strategy Evaluation Order</p>
            <p className="text-xs opacity-90 leading-relaxed">Strategies are evaluated in priority order (lowest number first). The Receive tab's suggested location uses the material's Assigned Location if one exists, otherwise the first active location — full rule-based routing is a later phase.</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PutawayStrategySection;
