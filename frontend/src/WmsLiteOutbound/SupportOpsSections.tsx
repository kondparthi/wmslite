import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Pencil, Trash2 } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend
} from "recharts";
import { useMasterDataList, useMasterDataCreate, useMasterDataUpdate, useMasterDataDelete } from "@/hooks/useMasterDataApi";
import {
  useOutboundOrders, useOutboundAllocations, usePickTasks, useLoadTasks, usePackTasks, useShipments,
} from "@/hooks/useOutboundOpsApi";

interface CarrierRecord { id: number; name: string; }

// ─── Task Management ───────────────────────────────────────────────────────────
const TASKS_RESOURCE = "/operations/outbound-tasks";
interface TaskRecord {
  id: number;
  task_type: string;
  order_id: number | null;
  assignee: string | null;
  zone: string | null;
  priority: string;
  status: string;
  due_at: string | null;
  notes: string | null;
}

const priorityColor: Record<string, string> = {
  Urgent: "bg-red-100 text-red-700", High: "bg-orange-100 text-orange-700",
  Medium: "bg-blue-100 text-blue-700", Low: "bg-slate-100 text-slate-600",
};
const taskStatusColor: Record<string, string> = {
  "In Progress": "bg-amber-100 text-amber-700", Pending: "bg-slate-100 text-slate-600",
  Completed: "bg-green-100 text-green-700",
};

const emptyTaskForm = { task_type: "Pick", order_id: "", assignee: "", zone: "", priority: "Medium", status: "Pending", due_at: "", notes: "" };

