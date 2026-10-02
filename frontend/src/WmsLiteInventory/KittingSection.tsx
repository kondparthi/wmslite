import React, { useMemo, useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Package, PlusCircle, Wrench, Loader2 } from "lucide-react";
import {
  useMasterDataList,
  useMasterDataCreate,
  useMasterDataUpdate,
} from "@/hooks/useMasterDataApi";

const KITS_RESOURCE = "/operations/kitting-orders";
const MATERIALS_RESOURCE = "/master-data/materials";

interface MaterialRecord { id: number; sku: string; }

interface KittingOrder {
  id: number;
  order_number: string;
  kit_material_id: number;
  qty: number;
  components_json: string | null;
  status: string;
  priority: string;
}

const KittingSection = () => {
  const { data: orders = [], isLoading } = useMasterDataList<KittingOrder>(KITS_RESOURCE);
  const { data: materials = [] } = useMasterDataList<MaterialRecord>(MATERIALS_RESOURCE);
  const createOrder = useMasterDataCreate<KittingOrder>(KITS_RESOURCE);
  const updateOrder = useMasterDataUpdate<KittingOrder>(KITS_RESOURCE);

  const materialById = useMemo(() => new Map(materials.map(m => [m.id, m.sku])), [materials]);

  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState({ order_number: "", kit_material_id: "", qty: "", priority: "Medium" });
  const [error, setError] = useState<string | null>(null);

  const componentCount = (order: KittingOrder) => {
    try {
      return order.components_json ? JSON.parse(order.components_json).length : 0;
    } catch {
      return 0;
    }
  };

  const handleSave = async () => {
    setError(null);
    if (!form.order_number || !form.kit_material_id || !form.qty) {
      setError("Order number, kit SKU and quantity are required.");
      return;
    }
    try {
      await createOrder.mutateAsync({
        order_number: form.order_number,
        kit_material_id: Number(form.kit_material_id),
        qty: Number(form.qty),
        components_json: null,
        status: "Scheduled",
        priority: form.priority,
      });
      setForm({ order_number: "", kit_material_id: "", qty: "", priority: "Medium" });
      setIsOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create VAS order.");
    }
  };

  const advanceStatus = (o: KittingOrder) => {
    const next = o.status === "Scheduled" ? "Production" : "Completed";
    updateOrder.mutate({ id: o.id, payload: { status: next } });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-neutral-200">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 rounded-lg text-purple-600">
            <Wrench className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-bold">Kitting & VAS (Value Added Services)</h3>
            <p className="text-neutral-500 text-xs">Create kits, bundles, or perform specialized labeling and packing.</p>
          </div>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="bg-neutral-900 text-white flex items-center gap-2">
              <PlusCircle className="h-4 w-4" /> Create VAS Order
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Create Kitting / VAS Order</DialogTitle>
              <DialogDescription>
                The kit SKU is a Master Data material — set up its component list from Master Data once BOM support is added; this phase tracks the kit-level order.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="ono" className="text-right">Order #</Label>
                <Input id="ono" className="col-span-3" value={form.order_number} onChange={e => setForm(f => ({ ...f, order_number: e.target.value }))} placeholder="KIT-XXX" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Kit SKU</Label>
                <div className="col-span-3">
                  <Select value={form.kit_material_id} onValueChange={v => setForm(f => ({ ...f, kit_material_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select material..." /></SelectTrigger>
                    <SelectContent>{materials.map(m => <SelectItem key={m.id} value={String(m.id)}>{m.sku}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="oqty" className="text-right">Quantity</Label>
                <Input id="oqty" type="number" min="0" className="col-span-3" value={form.qty} onChange={e => setForm(f => ({ ...f, qty: e.target.value }))} />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Priority</Label>
                <div className="col-span-3">
                  <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Low">Low</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="High">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {error && <p className="text-xs text-red-600 col-span-4">{error}</p>}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={createOrder.isPending}>
                {createOrder.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Order"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
        <Table>
          <TableHeader className="bg-neutral-50">
            <TableRow>
              <TableHead>Order ID</TableHead>
              <TableHead>Kit SKU</TableHead>
              <TableHead className="text-right">Quantity</TableHead>
              <TableHead className="text-right">Components</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-neutral-400"><Loader2 className="h-4 w-4 animate-spin inline mr-2" />Loading orders...</TableCell></TableRow>
            ) : orders.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-neutral-400">No kitting orders yet.</TableCell></TableRow>
            ) : orders.map((order) => (
              <TableRow key={order.id}>
                <TableCell className="font-mono text-xs">{order.order_number}</TableCell>
                <TableCell className="font-medium text-blue-600">{materialById.get(order.kit_material_id) || `#${order.kit_material_id}`}</TableCell>
                <TableCell className="text-right">{order.qty}</TableCell>
                <TableCell className="text-right">{componentCount(order)} items</TableCell>
                <TableCell>
                   <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium uppercase ${
                    order.status === 'Production' ? 'bg-orange-100 text-orange-700' :
                    order.status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {order.status}
                  </span>
                </TableCell>
                <TableCell>
                  <span className={`text-xs ${order.priority === 'High' ? 'text-red-600 font-bold' : 'text-neutral-500'}`}>
                    {order.priority}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  {order.status !== "Completed" && (
                    <Button variant="outline" size="sm" onClick={() => advanceStatus(order)} disabled={updateOrder.isPending}>
                      {order.status === "Scheduled" ? "Start Production" : "Mark Completed"}
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default KittingSection;
