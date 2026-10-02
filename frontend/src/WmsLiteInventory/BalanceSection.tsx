import React, { useMemo, useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Filter, Download, Plus, MoreHorizontal, FileText, ArrowUpDown, Loader2, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import {
  useMasterDataList,
  useMasterDataCreate,
  useMasterDataDelete,
} from "@/hooks/useMasterDataApi";

const BALANCES_RESOURCE = "/operations/inventory-balances";
const MATERIALS_RESOURCE = "/master-data/materials";
const LOCATIONS_RESOURCE = "/master-data/locations";

interface BalanceRecord {
  id: number;
  material_id: number;
  location_id: number;
  on_hand: number;
  allocated: number;
  on_hold: number;
  uom: string;
}

interface MaterialRecord {
  id: number;
  sku: string;
  description: string;
  category: string | null;
  uom: string;
}

interface LocationRecord {
  id: number;
  code: string;
}

const BalanceSection = () => {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ material_id: "", location_id: "", on_hand: "", allocated: "" });
  const [formError, setFormError] = useState<string | null>(null);

  const { data: balances = [], isLoading } = useMasterDataList<BalanceRecord>(BALANCES_RESOURCE);
  const { data: materials = [] } = useMasterDataList<MaterialRecord>(MATERIALS_RESOURCE);
  const { data: locations = [] } = useMasterDataList<LocationRecord>(LOCATIONS_RESOURCE);
  const createBalance = useMasterDataCreate<BalanceRecord>(BALANCES_RESOURCE);
  const deleteBalance = useMasterDataDelete(BALANCES_RESOURCE);

  const materialById = useMemo(() => new Map(materials.map(m => [m.id, m])), [materials]);
  const locationById = useMemo(() => new Map(locations.map(l => [l.id, l])), [locations]);

  const rows = useMemo(() => balances.map(b => {
    const mat = materialById.get(b.material_id);
    const loc = locationById.get(b.location_id);
    return {
      ...b,
      sku: mat?.sku ?? `#${b.material_id}`,
      name: mat?.description ?? "Unknown material",
      category: mat?.category ?? "",
      locationCode: loc?.code ?? `#${b.location_id}`,
      available: b.on_hand - b.allocated - (b.on_hold || 0),
    };
  }), [balances, materialById, locationById]);

  const filtered = rows.filter(r =>
    r.sku.toLowerCase().includes(search.toLowerCase()) ||
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.locationCode.toLowerCase().includes(search.toLowerCase())
  );

  const totalItems = rows.reduce((sum, r) => sum + r.on_hand, 0);
  const outOfStock = rows.filter(r => r.available <= 0).length;

  const chartData = useMemo(() => {
    const byCategory = new Map<string, number>();
    rows.forEach(r => {
      const cat = r.category || "Uncategorized";
      byCategory.set(cat, (byCategory.get(cat) || 0) + r.on_hand);
    });
    return Array.from(byCategory.entries()).map(([name, stock]) => ({ name, stock }));
  }, [rows]);

  const handleSave = async () => {
    setFormError(null);
    if (!form.material_id || !form.location_id || !form.on_hand) {
      setFormError("Material, location and quantity are required.");
      return;
    }
    try {
      await createBalance.mutateAsync({
        material_id: Number(form.material_id),
        location_id: Number(form.location_id),
        on_hand: Number(form.on_hand),
        allocated: Number(form.allocated || 0),
        uom: materialById.get(Number(form.material_id))?.uom || "EA",
      });
      setForm({ material_id: "", location_id: "", on_hand: "", allocated: "" });
      setIsAddOpen(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not save inventory item.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-neutral-500 uppercase">Total Units On Hand</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalItems.toLocaleString()}</div>
            <p className="text-xs text-neutral-500 mt-1">across {rows.length} SKU/location combinations</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-neutral-500 uppercase">Out of Stock</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{outOfStock}</div>
            <p className="text-xs text-neutral-500 mt-1">Requires immediate attention</p>
          </CardContent>
        </Card>
        <Card className="md:col-span-2">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-semibold text-neutral-500 uppercase">Stock by Category</CardTitle>
            <FileText className="h-4 w-4 text-neutral-400" />
          </CardHeader>
          <CardContent className="h-[80px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical">
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" hide />
                <Tooltip />
                <Bar dataKey="stock" radius={[0, 4, 4, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={['#3b82f6', '#10b981', '#f59e0b', '#ef4444'][index % 4]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
          <Input placeholder="Search SKU, name or location..." className="pl-9 bg-white" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2">
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" /> Add Inventory
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Add New Inventory Item</DialogTitle>
                <DialogDescription>
                  Assign an on-hand quantity for a material at a location.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">Material</Label>
                  <div className="col-span-3">
                    <Select value={form.material_id} onValueChange={v => setForm(f => ({ ...f, material_id: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select material..." /></SelectTrigger>
                      <SelectContent>
                        {materials.map(m => (
                          <SelectItem key={m.id} value={String(m.id)}>{m.sku} — {m.description}</SelectItem>
                        ))}
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
                        {locations.map(l => (
                          <SelectItem key={l.id} value={String(l.id)}>{l.code}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="onHand" className="text-right">On Hand</Label>
                  <Input id="onHand" type="number" className="col-span-3" value={form.on_hand} onChange={e => setForm(f => ({ ...f, on_hand: e.target.value }))} />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="allocated" className="text-right">Allocated</Label>
                  <Input id="allocated" type="number" className="col-span-3" value={form.allocated} onChange={e => setForm(f => ({ ...f, allocated: e.target.value }))} />
                </div>
                {formError && <p className="text-xs text-red-600 col-span-4">{formError}</p>}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                <Button type="submit" onClick={handleSave} disabled={createBalance.isPending}>
                  {createBalance.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Item"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button variant="outline" className="flex items-center gap-2">
            <Filter className="h-4 w-4" /> Filter
          </Button>
          <Button variant="outline" className="flex items-center gap-2">
            <Download className="h-4 w-4" /> Export
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-neutral-50">
            <TableRow>
              <TableHead className="font-semibold">
                <div className="flex items-center gap-1 cursor-pointer hover:text-blue-600 transition-colors">
                  SKU <ArrowUpDown className="h-3 w-3" />
                </div>
              </TableHead>
              <TableHead className="font-semibold">Description</TableHead>
              <TableHead className="font-semibold">Location</TableHead>
              <TableHead className="text-right font-semibold">On Hand</TableHead>
              <TableHead className="text-right font-semibold">Allocated</TableHead>
              <TableHead className="text-right font-semibold">Available</TableHead>
              <TableHead className="font-semibold">UOM</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-neutral-400">
                <Loader2 className="h-4 w-4 animate-spin inline mr-2" /> Loading inventory...
              </TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-neutral-400">No inventory records found.</TableCell></TableRow>
            ) : filtered.map((item) => (
              <TableRow key={item.id} className="hover:bg-neutral-50/50 transition-colors">
                <TableCell className="font-medium text-blue-600 font-mono text-sm">{item.sku}</TableCell>
                <TableCell>
                  <div>
                    <div className="font-medium text-neutral-900">{item.name}</div>
                    <div className="text-xs text-neutral-500">{item.category}</div>
                  </div>
                </TableCell>
                <TableCell className="font-mono text-xs bg-neutral-50 rounded-sm px-2 py-1 inline-block mt-2 ml-4">
                  {item.locationCode}
                </TableCell>
                <TableCell className="text-right font-medium">{item.on_hand.toLocaleString()}</TableCell>
                <TableCell className="text-right text-orange-600">{item.allocated.toLocaleString()}</TableCell>
                <TableCell className="text-right font-bold text-green-600">{item.available.toLocaleString()}</TableCell>
                <TableCell>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 uppercase">
                    {item.uom}
                  </span>
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => deleteBalance.mutate(item.id)} title="Delete">
                    <Trash2 className="h-4 w-4 text-neutral-400 hover:text-red-500" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default BalanceSection;
