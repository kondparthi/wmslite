import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Plus, Trash2, Eye, Download, RefreshCw,
} from "lucide-react";
import { useMasterDataList } from "@/hooks/useMasterDataApi";
import {
  useOutboundOrders, useOutboundOrderLines, useCreateWave, usePickTasks, useAssignPicker, useConfirmPick,
  useLoadTasks, useCreateLoadTask, useUpdateLoadTask, useDeleteLoadTask,
  usePackTasks, useCreatePackTask, useStartPack, useCompletePack,
  useShipments, useCreateShipment, useDispatchShipment, useDispatchByCode,
  useOutboundAllocations, useAllocateLine, useAutoAllocateAll, useUnallocate,
} from "@/hooks/useOutboundOpsApi";

interface MaterialRecord { id: number; sku: string; description: string; }
interface CarrierRecord { id: number; name: string; }
interface LocationRecord { id: number; code: string; }

// ─── Wave Planning ─────────────────────────────────────────────────────────────
export const WavePlanningSection = () => {
  const { data: orders = [] } = useOutboundOrders();
  const { data: pickTasks = [] } = usePickTasks();
  const createWave = useCreateWave();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [form, setForm] = useState({ name: "", max_orders: "20", assigned_pickers: "", zone_scope: "", priority_filter: "All" });
  const [result, setResult] = useState<string | null>(null);

  // Waves themselves aren't separately fetched here (no standalone GET-by-list
  // hook needed elsewhere) — this tab shows the wave-eligible orders queue
  // plus the pick tasks each completed wave generated.
  const eligible = orders.filter(o => o.status === "Allocated" && !o.wave_id);
  const wavedOrders = orders.filter(o => o.wave_id);

  const handleCreate = async () => {
    const wave = await createWave.mutateAsync({
      name: form.name || "New Wave",
      zone_scope: form.zone_scope || null,
      priority_filter: form.priority_filter,
      max_orders: parseInt(form.max_orders) || 20,
      assigned_pickers: parseInt(form.assigned_pickers) || 0,
    });
    setResult(`${wave.wave_number} created.`);
    setIsCreateOpen(false);
    setForm({ name: "", max_orders: "20", assigned_pickers: "", zone_scope: "", priority_filter: "All" });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div><h2 className="text-xl font-bold">Wave Planning</h2><p className="text-sm text-muted-foreground">Group Allocated orders into a wave and generate pick tasks for them.</p></div>
        <Button size="sm" className="bg-black text-white hover:bg-neutral-800" onClick={() => setIsCreateOpen(true)}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />Create Wave
        </Button>
      </div>
      {result && <div className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">{result}</div>}

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold uppercase text-muted-foreground">Ready to Wave ({eligible.length} orders)</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow className="bg-slate-50"><TableHead>Order</TableHead><TableHead>Priority</TableHead><TableHead>Required Date</TableHead></TableRow></TableHeader>
            <TableBody>
              {eligible.length === 0 ? (
                <TableRow><TableCell colSpan={3} className="text-center py-6 text-muted-foreground">No Allocated orders waiting for a wave right now.</TableCell></TableRow>
              ) : eligible.map(o => (
                <TableRow key={o.id}>
                  <TableCell className="font-mono text-sm font-semibold text-[#009FE3]">{o.order_number}</TableCell>
                  <TableCell className="text-sm">{o.priority}</TableCell>
                  <TableCell className="text-sm">{o.required_date ? new Date(o.required_date).toLocaleDateString() : "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold uppercase text-muted-foreground">Waved Orders</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow className="bg-slate-50"><TableHead>Order</TableHead><TableHead>Wave</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>
              {wavedOrders.length === 0 ? (
                <TableRow><TableCell colSpan={3} className="text-center py-6 text-muted-foreground">No waves created yet.</TableCell></TableRow>
              ) : wavedOrders.map(o => (
                <TableRow key={o.id}>
                  <TableCell className="font-mono text-sm font-semibold text-[#009FE3]">{o.order_number}</TableCell>
                  <TableCell className="font-mono text-xs">WV-{String(o.wave_id).padStart(4, "0")}</TableCell>
                  <TableCell><span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">{o.status}</span></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader><DialogTitle>Create New Wave</DialogTitle><DialogDescription>Pulls in Allocated orders (up to Max Orders) and creates a Ready pick task for each of their allocations.</DialogDescription></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-1.5"><Label>Wave Name</Label><Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Afternoon Priority Wave" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>Max Orders</Label><Input type="number" value={form.max_orders} onChange={e => setForm(p => ({ ...p, max_orders: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>Assigned Pickers</Label><Input type="number" value={form.assigned_pickers} onChange={e => setForm(p => ({ ...p, assigned_pickers: e.target.value }))} placeholder="5" /></div>
            </div>
            <div className="space-y-1.5"><Label>Zone Scope</Label><Input value={form.zone_scope} onChange={e => setForm(p => ({ ...p, zone_scope: e.target.value }))} placeholder="e.g. Zone A (optional)" /></div>
            <div className="space-y-1.5"><Label>Priority Filter</Label>
              <Select value={form.priority_filter} onValueChange={v => setForm(p => ({ ...p, priority_filter: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["All", "Urgent Only", "High & Urgent"].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button className="bg-black text-white hover:bg-neutral-800" onClick={handleCreate} disabled={createWave.isPending}>Create Wave</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ─── Picking ───────────────────────────────────────────────────────────────────
export const PickingSection = () => {
  const { data: tasks = [], isLoading } = usePickTasks();
  const { data: allocations = [] } = useOutboundAllocations();
  const { data: lines = [] } = useOutboundOrderLines();
  const { data: orders = [] } = useOutboundOrders();
  const { data: materials = [] } = useMasterDataList<MaterialRecord>("/master-data/materials");
  const { data: locations = [] } = useMasterDataList<LocationRecord>("/master-data/locations");
  const assignPicker = useAssignPicker();
  const confirmPick = useConfirmPick();

  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [picker, setPicker] = useState("");

  const allocById = useMemo(() => new Map(allocations.map(a => [a.id, a])), [allocations]);
  const lineById = useMemo(() => new Map(lines.map(l => [l.id, l])), [lines]);
  const orderById = useMemo(() => new Map(orders.map(o => [o.id, o])), [orders]);
  const materialById = useMemo(() => new Map(materials.map(m => [m.id, m])), [materials]);
  const locationById = useMemo(() => new Map(locations.map(l => [l.id, l.code])), [locations]);

  const statusColor: Record<string, string> = { Completed: "bg-green-100 text-green-700", "In Progress": "bg-amber-100 text-amber-700", Ready: "bg-blue-100 text-blue-700" };

  const enriched = tasks.map(t => {
    const alloc = allocById.get(t.allocation_id);
    const line = alloc ? lineById.get(alloc.order_line_id) : undefined;
    const order = line ? orderById.get(line.order_id) : undefined;
    const material = alloc ? materialById.get(alloc.material_id) : undefined;
    return { task: t, alloc, order, material };
  });

  const handleAssign = async () => {
    if (!selected) return;
    await assignPicker.mutateAsync({ id: selected.id, assignee: picker });
    setIsAssignOpen(false); setPicker("");
  };

  return (
    <div className="space-y-6">
      <div><h2 className="text-xl font-bold">Picking</h2><p className="text-sm text-muted-foreground">Pick tasks generated by released waves.</p></div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Ready", value: tasks.filter(t => t.status === "Ready").length, color: "text-blue-600 bg-blue-50 border-blue-100" },
          { label: "In Progress", value: tasks.filter(t => t.status === "In Progress").length, color: "text-amber-600 bg-amber-50 border-amber-100" },
          { label: "Completed", value: tasks.filter(t => t.status === "Completed").length, color: "text-green-600 bg-green-50 border-green-100" },
        ].map(k => (
          <Card key={k.label} className={`border ${k.color}`}><CardContent className="pt-4 pb-4"><p className="text-xs font-medium uppercase">{k.label}</p><p className="text-2xl font-bold mt-0.5">{k.value}</p></CardContent></Card>
        ))}
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow className="bg-slate-50">
              <TableHead>Task</TableHead><TableHead>Order</TableHead><TableHead>SKU</TableHead><TableHead>Location</TableHead>
              <TableHead>Qty</TableHead><TableHead>Picker</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
              ) : enriched.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No pick tasks yet — release a wave first.</TableCell></TableRow>
              ) : enriched.map(({ task, alloc, order, material }) => (
                <TableRow key={task.id} className="hover:bg-slate-50/60">
                  <TableCell className="font-mono text-sm font-semibold text-[#009FE3]">PICK-{task.id}</TableCell>
                  <TableCell className="font-mono text-xs">{order?.order_number || "—"}</TableCell>
                  <TableCell className="text-sm">{material?.sku || "—"}</TableCell>
                  <TableCell className="text-sm">{alloc ? locationById.get(alloc.location_id) || `#${alloc.location_id}` : "—"}</TableCell>
                  <TableCell>{alloc?.qty}</TableCell>
                  <TableCell className="text-sm">{task.assignee || "—"}</TableCell>
                  <TableCell><span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor[task.status]}`}>{task.status}</span></TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {task.status === "Ready" && (
                        <Button size="sm" className="h-7 text-xs bg-black text-white hover:bg-neutral-800" onClick={() => { setSelected(task); setIsAssignOpen(true); }}>Assign Picker</Button>
                      )}
                      {task.status === "In Progress" && (
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => confirmPick.mutate(task.id)} disabled={confirmPick.isPending}>Confirm Pick</Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isAssignOpen} onOpenChange={setIsAssignOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader><DialogTitle>Assign Picker — PICK-{selected?.id}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1.5"><Label>Picker Name</Label><Input value={picker} onChange={e => setPicker(e.target.value)} placeholder="e.g. John Doe" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAssignOpen(false)}>Cancel</Button>
            <Button className="bg-black text-white hover:bg-neutral-800" onClick={handleAssign} disabled={!picker || assignPicker.isPending}>Assign & Start</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ─── Unpicked / Unallocated ────────────────────────────────────────────────────
interface BalanceRecord { material_id: number; on_hand: number; allocated: number; on_hold: number; }

export const UnpickedSection = () => {
  const { data: lines = [] } = useOutboundOrderLines();
  const { data: orders = [] } = useOutboundOrders();
  const { data: materials = [] } = useMasterDataList<MaterialRecord>("/master-data/materials");
  const { data: balances = [] } = useMasterDataList<BalanceRecord>("/operations/inventory-balances");
  const allocateLine = useAllocateLine();
  const autoAllocateAll = useAutoAllocateAll();
  const [error, setError] = useState<string | null>(null);

  const orderById = useMemo(() => new Map(orders.map(o => [o.id, o])), [orders]);
  const materialById = useMemo(() => new Map(materials.map(m => [m.id, m])), [materials]);
  const availableByMaterial = useMemo(() => {
    const m = new Map<number, number>();
    balances.forEach(b => m.set(b.material_id, (m.get(b.material_id) || 0) + ((b.on_hand || 0) - (b.allocated || 0) - (b.on_hold || 0))));
    return m;
  }, [balances]);

  const rows = lines
    .filter(l => l.qty_allocated < l.qty_ordered && orderById.get(l.order_id)?.status !== "Cancelled")
    .map(l => {
      const remaining = l.qty_ordered - l.qty_allocated;
      const available = availableByMaterial.get(l.material_id) || 0;
      const reason = available <= 0 ? "Out of Stock" : available < remaining ? "Shortage" : "Not Allocated";
      return { line: l, remaining, available, reason };
    });

  const handleAllocate = async (lineId: number) => {
    setError(null);
    try { await allocateLine.mutateAsync({ order_line_id: lineId }); }
    catch (err: any) { setError(err?.message || "Could not allocate."); }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div><h2 className="text-xl font-bold">Unpicked / Unallocated</h2><p className="text-sm text-muted-foreground">Lines not yet fully allocated for fulfillment.</p></div>
        <Button size="sm" className="bg-black text-white hover:bg-neutral-800" onClick={() => autoAllocateAll.mutate()} disabled={autoAllocateAll.isPending}>
          <RefreshCw className="mr-1.5 h-3.5 w-3.5" />Re-Allocate All
        </Button>
      </div>
      {error && <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-red-100 bg-red-50"><CardContent className="pt-4"><p className="text-xs text-red-600 font-medium uppercase">Out of Stock</p><p className="text-2xl font-bold text-red-700 mt-0.5">{rows.filter(r => r.reason === "Out of Stock").length}</p></CardContent></Card>
        <Card className="border-orange-100 bg-orange-50"><CardContent className="pt-4"><p className="text-xs text-orange-600 font-medium uppercase">Shortage</p><p className="text-2xl font-bold text-orange-700 mt-0.5">{rows.filter(r => r.reason === "Shortage").length}</p></CardContent></Card>
        <Card className="border-blue-100 bg-blue-50"><CardContent className="pt-4"><p className="text-xs text-blue-600 font-medium uppercase">Not Allocated</p><p className="text-2xl font-bold text-blue-700 mt-0.5">{rows.filter(r => r.reason === "Not Allocated").length}</p></CardContent></Card>
      </div>
      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow className="bg-slate-50">
              <TableHead>Order</TableHead><TableHead>SKU</TableHead><TableHead>Description</TableHead>
              <TableHead>Remaining</TableHead><TableHead>Available</TableHead><TableHead>Reason</TableHead><TableHead className="text-right">Action</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nothing unallocated right now.</TableCell></TableRow>
              ) : rows.map(({ line, remaining, available, reason }) => {
                const mat = materialById.get(line.material_id);
                const order = orderById.get(line.order_id);
                return (
                  <TableRow key={line.id} className="hover:bg-slate-50/60">
                    <TableCell className="font-mono text-sm font-semibold text-[#009FE3]">{order?.order_number}</TableCell>
                    <TableCell className="font-mono text-xs">{mat?.sku}</TableCell>
                    <TableCell className="text-sm">{mat?.description}</TableCell>
                    <TableCell>{remaining}</TableCell>
                    <TableCell className={available === 0 ? "text-red-600 font-medium" : ""}>{available}</TableCell>
                    <TableCell><span className={`px-2 py-0.5 rounded text-xs font-medium ${reason === "Out of Stock" ? "bg-red-100 text-red-700" : reason === "Shortage" ? "bg-orange-100 text-orange-700" : "bg-blue-100 text-blue-700"}`}>{reason}</span></TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" className="h-7 text-xs bg-black text-white hover:bg-neutral-800" disabled={reason === "Out of Stock"} onClick={() => handleAllocate(line.id)}>Allocate</Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

// ─── Load & Unload ─────────────────────────────────────────────────────────────
export const LoadCreationSection = () => {
  const { data: rows = [], isLoading } = useLoadTasks();
  const { data: carriers = [] } = useMasterDataList<CarrierRecord>("/master-data/carriers");
  const createLoad = useCreateLoadTask();
  const updateLoad = useUpdateLoadTask();
  const deleteLoad = useDeleteLoadTask();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [form, setForm] = useState({ carrier_id: "", dock_door: "", eta: "" });

  const carrierById = useMemo(() => new Map(carriers.map(c => [c.id, c.name])), [carriers]);
  const statusColor: Record<string, string> = { Loading: "bg-amber-100 text-amber-700", Staged: "bg-blue-100 text-blue-700", Completed: "bg-green-100 text-green-700", Planned: "bg-slate-100 text-slate-600" };

  const handleCreate = async () => {
    await createLoad.mutateAsync({ carrier_id: form.carrier_id ? Number(form.carrier_id) : null, dock_door: form.dock_door || null, eta: form.eta || null });
    setIsCreateOpen(false); setForm({ carrier_id: "", dock_door: "", eta: "" });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div><h2 className="text-xl font-bold">Load & Unload</h2><p className="text-sm text-muted-foreground">Manage outbound load creation and dock assignments.</p></div>
        <Button size="sm" className="bg-black text-white hover:bg-neutral-800" onClick={() => setIsCreateOpen(true)}><Plus className="mr-1.5 h-3.5 w-3.5" />Create Load</Button>
      </div>
      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow className="bg-slate-50">
              <TableHead>Load ID</TableHead><TableHead>Carrier</TableHead><TableHead>Dock</TableHead><TableHead>ETA</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
              ) : rows.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No loads yet.</TableCell></TableRow>
              ) : rows.map(r => (
                <TableRow key={r.id} className="hover:bg-slate-50/60">
                  <TableCell className="font-mono text-sm font-semibold text-[#009FE3]">{r.load_number}</TableCell>
                  <TableCell className="font-medium">{r.carrier_id ? carrierById.get(r.carrier_id) : "—"}</TableCell>
                  <TableCell>{r.dock_door || "—"}</TableCell>
                  <TableCell className="text-sm">{r.eta || "—"}</TableCell>
                  <TableCell><span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor[r.status]}`}>{r.status}</span></TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {r.status === "Planned" && <Button size="sm" className="h-7 text-xs" variant="outline" onClick={() => updateLoad.mutate({ id: r.id, payload: { status: "Staged" } })}>Stage</Button>}
                      {r.status === "Staged" && <Button size="sm" className="h-7 text-xs bg-black text-white hover:bg-neutral-800" onClick={() => updateLoad.mutate({ id: r.id, payload: { status: "Loading" } })}>Start Load</Button>}
                      {r.status === "Loading" && <Button size="sm" className="h-7 text-xs" variant="outline" onClick={() => updateLoad.mutate({ id: r.id, payload: { status: "Completed" } })}>Complete</Button>}
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:bg-red-50" onClick={() => deleteLoad.mutate(r.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader><DialogTitle>Create New Load</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-1.5"><Label>Carrier</Label>
              <Select value={form.carrier_id} onValueChange={v => setForm(p => ({ ...p, carrier_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select carrier" /></SelectTrigger>
                <SelectContent>{carriers.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Dock Door</Label><Input value={form.dock_door} onChange={e => setForm(p => ({ ...p, dock_door: e.target.value }))} placeholder="e.g. Dock 3" /></div>
            <div className="space-y-1.5"><Label>Pickup ETA</Label><Input type="time" value={form.eta} onChange={e => setForm(p => ({ ...p, eta: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button className="bg-black text-white hover:bg-neutral-800" onClick={handleCreate} disabled={createLoad.isPending}>Create Load</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ─── Pack / Unpack ─────────────────────────────────────────────────────────────
export const PackUnpackSection = () => {
  const { data: rows = [], isLoading } = usePackTasks();
  const { data: orders = [] } = useOutboundOrders("Picking");
  const createPack = useCreatePackTask();
  const startPack = useStartPack();
  const completePack = useCompletePack();
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState({ order_id: "", station: "", packer: "" });

  const orderNumberByOrderId = useMemo(() => new Map(orders.map(o => [o.id, o.order_number])), [orders]);
  const statusColor: Record<string, string> = { Packed: "bg-green-100 text-green-700", Packing: "bg-amber-100 text-amber-700", Ready: "bg-blue-100 text-blue-700" };
  // Orders eligible for a new pack task: fully picked (status Picking here means picked, awaiting pack) with no existing pack task yet.
  const packedOrderIds = new Set(rows.map(r => r.order_id));
  const eligibleOrders = orders.filter(o => !packedOrderIds.has(o.id));

  const handleCreate = async () => {
    if (!form.order_id) return;
    await createPack.mutateAsync({ order_id: Number(form.order_id), station: form.station || undefined, packer: form.packer || undefined });
    setIsOpen(false); setForm({ order_id: "", station: "", packer: "" });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div><h2 className="text-xl font-bold">Pack / Unpack</h2><p className="text-sm text-muted-foreground">Manage packing station assignments and carton creation.</p></div>
        <Button size="sm" className="bg-black text-white hover:bg-neutral-800" onClick={() => setIsOpen(true)}><Plus className="mr-1.5 h-3.5 w-3.5" />New Pack Task</Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Ready to Pack", value: rows.filter(r => r.status === "Ready").length, color: "text-blue-600 bg-blue-50 border-blue-100" },
          { label: "Packing", value: rows.filter(r => r.status === "Packing").length, color: "text-amber-600 bg-amber-50 border-amber-100" },
          { label: "Packed", value: rows.filter(r => r.status === "Packed").length, color: "text-green-600 bg-green-50 border-green-100" },
        ].map(k => <Card key={k.label} className={`border ${k.color}`}><CardContent className="pt-4"><p className="text-xs font-medium uppercase">{k.label}</p><p className="text-2xl font-bold mt-0.5">{k.value}</p></CardContent></Card>)}
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow className="bg-slate-50">
              <TableHead>Pack ID</TableHead><TableHead>Order</TableHead><TableHead>Station</TableHead><TableHead>Packer</TableHead><TableHead>Progress</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
              ) : rows.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No pack tasks yet.</TableCell></TableRow>
              ) : rows.map(r => (
                <TableRow key={r.id} className="hover:bg-slate-50/60">
                  <TableCell className="font-mono text-sm font-semibold text-[#009FE3]">{r.pack_number}</TableCell>
                  <TableCell className="font-medium font-mono text-xs">{orderNumberByOrderId.get(r.order_id) || `#${r.order_id}`}</TableCell>
                  <TableCell>{r.station || "—"}</TableCell>
                  <TableCell className="text-sm">{r.packer || "—"}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-slate-100 rounded-full h-1.5"><div className="bg-[#009FE3] h-1.5 rounded-full" style={{ width: `${r.qty_items > 0 ? (r.qty_packed / r.qty_items) * 100 : 0}%` }} /></div>
                      <span className="text-xs text-muted-foreground">{r.qty_packed}/{r.qty_items}</span>
                    </div>
                  </TableCell>
                  <TableCell><span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor[r.status]}`}>{r.status}</span></TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {r.status === "Ready" && <Button size="sm" className="h-7 text-xs bg-black text-white hover:bg-neutral-800" onClick={() => startPack.mutate(r.id)}>Start Pack</Button>}
                      {r.status === "Packing" && <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => completePack.mutate(r.id)}>Complete</Button>}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader><DialogTitle>New Pack Task</DialogTitle><DialogDescription>Only fully-picked orders without a pack task yet are listed.</DialogDescription></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-1.5"><Label>Order</Label>
              <Select value={form.order_id} onValueChange={v => setForm(p => ({ ...p, order_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select order" /></SelectTrigger>
                <SelectContent>{eligibleOrders.map(o => <SelectItem key={o.id} value={String(o.id)}>{o.order_number}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Pack Station</Label><Input value={form.station} onChange={e => setForm(p => ({ ...p, station: e.target.value }))} placeholder="e.g. Station 2" /></div>
            <div className="space-y-1.5"><Label>Packer</Label><Input value={form.packer} onChange={e => setForm(p => ({ ...p, packer: e.target.value }))} placeholder="e.g. Emma Wilson" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button className="bg-black text-white hover:bg-neutral-800" onClick={handleCreate} disabled={!form.order_id || createPack.isPending}>Create Task</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ─── Ship ──────────────────────────────────────────────────────────────────────
export const ShippingSection = () => {
  const { data: shipments = [], isLoading } = useShipments();
  const { data: orders = [] } = useOutboundOrders("Packed");
  const { data: carriers = [] } = useMasterDataList<CarrierRecord>("/master-data/carriers");
  const createShipment = useCreateShipment();
  const dispatchShipment = useDispatchShipment();
  const dispatchByCode = useDispatchByCode();
  const [scanInput, setScanInput] = useState("");
  const [scanError, setScanError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState({ order_id: "", manifest_number: "", weight: "" });

  const orderNumberByOrderId = useMemo(() => new Map(orders.concat().map(o => [o.id, o.order_number])), [orders]);
  const shippedOrderIds = new Set(shipments.map(s => s.order_id));
  const eligibleOrders = orders.filter(o => !shippedOrderIds.has(o.id));

  const handleScan = async () => {
    if (!scanInput.trim()) return;
    setScanError(null);
    try {
      await dispatchByCode.mutateAsync(scanInput.trim());
      setScanInput("");
    } catch (err: any) {
      setScanError(err?.message || "No matching shipment found.");
    }
  };

  const handleCreate = async () => {
    if (!form.order_id) return;
    await createShipment.mutateAsync({ order_id: Number(form.order_id), manifest_number: form.manifest_number || undefined, weight: form.weight ? Number(form.weight) : undefined });
    setIsOpen(false); setForm({ order_id: "", manifest_number: "", weight: "" });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div><h2 className="text-xl font-bold">Ship</h2><p className="text-sm text-muted-foreground">Confirm dispatch and generate manifests.</p></div>
        <Button size="sm" className="bg-black text-white hover:bg-neutral-800" onClick={() => setIsOpen(true)}><Plus className="mr-1.5 h-3.5 w-3.5" />New Shipment</Button>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold uppercase text-muted-foreground">Scan to Confirm Dispatch</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-3 max-w-md">
            <Input placeholder="Order number, manifest, or ship number…" value={scanInput} onChange={e => setScanInput(e.target.value)} onKeyDown={e => e.key === "Enter" && handleScan()} />
            <Button className="bg-black text-white hover:bg-neutral-800" onClick={handleScan} disabled={dispatchByCode.isPending}>Confirm</Button>
          </div>
          {scanError && <p className="text-xs text-red-600 mt-2">{scanError}</p>}
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2"><CardTitle className="text-base font-semibold">Shipment Queue</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow className="bg-slate-50">
              <TableHead>Ship ID</TableHead><TableHead>Order</TableHead><TableHead>Manifest</TableHead><TableHead>Weight</TableHead><TableHead>Status</TableHead><TableHead>Dispatch Time</TableHead><TableHead className="text-right">Action</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
              ) : shipments.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No shipments yet.</TableCell></TableRow>
              ) : shipments.map(r => (
                <TableRow key={r.id} className="hover:bg-slate-50/60">
                  <TableCell className="font-mono text-sm font-semibold text-[#009FE3]">{r.ship_number}</TableCell>
                  <TableCell className="font-medium font-mono text-xs">#{r.order_id}</TableCell>
                  <TableCell className="font-mono text-xs">{r.manifest_number || "—"}</TableCell>
                  <TableCell>{r.weight ? `${r.weight} kg` : "—"}</TableCell>
                  <TableCell><span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${r.status === "Dispatched" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}`}>{r.status}</span></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.dispatched_at ? new Date(r.dispatched_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}</TableCell>
                  <TableCell className="text-right">
                    {r.status === "Ready to Ship" && <Button size="sm" className="h-7 text-xs bg-black text-white hover:bg-neutral-800" onClick={() => dispatchShipment.mutate(r.id)}>Dispatch</Button>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader><DialogTitle>New Shipment</DialogTitle><DialogDescription>Only Packed orders without a shipment yet are listed.</DialogDescription></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-1.5"><Label>Order</Label>
              <Select value={form.order_id} onValueChange={v => setForm(p => ({ ...p, order_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select order" /></SelectTrigger>
                <SelectContent>{eligibleOrders.map(o => <SelectItem key={o.id} value={String(o.id)}>{o.order_number}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Manifest Number</Label><Input value={form.manifest_number} onChange={e => setForm(p => ({ ...p, manifest_number: e.target.value }))} placeholder="e.g. MNF-2201" /></div>
            <div className="space-y-1.5"><Label>Weight (kg)</Label><Input type="number" value={form.weight} onChange={e => setForm(p => ({ ...p, weight: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button className="bg-black text-white hover:bg-neutral-800" onClick={handleCreate} disabled={!form.order_id || createShipment.isPending}>Create Shipment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
