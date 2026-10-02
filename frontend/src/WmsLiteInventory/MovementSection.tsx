import React, { useMemo, useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, ArrowRightLeft, Loader2, CheckCircle2 } from "lucide-react";
import { useMasterDataList } from "@/hooks/useMasterDataApi";
import { useCompleteTransfer, useInventoryTransactions, useTransferInventory } from "@/hooks/useInventoryOpsApi";

const MATERIALS_RESOURCE = "/master-data/materials";
const LOCATIONS_RESOURCE = "/master-data/locations";

interface MaterialRecord { id: number; sku: string; }
interface LocationRecord { id: number; code: string; }

const MovementSection = () => {
  const { data: transfers = [], isLoading } = useInventoryTransactions("Transfer");
  const { data: materials = [] } = useMasterDataList<MaterialRecord>(MATERIALS_RESOURCE);
  const { data: locations = [] } = useMasterDataList<LocationRecord>(LOCATIONS_RESOURCE);
  const transferInventory = useTransferInventory();
  const completeTransfer = useCompleteTransfer();

  const materialById = useMemo(() => new Map(materials.map(m => [m.id, m.sku])), [materials]);
  const locationById = useMemo(() => new Map(locations.map(l => [l.id, l.code])), [locations]);

  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState({ material_id: "", from_location_id: "", to_location_id: "", qty: "" });
  const [error, setError] = useState<string | null>(null);

  const filtered = transfers.filter(t =>
    (materialById.get(t.material_id) || "").toLowerCase().includes(search.toLowerCase())
  );

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
        immediate: false, // Movement = queued, tracked "In Transit" until completed
      });
      setForm({ material_id: "", from_location_id: "", to_location_id: "", qty: "" });
      setIsOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create movement.");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
          <Input placeholder="Search SKU or Movement ID..." className="pl-9 bg-white" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2">
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button className="bg-neutral-900 text-white flex items-center gap-2">
                <ArrowRightLeft className="h-4 w-4" /> New Movement
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>New Inventory Movement</DialogTitle>
                <DialogDescription>Queue a location-to-location move — it stays "In Transit" until marked complete.</DialogDescription>
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
                  <Label htmlFor="mqty" className="text-right">Quantity</Label>
                  <Input id="mqty" type="number" min="0" className="col-span-3" value={form.qty} onChange={e => setForm(f => ({ ...f, qty: e.target.value }))} />
                </div>
                {error && <p className="text-xs text-red-600 col-span-4">{error}</p>}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                <Button onClick={handleSave} disabled={transferInventory.isPending}>
                  {transferInventory.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Movement"}
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
              <TableHead className="font-semibold">MOV ID</TableHead>
              <TableHead className="font-semibold">SKU</TableHead>
              <TableHead className="font-semibold">From Location</TableHead>
              <TableHead className="font-semibold"></TableHead>
              <TableHead className="font-semibold">To Location</TableHead>
              <TableHead className="text-right font-semibold">Qty</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="text-right font-semibold">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-neutral-400"><Loader2 className="h-4 w-4 animate-spin inline mr-2" />Loading movements...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-neutral-400">No movements yet.</TableCell></TableRow>
            ) : filtered.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-mono text-xs">MOV-{String(item.id).padStart(4, "0")}</TableCell>
                <TableCell>{materialById.get(item.material_id) || `#${item.material_id}`}</TableCell>
                <TableCell className="font-mono text-xs text-neutral-500">{locationById.get(item.location_id) || `#${item.location_id}`}</TableCell>
                <TableCell className="text-center"><ArrowRightLeft className="h-3 w-3 text-neutral-300" /></TableCell>
                <TableCell className="font-mono text-xs text-neutral-500">{item.to_location_id ? (locationById.get(item.to_location_id) || `#${item.to_location_id}`) : "—"}</TableCell>
                <TableCell className="text-right">{item.qty}</TableCell>
                <TableCell>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium uppercase ${
                    item.status === 'Completed' ? 'bg-green-100 text-green-700' :
                    item.status === 'In Transit' ? 'bg-blue-100 text-blue-700' :
                    'bg-neutral-100 text-neutral-700'
                  }`}>
                    {item.status}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  {item.status === "In Transit" && (
                    <Button variant="ghost" size="sm" className="text-green-600 hover:text-green-700 p-0 h-auto"
                      onClick={() => completeTransfer.mutate(item.id)} disabled={completeTransfer.isPending}>
                      <CheckCircle2 className="h-4 w-4 mr-1" /> Complete
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

export default MovementSection;
