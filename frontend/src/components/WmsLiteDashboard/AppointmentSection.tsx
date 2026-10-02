import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, Plus, ChevronRight, Truck, ArrowDownToLine, Clock, CheckCircle2, AlertCircle, Ban } from "lucide-react";
import { useMasterDataList } from "@/hooks/useMasterDataApi";

// Real appointment schedule — sourced from Inbound's own Appointment tab
// (/operations/inbound-appointments), joined with ASN for a reference
// number and Supplier for a name. Only Inbound appointments exist so far
// (Outbound and Cross Dock have no appointment concept yet since those
// modules aren't built), so this section shows Inbound only rather than
// inventing the other types.

interface AppointmentRecord {
  id: number;
  supplier_id: number;
  asn_id: number | null;
  appt_date: string;
  dock_door: string | null;
  driver_name: string | null;
  vehicle_plate: string | null;
  status: string;
}
interface AsnRecord { id: number; asn_number: string; }
interface SupplierRecord { id: number; name: string; }

const statusMeta: Record<string, { icon: typeof Clock; badgeClass: string; actionClass: string }> = {
  Scheduled: { icon: CalendarDays, badgeClass: "bg-neutral-100 text-neutral-600", actionClass: "bg-neutral-700 text-white hover:bg-neutral-800" },
  Confirmed: { icon: Clock, badgeClass: "bg-blue-100 text-blue-700", actionClass: "bg-blue-600 text-white hover:bg-blue-700" },
  Arrived: { icon: Truck, badgeClass: "bg-violet-100 text-violet-700", actionClass: "bg-violet-600 text-white hover:bg-violet-700" },
  Completed: { icon: CheckCircle2, badgeClass: "bg-emerald-100 text-emerald-700", actionClass: "bg-emerald-600 text-white hover:bg-emerald-700" },
  "No Show": { icon: AlertCircle, badgeClass: "bg-red-100 text-red-700", actionClass: "bg-red-600 text-white hover:bg-red-700" },
  Cancelled: { icon: Ban, badgeClass: "bg-neutral-100 text-neutral-400", actionClass: "bg-neutral-400 text-white" },
};

const AppointmentSection = () => {
  const { data: appointments = [], isLoading } = useMasterDataList<AppointmentRecord>("/operations/inbound-appointments");
  const { data: asns = [] } = useMasterDataList<AsnRecord>("/operations/asns");
  const { data: suppliers = [] } = useMasterDataList<SupplierRecord>("/master-data/suppliers");
  const [statusFilter, setStatusFilter] = useState("All");

  const asnById = useMemo(() => new Map(asns.map(a => [a.id, a.asn_number])), [asns]);
  const supplierById = useMemo(() => new Map(suppliers.map(s => [s.id, s.name])), [suppliers]);

  const sorted = useMemo(
    () => [...appointments].sort((a, b) => new Date(a.appt_date).getTime() - new Date(b.appt_date).getTime()),
    [appointments]
  );
  const statusOrder = useMemo(() => ["All", ...Array.from(new Set(sorted.map(a => a.status)))], [sorted]);
  const visible = statusFilter === "All" ? sorted : sorted.filter(a => a.status === statusFilter);

  return (
    <section className="bg-white rounded-2xl border border-neutral-100 p-5 shadow-sm" id="appointment-section">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h2 className="text-sm font-semibold text-neutral-900 flex items-center gap-2">
            <div className="w-6 h-6 bg-neutral-100 rounded-lg flex items-center justify-center">
              <CalendarDays className="w-3.5 h-3.5 text-neutral-700" />
            </div>
            Inbound Appointment Schedule
          </h2>
          <p className="text-xs text-neutral-400 mt-0.5 ml-8">{sorted.length} total appointments</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="flex bg-neutral-100 rounded-lg p-0.5 gap-0.5 overflow-x-auto">
            {statusOrder.map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`text-xs px-2.5 py-1 rounded-md font-medium whitespace-nowrap transition-all ${statusFilter === s ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500 hover:text-neutral-700"}`}
              >
                {s}
              </button>
            ))}
          </div>
          <Link to="/wms-lite-inbound" className="flex items-center gap-1 text-xs font-medium bg-neutral-900 text-white px-3 py-1.5 rounded-lg hover:bg-neutral-800 transition-colors flex-shrink-0">
            <Plus className="w-3.5 h-3.5" /> New
          </Link>
        </div>
      </div>

      {isLoading ? (
        <p className="text-xs text-neutral-400 text-center py-8">Loading…</p>
      ) : visible.length === 0 ? (
        <p className="text-xs text-neutral-400 text-center py-8">No appointments{statusFilter !== "All" ? ` with status "${statusFilter}"` : ""} yet.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5 gap-3">
          {visible.map((appt) => {
            const meta = statusMeta[appt.status] || statusMeta.Scheduled;
            const StatusIcon = meta.icon;
            return (
              <div key={appt.id} className="border border-neutral-100 rounded-xl p-4 hover:shadow-md transition-all hover:border-neutral-200 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-mono font-semibold text-neutral-800">APT-{appt.id}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <Clock className="w-3 h-3 text-neutral-400" />
                      <span className="text-xs font-semibold text-neutral-700">{new Date(appt.appt_date).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1 flex-shrink-0 ${meta.badgeClass}`}>
                    <StatusIcon className="w-3 h-3" /> {appt.status}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1 bg-blue-100 text-blue-700 w-fit">
                    <ArrowDownToLine className="w-3 h-3" /> Inbound
                  </span>
                  <div className="flex items-center gap-1.5 text-xs text-neutral-500">
                    <Truck className="w-3 h-3 text-neutral-400" />
                    <span>{appt.driver_name || "Driver TBD"}{appt.vehicle_plate ? ` · ${appt.vehicle_plate}` : ""}</span>
                  </div>
                  <p className="text-xs text-neutral-400 font-mono">{appt.asn_id ? asnById.get(appt.asn_id) || `ASN #${appt.asn_id}` : "No linked ASN"}</p>
                  <p className="text-xs text-neutral-500 font-medium">{appt.dock_door || "Door TBD"} · {supplierById.get(appt.supplier_id) || "Supplier"}</p>
                </div>

                <Link
                  to="/wms-lite-inbound"
                  className={`text-xs font-medium px-3 py-1.5 rounded-lg text-center transition-all ${meta.actionClass} flex items-center justify-center gap-1`}
                >
                  <ChevronRight className="w-3 h-3" /> View
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default AppointmentSection;