export const TaskManagementSection = () => {
  const { data: tasks = [], isLoading } = useMasterDataList<TaskRecord>(TASKS_RESOURCE);
  const { data: orders = [] } = useOutboundOrders();
  const createTask = useMasterDataCreate<TaskRecord>(TASKS_RESOURCE);
  const updateTask = useMasterDataUpdate<TaskRecord>(TASKS_RESOURCE);
  const deleteTask = useMasterDataDelete(TASKS_RESOURCE);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editRow, setEditRow] = useState<TaskRecord | null>(null);
  const [form, setForm] = useState(emptyTaskForm);

  const orderLabel = (id: number | null) => {
    const o = orders.find(o => o.id === id);
    return o ? o.order_number : "—";
  };

  const handleCreate = async () => {
    await createTask.mutateAsync({
      task_type: form.task_type,
      order_id: form.order_id ? Number(form.order_id) : null,
      assignee: form.assignee || null,
      zone: form.zone || null,
      priority: form.priority,
      status: "Pending",
      due_at: form.due_at || null,
      notes: form.notes || null,
    });
    setIsCreateOpen(false);
    setForm(emptyTaskForm);
  };

  const openEdit = (t: TaskRecord) => {
    setEditRow(t);
    setForm({
      task_type: t.task_type, order_id: t.order_id ? String(t.order_id) : "", assignee: t.assignee || "",
      zone: t.zone || "", priority: t.priority, status: t.status,
      due_at: t.due_at ? t.due_at.slice(0, 16) : "", notes: t.notes || "",
    });
    setIsEditOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editRow) return;
    await updateTask.mutateAsync({
      id: editRow.id,
      payload: {
        task_type: form.task_type,
        order_id: form.order_id ? Number(form.order_id) : null,
        assignee: form.assignee || null,
        zone: form.zone || null,
        priority: form.priority,
        status: form.status,
        due_at: form.due_at || null,
        notes: form.notes || null,
      },
    });
    setIsEditOpen(false);
    setEditRow(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div><h2 className="text-xl font-bold">Task Management</h2><p className="text-sm text-muted-foreground">Create, assign, and track outbound operation tasks.</p></div>
        <Button size="sm" className="bg-black text-white hover:bg-neutral-800" onClick={() => { setForm(emptyTaskForm); setIsCreateOpen(true); }}><Plus className="mr-1.5 h-3.5 w-3.5" />Create Task</Button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Pending", value: tasks.filter(t => t.status === "Pending").length, color: "text-slate-600 bg-slate-50 border-slate-200" },
          { label: "In Progress", value: tasks.filter(t => t.status === "In Progress").length, color: "text-amber-600 bg-amber-50 border-amber-100" },
          { label: "Completed", value: tasks.filter(t => t.status === "Completed").length, color: "text-green-600 bg-green-50 border-green-100" },
          { label: "Urgent", value: tasks.filter(t => t.priority === "Urgent").length, color: "text-red-600 bg-red-50 border-red-100" },
        ].map(k => <Card key={k.label} className={`border ${k.color}`}><CardContent className="pt-4 pb-4"><p className="text-xs font-medium uppercase">{k.label}</p><p className="text-2xl font-bold mt-0.5">{k.value}</p></CardContent></Card>)}
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow className="bg-slate-50">
              <TableHead>Task ID</TableHead><TableHead>Type</TableHead><TableHead>Order</TableHead><TableHead>Zone</TableHead>
              <TableHead>Assignee</TableHead><TableHead>Priority</TableHead><TableHead>Due</TableHead>
              <TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
              ) : tasks.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No tasks yet.</TableCell></TableRow>
              ) : tasks.map(t => (
                <TableRow key={t.id} className="hover:bg-slate-50/60">
                  <TableCell className="font-mono text-xs font-semibold text-[#009FE3]">TSK-{String(t.id).padStart(4, "0")}</TableCell>
                  <TableCell className="text-sm font-medium">{t.task_type}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{orderLabel(t.order_id)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{t.zone || "—"}</TableCell>
                  <TableCell className="text-sm">{t.assignee || "—"}</TableCell>
                  <TableCell><span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${priorityColor[t.priority] || priorityColor.Medium}`}>{t.priority}</span></TableCell>
                  <TableCell className="text-sm">{t.due_at ? new Date(t.due_at).toLocaleString() : "—"}</TableCell>
                  <TableCell><span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${taskStatusColor[t.status] || taskStatusColor.Pending}`}>{t.status}</span></TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(t)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:bg-red-50" onClick={() => deleteTask.mutate(t.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader><DialogTitle>Create New Task</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>Task Type</Label>
                <Select value={form.task_type} onValueChange={v => setForm(p => ({ ...p, task_type: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>{["Pick", "Pack", "Load", "Ship", "Count"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>Priority</Label>
                <Select value={form.priority} onValueChange={v => setForm(p => ({ ...p, priority: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["Urgent", "High", "Medium", "Low"].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 col-span-2"><Label>Related Order</Label>
                <Select value={form.order_id} onValueChange={v => setForm(p => ({ ...p, order_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>{orders.map(o => <SelectItem key={o.id} value={String(o.id)}>{o.order_number}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>Zone</Label><Input value={form.zone} onChange={e => setForm(p => ({ ...p, zone: e.target.value }))} placeholder="e.g. Zone A" /></div>
              <div className="space-y-1.5"><Label>Assignee</Label><Input value={form.assignee} onChange={e => setForm(p => ({ ...p, assignee: e.target.value }))} placeholder="Name" /></div>
              <div className="space-y-1.5 col-span-2"><Label>Due</Label><Input type="datetime-local" value={form.due_at} onChange={e => setForm(p => ({ ...p, due_at: e.target.value }))} /></div>
              <div className="space-y-1.5 col-span-2"><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button className="bg-black text-white hover:bg-neutral-800" onClick={handleCreate}>Create Task</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader><DialogTitle>Edit Task — TSK-{editRow ? String(editRow.id).padStart(4, "0") : ""}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["Pending", "In Progress", "Completed"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>Priority</Label>
                <Select value={form.priority} onValueChange={v => setForm(p => ({ ...p, priority: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["Urgent", "High", "Medium", "Low"].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>Assignee</Label><Input value={form.assignee} onChange={e => setForm(p => ({ ...p, assignee: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>Due</Label><Input type="datetime-local" value={form.due_at} onChange={e => setForm(p => ({ ...p, due_at: e.target.value }))} /></div>
              <div className="space-y-1.5 col-span-2"><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
            <Button className="bg-black text-white hover:bg-neutral-800" onClick={handleSaveEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ─── Appointments ──────────────────────────────────────────────────────────────
const APPT_RESOURCE = "/operations/outbound-appointments";
interface ApptRecord {
  id: number;
  carrier_id: number | null;
  order_id: number | null;
  appt_date: string;
  dock_door: string | null;
  driver_name: string | null;
  vehicle_plate: string | null;
  status: string;
}

const apptStatusColor: Record<string, string> = {
  Confirmed: "bg-green-100 text-green-700", Scheduled: "bg-amber-100 text-amber-700",
  Arrived: "bg-blue-100 text-blue-700", Completed: "bg-slate-100 text-slate-600",
  "No Show": "bg-red-100 text-red-700", Cancelled: "bg-red-100 text-red-700",
};

const emptyApptForm = { carrier_id: "", order_id: "", appt_date: "", dock_door: "", driver_name: "", vehicle_plate: "", status: "Scheduled" };

export const AppointmentSection = () => {
  const { data: appts = [], isLoading } = useMasterDataList<ApptRecord>(APPT_RESOURCE);
  const { data: carriers = [] } = useMasterDataList<CarrierRecord>("/master-data/carriers");
  const { data: orders = [] } = useOutboundOrders();
  const createAppt = useMasterDataCreate<ApptRecord>(APPT_RESOURCE);
  const updateAppt = useMasterDataUpdate<ApptRecord>(APPT_RESOURCE);
  const deleteAppt = useMasterDataDelete(APPT_RESOURCE);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editRow, setEditRow] = useState<ApptRecord | null>(null);
  const [form, setForm] = useState(emptyApptForm);

  const carrierLabel = (id: number | null) => carriers.find(c => c.id === id)?.name || "—";
  const orderLabel = (id: number | null) => orders.find(o => o.id === id)?.order_number || "—";
  const todayStr = new Date().toDateString();

  const handleCreate = async () => {
    await createAppt.mutateAsync({
      carrier_id: form.carrier_id ? Number(form.carrier_id) : null,
      order_id: form.order_id ? Number(form.order_id) : null,
      appt_date: form.appt_date,
      dock_door: form.dock_door || null,
      driver_name: form.driver_name || null,
      vehicle_plate: form.vehicle_plate || null,
      status: "Scheduled",
    });
    setIsCreateOpen(false);
    setForm(emptyApptForm);
  };

  const openEdit = (a: ApptRecord) => {
    setEditRow(a);
    setForm({
      carrier_id: a.carrier_id ? String(a.carrier_id) : "", order_id: a.order_id ? String(a.order_id) : "",
      appt_date: a.appt_date ? a.appt_date.slice(0, 16) : "", dock_door: a.dock_door || "",
      driver_name: a.driver_name || "", vehicle_plate: a.vehicle_plate || "", status: a.status,
    });
    setIsEditOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editRow) return;
    await updateAppt.mutateAsync({
      id: editRow.id,
      payload: {
        carrier_id: form.carrier_id ? Number(form.carrier_id) : null,
        order_id: form.order_id ? Number(form.order_id) : null,
        appt_date: form.appt_date,
        dock_door: form.dock_door || null,
        driver_name: form.driver_name || null,
        vehicle_plate: form.vehicle_plate || null,
        status: form.status,
      },
    });
    setIsEditOpen(false);
    setEditRow(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div><h2 className="text-xl font-bold">Outbound Appointments</h2><p className="text-sm text-muted-foreground">Schedule and manage carrier pickup appointments.</p></div>
        <Button size="sm" className="bg-black text-white hover:bg-neutral-800" onClick={() => { setForm(emptyApptForm); setIsCreateOpen(true); }}><Plus className="mr-1.5 h-3.5 w-3.5" />New Appointment</Button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Today", value: appts.filter(a => a.appt_date && new Date(a.appt_date).toDateString() === todayStr).length, color: "text-[#009FE3] bg-blue-50 border-blue-100" },
          { label: "Confirmed", value: appts.filter(a => a.status === "Confirmed").length, color: "text-green-600 bg-green-50 border-green-100" },
          { label: "Scheduled", value: appts.filter(a => a.status === "Scheduled").length, color: "text-amber-600 bg-amber-50 border-amber-100" },
          { label: "Arrived", value: appts.filter(a => a.status === "Arrived").length, color: "text-slate-600 bg-slate-50 border-slate-200" },
        ].map(k => <Card key={k.label} className={`border ${k.color}`}><CardContent className="pt-4 pb-4"><p className="text-xs font-medium uppercase">{k.label}</p><p className="text-2xl font-bold mt-0.5">{k.value}</p></CardContent></Card>)}
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow className="bg-slate-50">
              <TableHead>Appt ID</TableHead><TableHead>Carrier</TableHead><TableHead>Order</TableHead><TableHead>Dock</TableHead>
              <TableHead>Date/Time</TableHead><TableHead>Driver</TableHead>
              <TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
              ) : appts.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No appointments scheduled.</TableCell></TableRow>
              ) : appts.map(a => (
                <TableRow key={a.id} className="hover:bg-slate-50/60">
                  <TableCell className="font-mono text-xs font-semibold text-[#009FE3]">APT-{String(a.id).padStart(4, "0")}</TableCell>
                  <TableCell className="font-medium">{carrierLabel(a.carrier_id)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{orderLabel(a.order_id)}</TableCell>
                  <TableCell>{a.dock_door || "—"}</TableCell>
                  <TableCell className="text-sm">{a.appt_date ? new Date(a.appt_date).toLocaleString() : "—"}</TableCell>
                  <TableCell className="text-sm">{a.driver_name || "—"}</TableCell>
                  <TableCell><span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${apptStatusColor[a.status] || apptStatusColor.Scheduled}`}>{a.status}</span></TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(a)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:bg-red-50" onClick={() => deleteAppt.mutate(a.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader><DialogTitle>New Outbound Appointment</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-1.5"><Label>Carrier</Label>
              <Select value={form.carrier_id} onValueChange={v => setForm(p => ({ ...p, carrier_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select carrier" /></SelectTrigger>
                <SelectContent>{carriers.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Related Order</Label>
              <Select value={form.order_id} onValueChange={v => setForm(p => ({ ...p, order_id: v }))}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>{orders.map(o => <SelectItem key={o.id} value={String(o.id)}>{o.order_number}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>Dock Door</Label>
                <Select value={form.dock_door} onValueChange={v => setForm(p => ({ ...p, dock_door: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select dock" /></SelectTrigger>
                  <SelectContent>{["Dock 1", "Dock 2", "Dock 3", "Dock 4", "Dock 5"].map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>Date/Time</Label><Input type="datetime-local" value={form.appt_date} onChange={e => setForm(p => ({ ...p, appt_date: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>Driver Name</Label><Input value={form.driver_name} onChange={e => setForm(p => ({ ...p, driver_name: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>Vehicle Plate</Label><Input value={form.vehicle_plate} onChange={e => setForm(p => ({ ...p, vehicle_plate: e.target.value }))} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button className="bg-black text-white hover:bg-neutral-800" onClick={handleCreate}>Book Appointment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader><DialogTitle>Edit Appointment — APT-{editRow ? String(editRow.id).padStart(4, "0") : ""}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["Scheduled", "Confirmed", "Arrived", "Completed", "No Show", "Cancelled"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>Dock</Label>
                <Select value={form.dock_door} onValueChange={v => setForm(p => ({ ...p, dock_door: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["Dock 1", "Dock 2", "Dock 3", "Dock 4", "Dock 5"].map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>Date/Time</Label><Input type="datetime-local" value={form.appt_date} onChange={e => setForm(p => ({ ...p, appt_date: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>Driver Name</Label><Input value={form.driver_name} onChange={e => setForm(p => ({ ...p, driver_name: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>Vehicle Plate</Label><Input value={form.vehicle_plate} onChange={e => setForm(p => ({ ...p, vehicle_plate: e.target.value }))} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
            <Button className="bg-black text-white hover:bg-neutral-800" onClick={handleSaveEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ─── Reports ───────────────────────────────────────────────────────────────────
const PIE_COLORS = ["#009FE3", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444", "#64748b"];

export const ReportSection = () => {
  const { data: orders = [] } = useOutboundOrders();
  const { data: allocations = [] } = useOutboundAllocations();
  const { data: pickTasks = [] } = usePickTasks();
  const { data: loadTasks = [] } = useLoadTasks();
  const { data: packTasks = [] } = usePackTasks();
  const { data: shipments = [] } = useShipments();
  const { data: carriers = [] } = useMasterDataList<CarrierRecord>("/master-data/carriers");

  const [statusFilter, setStatusFilter] = useState("All");

  const statusBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    orders.forEach(o => { counts[o.status] = (counts[o.status] || 0) + 1; });
    return Object.entries(counts).map(([status, count]) => ({ status, count }));
  }, [orders]);

  const carrierShare = useMemo(() => {
    const counts: Record<string, number> = {};
    shipments.forEach(s => {
      const name = carriers.find(c => c.id === s.carrier_id)?.name || "Unassigned";
      counts[name] = (counts[name] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value], i) => ({ name, value, fill: PIE_COLORS[i % PIE_COLORS.length] }));
  }, [shipments, carriers]);

  const kpis = [
    { label: "Total Orders", value: orders.length },
    { label: "Orders Shipped", value: orders.filter(o => o.status === "Shipped").length },
    { label: "Open Pick Tasks", value: pickTasks.filter(t => t.status !== "Completed").length },
    { label: "Dispatched Shipments", value: shipments.filter(s => s.status === "Dispatched").length },
  ];

  const filteredStatusRows = statusFilter === "All" ? statusBreakdown : statusBreakdown.filter(r => r.status === statusFilter);
  const totalOrders = orders.length || 1;

  return (
    <div className="space-y-6">
      <div><h2 className="text-xl font-bold">Outbound Reports</h2><p className="text-sm text-muted-foreground">Live operational counts drawn from current order, allocation, pick, load, pack, and shipment data.</p></div>

      {/* KPI Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map(k => (
          <Card key={k.label} className="border-0 shadow-sm">
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{k.label}</p>
              <p className="text-2xl font-bold mt-0.5">{k.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold uppercase text-muted-foreground">Orders by Status</CardTitle></CardHeader>
          <CardContent className="h-[220px]">
            {statusBreakdown.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">No orders yet.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusBreakdown}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="status" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }} />
                  <Bar dataKey="count" name="Orders" fill="#009FE3" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold uppercase text-muted-foreground">Shipments by Carrier</CardTitle></CardHeader>
          <CardContent className="h-[220px]">
            {carrierShare.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">No shipments yet.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={carrierShare} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} paddingAngle={4}>
                    {carrierShare.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 8, border: "none" }} />
                  <Legend iconSize={10} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Status Breakdown Table */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base font-semibold">Order Status Breakdown</CardTitle>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40 h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>{["All", ...statusBreakdown.map(r => r.status)].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow className="bg-slate-50">
              <TableHead>Status</TableHead><TableHead>Order Count</TableHead><TableHead>% of Total</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {filteredStatusRows.length === 0 ? (
                <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground">No data.</TableCell></TableRow>
              ) : filteredStatusRows.map(r => (
                <TableRow key={r.status} className="hover:bg-slate-50/60">
                  <TableCell className="font-medium text-sm">{r.status}</TableCell>
                  <TableCell className="text-sm">{r.count}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{((r.count / totalOrders) * 100).toFixed(1)}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
