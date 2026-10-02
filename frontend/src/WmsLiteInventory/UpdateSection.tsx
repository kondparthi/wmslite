import React, { useMemo, useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Edit2, ArrowRight, Loader2 } from "lucide-react";
import { useMasterDataList } from "@/hooks/useMasterDataApi";
import { useInventoryTransactions, useTransferInventory } from "@/hooks/useInventoryOpsApi";

const MATERIALS_RESOURCE = "/master-data/materials";
const LOCATIONS_RESOURCE = "/master-data/locations";

interface MaterialRecord { id: number; sku: string; }
interface LocationRecord { id: number; code: string; }

const UpdateSection = () => {
  // Same underlying data as Movement (a Transfer transaction), filtered to
  // the ones applied immediately rather than queued — this tab is for an
  // instant location correction, not a tracked in-transit move.
  const { data: allTransfers = [], isLoading } = useInventoryTransactions("Transfer");
  const { data: materials = [] } = useMasterDataList<MaterialRecord>(MATERIALS_RESOURCE);
  const { data: locations = [] } = useMasterDataList<LocationRecord>(LOCATIONS_RESOURCE);
  const transferInventory = useTransferInventory();

  const materialById = useMemo(() => new Map(materials.map(m => [m.id, m.sku])), [materials]);
  const locationById = useMemo(() => new Map(locations.map(l => [l.id, l.code])), [locations]);

  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState({ material_id: "", from_location_id: "", to_location_id: "", qty: "" });
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setError(null);
    if (!form.material_id || !form.from_location_id || !form.to_location_id || !form.qty) {
      setError("All fields are required.");
      return;
    }
    if (form.from_location_id === form.to_location_id) {
      setError("From and To locations must be different.");
      return;
    }
    try {
      await transferInventory.mutateAsync({
        material_id: Number(form.material_id),
        from_location_id: Number(form.from_location_id),
        to_location_id: Number(form.to_location_id),
        qty: Number(form.qty),
        immediate: true, // Update = applied right away, no In-Transit state
      });
      setForm({ material_id: "", from_location_id: "", to_location_id: "", qty: "" });
      setIsOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not complete transfer.");
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-neutral-900 p-4 rounded-xl text-white flex justify-between items-center">
        <div>
          <h3 className="font-semibold text-lg">Internal Transfer / Update</h3>
          <p className="text-neutral-400 text-sm">Move stock between locations immediately — no in-transit tracking.</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button variant="secondary" className="flex items-center gap-2">
              <Edit2 className="h-4 w-4" /> New Transfer
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Immediate Location Transfer</DialogTitle>
              <DialogDescription>Applies to inventory balances right away.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Material</Label>
                <div className="col-span-3">
                  <Select value={form.material_id} onValueChange={v => setForm(f => ({ ...f, material_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select SKU..." /></SelectTrigger>
                    <SelectContent>{materials.map(m => <SelectItem key={m.id} value={String(m.id)}>{m.sku}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">From</Label>
                <div className="col-span-3">
                  <Select value={form.from_location_id} onValueChange={v => setForm(f => ({ ...f, from_location_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="From location..." /></SelectTrigger>
                    <SelectContent>{locations.map(l => <SelectItem key={l.id} value={String(l.id)}>{l.code}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">To</Label>
                <div className="col-span-3">
                  <Select value={form.to_location_id} onValueChange={v => setForm(f => ({ ...f, to_location_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="To location..." /></SelectTrigger>
                    <SelectContent>{locations.map(l => <SelectItem key={l.id} value={String(l.id)}>{l.code}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="uqty" className="text-right">Quantity</Label>
                <Input id="uqty" type="number" min="0" className="col-span-3" value={form.qty} onChange={e => setForm(f => ({ ...f, qty: e.target.value }))} />
              </div>
              {error && <p className="text-xs text-red-600 col-span-4">{error}</p>}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={transferInventory.isPending}>
                {transferInventory.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Transfer Now"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
        <Table>
          <TableHeader className="bg-neutral-50">
            <TableRow>
              <TableHead className="font-semibold">Update ID</TableHead>
              <TableHead className="font-semibold">SKU</TableHead>
              <TableHead className="font-semibold">Transfer Flow</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="text-right font-semibold">Qty</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-neutral-400"><Loader2 className="h-4 w-4 animate-spin inline mr-2" />Loading...</TableCell></TableRow>
            ) : allTransfers.filter(t => t.status === "Completed").length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-neutral-400">No completed transfers yet.</TableCell></TableRow>
            ) : allTransfers.filter(t => t.status === "Completed").map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-mono text-xs">UPD-{String(item.id).padStart(4, "0")}</TableCell>
                <TableCell className="font-medium">{materialById.get(item.material_id) || `#${item.material_id}`}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-mono bg-neutral-100 px-1.5 py-0.5 rounded">{locationById.get(item.location_id) || `#${item.location_id}`}</span>
                    <ArrowRight className="h-3 w-3 text-neutral-400" />
                    <span className="font-mono bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">{item.to_location_id ? (locationById.get(item.to_location_id) || `#${item.to_location_id}`) : "—"}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium uppercase bg-green-100 text-green-700">Completed</span>
                </TableCell>
                <TableCell className="text-right">{item.qty}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default UpdateSection;
