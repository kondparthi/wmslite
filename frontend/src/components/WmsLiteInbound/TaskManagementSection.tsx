import React, { useMemo, useState } from "react";
import {
  ClipboardList, Plus, Search, Eye, Pencil, Trash2, User, AlertCircle,
  CheckCircle2, Clock, X, Check, Loader2,
} from "lucide-react";
import {
  useMasterDataList, useMasterDataCreate, useMasterDataUpdate, useMasterDataDelete,
} from "@/hooks/useMasterDataApi";

const BRAND = "#009FE3";
const TASKS_RESOURCE = "/operations/inbound-tasks";
const ASNS_RESOURCE = "/operations/asns";

interface InboundTask {
  id: number;
  task_type: string;
  asn_id: number | null;
  assignee: string | null;
  zone: string | null;
  priority: string;
  status: string;
  due_at: string | null;
  notes: string | null;
}
interface AsnRecord { id: number; asn_number: string; }

const priorityStyle: Record<string, string> = {
  "High": "bg-red-50 text-red-600",
  "Medium": "bg-amber-50 text-amber-600",
  "Low": "bg-emerald-50 text-emerald-700",
};
const taskTypes = ["Receive", "Putaway", "QC Check", "Count", "Move"];
const nextStatus: Record<string, string> = { "Pending": "In Progress", "In Progress": "Completed" };

const emptyForm = { task_type: "Receive", asn_id: "", assignee: "", zone: "Dock-01", priority: "Medium", due_at: "", notes: "" };

const isOverdue = (t: InboundTask) => t.status !== "Completed" && t.due_at && new Date(t.due_at) < new Date();

