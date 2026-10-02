import React, { useMemo, useState } from "react";
import {
  Package, Search, MapPin, CheckCircle2, AlertCircle, Eye, Play, Loader2,
} from "lucide-react";
import { useMasterDataList } from "@/hooks/useMasterDataApi";
import { usePutawayTasks, useStartPutawayTask, useConfirmPutawayTask } from "@/hooks/useInboundOpsApi";

const BRAND = "#009FE3";
const MATERIALS_RESOURCE = "/master-data/materials";
const LOCATIONS_RESOURCE = "/master-data/locations";

interface MaterialRecord { id: number; sku: string; }
interface LocationRecord { id: number; code: string; }

const statusStyle: Record<string, { bg: string; color: string }> = {
  "Pending": { bg: "#F9FAFB", color: "#6B7280" },
  "In Progress": { bg: "#EFF6FF", color: "#3B82F6" },
  "Completed": { bg: "#ECFDF5", color: "#10B981" },
};
const priorityStyle: Record<string, string> = {
  "High": "bg-red-50 text-red-600",
  "Medium": "bg-amber-50 text-amber-600",
  "Low": "bg-emerald-50 text-emerald-700",
};

const PutawayByWebUISection = () => {
  const { data: tasks = [], isLoading } = usePutawayTasks();
  const { data: materials = [] } = useMasterDataList<MaterialRecord>(MATERIALS_RESOURCE);
  const { data: locations = [] } = useMasterDataList<LocationRecord>(LOCATIONS_RESOURCE);
  const startTask = useStartPutawayTask();
  const confirmTask = useConfirmPutawayTask();

  const materialById = useMemo(() => new Map(materials.map(m => [m.id, m.sku])), [materials]);
  const locationById = useMemo(() => new Map(locations.map(l => [l.id, l.code])), [locations]);

  const [selected, setSelected] = useState<number | null>(null);
  const [filterStatus, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [confirmLoc, setConfirmLoc] = useState("");
  const [error, setError] = useState<string | null>(null);

  const statuses = ["All", "Pending", "In Progress", "Completed"];
  const filtered = tasks.filter(t => {
    const sku = materialById.get(t.material_id) || "";
    return (filterStatus === "All" || t.status === filterStatus) &&
      (sku.toLowerCase().includes(search.toLowerCase()) || String(t.id).includes(search));
  });
  const detail = tasks.find(t => t.id === selected);

  const stats = {
    total: tasks.length,
    pending: tasks.filter(t => t.status === "Pending").length,
    inProgress: tasks.filter(t => t.status === "In Progress").length,
    completed: tasks.filter(t => t.status === "Completed").length,
  };

  const handleStart = (id: number) => {
    startTask.mutate(id);
    setSelected(id);
  };

  const handleConfirm = async () => {
    if (!detail) return;
    setError(null);
    const locId = confirmLoc ? Number(confirmLoc) : detail.suggested_location_id;
    if (!locId) { setError("Choose a location to confirm putaway."); return; }
    try {
      await confirmTask.mutateAsync({ id: detail.id, location_id: locId });
      setConfirmLoc("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not confirm putaway.");
    }
  };

  return (
    <section className="space-y-4" id="putaway-webui-section">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Tasks", value: stats.total, bg: BRAND, color: "#fff" },
          { label: "Pending", value: stats.pending, bg: "#F9FAFB", color: "#374151" },
          { label: "In Progress", value: stats.inProgress, bg: "#EFF6FF", color: "#3B82F6" },
          { label: "Completed", value: stats.completed, bg: "#ECFDF5", color: "#10B981" },
        ].map(({ label, value, bg, color }) => (
          <div key={label} className="rounded-xl px-5 py-4 border border-neutral-100" style={{ background: bg }}>
            <p className="text-xl font-bold" style={{ color }}>{value}</p>
            <p className="text-xs mt-0.5" style={{ color, opacity: 0.75 }}>{label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-xl border border-neutral-200">
          <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-sm font-semibold text-neutral-900 flex items-center gap-2">
              <Package size={14} style={{ color: BRAND }} /> Putaway Task Queue
            </h2>
            <div className="flex items-center gap-1.5 border border-neutral-200 rounded-lg px-3 py-1.5 bg-neutral-50">
              <Search size={12} className="text-neutral-400" />
              <input className="bg-transparent text-xs text-neutral-700 placeholder-neutral-400 focus:outline-none w-28"
                placeholder="Search task / SKU..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>

          <div className="px-5 py-2.5 border-b border-neutral-100 flex items-center gap-2 flex-wrap">
            {statuses.map(s => (
              <button key={s} onClick={() => setFilter(s)}
                className="text-xs px-3 py-1 rounded-full transition-all border"
                style={filterStatus === s ? { background: BRAND, color: "#fff", borderColor: BRAND } : { borderColor: "#E5E7EB", color: "#6B7280" }}>
                {s}
              </button>
            ))}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-100">
                  <th className="text-left py-2.5 px-3 text-neutral-500">Task ID</th>
                  <th className="text-left py-2.5 px-3 text-neutral-500">SKU</th>
                  <th className="text-left py-2.5 px-3 text-neutral-500">Qty</th>
                  <th className="text-left py-2.5 px-3 text-neutral-500">Suggested To</th>
                  <th className="text-left py-2.5 px-3 text-neutral-500">Priority</th>
                  <th className="text-left py-2.5 px-3 text-neutral-500">Status</th>
                  <th className="text-left py-2.5 px-3 text-neutral-500">Act.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50">
                {isLoading ? (
                  <tr><td colSpan={7} className="text-center py-8 text-neutral-400"><Loader2 className="h-4 w-4 animate-spin inline mr-2" />Loading tasks...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-8 text-neutral-400">No putaway tasks.</td></tr>
                ) : filtered.map(t => {
                  const st = statusStyle[t.status];
                  return (
                    <tr key={t.id}
                      className={`hover:bg-blue-50/20 cursor-pointer transition-colors ${selected === t.id ? "bg-blue-50/40" : ""}`}
                      style={selected === t.id ? { borderLeft: `3px solid ${BRAND}` } : {}}
                      onClick={() => setSelected(t.id)}>
                      <td className="py-2.5 px-3 font-medium text-neutral-900">PUT-{t.id}</td>
                      <td className="py-2.5 px-3 text-neutral-600">{materialById.get(t.material_id) || `#${t.material_id}`}</td>
                      <td className="py-2.5 px-3 font-medium text-neutral-900">{t.qty}</td>
                      <td className="py-2.5 px-3">
                        <span className="flex items-center gap-1 font-medium" style={{ color: BRAND }}>
                          <MapPin size={10} />{t.suggested_location_id ? (locationById.get(t.suggested_location_id) || `#${t.suggested_location_id}`) : "—"}
                        </span>
                      </td>
                      <td className="py-2.5 px-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${priorityStyle[t.priority]}`}>{t.priority}</span></td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded text-xs font-medium" style={{ background: st.bg, color: st.color }}>{t.status}</span>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5">
                          <button onClick={e => { e.stopPropagation(); setSelected(t.id); }}
                            className="text-neutral-400 hover:text-[#009FE3] transition-colors"><Eye size={12} /></button>
                          {t.status === "Pending" && (
                            <button onClick={e => { e.stopPropagation(); handleStart(t.id); }}
                              className="hover:text-[#009FE3] transition-colors text-neutral-400"><Play size={12} /></button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3 border-t border-neutral-100 flex items-center justify-between">
            <span className="text-xs text-neutral-400">Showing {filtered.length} of {tasks.length} tasks</span>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {detail ? (
            <div className="bg-white rounded-xl border border-neutral-200">
              <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-neutral-900">PUT-{detail.id}</h3>
                <span className="px-2 py-0.5 rounded text-xs font-medium"
                  style={{ background: statusStyle[detail.status].bg, color: statusStyle[detail.status].color }}>
                  {detail.status}
                </span>
              </div>
              <div className="p-5 space-y-3">
                {[
                  ["SKU", materialById.get(detail.material_id) || `#${detail.material_id}`],
                  ["Quantity", detail.qty],
                  ["Assignee", detail.assignee || "Unassigned"],
                ].map(([k, v]) => (
                  <div key={k as string} className="flex justify-between text-xs">
                    <span className="text-neutral-500">{k}</span>
                    <span className="text-neutral-900 font-medium">{v}</span>
                  </div>
                ))}

                <div className="rounded-lg p-3 space-y-2" style={{ background: "#009FE308" }}>
                  <p className="text-xs font-medium" style={{ color: BRAND }}>Suggested Location</p>
                  <div className="flex items-center gap-2">
                    <MapPin size={12} style={{ color: BRAND }} />
                    <span className="text-sm font-bold text-neutral-900">
                      {detail.suggested_location_id ? (locationById.get(detail.suggested_location_id) || `#${detail.suggested_location_id}`) : "—"}
                    </span>
                  </div>
                </div>

                {detail.status !== "Completed" ? (
                  <>
                    <div>
                      <label className="block text-xs text-neutral-600 mb-1">Confirm / Override Location</label>
                      <select className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-xs bg-white focus:outline-none"
                        value={confirmLoc} onChange={e => setConfirmLoc(e.target.value)}>
                        <option value="">
                          {detail.suggested_location_id ? `Use suggested (${locationById.get(detail.suggested_location_id)})` : "Select location..."}
                        </option>
                        {locations.map(l => <option key={l.id} value={l.id}>{l.code}</option>)}
                      </select>
                    </div>
                    {error && <p className="text-xs text-red-600">{error}</p>}
                    <button onClick={handleConfirm} disabled={confirmTask.isPending}
                      className="w-full py-2.5 text-white rounded-lg text-xs hover:opacity-90 flex items-center justify-center gap-2 transition-opacity font-medium disabled:opacity-60"
                      style={{ background: BRAND }}>
                      {confirmTask.isPending ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />} Confirm Putaway
                    </button>
                  </>
                ) : (
                  <div className="flex items-center gap-2 py-2.5 rounded-lg justify-center text-xs font-medium"
                    style={{ background: "#ECFDF5", color: "#10B981" }}>
                    <CheckCircle2 size={13} /> Putaway Completed — {detail.confirmed_location_id ? locationById.get(detail.confirmed_location_id) : ""}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-neutral-200 p-8 text-center">
              <Package size={28} className="text-neutral-300 mx-auto mb-2" />
              <p className="text-xs text-neutral-400">Select a task to view details</p>
            </div>
          )}

          <div className="bg-white rounded-xl border border-neutral-200 p-4">
            <p className="text-xs font-semibold text-neutral-700 mb-3">Today's Progress</p>
            <div className="space-y-2.5">
              {[
                { label: "Completion Rate", val: stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0, color: "#10B981" },
                { label: "In Progress", val: stats.total > 0 ? Math.round((stats.inProgress / stats.total) * 100) : 0, color: BRAND },
              ].map(({ label, val, color }) => (
                <div key={label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-neutral-600">{label}</span>
                    <span className="font-medium text-neutral-900">{val}%</span>
                  </div>
                  <div className="w-full bg-neutral-100 rounded-full h-1.5">
                    <div className="h-1.5 rounded-full transition-all" style={{ width: `${val}%`, background: color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {stats.pending > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
              <AlertCircle size={15} className="text-amber-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-semibold text-amber-700">{stats.pending} Pending Putaway Task(s)</p>
                <p className="text-xs text-amber-600 mt-0.5">Received goods are waiting at the dock — confirm a location to bring them into stock.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default PutawayByWebUISection;
