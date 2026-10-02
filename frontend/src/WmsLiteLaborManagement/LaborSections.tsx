import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Clock, Users, TrendingUp, CalendarCheck, UserCheck, FileText,
  Plus, Pencil, Trash2, Eye, Download, Search, RefreshCw,
  BarChart3, Activity
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend
} from "recharts";
import {
  useEmployees, useCreateEmployee, useUpdateEmployee, useDeleteEmployee,
  useShiftLogs, useCreateShiftLog, useUpdateShiftLog,
  useAttendanceRecords, useCreateAttendanceRecord, useUpdateAttendanceRecord,
  useZoneAllocations, useCreateZoneAllocation, useUpdateZoneAllocation, useDeleteZoneAllocation,
  usePerformanceGoals, useCreatePerformanceGoal, useUpdatePerformanceGoal,
} from "@/hooks/useLaborOpsApi";
import type { Employee } from "@/hooks/useLaborOpsApi";

// ─── Shared helpers ────────────────────────────────────────────────────────────
const statusBadge = (status: string) => {
  const map: Record<string, string> = {
    Active: "bg-green-100 text-green-700", Inactive: "bg-slate-100 text-slate-600",
    "On Leave": "bg-amber-100 text-amber-700", Break: "bg-orange-100 text-orange-700",
    Completed: "bg-blue-100 text-blue-700", Present: "bg-green-100 text-green-700",
    Absent: "bg-red-100 text-red-700", Late: "bg-orange-100 text-orange-700",
  };
  return map[status] || "bg-slate-100 text-slate-600";
};
const PIE_COLORS = ["#009FE3", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444", "#64748b"];
const empName = (employees: Employee[], id: number) => {
  const e = employees.find(x => x.id === id);
  return e ? `${e.first_name} ${e.last_name}` : `#${id}`;
};
const empCode = (employees: Employee[], id: number) => employees.find(x => x.id === id)?.employee_code || `#${id}`;
const ratingFor = (eff: number) => (eff >= 100 ? "Excellent" : eff >= 90 ? "Good" : eff >= 80 ? "Average" : "Poor");
const ratingColor: Record<string, string> = {
  Excellent: "bg-green-100 text-green-700", Good: "bg-blue-100 text-blue-700",
  Average: "bg-amber-100 text-amber-700", Poor: "bg-red-100 text-red-700",
};

// ─── 1. Labor Tracking ─────────────────────────────────────────────────────────
export const LaborTrackingSection = () => {
  const { data: logs = [], isLoading } = useShiftLogs();
  const { data: employees = [] } = useEmployees();
  const createLog = useCreateShiftLog();
  const updateLog = useUpdateShiftLog();
  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [form, setForm] = useState({ employee_id: "", activity: "Picking", zone: "" });

  const rows = logs.filter(l => l.status !== "Completed");
  const filtered = rows.filter(r => {
    const name = empName(employees, r.employee_id).toLowerCase();
    const code = empCode(employees, r.employee_id).toLowerCase();
    return name.includes(search.toLowerCase()) || code.includes(search.toLowerCase()) || r.activity.toLowerCase().includes(search.toLowerCase());
  });

  const activityUnits = useMemo(() => {
    const totals: Record<string, number> = {};
    logs.forEach(l => { totals[l.activity] = (totals[l.activity] || 0) + l.units_completed; });
    return Object.entries(totals).map(([activity, units]) => ({ activity, units }));
  }, [logs]);

  const handleClockOut = (id: number) => updateLog.mutate({ id, payload: { status: "Completed", clock_out: new Date().toISOString() } });
  const handleBreak = (id: number, current: string) => updateLog.mutate({ id, payload: { status: current === "Break" ? "Active" : "Break" } });

  const handleClockIn = async () => {
    if (!form.employee_id) return;
    await createLog.mutateAsync({
      employee_id: Number(form.employee_id), activity: form.activity, zone: form.zone || null,
      clock_in: new Date().toISOString(), units_completed: 0, status: "Active",
    });
    setIsCreateOpen(false);
    setForm({ employee_id: "", activity: "Picking", zone: "" });
  };

  const durationSince = (iso: string | null) => {
    if (!iso) return "—";
    const ms = Date.now() - new Date(iso).getTime();
    const h = Math.floor(ms / 3_600_000);
    const m = Math.floor((ms % 3_600_000) / 60_000);
    return `${h}h ${m}m`;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div><h2 className="text-xl font-bold">Labor Tracking</h2><p className="text-sm text-muted-foreground">Real-time personnel activity monitoring across all zones.</p></div>
        <Button size="sm" className="bg-black text-white hover:bg-neutral-800" onClick={() => setIsCreateOpen(true)}><Clock className="mr-1.5 h-3.5 w-3.5" />Clock In</Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Active Workers", value: rows.filter(r => r.status === "Active").length.toString(), icon: Users, color: "#009FE3" },
          { label: "On Break", value: rows.filter(r => r.status === "Break").length.toString(), icon: Clock, color: "#f59e0b" },
          { label: "Sessions Today", value: logs.length.toString(), icon: BarChart3, color: "#10b981" },
          { label: "Units Today", value: logs.reduce((s, r) => s + r.units_completed, 0).toString(), icon: Activity, color: "#8b5cf6" },
        ].map(k => (
          <Card key={k.label} className="border-0 shadow-sm">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{k.label}</p>
                  <p className="text-2xl font-bold mt-0.5">{k.value}</p>
                </div>
                <div className="p-2 rounded-lg" style={{ background: `${k.color}20` }}>
                  <k.icon className="h-5 w-5" style={{ color: k.color }} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Units by Activity Chart */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold uppercase text-muted-foreground">Units Completed by Activity</CardTitle></CardHeader>
        <CardContent className="h-[180px]">
          {activityUnits.length === 0 ? (
            <div className="h-full flex items-center justify-center text-sm text-muted-foreground">No activity logged yet.</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={activityUnits}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="activity" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 8, border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }} />
                <Bar dataKey="units" fill="#009FE3" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Search + Table */}
      <div className="flex items-center gap-2">
        <div className="relative w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by name, ID, activity…" className="pl-8 h-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow className="bg-slate-50">
              <TableHead>Emp ID</TableHead><TableHead>Name</TableHead><TableHead>Activity</TableHead>
              <TableHead>Zone / Area</TableHead><TableHead>Start Time</TableHead><TableHead>Duration</TableHead>
              <TableHead>Units</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No one clocked in.</TableCell></TableRow>
              ) : filtered.map(r => (
                <TableRow key={r.id} className="hover:bg-slate-50/60">
                  <TableCell className="font-mono text-xs font-semibold text-[#009FE3]">{empCode(employees, r.employee_id)}</TableCell>
                  <TableCell className="font-medium">{empName(employees, r.employee_id)}</TableCell>
                  <TableCell className="text-sm">{r.activity}</TableCell>
                  <TableCell className="text-sm">{r.zone || "—"}</TableCell>
                  <TableCell className="text-sm">{r.clock_in ? new Date(r.clock_in).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}</TableCell>
                  <TableCell className="text-sm">{durationSince(r.clock_in)}</TableCell>
                  <TableCell className="font-medium">{r.units_completed}</TableCell>
                  <TableCell><span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusBadge(r.status)}`}>{r.status}</span></TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => handleBreak(r.id, r.status)}>
                        {r.status === "Break" ? "Resume" : "Break"}
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 text-xs text-red-600 hover:bg-red-50" onClick={() => handleClockOut(r.id)}>Clock Out</Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader><DialogTitle>Clock In</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-1.5"><Label>Employee</Label>
              <Select value={form.employee_id} onValueChange={v => setForm(p => ({ ...p, employee_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>{employees.map(e => <SelectItem key={e.id} value={String(e.id)}>{e.employee_code} — {e.first_name} {e.last_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Activity</Label>
              <Select value={form.activity} onValueChange={v => setForm(p => ({ ...p, activity: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["Picking", "Packing", "Receiving", "Cycle Count", "Putaway"].map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Zone / Area</Label><Input value={form.zone} onChange={e => setForm(p => ({ ...p, zone: e.target.value }))} placeholder="e.g. Zone A" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button className="bg-black text-white hover:bg-neutral-800" onClick={handleClockIn}>Clock In</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ─── 2. Employee Master ────────────────────────────────────────────────────────
const emptyEmpForm = { employee_code: "", first_name: "", last_name: "", role: "Associate", department: "Outbound", shift: "Morning", phone: "", email: "", skills: "" };

export const EmployeeMasterSection = () => {
  const { data: emps = [], isLoading } = useEmployees();
  const createEmployee = useCreateEmployee();
  const updateEmployee = useUpdateEmployee();
  const deleteEmployee = useDeleteEmployee();

  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("All");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selected, setSelected] = useState<Employee | null>(null);
  const [form, setForm] = useState(emptyEmpForm);

  const filtered = emps.filter(e =>
    (deptFilter === "All" || e.department === deptFilter) &&
    (`${e.first_name} ${e.last_name} ${e.employee_code}`.toLowerCase().includes(search.toLowerCase()))
  );

  const skillDist = useMemo(() => {
    const counts: Record<string, number> = {};
    emps.forEach(e => (e.skills || "").split(",").map(s => s.trim()).filter(Boolean).forEach(s => { counts[s] = (counts[s] || 0) + 1; }));
    const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
    return Object.entries(counts).map(([name, count], i) => ({ name, value: Math.round((count / total) * 100), fill: PIE_COLORS[i % PIE_COLORS.length] }));
  }, [emps]);

  const nextCode = () => {
    const nums = emps.map(e => parseInt(e.employee_code.replace(/\D/g, ""), 10)).filter(n => !isNaN(n));
    const next = (nums.length ? Math.max(...nums) : 0) + 1;
    return `EMP${String(next).padStart(3, "0")}`;
  };

  const handleCreate = async () => {
    await createEmployee.mutateAsync({ ...form, employee_code: form.employee_code || nextCode(), status: "Active" });
    setIsCreateOpen(false);
    setForm(emptyEmpForm);
  };

  const handleSaveEdit = async () => {
    if (!selected) return;
    await updateEmployee.mutateAsync({ id: selected.id, payload: selected });
    setIsEditOpen(false);
  };

  const handleDelete = async () => {
    if (!selected) return;
    await deleteEmployee.mutateAsync(selected.id);
    setIsDeleteOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div><h2 className="text-xl font-bold">Employee Master</h2><p className="text-sm text-muted-foreground">Manage workforce profiles, roles, skills and departments.</p></div>
        <Button size="sm" className="bg-black text-white hover:bg-neutral-800" onClick={() => { setForm({ ...emptyEmpForm, employee_code: nextCode() }); setIsCreateOpen(true); }}><Plus className="mr-1.5 h-3.5 w-3.5" />Add Employee</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center gap-2">
            <div className="relative flex-1 max-w-72">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by name or ID…" className="pl-8 h-9" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={deptFilter} onValueChange={setDeptFilter}>
              <SelectTrigger className="w-36 h-9"><SelectValue /></SelectTrigger>
              <SelectContent>{["All", "Outbound", "Inbound", "Inventory", "Admin"].map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow className="bg-slate-50">
                  <TableHead>Emp ID</TableHead><TableHead>Name</TableHead><TableHead>Role</TableHead>
                  <TableHead>Dept</TableHead><TableHead>Shift</TableHead><TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
                  ) : filtered.map(e => (
                    <TableRow key={e.id} className="hover:bg-slate-50/60">
                      <TableCell className="font-mono text-xs font-semibold text-[#009FE3]">{e.employee_code}</TableCell>
                      <TableCell className="font-medium">{e.first_name} {e.last_name}</TableCell>
                      <TableCell className="text-sm">{e.role}</TableCell>
                      <TableCell className="text-sm">{e.department || "—"}</TableCell>
                      <TableCell className="text-sm">{e.shift}</TableCell>
                      <TableCell><span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusBadge(e.status)}`}>{e.status}</span></TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setSelected(e); setIsViewOpen(true); }}><Eye className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setSelected({ ...e }); setIsEditOpen(true); }}><Pencil className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:bg-red-50" onClick={() => { setSelected(e); setIsDeleteOpen(true); }}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold uppercase text-muted-foreground">Skill Distribution</CardTitle></CardHeader>
          <CardContent>
            {skillDist.length === 0 ? (
              <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">No skills recorded.</div>
            ) : (
              <>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={skillDist} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={5}>
                        {skillDist.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: 8, border: "none" }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2 mt-3">
                  {skillDist.map(s => (
                    <div key={s.name} className="flex justify-between items-center text-sm">
                      <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.fill }} /><span>{s.name}</span></div>
                      <span className="font-bold">{s.value}%</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialogs */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader><DialogTitle>Add New Employee</DialogTitle><DialogDescription>Create a new employee profile.</DialogDescription></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>Employee ID</Label><Input value={form.employee_code} onChange={e => setForm(p => ({ ...p, employee_code: e.target.value }))} /></div>
              <div />
              <div className="space-y-1.5"><Label>First Name</Label><Input value={form.first_name} onChange={e => setForm(p => ({ ...p, first_name: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>Last Name</Label><Input value={form.last_name} onChange={e => setForm(p => ({ ...p, last_name: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>Role</Label>
                <Select value={form.role} onValueChange={v => setForm(p => ({ ...p, role: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["Associate", "Specialist", "Lead", "Manager", "Supervisor"].map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>Department</Label>
                <Select value={form.department} onValueChange={v => setForm(p => ({ ...p, department: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["Outbound", "Inbound", "Inventory", "Admin"].map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>Shift</Label>
                <Select value={form.shift} onValueChange={v => setForm(p => ({ ...p, shift: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["Morning", "Afternoon", "Night"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>Phone</Label><Input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="+1-555-0000" /></div>
              <div className="space-y-1.5 col-span-2"><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} /></div>
              <div className="space-y-1.5 col-span-2"><Label>Skills (comma-separated)</Label><Input value={form.skills} onChange={e => setForm(p => ({ ...p, skills: e.target.value }))} placeholder="Picking, Packing" /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button className="bg-black text-white hover:bg-neutral-800" onClick={handleCreate}>Create Employee</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader><DialogTitle>Employee Profile — {selected?.employee_code}</DialogTitle></DialogHeader>
          {selected && (
            <div className="grid grid-cols-2 gap-4 py-2 text-sm">
              <div><p className="text-xs text-muted-foreground">Full Name</p><p className="font-semibold">{selected.first_name} {selected.last_name}</p></div>
              <div><p className="text-xs text-muted-foreground">Employee ID</p><p className="font-mono font-semibold">{selected.employee_code}</p></div>
              <div><p className="text-xs text-muted-foreground">Role</p><p className="font-semibold">{selected.role}</p></div>
              <div><p className="text-xs text-muted-foreground">Department</p><p className="font-semibold">{selected.department || "—"}</p></div>
              <div><p className="text-xs text-muted-foreground">Shift</p><p className="font-semibold">{selected.shift}</p></div>
              <div><p className="text-xs text-muted-foreground">Status</p><span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusBadge(selected.status)}`}>{selected.status}</span></div>
              <div><p className="text-xs text-muted-foreground">Phone</p><p className="font-semibold">{selected.phone || "—"}</p></div>
              <div><p className="text-xs text-muted-foreground">Email</p><p className="font-semibold">{selected.email || "—"}</p></div>
              <div className="col-span-2"><p className="text-xs text-muted-foreground">Skills</p><p className="font-semibold">{selected.skills || "—"}</p></div>
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setIsViewOpen(false)}>Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader><DialogTitle>Edit Employee — {selected?.employee_code}</DialogTitle></DialogHeader>
          {selected && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5"><Label>First Name</Label><Input value={selected.first_name} onChange={e => setSelected(p => p && ({ ...p, first_name: e.target.value }))} /></div>
                <div className="space-y-1.5"><Label>Last Name</Label><Input value={selected.last_name} onChange={e => setSelected(p => p && ({ ...p, last_name: e.target.value }))} /></div>
                <div className="space-y-1.5"><Label>Role</Label>
                  <Select value={selected.role} onValueChange={v => setSelected(p => p && ({ ...p, role: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{["Associate", "Specialist", "Lead", "Manager"].map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5"><Label>Status</Label>
                  <Select value={selected.status} onValueChange={v => setSelected(p => p && ({ ...p, status: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{["Active", "Inactive", "On Leave"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5"><Label>Shift</Label>
                  <Select value={selected.shift} onValueChange={v => setSelected(p => p && ({ ...p, shift: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{["Morning", "Afternoon", "Night"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5"><Label>Phone</Label><Input value={selected.phone || ""} onChange={e => setSelected(p => p && ({ ...p, phone: e.target.value }))} /></div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
            <Button className="bg-black text-white hover:bg-neutral-800" onClick={handleSaveEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="sm:max-w-[380px]">
          <DialogHeader><DialogTitle>Remove Employee</DialogTitle><DialogDescription>Remove <strong>{selected?.first_name} {selected?.last_name}</strong> from the system? This cannot be undone.</DialogDescription></DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Remove</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ─── 3. Performance ────────────────────────────────────────────────────────────
export const LaborPerformanceSection = () => {
  const { data: goals = [], isLoading } = usePerformanceGoals();
  const { data: employees = [] } = useEmployees();
  const { data: logs = [] } = useShiftLogs();
  const createGoal = useCreatePerformanceGoal();
  const updateGoal = useUpdatePerformanceGoal();

  const [isGoalOpen, setIsGoalOpen] = useState(false);
  const [editRow, setEditRow] = useState<{ id?: number; employee_id: number; task: string; target: number } | null>(null);
  const [newTarget, setNewTarget] = useState("");

  const perfRows = useMemo(() => goals.map(g => {
    const actual = logs.filter(l => l.employee_id === g.employee_id && l.activity === g.task).reduce((s, l) => s + l.units_completed, 0);
    const efficiency = g.target > 0 ? Math.round((actual / g.target) * 100) : 0;
    return { ...g, actual, efficiency, rating: ratingFor(efficiency) };
  }), [goals, logs]);

  const perfChartData = perfRows.map(r => ({ name: empName(employees, r.employee_id), efficiency: r.efficiency }));

  const handleSaveGoal = async () => {
    if (!editRow) return;
    const target = parseFloat(newTarget) || 0;
    if (editRow.id) {
      await updateGoal.mutateAsync({ id: editRow.id, payload: { target } });
    } else {
      await createGoal.mutateAsync({ employee_id: editRow.employee_id, task: editRow.task, target });
    }
    setIsGoalOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div><h2 className="text-xl font-bold">Performance</h2><p className="text-sm text-muted-foreground">Track individual efficiency scores against targets.</p></div>
        <Button size="sm" className="bg-black text-white hover:bg-neutral-800" onClick={() => { setEditRow({ employee_id: employees[0]?.id ?? 0, task: "Picking", target: 0 }); setNewTarget(""); setIsGoalOpen(true); }}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />Set Goal
        </Button>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold uppercase text-muted-foreground">Efficiency by Employee (%)</CardTitle></CardHeader>
        <CardContent className="h-[220px]">
          {perfChartData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-sm text-muted-foreground">No goals set yet.</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={perfChartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ borderRadius: 8, border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }} />
                <Bar dataKey="efficiency" name="Efficiency %" radius={[4, 4, 0, 0]}>
                  {perfChartData.map((entry, i) => (
                    <Cell key={i} fill={entry.efficiency >= 100 ? "#10b981" : entry.efficiency >= 90 ? "#009FE3" : "#f59e0b"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow className="bg-slate-50">
              <TableHead>Emp ID</TableHead><TableHead>Name</TableHead><TableHead>Dept</TableHead>
              <TableHead>Task</TableHead><TableHead>Target</TableHead><TableHead>Actual</TableHead>
              <TableHead>Efficiency</TableHead><TableHead>Rating</TableHead><TableHead className="text-right">Actions</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
              ) : perfRows.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No goals set yet.</TableCell></TableRow>
              ) : perfRows.map(r => {
                const emp = employees.find(e => e.id === r.employee_id);
                return (
                  <TableRow key={r.id} className="hover:bg-slate-50/60">
                    <TableCell className="font-mono text-xs font-semibold text-[#009FE3]">{empCode(employees, r.employee_id)}</TableCell>
                    <TableCell className="font-medium">{empName(employees, r.employee_id)}</TableCell>
                    <TableCell className="text-sm">{emp?.department || "—"}</TableCell>
                    <TableCell className="text-sm">{r.task}</TableCell>
                    <TableCell>{r.target}</TableCell>
                    <TableCell className="font-medium">{r.actual}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-slate-100 rounded-full h-1.5">
                          <div className="h-1.5 rounded-full" style={{ width: `${Math.min(r.efficiency, 100)}%`, background: r.efficiency >= 100 ? "#10b981" : r.efficiency >= 90 ? "#009FE3" : "#f59e0b" }} />
                        </div>
                        <span className="text-sm font-semibold">{r.efficiency}%</span>
                      </div>
                    </TableCell>
                    <TableCell><span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${ratingColor[r.rating]}`}>{r.rating}</span></TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { setEditRow(r); setNewTarget(String(r.target)); setIsGoalOpen(true); }}>
                        Set Goal
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isGoalOpen} onOpenChange={setIsGoalOpen}>
        <DialogContent className="sm:max-w-[380px]">
          <DialogHeader><DialogTitle>{editRow?.id ? "Update" : "Set"} Performance Goal</DialogTitle><DialogDescription>{editRow ? `${empName(employees, editRow.employee_id)} — ${editRow.task}` : ""}</DialogDescription></DialogHeader>
          <div className="space-y-4 py-4">
            {!editRow?.id && (
              <>
                <div className="space-y-1.5"><Label>Employee</Label>
                  <Select value={String(editRow?.employee_id ?? "")} onValueChange={v => setEditRow(p => p && ({ ...p, employee_id: Number(v) }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{employees.map(e => <SelectItem key={e.id} value={String(e.id)}>{e.employee_code} — {e.first_name} {e.last_name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5"><Label>Task</Label>
                  <Select value={editRow?.task ?? "Picking"} onValueChange={v => setEditRow(p => p && ({ ...p, task: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{["Picking", "Packing", "Receiving", "Cycle Count", "Putaway"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </>
            )}
            <div className="space-y-1.5"><Label>Daily Target (Units)</Label><Input type="number" value={newTarget} onChange={e => setNewTarget(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsGoalOpen(false)}>Cancel</Button>
            <Button className="bg-black text-white hover:bg-neutral-800" onClick={handleSaveGoal}>Save Goal</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ─── 4. Attendance ─────────────────────────────────────────────────────────────
const toDateStr = (d: Date) => d.toISOString().slice(0, 10);

export const AttendanceSection = () => {
  const { data: records = [], isLoading } = useAttendanceRecords();
  const { data: employees = [] } = useEmployees();
  const createRecord = useCreateAttendanceRecord();
  const updateRecord = useUpdateAttendanceRecord();

  const [isManualOpen, setIsManualOpen] = useState(false);
  const [form, setForm] = useState({ employee_id: "", clockIn: "", clockOut: "", notes: "" });
  const [dateFilter, setDateFilter] = useState(toDateStr(new Date()));

  const dayRows = records.filter(r => r.work_date && r.work_date.slice(0, 10) === dateFilter);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { Present: 0, Absent: 0, Late: 0 };
    dayRows.forEach(r => { counts[r.status] = (counts[r.status] || 0) + 1; });
    return Object.entries(counts).map(([status, count]) => ({ status, count }));
  }, [dayRows]);

  const handleManual = async () => {
    if (!form.employee_id) return;
    const existing = dayRows.find(r => r.employee_id === Number(form.employee_id));
    const [h1, m1] = form.clockIn.split(":").map(Number);
    const [h2, m2] = form.clockOut.split(":").map(Number);
    const base = new Date(dateFilter + "T00:00:00");
    const clockIn = form.clockIn ? new Date(base.getFullYear(), base.getMonth(), base.getDate(), h1, m1).toISOString() : null;
    const clockOut = form.clockOut ? new Date(base.getFullYear(), base.getMonth(), base.getDate(), h2, m2).toISOString() : null;
    const payload = { employee_id: Number(form.employee_id), work_date: base.toISOString(), clock_in: clockIn, clock_out: clockOut, status: "Present", notes: form.notes || null };
    if (existing) {
      await updateRecord.mutateAsync({ id: existing.id, payload });
    } else {
      await createRecord.mutateAsync(payload);
    }
    setIsManualOpen(false);
    setForm({ employee_id: "", clockIn: "", clockOut: "", notes: "" });
  };

  const openCorrect = (r: typeof dayRows[number]) => {
    setForm({
      employee_id: String(r.employee_id),
      clockIn: r.clock_in ? new Date(r.clock_in).toTimeString().slice(0, 5) : "",
      clockOut: r.clock_out ? new Date(r.clock_out).toTimeString().slice(0, 5) : "",
      notes: r.notes || "",
    });
    setIsManualOpen(true);
  };

  const hoursBetween = (a: string | null, b: string | null) => {
    if (!a || !b) return "—";
    const ms = new Date(b).getTime() - new Date(a).getTime();
    const h = Math.floor(ms / 3_600_000);
    const m = Math.round((ms % 3_600_000) / 60_000);
    return `${h}h ${m}m`;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div><h2 className="text-xl font-bold">Attendance</h2><p className="text-sm text-muted-foreground">Daily attendance records, clock-in/out and exceptions.</p></div>
        <Button size="sm" className="bg-black text-white hover:bg-neutral-800" onClick={() => { setForm({ employee_id: "", clockIn: "", clockOut: "", notes: "" }); setIsManualOpen(true); }}><Plus className="mr-1.5 h-3.5 w-3.5" />Manual Entry</Button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Present", value: dayRows.filter(r => r.status === "Present").length, color: "text-green-600 bg-green-50 border-green-100" },
          { label: "Absent", value: dayRows.filter(r => r.status === "Absent").length, color: "text-red-600 bg-red-50 border-red-100" },
          { label: "Late", value: dayRows.filter(r => r.status === "Late").length, color: "text-orange-600 bg-orange-50 border-orange-100" },
          { label: "Attendance Rate", value: dayRows.length ? `${Math.round((dayRows.filter(r => r.status === "Present" || r.status === "Late").length / dayRows.length) * 100)}%` : "—", color: "text-[#009FE3] bg-blue-50 border-blue-100" },
        ].map(k => <Card key={k.label} className={`border ${k.color}`}><CardContent className="pt-4 pb-4"><p className="text-xs font-medium uppercase">{k.label}</p><p className="text-2xl font-bold mt-0.5">{k.value}</p></CardContent></Card>)}
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold uppercase text-muted-foreground">Attendance Breakdown — {dateFilter}</CardTitle></CardHeader>
        <CardContent className="h-[200px]">
          {statusCounts.every(s => s.count === 0) ? (
            <div className="h-full flex items-center justify-center text-sm text-muted-foreground">No records for this date.</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusCounts}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="status" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 8, border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {statusCounts.map((s, i) => <Cell key={i} fill={s.status === "Present" ? "#10b981" : s.status === "Late" ? "#f59e0b" : "#ef4444"} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center gap-2">
        <Label className="text-sm font-medium">Date:</Label>
        <Input type="date" className="w-40 h-9" value={dateFilter} onChange={e => setDateFilter(e.target.value)} />
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow className="bg-slate-50">
              <TableHead>Emp ID</TableHead><TableHead>Name</TableHead><TableHead>Dept</TableHead>
              <TableHead>Shift</TableHead><TableHead>Clock In</TableHead><TableHead>Clock Out</TableHead>
              <TableHead>Hours</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Action</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
              ) : dayRows.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No records for this date.</TableCell></TableRow>
              ) : dayRows.map(r => {
                const emp = employees.find(e => e.id === r.employee_id);
                return (
                  <TableRow key={r.id} className="hover:bg-slate-50/60">
                    <TableCell className="font-mono text-xs font-semibold text-[#009FE3]">{empCode(employees, r.employee_id)}</TableCell>
                    <TableCell className="font-medium">{empName(employees, r.employee_id)}</TableCell>
                    <TableCell className="text-sm">{emp?.department || "—"}</TableCell>
                    <TableCell className="text-sm">{emp?.shift || "—"}</TableCell>
                    <TableCell className="text-sm font-medium">{r.clock_in ? new Date(r.clock_in).toTimeString().slice(0, 5) : "—"}</TableCell>
                    <TableCell className="text-sm font-medium">{r.clock_out ? new Date(r.clock_out).toTimeString().slice(0, 5) : "—"}</TableCell>
                    <TableCell className="text-sm">{hoursBetween(r.clock_in, r.clock_out)}</TableCell>
                    <TableCell><span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusBadge(r.status)}`}>{r.status}</span></TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => openCorrect(r)}>Correct</Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isManualOpen} onOpenChange={setIsManualOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader><DialogTitle>Manual Attendance Entry</DialogTitle><DialogDescription>Correct or add a clock-in/out record for {dateFilter}.</DialogDescription></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-1.5"><Label>Employee</Label>
              <Select value={form.employee_id} onValueChange={v => setForm(p => ({ ...p, employee_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>{employees.map(e => <SelectItem key={e.id} value={String(e.id)}>{e.employee_code} — {e.first_name} {e.last_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>Clock In</Label><Input type="time" value={form.clockIn} onChange={e => setForm(p => ({ ...p, clockIn: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>Clock Out</Label><Input type="time" value={form.clockOut} onChange={e => setForm(p => ({ ...p, clockOut: e.target.value }))} /></div>
            </div>
            <div className="space-y-1.5"><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Reason for manual entry…" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsManualOpen(false)}>Cancel</Button>
            <Button className="bg-black text-white hover:bg-neutral-800" onClick={handleManual}>Save Entry</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ─── 5. Allocation ─────────────────────────────────────────────────────────────
const emptyZoneForm = { zone_name: "", task_type: "Outbound", shift: "Morning", assigned: "0", capacity: "0" };

export const LaborAllocationSection = () => {
  const { data: rows = [], isLoading } = useZoneAllocations();
  const createZone = useCreateZoneAllocation();
  const updateZone = useUpdateZoneAllocation();
  const deleteZone = useDeleteZoneAllocation();

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selected, setSelected] = useState<{ id: number; zone_name: string; capacity: number } | null>(null);
  const [newAssigned, setNewAssigned] = useState("");
  const [form, setForm] = useState(emptyZoneForm);

  const handleSave = async () => {
    if (!selected) return;
    await updateZone.mutateAsync({ id: selected.id, payload: { assigned: Math.min(parseInt(newAssigned, 10) || 0, selected.capacity) } });
    setIsEditOpen(false);
  };

  const handleCreate = async () => {
    await createZone.mutateAsync({ zone_name: form.zone_name, task_type: form.task_type, shift: form.shift, assigned: Number(form.assigned) || 0, capacity: Number(form.capacity) || 0 });
    setIsCreateOpen(false);
    setForm(emptyZoneForm);
  };

  const totalAssigned = rows.reduce((s, r) => s + r.assigned, 0);
  const totalCapacity = rows.reduce((s, r) => s + r.capacity, 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div><h2 className="text-xl font-bold">Allocation</h2><p className="text-sm text-muted-foreground">Manage and optimize workforce distribution across zones.</p></div>
        <Button size="sm" className="bg-black text-white hover:bg-neutral-800" onClick={() => { setForm(emptyZoneForm); setIsCreateOpen(true); }}><Plus className="mr-1.5 h-3.5 w-3.5" />Add Zone</Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Workforce", value: totalAssigned },
          { label: "Total Capacity", value: totalCapacity },
          { label: "Utilization", value: totalCapacity ? `${Math.round((totalAssigned / totalCapacity) * 100)}%` : "—" },
        ].map(k => (
          <Card key={k.label} className="border-0 shadow-sm">
            <CardContent className="pt-4 pb-4"><p className="text-xs text-muted-foreground font-medium uppercase">{k.label}</p><p className="text-2xl font-bold mt-0.5">{k.value}</p></CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow className="bg-slate-50">
              <TableHead>Zone / Area</TableHead><TableHead>Task Type</TableHead><TableHead>Shift</TableHead>
              <TableHead>Assigned</TableHead><TableHead>Capacity</TableHead><TableHead>Utilization</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
              ) : rows.map(r => {
                const pct = r.capacity ? Math.round((r.assigned / r.capacity) * 100) : 0;
                return (
                  <TableRow key={r.id} className="hover:bg-slate-50/60">
                    <TableCell className="font-medium">{r.zone_name}</TableCell>
                    <TableCell className="text-sm">{r.task_type}</TableCell>
                    <TableCell className="text-sm">{r.shift}</TableCell>
                    <TableCell className="font-semibold">{r.assigned}</TableCell>
                    <TableCell>{r.capacity}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-slate-100 rounded-full h-1.5">
                          <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, background: pct >= 95 ? "#ef4444" : pct >= 80 ? "#f59e0b" : "#10b981" }} />
                        </div>
                        <span className="text-xs font-medium">{pct}%</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { setSelected(r); setNewAssigned(String(r.assigned)); setIsEditOpen(true); }}>
                          <Pencil className="mr-1 h-3 w-3" />Edit
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:bg-red-50" onClick={() => deleteZone.mutate(r.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[360px]">
          <DialogHeader><DialogTitle>Edit Allocation</DialogTitle><DialogDescription>{selected?.zone_name}</DialogDescription></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1.5"><Label>Assigned Workers</Label><Input type="number" value={newAssigned} onChange={e => setNewAssigned(e.target.value)} min={0} max={selected?.capacity} /></div>
            <p className="text-xs text-muted-foreground">Max capacity: {selected?.capacity}</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
            <Button className="bg-black text-white hover:bg-neutral-800" onClick={handleSave}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader><DialogTitle>Add Zone</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-1.5"><Label>Zone / Area Name</Label><Input value={form.zone_name} onChange={e => setForm(p => ({ ...p, zone_name: e.target.value }))} placeholder="e.g. Cross-Dock Staging" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>Task Type</Label>
                <Select value={form.task_type} onValueChange={v => setForm(p => ({ ...p, task_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["Inbound", "Outbound", "Inventory"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>Shift</Label>
                <Select value={form.shift} onValueChange={v => setForm(p => ({ ...p, shift: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["Morning", "Afternoon", "Night"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>Assigned</Label><Input type="number" value={form.assigned} onChange={e => setForm(p => ({ ...p, assigned: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>Capacity</Label><Input type="number" value={form.capacity} onChange={e => setForm(p => ({ ...p, capacity: e.target.value }))} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button className="bg-black text-white hover:bg-neutral-800" onClick={handleCreate}>Add Zone</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ─── 6. Productivity ──────────────────────────────────────────────────────────
export const LaborProductivitySection = () => {
  const { data: employees = [] } = useEmployees();
  const { data: logs = [] } = useShiftLogs();
  const { data: goals = [] } = usePerformanceGoals();

  const activityUnits = useMemo(() => {
    const totals: Record<string, number> = {};
    logs.forEach(l => { totals[l.activity] = (totals[l.activity] || 0) + l.units_completed; });
    return Object.entries(totals).map(([activity, units]) => ({ activity, units }));
  }, [logs]);

  const statusDist = useMemo(() => {
    const counts: Record<string, number> = {};
    employees.forEach(e => { counts[e.status] = (counts[e.status] || 0) + 1; });
    return Object.entries(counts).map(([name, value], i) => ({ name, value, fill: PIE_COLORS[i % PIE_COLORS.length] }));
  }, [employees]);

  const perfRows = useMemo(() => goals.map(g => {
    const actual = logs.filter(l => l.employee_id === g.employee_id && l.activity === g.task).reduce((s, l) => s + l.units_completed, 0);
    const efficiency = g.target > 0 ? Math.round((actual / g.target) * 100) : 0;
    return { ...g, efficiency };
  }), [goals, logs]);

  const avgEfficiency = perfRows.length ? Math.round(perfRows.reduce((s, r) => s + r.efficiency, 0) / perfRows.length) : null;
  const unitsProcessed = logs.reduce((s, l) => s + l.units_completed, 0);
  const activeCount = employees.filter(e => e.status === "Active").length;
  const onLeaveCount = employees.filter(e => e.status === "On Leave").length;

  const best = perfRows.length ? perfRows.reduce((a, b) => (b.efficiency > a.efficiency ? b : a)) : null;
  const worst = perfRows.length ? perfRows.reduce((a, b) => (b.efficiency < a.efficiency ? b : a)) : null;

  const deptBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    employees.forEach(e => { const d = e.department || "Unassigned"; counts[d] = (counts[d] || 0) + 1; });
    const total = employees.length || 1;
    return Object.entries(counts).map(([dept, count]) => ({ dept, count, pct: Math.round((count / total) * 100) }));
  }, [employees]);

  return (
    <div className="space-y-6">
      <div><h2 className="text-xl font-bold">Productivity Analytics</h2><p className="text-sm text-muted-foreground">Live labor performance trends computed from tracking, attendance and goal data.</p></div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Avg Efficiency (Goals)", value: avgEfficiency !== null ? `${avgEfficiency}%` : "—" },
          { label: "Units Processed", value: unitsProcessed.toLocaleString() },
          { label: "Active Employees", value: String(activeCount) },
          { label: "On Leave", value: String(onLeaveCount) },
        ].map(k => (
          <Card key={k.label} className="border-0 shadow-sm">
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{k.label}</p>
              <p className="text-2xl font-bold mt-0.5">{k.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold uppercase text-muted-foreground">Units Completed by Activity</CardTitle></CardHeader>
          <CardContent className="h-[220px]">
            {activityUnits.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">No activity logged yet.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={activityUnits}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="activity" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                  <YAxis axisLine={false} tickLine={false} allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }} />
                  <Bar dataKey="units" fill="#009FE3" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold uppercase text-muted-foreground">Performance Highlights</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {best ? (
              <div className="p-3 bg-green-50 rounded-lg border border-green-100">
                <p className="text-xs font-bold text-green-700 uppercase">Top Performer</p>
                <p className="text-lg font-bold text-green-900">{empName(employees, best.employee_id)} — {best.efficiency}%</p>
                <p className="text-xs text-green-600">{best.task}</p>
              </div>
            ) : (
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-sm text-muted-foreground">No goals set yet.</div>
            )}
            {worst && worst !== best ? (
              <div className="p-3 bg-amber-50 rounded-lg border border-amber-100">
                <p className="text-xs font-bold text-amber-700 uppercase">Needs Attention</p>
                <p className="text-lg font-bold text-amber-900">{empName(employees, worst.employee_id)} — {worst.efficiency}%</p>
                <p className="text-xs text-amber-600">{worst.task}</p>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold uppercase text-muted-foreground">Workforce Status</CardTitle></CardHeader>
          <CardContent className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusDist} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} paddingAngle={4}>
                  {statusDist.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 8, border: "none" }} />
                <Legend iconSize={10} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-base font-semibold">Employees by Department</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader><TableRow className="bg-slate-50">
                <TableHead>Department</TableHead><TableHead>Employees</TableHead><TableHead>% of Total</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {deptBreakdown.length === 0 ? (
                  <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground">No employees yet.</TableCell></TableRow>
                ) : deptBreakdown.map(d => (
                  <TableRow key={d.dept} className="hover:bg-slate-50/60">
                    <TableCell className="font-medium text-sm">{d.dept}</TableCell>
                    <TableCell className="text-sm">{d.count}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{d.pct}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
