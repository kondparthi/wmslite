import React, { useMemo, useState } from "react";
import {
  CalendarCheck, Plus, Search, Pencil, Trash2, Eye, X, Check, Clock,
  AlertCircle, Truck, Loader2,
} from "lucide-react";
import {
  useMasterDataList, useMasterDataCreate, useMasterDataUpdate, useMasterDataDelete,
} from "@/hooks/useMasterDataApi";

const BRAND = "#009FE3";
const APPTS_RESOURCE = "/operations/inbound-appointments";
const SUPPLIERS_RESOURCE = "/master-data/suppliers";
const ASNS_RESOURCE = "/operations/asns";

interface Appointment {
  id: number;
  supplier_id: number;
  asn_id: number | null;
  appt_date: string;
  dock_door: string | null;
  driver_name: string | null;
  vehicle_plate: string | null;
  status: string;
}
interface LookupRecord { id: number; name?: string; asn_number?: string; }

const statusStyle: Record<string, string> = {
  "Scheduled": "bg-sky-100 text-sky-700 border border-sky-200",
  "Confirmed": "bg-[#003A78] text-white",
  "Arrived": "bg-[#009FE3] text-white",
  "Completed": "bg-emerald-100 text-emerald-700 border border-emerald-200",
  "No Show": "bg-red-100 text-red-700 border border-red-200",
  "Cancelled": "bg-neutral-100 text-neutral-500 border border-neutral-200",
};
const docks = ["DOCK-01", "DOCK-02", "DOCK-03", "DOCK-04"];
const nextStatus: Record<string, string> = { "Scheduled": "Confirmed", "Confirmed": "Arrived", "Arrived": "Completed" };

const emptyForm = { supplier_id: "", asn_id: "", date: "", time: "", dock_door: "DOCK-01", driver_name: "", vehicle_plate: "" };

