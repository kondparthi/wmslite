import React, { useMemo, useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, Loader2 } from "lucide-react";
import { useMasterDataList } from "@/hooks/useMasterDataApi";
import { useAdjustInventory, useInventoryTransactions } from "@/hooks/useInventoryOpsApi";

const MATERIALS_RESOURCE = "/master-data/materials";
const LOCATIONS_RESOURCE = "/master-data/locations";

interface MaterialRecord { id: number; sku: string; }
interface LocationRecord { id: number; code: string; }

const AdjustmentSection = () => {
  const { data: adjustments = [], isLoading } = useInventoryTransactions("Adjustment");
  const { data: materials = [] } = useMasterDataList<MaterialRecord>(MATERIALS_RESOURCE);
  const { data: locations = [] } = useMasterDataList<LocationRecord>(LOCATIONS_RESOURCE);
  const adjustInventory = useAdjustInventory();

  const materialById = useMemo(() => new Map(materials.map(m => [m.id, m.sku])), [materials]);
  const locationById = useMemo(() => new Map(locations.map(l => [l.id, l.code])), [locations]);

  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState({ material_id: "", location_id: "", type: "Cycle Count", qty: "", direction: "add" });
  const [error, setError] = useState<string | null>(null);

  const filtered = adjustments.filter(a =>
    (materialById.get(a.material_id) || "").toLowerCase().includes(search.toLowerCase()) ||
    (a.reference || "").toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = async () => {
    setError(null);
    if (!form.material_id || !form.location_id || !form.qty) {
      setError("Material, location and quantity are required.");
      return;
    }
    const signedQty = form.direction === "subtract" ? -Math.abs(Number(form.qty)) : Math.abs(Number(form.qty));
    try {
      await adjustInventory.mutateAsync({
        material_id: Number(form.material_id),
        location_id: Number(form.location_id),
        qty: signedQty,
        reason: form.type,
      });
      setForm({ material_id: "", location_id: "", type: "Cycle Count", qty: "", direction: "add" });
      setIsOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save adjustment.");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
          <Input placeholder="Search adjustment ID or SKU..." className="pl-9 bg-white" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2">
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button className="bg-neutral-900 text-white flex items-center gap-2">
                <Plus className="h-4 w-4" /> New Adjustment
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>New Inventory Adjustment</DialogTitle>
                <DialogDescription>Correct an on-hand quantity with a reason code.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-2">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">Material</Label>
                  <div className="col-span-3">
                    <Select value={form.material_id} onValueChange={v => setForm(f => ({ ...f, material_id: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select SKU..." /></SelectTrigger>
                      <SelectContent>
                        {materials.map(m => <SelectItem key={m.id} value={String(m.id)}>{m.sku}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">Location</Label>
                  <div className="col-span-3">
                    <Select value={form.location_id} onValueChange={v => setForm(f => ({ ...f, location_id: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select location..." /></SelectTrigger>
                      <SelectContent>
                        {locations.map(l => <SelectItem key={l.id} value={String(l.id)}>{l.code}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">Reason</Label>
                  <div className="col-span-3">
                    <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Cycle Count">Cycle Count</SelectItem>
                        <SelectItem value="Damaged">Damaged</SelectItem>
                        <SelectItem value="Found Stock">Found Stock</SelectItem>
                        <SelectItem value="Expired">Expired</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">Direction</Label>
                  <div className="col-span-3">
                    <Select value={form.direction} onValueChange={v => setForm(f => ({ ...f, direction: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="add">Add (+)</SelectItem>
                        <SelectItem value="subtract">Subtract (−)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="qty" className="text-right">Quantity</Label>
                  <Input id="qty" type="number" min="0" className="col-span-3" value={form.qty} onChange={e => setForm(f => ({ ...f, qty: e.target.value }))} />
                </div>
                {error && <p className="text-xs text-red-600 col-span-4">{error}</p>}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                <Button onClick={handleSave} disabled={adjustInventory.isPending}>
                  {adjustInventory.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Adjustment"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
        <Table>
          <TableHeader className="bg-neutral-50">
            <TableRow>
              <TableHead className="font-semibold">TXN ID</TableHead>
              <TableHead className="font-semibold">SKU</TableHead>
              <TableHead className="font-semibold">Location</TableHead>
              <TableHead className="font-semibold">Reason</TableHead>
              <TableHead className="text-right font-semibold">Qty Change</TableHead>
              <TableHead className="font-semibold">Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-neutral-400"><Loader2 className="h-4 w-4 animate-spin inline mr-2" />Loading adjustments...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-neutral-400">No adjustments yet.</TableCell></TableRow>
            ) : filtered.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-mono text-xs">ADJ-{String(item.id).padStart(4, "0")}</TableCell>
                <TableCell className="font-medium">{materialById.get(item.material_id) || `#${item.material_id}`}</TableCell>
                <TableCell className="font-mono text-xs">{locationById.get(item.location_id) || `#${item.location_id}`}</TableCell>
                <TableCell>{item.reason || "—"}</TableCell>
                <TableCell className={`text-right font-bold ${item.qty < 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {item.qty > 0 ? `+${item.qty}` : item.qty}
                </TableCell>
                <TableCell className="text-neutral-500 text-xs">{new Date(item.created_at).toLocaleString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default AdjustmentSection;
