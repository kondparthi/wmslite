import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ClipboardList, Smartphone, Loader2 } from "lucide-react";
import {
  useMasterDataList,
  useMasterDataCreate,
  useMasterDataUpdate,
} from "@/hooks/useMasterDataApi";

const PLANS_RESOURCE = "/operations/cycle-count-plans";

interface CycleCountPlan {
  id: number;
  name: string;
  scope_description: string | null;
  method: string;
  status: string;
  total_items: number;
  variance: number;
}

const CycleCountSection = () => {
  const { data: plans = [], isLoading } = useMasterDataList<CycleCountPlan>(PLANS_RESOURCE);
  const createPlan = useMasterDataCreate<CycleCountPlan>(PLANS_RESOURCE);
  const updatePlan = useMasterDataUpdate<CycleCountPlan>(PLANS_RESOURCE);

  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState({ name: "", scope_description: "", method: "Web UI", total_items: "" });
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setError(null);
    if (!form.name) {
      setError("Plan name is required.");
      return;
    }
    try {
      await createPlan.mutateAsync({
        name: form.name,
        scope_description: form.scope_description || null,
        method: form.method,
        status: "Pending",
        total_items: Number(form.total_items) || 0,
        variance: 0,
      });
      setForm({ name: "", scope_description: "", method: "Web UI", total_items: "" });
      setIsOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create plan.");
    }
  };

  const progressPct = (p: CycleCountPlan) => p.status === "Completed" ? 100 : p.status === "In Progress" ? 50 : 0;

  const advanceStatus = (p: CycleCountPlan) => {
    const next = p.status === "Pending" ? "In Progress" : "Completed";
    updatePlan.mutate({ id: p.id, payload: { status: next } });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-6 rounded-xl border border-neutral-200 flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
            <ClipboardList className="h-6 w-6" />
          </div>
          <div>
            <h4 className="font-bold text-neutral-900">Web UI Counting</h4>
            <p className="text-neutral-500 text-sm">Perform counting directly from the desktop interface.</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-neutral-200 flex items-center gap-4">
          <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center text-orange-600">
            <Smartphone className="h-6 w-6" />
          </div>
          <div>
            <h4 className="font-bold text-neutral-900">RF Gun Scanning</h4>
            <p className="text-neutral-500 text-sm">Send counting tasks to handheld RF devices.</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
        <div className="p-4 border-b border-neutral-200 flex justify-between items-center">
          <h3 className="font-bold">Active Counting Plans</h3>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-neutral-900 text-white">Create New Plan</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Create Cycle Count Plan</DialogTitle>
                <DialogDescription>Set up a counting plan for a zone or a set of items.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-2">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="pname" className="text-right">Name</Label>
                  <Input id="pname" className="col-span-3" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Weekly Zone A Count" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="pscope" className="text-right">Scope</Label>
                  <Input id="pscope" className="col-span-3" value={form.scope_description} onChange={e => setForm(f => ({ ...f, scope_description: e.target.value }))} placeholder="e.g. Zone A" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">Method</Label>
                  <div className="col-span-3">
                    <Select value={form.method} onValueChange={v => setForm(f => ({ ...f, method: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Web UI">Web UI</SelectItem>
                        <SelectItem value="RF Gun">RF Gun</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="pitems" className="text-right">Total Items</Label>
                  <Input id="pitems" type="number" min="0" className="col-span-3" value={form.total_items} onChange={e => setForm(f => ({ ...f, total_items: e.target.value }))} />
                </div>
                {error && <p className="text-xs text-red-600 col-span-4">{error}</p>}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                <Button onClick={handleSave} disabled={createPlan.isPending}>
                  {createPlan.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Plan"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        <Table>
          <TableHeader className="bg-neutral-50">
            <TableRow>
              <TableHead>Plan ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Progress</TableHead>
              <TableHead className="text-right">Total Items</TableHead>
              <TableHead className="text-right">Variance</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-neutral-400"><Loader2 className="h-4 w-4 animate-spin inline mr-2" />Loading plans...</TableCell></TableRow>
            ) : plans.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-neutral-400">No cycle count plans yet.</TableCell></TableRow>
            ) : plans.map((plan) => (
              <TableRow key={plan.id}>
                <TableCell className="font-mono text-xs">CC-{String(plan.id).padStart(4, "0")}</TableCell>
                <TableCell className="font-medium">{plan.name}</TableCell>
                <TableCell>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium uppercase ${
                    plan.status === 'Completed' ? 'bg-green-100 text-green-700' :
                    plan.status === 'In Progress' ? 'bg-blue-100 text-blue-700' : 'bg-neutral-100 text-neutral-700'
                  }`}>
                    {plan.status}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="w-full bg-neutral-100 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-blue-600 h-full" style={{ width: `${progressPct(plan)}%` }}></div>
                  </div>
                  <span className="text-[10px] text-neutral-500">{progressPct(plan)}%</span>
                </TableCell>
                <TableCell className="text-right">{plan.total_items}</TableCell>
                <TableCell className={`text-right font-bold ${plan.variance !== 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {plan.variance > 0 ? `+${plan.variance}` : plan.variance}
                </TableCell>
                <TableCell className="text-right">
                  {plan.status !== "Completed" && (
                    <Button variant="ghost" size="sm" className="p-0 h-auto" onClick={() => advanceStatus(plan)} disabled={updatePlan.isPending}>
                      {plan.status === "Pending" ? "Start Counting" : "Mark Completed"}
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

export default CycleCountSection;