const TaskManagementSection = () => {
  const { data, isLoading } = useMasterDataList<InboundTask>(TASKS_RESOURCE);
  const { data: asns = [] } = useMasterDataList<AsnRecord>(ASNS_RESOURCE);
  const createTask = useMasterDataCreate<InboundTask>(TASKS_RESOURCE);
  const updateTask = useMasterDataUpdate<InboundTask>(TASKS_RESOURCE);
  const deleteTask = useMasterDataDelete(TASKS_RESOURCE);
  const tasks = data ?? [];

  const asnById = useMemo(() => new Map(asns.map(a => [a.id, a.asn_number])), [asns]);

  const [showForm, setShowForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState("All");
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);

  const statuses = ["All", "In Progress", "Pending", "Completed", "Overdue"];
  const filtered = filterStatus === "All" ? tasks
    : filterStatus === "Overdue" ? tasks.filter(isOverdue)
    : tasks.filter(t => t.status === filterStatus && !isOverdue(t));

  const stats = {
    total: tasks.length,
    inProgress: tasks.filter(t => t.status === "In Progress").length,
    completed: tasks.filter(t => t.status === "Completed").length,
    overdue: tasks.filter(isOverdue).length,
  };

  const workload = useMemo(() => {
    const byAssignee = new Map<string, { tasks: number; done: number }>();
    tasks.forEach(t => {
      const name = t.assignee || "Unassigned";
      const entry = byAssignee.get(name) || { tasks: 0, done: 0 };
      entry.tasks += 1;
      if (t.status === "Completed") entry.done += 1;
      byAssignee.set(name, entry);
    });
    return Array.from(byAssignee.entries()).map(([name, v]) => ({ name, ...v }));
  }, [tasks]);

  const handleCreate = async () => {
    setError(null);
    if (!form.assignee) { setError("Assignee is required."); return; }
    try {
      await createTask.mutateAsync({
        task_type: form.task_type,
        asn_id: form.asn_id ? Number(form.asn_id) : null,
        assignee: form.assignee,
        zone: form.zone,
        priority: form.priority,
        status: "Pending",
        due_at: form.due_at ? new Date(form.due_at).toISOString() : null,
        notes: form.notes || null,
      });
      setForm(emptyForm);
      setShowForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create task.");
    }
  };

  const advance = (t: InboundTask) => { const next = nextStatus[t.status]; if (next) updateTask.mutate({ id: t.id, payload: { status: next } }); };
  const handleDelete = (id: number) => deleteTask.mutate(id);

  return (
    <section className="space-y-4" id="task-section">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Tasks", value: stats.total, icon: ClipboardList, color: "#009FE3" },
          { label: "In Progress", value: stats.inProgress, icon: Clock, color: "#F59E0B" },
          { label: "Completed", value: stats.completed, icon: CheckCircle2, color: "#10B981" },
          { label: "Overdue", value: stats.overdue, icon: AlertCircle, color: "#EF4444" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl border border-neutral-200 p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${color}18` }}>
              <Icon size={16} style={{ color }} />
            </div>
            <div>
              <p className="text-xl font-bold text-neutral-900">{value}</p>
              <p className="text-xs text-neutral-500">{label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-xl border border-neutral-200">
          <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-sm font-semibold text-neutral-900 flex items-center gap-2">
              <ClipboardList size={14} className="text-[#009FE3]" /> Inbound Task Queue
            </h2>
            <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-white rounded-lg text-xs hover:opacity-90" style={{ background: "#009FE3" }}>
              <Plus size={12} /> New Task
            </button>
          </div>
          <div className="px-5 py-2.5 border-b border-neutral-100 flex items-center gap-2 flex-wrap">
            {statuses.map(s => (
              <button key={s} onClick={() => setFilterStatus(s)}
                className={`text-xs px-3 py-1 rounded-full transition-all ${filterStatus === s ? "text-white" : "border border-neutral-200 text-neutral-600 hover:bg-neutral-50"}`}
                style={filterStatus === s ? { background: "#009FE3" } : {}}>{s}</button>
            ))}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-100">
                  <th className="text-left py-2.5 px-3 text-neutral-500">Type</th>
                  <th className="text-left py-2.5 px-3 text-neutral-500">ASN Ref</th>
                  <th className="text-left py-2.5 px-3 text-neutral-500">Assignee</th>
                  <th className="text-left py-2.5 px-3 text-neutral-500">Zone</th>
                  <th className="text-left py-2.5 px-3 text-neutral-500">Priority</th>
                  <th className="text-left py-2.5 px-3 text-neutral-500">Due</th>
                  <th className="text-left py-2.5 px-3 text-neutral-500">Status</th>
                  <th className="text-left py-2.5 px-3 text-neutral-500">Act.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50">
                {isLoading ? (
                  <tr><td colSpan={8} className="text-center py-8 text-neutral-400"><Loader2 className="h-4 w-4 animate-spin inline mr-2" />Loading tasks...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-8 text-neutral-400">No tasks found.</td></tr>
                ) : filtered.map(t => {
                  const overdue = isOverdue(t);
                  return (
                    <tr key={t.id} className="hover:bg-blue-50/20 transition-colors">
                      <td className="py-2.5 px-3 text-neutral-700">{t.task_type}</td>
                      <td className="py-2.5 px-3 text-neutral-600">{t.asn_id ? (asnById.get(t.asn_id) || `#${t.asn_id}`) : "—"}</td>
                      <td className="py-2.5 px-3">
                        <span className={`flex items-center gap-1 ${t.assignee === "Unassigned" || !t.assignee ? "text-red-500" : "text-neutral-700"}`}>
                          <User size={10} />{t.assignee || "Unassigned"}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-neutral-600">{t.zone || "—"}</td>
                      <td className="py-2.5 px-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${priorityStyle[t.priority]}`}>{t.priority}</span></td>
                      <td className="py-2.5 px-3 text-neutral-600">{t.due_at ? new Date(t.due_at).toLocaleString() : "—"}</td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${overdue ? "bg-red-50 text-red-700" : t.status === "Completed" ? "bg-emerald-50 text-emerald-700" : t.status === "In Progress" ? "bg-blue-50 text-blue-700" : "bg-amber-50 text-amber-700"}`}>
                          {overdue ? "Overdue" : t.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex gap-1.5 items-center">
                          {nextStatus[t.status] && (
                            <button onClick={() => advance(t)} title={`Mark ${nextStatus[t.status]}`} className="text-neutral-400 hover:text-[#009FE3]"><Check size={12} /></button>
                          )}
                          <button onClick={() => handleDelete(t.id)} className="text-neutral-400 hover:text-red-500"><Trash2 size={12} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3 border-t border-neutral-100 flex items-center justify-between">
            <span className="text-xs text-neutral-400">Showing {filtered.length} tasks</span>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {showForm ? (
            <div className="bg-white rounded-xl border border-neutral-200">
              <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-neutral-900">Create Task</h3>
                <button onClick={() => setShowForm(false)} className="text-neutral-400 hover:text-neutral-600"><X size={14} /></button>
              </div>
              <div className="p-5 space-y-3">
                <div>
                  <label className="block text-xs text-neutral-600 mb-1">Task Type *</label>
                  <select className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-xs bg-white focus:outline-none"
                    value={form.task_type} onChange={e => setForm(f => ({ ...f, task_type: e.target.value }))}>
                    {taskTypes.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-neutral-600 mb-1">ASN Reference</label>
                  <select className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-xs bg-white focus:outline-none"
                    value={form.asn_id} onChange={e => setForm(f => ({ ...f, asn_id: e.target.value }))}>
                    <option value="">— None —</option>
                    {asns.map(a => <option key={a.id} value={a.id}>{a.asn_number}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-neutral-600 mb-1">Assign To *</label>
                  <input className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-xs focus:outline-none"
                    placeholder="Worker name..." value={form.assignee} onChange={e => setForm(f => ({ ...f, assignee: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs text-neutral-600 mb-1">Zone / Location</label>
                  <input className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-xs focus:outline-none"
                    placeholder="e.g. Dock-01" value={form.zone} onChange={e => setForm(f => ({ ...f, zone: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-neutral-600 mb-1">Priority</label>
                    <select className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-xs bg-white focus:outline-none"
                      value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                      <option>High</option><option>Medium</option><option>Low</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-neutral-600 mb-1">Due Date/Time</label>
                    <input type="datetime-local" className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-xs focus:outline-none"
                      value={form.due_at} onChange={e => setForm(f => ({ ...f, due_at: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-neutral-600 mb-1">Instructions</label>
                  <textarea className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-xs focus:outline-none resize-none" rows={2}
                    placeholder="Task instructions..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
                </div>
                {error && <p className="text-xs text-red-600">{error}</p>}
                <div className="flex gap-2 pt-1">
                  <button onClick={handleCreate} disabled={createTask.isPending}
                    className="flex-1 py-2 text-white rounded-lg text-xs flex items-center justify-center gap-1.5 hover:opacity-90 disabled:opacity-60" style={{ background: "#009FE3" }}>
                    {createTask.isPending ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Create Task
                  </button>
                  <button onClick={() => setShowForm(false)} className="flex-1 py-2 border border-neutral-200 text-neutral-700 rounded-lg text-xs hover:bg-neutral-50">Cancel</button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-neutral-200">
              <div className="px-5 py-4 border-b border-neutral-100">
                <h3 className="text-sm font-semibold text-neutral-900">Team Workload</h3>
              </div>
              <div className="p-4 space-y-3">
                {workload.length === 0 ? (
                  <p className="text-xs text-neutral-400 text-center py-4">No tasks assigned yet.</p>
                ) : workload.map(w => (
                  <div key={w.name}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-neutral-700 font-medium">{w.name}</span>
                      <span className="text-neutral-500">{w.done}/{w.tasks} done</span>
                    </div>
                    <div className="w-full bg-neutral-100 rounded-full h-1.5">
                      <div className="h-1.5 rounded-full transition-all" style={{ width: `${w.tasks > 0 ? (w.done / w.tasks) * 100 : 0}%`, background: BRAND }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {stats.overdue > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex gap-3">
              <AlertCircle size={15} className="text-red-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-semibold text-red-700">{stats.overdue} Overdue Task(s)</p>
                <p className="text-xs text-red-600 mt-0.5">These tasks are past their due time and need attention.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default TaskManagementSection;
