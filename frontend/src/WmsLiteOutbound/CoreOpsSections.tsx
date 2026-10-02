import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Search, Plus, Download, Pencil, Trash2, Eye, Package, Truck, Clock,
  CheckCircle2, RefreshCw, Layers,
} from "lucide-react";
import { useMasterDataList, useMasterDataCreate, useMasterDataUpdate, useMasterDataDelete } from "@/hooks/useMasterDataApi";
import {
  useOutboundOrders, useOutboundOrderLines, useCreateOutboundOrder, useUpdateOutboundOrder, useDeleteOutboundOrder,
  useAllocateLine, useAutoAllocateAll,
} from "@/hooks/useOutboundOpsApi";

const statusColor: Record<string, string> = {
  Pending: "bg-slate-100 text-slate-700",
  Allocated: "bg-blue-100 text-blue-700",
  Picking: "bg-amber-100 text-amber-700",
  Packed: "bg-purple-100 text-purple-700",
  Shipped: "bg-green-100 text-green-700",
  Cancelled: "bg-red-100 text-red-700",
};
const priorityColor: Record<string, string> = {
  Urgent: "bg-red-100 text-red-700",
  High: "bg-orange-100 text-orange-700",
  Normal: "bg-blue-100 text-blue-700",
  Low: "bg-slate-100 text-slate-600",
};

interface MaterialRecord { id: number; sku: string; description: string; }
interface CarrierRecord { id: number; name: string; }
interface ShipToRecord { id: number; name: string; party_type: string; }