const InboundAppointmentSection = () => {
  const { data, isLoading } = useMasterDataList<Appointment>(APPTS_RESOURCE);
  const { data: suppliers = [] } = useMasterDataList<LookupRecord>(SUPPLIERS_RESOURCE);
  const { data: asns = [] } = useMasterDataList<LookupRecord>(ASNS_RESOURCE);
  const createAppt = useMasterDataCreate<Appointment>(APPTS_RESOURCE);
  const updateAppt = useMasterDataUpdate<Appointment>(APPTS_RESOURCE);
  const deleteAppt = useMasterDataDelete(APPTS_RESOURCE);
  const appointments = data ?? [];

  const supplierById = useMemo(() => new Map(suppliers.map(s => [s.id, s.name || ""])), [suppliers]);
  const asnById = useMemo(() => new Map(asns.map(a => [a.id, a.asn_number || ""])), [asns]);

  const [selected, setSelected] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Appointment | null>(null);
  const [filterStatus, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);

  const statuses = ["All", "Scheduled", "Confirmed", "Arrived", "Completed", "No Show"];
  const filtered = appointments.filter(a =>
    (filterStatus === "All" || a.status === filterStatus) &&
    (supplierById.get(a.supplier_id) || "").toLowerCase().includes(search.toLowerCase())
  );
  const detail = appointments.find(a => a.id === selected);

  const openNew = () => { setEditTarget(null); setForm(emptyForm); setError(null); setShowForm(true); };
  const openEdit = (a: Appointment) => {
    setEditTarget(a);
    const dt = new Date(a.appt_date);
    setForm({
      supplier_id: String(a.supplier_id), asn_id: a.asn_id ? String(a.asn_id) : "",
      date: dt.toISOString().slice(0, 10), time: dt.toISOString().slice(11, 16),
      dock_door: a.dock_door || "DOCK-01", driver_name: a.driver_name || "", vehicle_plate: a.vehicle_plate || "",
    });
    setError(null);
    setShowForm(true);
  };

  const handleSave = async () => {
    setError(null);
    if (!form.supplier_id || !form.date || !form.time) { setError("Supplier, date and time are required."); return; }
    const payload = {
      supplier_id: Number(form.supplier_id),
      asn_id: form.asn_id ? Number(form.asn_id) : null,
      appt_date: new Date(`${form.date}T${form.time}:00`).toISOString(),
      dock_door: form.dock_door,
      driver_name: form.driver_name || null,
      vehicle_plate: form.vehicle_plate || null,
    };
    try {
      if (editTarget) {
        await updateAppt.mutateAsync({ id: editTarget.id, payload });
      } else {
        await createAppt.mutateAsync({ ...payload, status: "Scheduled" });
      }
      setShowForm(false);
      setEditTarget(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save appointment.");
    }
  };

  const handleDelete = (id: number) => { deleteAppt.mutate(id); if (selected === id) setSelected(null); };
  const advance = (a: Appointment) => { const next = nextStatus[a.status]; if (next) updateAppt.mutate({ id: a.id, payload: { status: next } }); };

  const stats = {
    total: appointments.length,
    scheduled: appointments.filter(a => a.status === "Scheduled").length,
    confirmed: appointments.filter(a => a.status === "Confirmed").length,
    arrived: appointments.filter(a => a.status === "Arrived").length,
    completed: appointments.filter(a => a.status === "Completed").length,
  };

  return (
    <section className="space-y-4" id="inbound-appointment-section">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Total", value: stats.total, accent: true },
          { label: "Scheduled", value: stats.scheduled, color: "text-sky-600", bg: "bg-sky-50 border-sky-200" },
          { label: "Confirmed", value: stats.confirmed, color: "text-[#003A78]", bg: "bg-blue-50 border-blue-200" },
          { label: "Arrived", value: stats.arrived, color: "text-[#009FE3]", bg: "bg-cyan-50 border-cyan-200" },
          { label: "Completed", value: stats.completed, color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200" },
        ].map(({ label, value, accent, color, bg }) => (
          <div key={label} className={`rounded-xl px-5 py-4 border ${accent ? "bg-gradient-to-br from-[#003A78] to-[#005aaa] text-white border-[#003A78]" : `bg-white ${bg}`}`}>
            <p className={`text-2xl font-bold ${accent ? "text-white" : color}`}>{value}</p>
            <p className={`text-xs mt-0.5 ${accent ? "text-blue-200" : "text-neutral-500"}`}>{label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-xl border border-neutral-200 shadow-sm">
          <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-sm font-bold text-[#003A78] flex items-center gap-2">
              <CalendarCheck size={15} className="text-[#009FE3]" /> Inbound Appointments
            </h2>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 border border-neutral-200 rounded-lg px-3 py-1.5 bg-white">
                <Search size={12} className="text-[#009FE3]" />
                <input className="bg-transparent text-xs text-neutral-700 placeholder-neutral-400 focus:outline-none w-28"
                  placeholder="Search supplier..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <button onClick={openNew}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-white font-semibold transition-all"
                style={{ background: "linear-gradient(135deg, #009FE3 0%, #003A78 100%)" }}>
                <Plus size={12} /> New Appointment
              </button>
            </div>
          </div>

          <div className="px-5 py-2.5 border-b border-neutral-100 flex items-center gap-2 flex-wrap bg-neutral-50/50">
            {statuses.map(s => (
              <button key={s} onClick={() => setFilter(s)}
                className={`text-xs px-3 py-1 rounded-full font-medium transition-all ${filterStatus === s ? "text-white" : "border border-neutral-200 text-neutral-600 bg-white"}`}
                style={filterStatus === s ? { background: "linear-gradient(135deg, #009FE3 0%, #003A78 100%)" } : {}}>
                {s}
              </button>
            ))}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-neutral-100" style={{ background: "linear-gradient(135deg, #f0f7ff 0%, #e8f4fd 100%)" }}>
                  <th className="text-left py-2.5 px-3 text-[#003A78] font-semibold">Supplier</th>
                  <th className="text-left py-2.5 px-3 text-[#003A78] font-semibold">ASN</th>
                  <th className="text-left py-2.5 px-3 text-[#003A78] font-semibold">Date / Time</th>
                  <th className="text-left py-2.5 px-3 text-[#003A78] font-semibold">Dock</th>
                  <th className="text-left py-2.5 px-3 text-[#003A78] font-semibold">Driver</th>
                  <th className="text-left py-2.5 px-3 text-[#003A78] font-semibold">Status</th>
                  <th className="text-left py-2.5 px-3 text-[#003A78] font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50">
                {isLoading ? (
                  <tr><td colSpan={7} className="text-center py-8 text-neutral-400"><Loader2 className="h-4 w-4 animate-spin inline mr-2" />Loading appointments...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-8 text-neutral-400">No appointments found.</td></tr>
                ) : filtered.map(a => (
                  <tr key={a.id}
                    className={`cursor-pointer transition-colors ${selected === a.id ? "bg-sky-50 border-l-2 border-l-[#009FE3]" : "hover:bg-neutral-50/70"}`}
                    onClick={() => setSelected(a.id)}>
                    <td className="py-2.5 px-3 text-neutral-700 font-medium">{supplierById.get(a.supplier_id) || `#${a.supplier_id}`}</td>
                    <td className="py-2.5 px-3 text-neutral-600">{a.asn_id ? (asnById.get(a.asn_id) || `#${a.asn_id}`) : "—"}</td>
                    <td className="py-2.5 px-3">
                      <span className="flex items-center gap-1 text-[#009FE3] font-semibold"><Clock size={10} />{new Date(a.appt_date).toLocaleString()}</span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="flex items-center gap-1 text-[#003A78] font-medium"><Truck size={10} className="text-[#009FE3]" />{a.dock_door || "—"}</span>
                    </td>
                    <td className="py-2.5 px-3 text-neutral-600">{a.driver_name || "—"}</td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusStyle[a.status]}`}>{a.status}</span>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-1.5">
                        <button onClick={e => { e.stopPropagation(); setSelected(a.id); }}
                          className="p-1 rounded text-neutral-400 hover:text-[#009FE3]"><Eye size={12} /></button>
                        <button onClick={e => { e.stopPropagation(); openEdit(a); }}
                          className="p-1 rounded text-neutral-400 hover:text-[#003A78]"><Pencil size={12} /></button>
                        <button onClick={e => { e.stopPropagation(); handleDelete(a.id); }}
                          className="p-1 rounded text-neutral-400 hover:text-red-600"><Trash2 size={12} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3 border-t border-neutral-100 flex items-center justify-between bg-neutral-50/50">
            <span className="text-xs text-neutral-400">Showing {filtered.length} of {appointments.length} appointments</span>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {showForm ? (
            <div className="bg-white rounded-xl border border-[#009FE3]/30 shadow-md overflow-hidden">
              <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between" style={{ background: "linear-gradient(135deg, #003A78 0%, #005aaa 100%)" }}>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Plus size={13} className="text-[#009FE3]" /> {editTarget ? "Edit Appointment" : "New Appointment"}
                </h3>
                <button onClick={() => setShowForm(false)} className="text-blue-200 hover:text-white"><X size={14} /></button>
              </div>
              <div className="p-5 space-y-3">
                <div>
                  <label className="block text-xs font-medium text-[#003A78] mb-1">Supplier *</label>
                  <select className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-xs bg-white focus:outline-none"
                    value={form.supplier_id} onChange={e => setForm(f => ({ ...f, supplier_id: e.target.value }))}>
                    <option value="">Select supplier...</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#003A78] mb-1">ASN Reference</label>
                  <select className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-xs bg-white focus:outline-none"
                    value={form.asn_id} onChange={e => setForm(f => ({ ...f, asn_id: e.target.value }))}>
                    <option value="">None</option>
                    {asns.map(a => <option key={a.id} value={a.id}>{a.asn_number}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-[#003A78] mb-1">Date *</label>
                    <input type="date" className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-xs focus:outline-none"
                      value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#003A78] mb-1">Time *</label>
                    <input type="time" className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-xs focus:outline-none"
                      value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#003A78] mb-1">Dock Door</label>
                  <select className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-xs bg-white focus:outline-none"
                    value={form.dock_door} onChange={e => setForm(f => ({ ...f, dock_door: e.target.value }))}>
                    {docks.map(d => <option key={d}>{d}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-[#003A78] mb-1">Driver Name</label>
                    <input className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-xs focus:outline-none"
                      placeholder="Driver..." value={form.driver_name} onChange={e => setForm(f => ({ ...f, driver_name: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#003A78] mb-1">Vehicle Plate</label>
                    <input className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-xs focus:outline-none"
                      placeholder="Plate #" value={form.vehicle_plate} onChange={e => setForm(f => ({ ...f, vehicle_plate: e.target.value }))} />
                  </div>
                </div>
                {error && <p className="text-xs text-red-600">{error}</p>}
                <div className="flex gap-2 pt-1">
                  <button onClick={handleSave} disabled={createAppt.isPending || updateAppt.isPending}
                    className="flex-1 py-2 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-60"
                    style={{ background: "linear-gradient(135deg, #009FE3 0%, #003A78 100%)" }}>
                    {(createAppt.isPending || updateAppt.isPending) ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                    {editTarget ? "Save Changes" : "Create Appointment"}
                  </button>
                  <button onClick={() => setShowForm(false)} className="flex-1 py-2 border border-neutral-200 text-neutral-700 rounded-lg text-xs hover:bg-neutral-50">Cancel</button>
                </div>
              </div>
            </div>
          ) : detail ? (
            <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between" style={{ background: "linear-gradient(135deg, #003A78 0%, #005aaa 100%)" }}>
                <div>
                  <p className="text-xs text-blue-200 mb-0.5">Appointment Details</p>
                  <h3 className="text-sm font-bold text-white">{supplierById.get(detail.supplier_id) || `#${detail.supplier_id}`}</h3>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusStyle[detail.status]}`}>{detail.status}</span>
              </div>
              <div className="p-5 space-y-3">
                {[
                  ["ASN Ref", detail.asn_id ? (asnById.get(detail.asn_id) || `#${detail.asn_id}`) : "—"],
                  ["Date / Time", new Date(detail.appt_date).toLocaleString()],
                  ["Dock Door", detail.dock_door || "—"],
                  ["Driver", detail.driver_name || "—"],
                  ["Vehicle", detail.vehicle_plate || "—"],
                ].map(([k, v]) => (
                  <div key={k as string} className="flex justify-between text-xs py-1 border-b border-neutral-50 last:border-0">
                    <span className="text-neutral-500 font-medium">{k}</span>
                    <span className="text-[#003A78] font-semibold">{v}</span>
                  </div>
                ))}
                <div className="space-y-2 pt-2">
                  {nextStatus[detail.status] && (
                    <button onClick={() => advance(detail)} disabled={updateAppt.isPending}
                      className="w-full py-2 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
                      style={{ background: "linear-gradient(135deg, #009FE3 0%, #003A78 100%)" }}>
                      <Check size={12} /> Mark as {nextStatus[detail.status]}
                    </button>
                  )}
                  <button onClick={() => openEdit(detail)}
                    className="w-full py-2 border border-[#009FE3]/40 text-[#003A78] rounded-lg text-xs font-medium hover:bg-sky-50 flex items-center justify-center gap-2">
                    <Pencil size={11} /> Edit Appointment
                  </button>
                  <button onClick={() => handleDelete(detail.id)}
                    className="w-full py-2 border border-red-200 text-red-600 rounded-lg text-xs hover:bg-red-50 flex items-center justify-center gap-2">
                    <Trash2 size={11} /> Cancel Appointment
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-neutral-200 p-8 text-center">
              <CalendarCheck size={28} className="text-neutral-300 mx-auto mb-2" />
              <p className="text-xs text-neutral-400">Select an appointment to view details</p>
            </div>
          )}

          <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-neutral-100" style={{ background: "linear-gradient(135deg, #f0f7ff 0%, #e8f4fd 100%)" }}>
              <p className="text-xs font-bold text-[#003A78] flex items-center gap-1.5"><Truck size={12} className="text-[#009FE3]" /> Dock Availability — Today</p>
            </div>
            <div className="p-4 space-y-1">
              {docks.map(dock => {
                const apts = appointments.filter(a => a.dock_door === dock && a.status !== "Completed" && a.status !== "Cancelled" && a.status !== "No Show");
                const busy = apts.length > 0;
                return (
                  <div key={dock} className="flex items-center justify-between py-2 border-b border-neutral-50 last:border-0">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${busy ? "bg-[#009FE3]" : "bg-emerald-400"}`} />
                      <span className="text-xs font-semibold text-[#003A78]">{dock}</span>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${busy ? "bg-sky-100 text-[#009FE3]" : "bg-emerald-100 text-emerald-600"}`}>
                      {busy ? `${apts.length} busy` : "Free"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {appointments.some(a => a.status === "No Show") && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex gap-3">
              <AlertCircle size={15} className="text-red-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-bold text-red-700">No Show Alert</p>
                <p className="text-xs text-red-600 mt-0.5">{appointments.filter(a => a.status === "No Show").length} appointment(s) marked No Show.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default InboundAppointmentSection;
