import React, { useMemo, useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Lock, Unlock, Loader2 } from "lucide-react";
import { useMasterDataList } from "@/hooks/useMasterDataApi";
import { useInventoryHolds, usePlaceHold, useReleaseHold } from "@/hooks/useInventoryOpsApi";

const MATERIALS_RESOURCE = "/master-data/materials";
const LOCATIONS_RESOURCE = "/master-data/locations";

interface MaterialRecord { id: number; sku: string; }
interface LocationRecord { id: number; code: string; }

const HoldSection = () => {
  const { data: holds = [], isLoading } = useInventoryHolds();
  const { data: materials = [] } = useMasterDataList<MaterialRecord>(MATERIALS_RESOURCE);
  const { data: locations = [] } = useMasterDataList<LocationRecord>(LOCATIONS_RESOURCE);
  const placeHold = usePlaceHold();
  const releaseHold = useReleaseHold();

  const materialById = useMemo(() => new Map(materials.map(m => [m.id, m.sku])), [materials]);
  const locationById = useMemo(() => new Map(locations.map(l => [l.id, l.code])), [locations]);

  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState({ material_id: "", location_id: "", qty: "", reason: "Quality Control" });
  const [error, setError] = useState<string | null>(null);

  const filtered = holds.filter(h =>
    (materialById.get(h.material_id) || "").toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = async () => {
    setError(null);
    if (!form.material_id || !form.location_id || !form.qty) {
      setError("Material, location and quantity are required.");
      return;
    }
    try {
      await placeHold.mutateAsync({
        material_id: Number(form.material_id),
        location_id: Number(form.location_id),
        qty: Number(form.qty),
        reason: form.reason,
      });
      setForm({ material_id: "", location_id: "", qty: "", reason: "Quality Control" });
      setIsOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not place hold.");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
          <Input placeholder="Search SKU..." className="pl-9 bg-white" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2">
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button className="bg-red-600 hover:bg-red-700 text-white flex items-center gap-2">
                <Lock className="h-4 w-4" /> Place Hold
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Place Inventory Hold</DialogTitle>
                <DialogDescription>Reserves quantity out of what's available at this location.</DialogDescription>
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
                  <Label className="text-right">Location</Label>
                  <div className="col-span-3">
                    <Select value={form.location_id} onValueChange={v => setForm(f => ({ ...f, location_id: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select location..." /></SelectTrigger>
                      <SelectContent>{locations.map(l => <SelectItem key={l.id} value={String(l.id)}>{l.code}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">Reason</Label>
                  <div className="col-span-3">
                    <Select value={form.reason} onValueChange={v => setForm(f => ({ ...f, reason: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Quality Control">Quality Control</SelectItem>
                        <SelectItem value="Damaged Packaging">Damaged Packaging</SelectItem>
                        <SelectItem value="Wrong Label">Wrong Label</SelectItem>
                        <SelectItem value="Pending Inspection">Pending Inspection</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="hqty" className="text-right">Quantity</Label>
                  <Input id="hqty" type="number" min="0" className="col-span-3" value={form.qty} onChange={e => setForm(f => ({ ...f, qty: e.target.value }))} />
                </div>
                {error && <p className="text-xs text-red-600 col-span-4">{error}</p>}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                <Button onClick={handleSave} disabled={placeHold.isPending}>
                  {placeHold.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Place Hold"}
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
              <TableHead className="font-semibold">Hold ID</TableHead>
              <TableHead className="font-semibold">SKU / Location</TableHead>
              <TableHead className="text-right font-semibold">Qty</TableHead>
              <TableHead className="font-semibold">Reason</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="font-semibold">Date</TableHead>
              <TableHead className="text-right font-semibold">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-neutral-400"><Loader2 className="h-4 w-4 animate-spin inline mr-2" />Loading holds...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-neutral-400">No holds placed.</TableCell></TableRow>
            ) : filtered.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-mono text-xs">HLD-{String(item.id).padStart(4, "0")}</TableCell>
                <TableCell>
                  <div className="font-medium">{materialById.get(item.material_id) || `#${item.material_id}`}</div>
                  <div className="text-xs text-neutral-500">{locationById.get(item.location_id) || `#${item.location_id}`}</div>
                </TableCell>
                <TableCell className="text-right">{item.qty}</TableCell>
                <TableCell>{item.reason || "—"}</TableCell>
                <TableCell>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium uppercase ${
                    item.status === 'Active' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                  }`}>
                    {item.status}
                  </span>
                </TableCell>
                <TableCell className="text-neutral-500 text-xs">{new Date(item.created_at).toLocaleDateString()}</TableCell>
                <TableCell className="text-right">
                  {item.status === "Active" && (
                    <Button variant="ghost" size="sm" className="text-green-600 hover:text-green-700 p-0 h-auto"
                      onClick={() => releaseHold.mutate(item.id)} disabled={releaseHold.isPending}>
                      <Unlock className="h-4 w-4 mr-1" /> Release
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

export default HoldSection;