// ─── Shipment Orders ────────────────────────────────────────────────────────
export const ShipmentOrderSection = () => {
  const { data: orders = [], isLoading } = useOutboundOrders();
  const { data: materials = [] } = useMasterDataList<MaterialRecord>("/master-data/materials");
  const { data: carriers = [] } = useMasterDataList<CarrierRecord>("/master-data/carriers");
  const { data: shipTos = [] } = useMasterDataList<ShipToRecord>("/master-data/ship-to-from");
  const createOrder = useCreateOutboundOrder();
  const updateOrder = useUpdateOutboundOrder();
  const deleteOrder = useDeleteOutboundOrder();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const emptyForm = { order_number: "", ship_to_id: "", carrier_id: "", priority: "Normal", required_date: "", notes: "", material_id: "", qty_ordered: "" };
  const [form, setForm] = useState(emptyForm);
  const [editForm, setEditForm] = useState({ priority: "Normal", status: "Pending", required_date: "" });

  const shipToById = useMemo(() => new Map(shipTos.filter(s => s.party_type === "Ship To").map(s => [s.id, s.name])), [shipTos]);
  const carrierById = useMemo(() => new Map(carriers.map(c => [c.id, c.name])), [carriers]);
  const { data: viewLines = [] } = useOutboundOrderLines(selectedOrder?.id);
  const materialSkuById = useMemo(() => new Map(materials.map(m => [m.id, m.sku])), [materials]);

  const filtered = orders.filter(o =>
    (statusFilter === "All" || o.status === statusFilter) &&
    (o.order_number.toLowerCase().includes(search.toLowerCase()))
  );

  const kpiData = [
    { label: "Pending", value: orders.filter(o => o.status === "Pending").length, icon: Clock, color: "#94a3b8" },
    { label: "Allocated", value: orders.filter(o => o.status === "Allocated").length, icon: Package, color: "#3b82f6" },
    { label: "Picking", value: orders.filter(o => o.status === "Picking").length, icon: Layers, color: "#f59e0b" },
    { label: "Packed", value: orders.filter(o => o.status === "Packed").length, icon: CheckCircle2, color: "#8b5cf6" },
    { label: "Shipped", value: orders.filter(o => o.status === "Shipped").length, icon: Truck, color: "#10b981" },
  ];

  const handleCreate = async () => {
    setFormError(null);
    if (!form.order_number || !form.material_id || !form.qty_ordered) {
      setFormError("Order number, a material and quantity are required.");
      return;
    }
    try {
      await createOrder.mutateAsync({
        order_number: form.order_number,
        ship_to_id: form.ship_to_id ? Number(form.ship_to_id) : null,
        carrier_id: form.carrier_id ? Number(form.carrier_id) : null,
        priority: form.priority,
        required_date: form.required_date ? new Date(form.required_date).toISOString() : null,
        notes: form.notes || null,
        lines: [{ material_id: Number(form.material_id), qty_ordered: Number(form.qty_ordered) }],
      });
      setIsCreateOpen(false);
      setForm(emptyForm);
    } catch (err: any) {
      setFormError(err?.message || "Could not create the order.");
    }
  };

  const handleSaveEdit = async () => {
    if (!selectedOrder) return;
    await updateOrder.mutateAsync({
      id: selectedOrder.id,
      payload: { priority: editForm.priority, status: editForm.status, required_date: editForm.required_date ? new Date(editForm.required_date).toISOString() : null },
    });
    setIsEditOpen(false);
  };

  const handleDelete = async () => {
    if (!selectedOrder) return;
    await deleteOrder.mutateAsync(selectedOrder.id);
    setIsDeleteOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {kpiData.map((k) => (
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

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative w-full md:w-72">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search order number…" className="pl-8 h-9" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              {["All", "Pending", "Allocated", "Picking", "Packed", "Shipped", "Cancelled"].map(s => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={(v) => { setIsCreateOpen(v); if (!v) setFormError(null); }}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-black text-white hover:bg-neutral-800"><Plus className="mr-1.5 h-3.5 w-3.5" />Create Order</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[560px]">
            <DialogHeader>
              <DialogTitle>Create New Shipment Order</DialogTitle>
              <DialogDescription>Fill in the order header and its first line item.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {formError && <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{formError}</div>}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5 col-span-2">
                  <Label>Order Number</Label>
                  <Input placeholder="SO-2026-XXXX" value={form.order_number} onChange={e => setForm(p => ({ ...p, order_number: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Priority</Label>
                  <Select value={form.priority} onValueChange={v => setForm(p => ({ ...p, priority: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{["Urgent", "High", "Normal", "Low"].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Required Date</Label>
                  <Input type="date" value={form.required_date} onChange={e => setForm(p => ({ ...p, required_date: e.target.value }))} />
                </div>
                <div className="space-y-1.5 col-span-2">
                  <Label>Ship To</Label>
                  <Select value={form.ship_to_id} onValueChange={v => setForm(p => ({ ...p, ship_to_id: v }))}>
                    <SelectTrigger><SelectValue placeholder={shipTos.length ? "Select ship-to party" : "No Ship To parties in Master Data yet"} /></SelectTrigger>
                    <SelectContent>{shipTos.filter(s => s.party_type === "Ship To").map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 col-span-2">
                  <Label>Carrier</Label>
                  <Select value={form.carrier_id} onValueChange={v => setForm(p => ({ ...p, carrier_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select carrier" /></SelectTrigger>
                    <SelectContent>{carriers.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Material (SKU)</Label>
                  <Select value={form.material_id} onValueChange={v => setForm(p => ({ ...p, material_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select SKU" /></SelectTrigger>
                    <SelectContent>{materials.map(m => <SelectItem key={m.id} value={String(m.id)}>{m.sku} — {m.description}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Qty Ordered</Label>
                  <Input type="number" value={form.qty_ordered} onChange={e => setForm(p => ({ ...p, qty_ordered: e.target.value }))} />
                </div>
                <div className="space-y-1.5 col-span-2">
                  <Label>Notes</Label>
                  <Textarea placeholder="Any special instructions…" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
              <Button className="bg-black text-white hover:bg-neutral-800" onClick={handleCreate} disabled={createOrder.isPending}>Create Order</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold">Shipment Orders</CardTitle>
          <span className="text-xs text-muted-foreground">{filtered.length} orders</span>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead>Order ID</TableHead><TableHead>Ship To</TableHead><TableHead>Carrier</TableHead>
                <TableHead>Required Date</TableHead><TableHead>Priority</TableHead><TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No orders yet.</TableCell></TableRow>
              ) : filtered.map(order => (
                <TableRow key={order.id} className="hover:bg-slate-50/60">
                  <TableCell className="font-mono text-sm font-semibold text-[#009FE3]">{order.order_number}</TableCell>
                  <TableCell className="font-medium">{order.ship_to_id ? shipToById.get(order.ship_to_id) || `#${order.ship_to_id}` : "—"}</TableCell>
                  <TableCell className="text-sm">{order.carrier_id ? carrierById.get(order.carrier_id) || `#${order.carrier_id}` : "—"}</TableCell>
                  <TableCell className="text-sm">{order.required_date ? new Date(order.required_date).toLocaleDateString() : "—"}</TableCell>
                  <TableCell><span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${priorityColor[order.priority]}`}>{order.priority}</span></TableCell>
                  <TableCell><span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor[order.status]}`}>{order.status}</span></TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setSelectedOrder(order); setIsViewOpen(true); }}><Eye className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setSelectedOrder(order); setEditForm({ priority: order.priority, status: order.status, required_date: order.required_date?.slice(0, 10) || "" }); setIsEditOpen(true); }}><Pencil className="h-3.5 w-3.5" /></Button>
                      {(order.status === "Pending" || order.status === "Cancelled") && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => { setSelectedOrder(order); setIsDeleteOpen(true); }}><Trash2 className="h-3.5 w-3.5" /></Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader><DialogTitle>Order Details — {selectedOrder?.order_number}</DialogTitle></DialogHeader>
          {selectedOrder && (
            <div className="space-y-4 py-2 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-muted-foreground text-xs">Ship To</p><p className="font-semibold">{selectedOrder.ship_to_id ? shipToById.get(selectedOrder.ship_to_id) : "—"}</p></div>
                <div><p className="text-muted-foreground text-xs">Carrier</p><p className="font-semibold">{selectedOrder.carrier_id ? carrierById.get(selectedOrder.carrier_id) : "—"}</p></div>
                <div><p className="text-muted-foreground text-xs">Required Date</p><p className="font-semibold">{selectedOrder.required_date ? new Date(selectedOrder.required_date).toLocaleDateString() : "—"}</p></div>
                <div><p className="text-muted-foreground text-xs">Priority</p><span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${priorityColor[selectedOrder.priority]}`}>{selectedOrder.priority}</span></div>
                <div className="col-span-2"><p className="text-muted-foreground text-xs">Status</p><span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor[selectedOrder.status]}`}>{selectedOrder.status}</span></div>
              </div>
              <div>
                <p className="text-muted-foreground text-xs mb-1.5">Lines</p>
                <Table>
                  <TableHeader><TableRow><TableHead>SKU</TableHead><TableHead>Ordered</TableHead><TableHead>Allocated</TableHead><TableHead>Picked</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {viewLines.map(l => (
                      <TableRow key={l.id}>
                        <TableCell className="font-mono text-xs">{materialSkuById.get(l.material_id) || `#${l.material_id}`}</TableCell>
                        <TableCell>{l.qty_ordered}</TableCell>
                        <TableCell>{l.qty_allocated}</TableCell>
                        <TableCell>{l.qty_picked}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setIsViewOpen(false)}>Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader><DialogTitle>Edit Order — {selectedOrder?.order_number}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>Priority</Label>
                <Select value={editForm.priority} onValueChange={v => setEditForm(p => ({ ...p, priority: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["Urgent", "High", "Normal", "Low"].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>Status</Label>
                <Select value={editForm.status} onValueChange={v => setEditForm(p => ({ ...p, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["Pending", "Allocated", "Picking", "Packed", "Shipped", "Cancelled"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 col-span-2"><Label>Required Date</Label><Input type="date" value={editForm.required_date} onChange={e => setEditForm(p => ({ ...p, required_date: e.target.value }))} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
            <Button className="bg-black text-white hover:bg-neutral-800" onClick={handleSaveEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Delete Order</DialogTitle>
            <DialogDescription>Are you sure you want to delete <strong>{selectedOrder?.order_number}</strong>? This cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ─── Allocation Strategies ────────────────────────────────────────────────────
const RESOURCE = "/operations/allocation-strategies";
interface StrategyRecord { id: number; name: string; method: string; scope_description: string | null; status: string; usage_count: number; }

export const AllocationStrategiesSection = () => {
  const { data: rows = [], isLoading } = useMasterDataList<StrategyRecord>(RESOURCE);
  const createStrategy = useMasterDataCreate<StrategyRecord>(RESOURCE);
  const updateStrategy = useMasterDataUpdate<StrategyRecord>(RESOURCE);
  const deleteStrategy = useMasterDataDelete(RESOURCE);

  const [isOpen, setIsOpen] = useState(false);
  const [editRow, setEditRow] = useState<StrategyRecord | null>(null);
  const [form, setForm] = useState({ name: "", method: "FIFO", scope_description: "", status: "Active" });

  const handleSave = async () => {
    if (editRow) {
      await updateStrategy.mutateAsync({ id: editRow.id, payload: form });
    } else {
      await createStrategy.mutateAsync(form);
    }
    setIsOpen(false); setEditRow(null); setForm({ name: "", method: "FIFO", scope_description: "", status: "Active" });
  };

  const openEdit = (r: StrategyRecord) => { setEditRow(r); setForm({ name: r.name, method: r.method, scope_description: r.scope_description || "", status: r.status }); setIsOpen(true); };

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center">
        <div><h2 className="text-xl font-bold">Allocation Strategies</h2><p className="text-sm text-muted-foreground">Define rules governing inventory pick sequences.</p></div>
        <Button size="sm" className="bg-black text-white hover:bg-neutral-800" onClick={() => { setEditRow(null); setForm({ name: "", method: "FIFO", scope_description: "", status: "Active" }); setIsOpen(true); }}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />New Strategy
        </Button>
      </div>
      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow className="bg-slate-50">
              <TableHead>Strategy</TableHead><TableHead>Method</TableHead><TableHead>Scope</TableHead><TableHead>Used</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
              ) : rows.map(r => (
                <TableRow key={r.id} className="hover:bg-slate-50/60">
                  <TableCell className="font-semibold">{r.name}</TableCell>
                  <TableCell className="text-sm">{r.method}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.scope_description || "—"}</TableCell>
                  <TableCell className="text-sm">{r.usage_count}</TableCell>
                  <TableCell><span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${r.status === "Active" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"}`}>{r.status}</span></TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(r)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:bg-red-50" onClick={() => deleteStrategy.mutate(r.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader><DialogTitle>{editRow ? "Edit Strategy" : "New Allocation Strategy"}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-1.5"><Label>Strategy Name</Label><Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. FEFO" /></div>
            <div className="space-y-1.5"><Label>Method</Label>
              <Select value={form.method} onValueChange={v => setForm(p => ({ ...p, method: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["FIFO", "FEFO", "LIFO", "Zone-Priority"].map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Scope / Applicability</Label><Input value={form.scope_description} onChange={e => setForm(p => ({ ...p, scope_description: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="Active">Active</SelectItem><SelectItem value="Inactive">Inactive</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button className="bg-black text-white hover:bg-neutral-800" onClick={handleSave}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ─── Allocation ────────────────────────────────────────────────────────────────
interface BalanceRecord { material_id: number; on_hand: number; allocated: number; on_hold: number; }

export const AllocationSection = () => {
  const { data: lines = [], isLoading } = useOutboundOrderLines();
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

  const openLines = lines.filter(l => l.qty_allocated < l.qty_ordered && orderById.get(l.order_id)?.status !== "Cancelled");
  const rows = openLines.map(l => {
    const remaining = l.qty_ordered - l.qty_allocated;
    const available = availableByMaterial.get(l.material_id) || 0;
    const status = available <= 0 ? "Shortage" : available < remaining ? "Partial" : "Ready";
    return { line: l, remaining, available, status };
  });

  const handleAllocate = async (lineId: number) => {
    setError(null);
    try {
      await allocateLine.mutateAsync({ order_line_id: lineId });
    } catch (err: any) {
      setError(err?.message || "Could not allocate this line.");
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center">
        <div><h2 className="text-xl font-bold">Allocation</h2><p className="text-sm text-muted-foreground">Reserve on-hand inventory against open order lines.</p></div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => autoAllocateAll.mutate()} disabled={autoAllocateAll.isPending}>
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />Auto-Allocate All
          </Button>
        </div>
      </div>
      {error && <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Ready", value: rows.filter(r => r.status === "Ready").length, color: "bg-green-50 border-green-200 text-green-700" },
          { label: "Partial", value: rows.filter(r => r.status === "Partial").length, color: "bg-orange-50 border-orange-200 text-orange-700" },
          { label: "Shortage", value: rows.filter(r => r.status === "Shortage").length, color: "bg-red-50 border-red-200 text-red-700" },
        ].map(k => (
          <Card key={k.label} className={`border ${k.color}`}>
            <CardContent className="pt-4 pb-4"><p className="text-xs font-medium uppercase">{k.label}</p><p className="text-2xl font-bold mt-0.5">{k.value}</p></CardContent>
          </Card>
        ))}
      </div>
      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow className="bg-slate-50">
              <TableHead>Order</TableHead><TableHead>SKU</TableHead><TableHead>Description</TableHead>
              <TableHead>Remaining</TableHead><TableHead>Available</TableHead>
              <TableHead>Status</TableHead><TableHead className="text-right">Action</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
              ) : rows.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nothing left to allocate — every open line is fully allocated.</TableCell></TableRow>
              ) : rows.map(({ line, remaining, available, status }) => {
                const mat = materialById.get(line.material_id);
                const order = orderById.get(line.order_id);
                return (
                  <TableRow key={line.id} className="hover:bg-slate-50/60">
                    <TableCell className="font-mono text-sm font-semibold text-[#009FE3]">{order?.order_number || `#${line.order_id}`}</TableCell>
                    <TableCell className="font-mono text-xs">{mat?.sku || `#${line.material_id}`}</TableCell>
                    <TableCell className="text-sm">{mat?.description || "—"}</TableCell>
                    <TableCell>{remaining}</TableCell>
                    <TableCell className={available <= 0 ? "text-red-600 font-medium" : ""}>{available}</TableCell>
                    <TableCell>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${status === "Ready" ? "bg-green-100 text-green-700" : status === "Partial" ? "bg-orange-100 text-orange-700" : "bg-red-100 text-red-700"}`}>{status}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" className="bg-black text-white hover:bg-neutral-800 h-7 text-xs" disabled={status === "Shortage" || allocateLine.isPending} onClick={() => handleAllocate(line.id)}>
                        {status === "Partial" ? "Allocate Available" : "Allocate"}
                      </Button>
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
