import React from "react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCalendarCheck, faCircleCheck, faDolly, faFileLines, faTriangleExclamation, faTruckRampBox } from '@fortawesome/free-solid-svg-icons';
import { useMasterDataList } from "@/hooks/useMasterDataApi";
import { useInboundReceipts, usePutawayTasks } from "@/hooks/useInboundOpsApi";

interface AsnRecord { id: number; status: string; qty_expected: number; qty_received: number; }
interface AppointmentRecord { id: number; appt_date: string; status: string; }

const isToday = (iso: string) => {
  const d = new Date(iso);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
};

const InboundKpiGrid = () => {
  const { data: asns = [] } = useMasterDataList<AsnRecord>("/operations/asns");
  const { data: appointments = [] } = useMasterDataList<AppointmentRecord>("/operations/inbound-appointments");
  const { data: receipts = [] } = useInboundReceipts();
  const { data: pendingPutaway = [] } = usePutawayTasks("Pending");

  const openAsns = asns.filter(a => a.status === "Open" || a.status === "In Progress").length;
  const pendingReceipt = asns.filter(a => a.status !== "Closed" && a.qty_received < a.qty_expected).length;
  const todaysAppointments = appointments.filter(a => isToday(a.appt_date)).length;
  const receivedToday = receipts.filter(r => isToday((r as any).created_at)).reduce((s, r) => s + r.qty, 0);
  const exceptions = receipts.filter(r => r.condition !== "Good").length;

  const cards = [
    { icon: faFileLines, value: openAsns, label: "Open ASNs" },
    { icon: faTruckRampBox, value: pendingReceipt, label: "Pending Receipt" },
    { icon: faDolly, value: pendingPutaway.length, label: "Pending Putaway" },
    { icon: faCalendarCheck, value: todaysAppointments, label: "Today's Appointments" },
    { icon: faCircleCheck, value: receivedToday, label: "Received Today" },
    { icon: faTriangleExclamation, value: exceptions, label: "Exceptions" },
  ];

  return (
    <section className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3" id="inbound-kpi">
      {cards.map(({ icon, value, label }) => (
        <div key={label} className="bg-white rounded-xl border border-neutral-200 p-4 flex flex-col gap-2">
          <div className="w-8 h-8 bg-neutral-100 rounded-lg flex items-center justify-center">
            <FontAwesomeIcon icon={icon} className="text-neutral-700 text-sm" />
          </div>
          <p className="text-2xl text-neutral-900">{value}</p>
          <p className="text-xs text-neutral-500">{label}</p>
        </div>
      ))}
    </section>
  );
};

export default InboundKpiGrid;
