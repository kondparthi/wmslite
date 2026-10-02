import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus, Search, Filter, Download, Edit, Trash2, Eye, TrendingUp,
  Activity, CheckCircle, Clock, AlertCircle, RefreshCw, FileText,
  DollarSign, Users, Package, BarChart2, ArrowUpRight, ArrowDownRight,
  Printer, Send, Copy, MoreHorizontal, Building2, Phone, Mail,
  Calendar, Settings, Layers, Zap, Receipt, PieChart, CreditCard
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, AreaChart, Area, PieChart as RPieChart, Pie, Cell, Legend
} from 'recharts';
import {
  useBillingCustomers, useCreateBillingCustomer, useUpdateBillingCustomer, useDeleteBillingCustomer,
  useRateCards, useCreateRateCard, useUpdateRateCard, useDeleteRateCard,
  useChargeRules, useCreateChargeRule, useUpdateChargeRule, useDeleteChargeRule,
  useStorageRecords, useCreateStorageRecord,
  useTransactionalCharges, useCreateTransactionalCharge, useDeleteTransactionalCharge,
  useInvoices, useUpdateInvoice, useDeleteInvoice, useGenerateInvoiceBatch,
  type BillingCustomer, type RateCard, type ChargeRule, type StorageBillingRecord,
  type TransactionalCharge, type Invoice,
} from "@/hooks/useBillingOpsApi";
import { useDashboardSummary } from "@/hooks/useDashboardApi";

// ─── Shared helpers ─────────────────────────────────────────────────────────
const statusBadge = (status: string) => {
  const map: Record<string, string> = {
    Active:   "bg-emerald-100 text-emerald-700 border-emerald-200",
    Inactive: "bg-slate-100 text-slate-500 border-slate-200",
    Review:   "bg-amber-100 text-amber-700 border-amber-200",
    Paid:     "bg-emerald-100 text-emerald-700 border-emerald-200",
    Unpaid:   "bg-amber-100 text-amber-700 border-amber-200",
    Overdue:  "bg-red-100 text-red-700 border-red-200",
    Draft:    "bg-slate-100 text-slate-600 border-slate-200",
    Enabled:  "bg-emerald-100 text-emerald-700 border-emerald-200",
    Disabled: "bg-slate-100 text-slate-500 border-slate-200",
    Pending:  "bg-blue-100 text-blue-700 border-blue-200",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${map[status] || "bg-slate-100 text-slate-600"}`}>
      {status}
    </span>
  );
};

const money = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtDate = (d: string | null) => (d ? new Date(d).toLocaleDateString() : "—");

// ─── KPI Card ────────────────────────────────────────────────────────────────
const KpiCard = ({ label, value, sub, trend, color }: { label: string; value: string; sub: string; trend?: string; color: string }) => (
  <Card className="border shadow-sm">
    <CardContent className="pt-5 pb-4">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-2xl font-bold text-slate-800">{value}</p>
      <div className="flex items-center justify-between mt-2">
        <p className="text-xs text-slate-500">{sub}</p>
        {trend && (
          <span className={`text-xs font-bold flex items-center gap-0.5 ${trend.startsWith('+') ? 'text-emerald-600' : 'text-red-500'}`}>
            {trend.startsWith('+') ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
            {trend}
          </span>
        )}
      </div>
      <div className="mt-3 h-1 rounded-full bg-slate-100">
        <div className="h-full rounded-full" style={{ width: '65%', background: color }} />
      </div>
    </CardContent>
  </Card>
);

const emptyCustomerForm = {
  customer_code: "", name: "", contact_name: "", phone: "", email: "", address: "",
  billing_cycle: "Monthly", currency: "USD", payment_terms_days: "30", tax_id: "",
  invoice_delivery: "Email", contract_type: "Standard", rate_card_id: "", contract_start: "",
  contract_end: "", auto_renew: false,
};

// ══════════════════════════════════════════════════════════════════════════════
// 1. CUSTOMER MASTER
// ══════════════════════════════════════════════════════════════════════════════
export const CustomerMasterSection = () => {
  const { data: customers = [] } = useBillingCustomers();
  const { data: rateCards = [] } = useRateCards();
  const { data: invoices = [] } = useInvoices();
  const createCustomer = useCreateBillingCustomer();
  const deleteCustomer = useDeleteBillingCustomer();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [selectedCust, setSelectedCust] = useState<BillingCustomer | null>(null);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(emptyCustomerForm);

  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.customer_code.toLowerCase().includes(search.toLowerCase())
  );

  // Revenue actually billed (sum of invoice line amounts) per customer, all invoices to date.
  const revenueByCustomer = useMemo(() => {
    const map = new Map<number, number>();
    for (const inv of invoices) {
      const total = inv.lines.reduce((s, l) => s + l.amount, 0);
      map.set(inv.customer_id, (map.get(inv.customer_id) || 0) + total);
    }
    return map;
  }, [invoices]);

  const totalRevenue = useMemo(() => Array.from(revenueByCustomer.values()).reduce((s, v) => s + v, 0), [revenueByCustomer]);
  const activeContracts = customers.filter(c => c.status === "Active").length;

  const chartData = customers
    .map(c => ({ name: c.name, amount: revenueByCustomer.get(c.id) || 0 }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 6);

  const resetForm = () => setForm(emptyCustomerForm);

  const handleCreate = () => {
    if (!form.customer_code || !form.name) return;
    createCustomer.mutate({
      customer_code: form.customer_code,
      name: form.name,
      contact_name: form.contact_name || null,
      phone: form.phone || null,
      email: form.email || null,
      address: form.address || null,
      billing_cycle: form.billing_cycle,
      currency: form.currency,
      payment_terms_days: Number(form.payment_terms_days) || 30,
      tax_id: form.tax_id || null,
      invoice_delivery: form.invoice_delivery,
      contract_type: form.contract_type,
      rate_card_id: form.rate_card_id ? Number(form.rate_card_id) : null,
      contract_start: form.contract_start || null,
      contract_end: form.contract_end || null,
      auto_renew: form.auto_renew,
      status: "Active",
    }, { onSuccess: () => { setIsAddOpen(false); resetForm(); } });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Total Customers" value={String(customers.length)} sub={`${customers.filter(c => c.status === "Review").length} pending review`} color="#009FE3" />
        <KpiCard label="Active Contracts" value={String(activeContracts)} sub={`${customers.length - activeContracts} inactive / review`} color="#0369a1" />
        <KpiCard label="Total Billed" value={money(totalRevenue)} sub="Across all invoices" color="#06b6d4" />
        <KpiCard label="Avg. Rev/Customer" value={customers.length ? money(totalRevenue / customers.length) : "$0.00"} sub="Per billing cycle" color="#67e8f9" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold">Customer Directory</CardTitle>
                <CardDescription className="text-xs mt-0.5">All 3PL customer accounts and contract status</CardDescription>
              </div>
              <div className="flex gap-2">
                <Dialog open={isAddOpen} onOpenChange={(o) => { setIsAddOpen(o); if (!o) resetForm(); }}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="h-8 text-xs gap-1" style={{ background: "#009FE3" }}><Plus size={13} />New Customer</Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[560px]">
                    <DialogHeader>
                      <DialogTitle>Register New 3PL Customer</DialogTitle>
                      <DialogDescription>Set up customer account, contract type, and billing preferences.</DialogDescription>
                    </DialogHeader>
                    <Tabs defaultValue="general">
                      <TabsList className="w-full mb-4">
                        <TabsTrigger value="general" className="flex-1 text-xs">General</TabsTrigger>
                        <TabsTrigger value="billing" className="flex-1 text-xs">Billing</TabsTrigger>
                        <TabsTrigger value="contract" className="flex-1 text-xs">Contract</TabsTrigger>
                      </TabsList>
                      <TabsContent value="general" className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1"><Label className="text-xs">Customer Code</Label><Input placeholder="CUST006" className="h-8 text-xs" value={form.customer_code} onChange={e => setForm({ ...form, customer_code: e.target.value })} /></div>
                          <div className="space-y-1"><Label className="text-xs">Company Name</Label><Input placeholder="Acme Logistics" className="h-8 text-xs" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1"><Label className="text-xs">Contact Person</Label><Input placeholder="Jane Doe" className="h-8 text-xs" value={form.contact_name} onChange={e => setForm({ ...form, contact_name: e.target.value })} /></div>
                          <div className="space-y-1"><Label className="text-xs">Phone</Label><Input placeholder="+1 555-000-0000" className="h-8 text-xs" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
                        </div>
                        <div className="space-y-1"><Label className="text-xs">Email</Label><Input placeholder="contact@acme.com" className="h-8 text-xs" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
                        <div className="space-y-1"><Label className="text-xs">Address</Label><Textarea placeholder="Street address, City, State, ZIP" className="text-xs resize-none h-16" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></div>
                      </TabsContent>
                      <TabsContent value="billing" className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1"><Label className="text-xs">Billing Cycle</Label>
                            <Select value={form.billing_cycle} onValueChange={v => setForm({ ...form, billing_cycle: v })}>
                              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
                              <SelectContent><SelectItem value="Monthly">Monthly</SelectItem><SelectItem value="Bi-Weekly">Bi-Weekly</SelectItem><SelectItem value="Weekly">Weekly</SelectItem></SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1"><Label className="text-xs">Currency</Label>
                            <Select value={form.currency} onValueChange={v => setForm({ ...form, currency: v })}>
                              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="USD" /></SelectTrigger>
                              <SelectContent><SelectItem value="USD">USD</SelectItem><SelectItem value="EUR">EUR</SelectItem><SelectItem value="GBP">GBP</SelectItem></SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1"><Label className="text-xs">Payment Terms (days)</Label><Input placeholder="30" type="number" className="h-8 text-xs" value={form.payment_terms_days} onChange={e => setForm({ ...form, payment_terms_days: e.target.value })} /></div>
                          <div className="space-y-1"><Label className="text-xs">Tax ID / VAT</Label><Input placeholder="VAT-12345678" className="h-8 text-xs" value={form.tax_id} onChange={e => setForm({ ...form, tax_id: e.target.value })} /></div>
                        </div>
                        <div className="space-y-1"><Label className="text-xs">Invoice Delivery</Label>
                          <Select value={form.invoice_delivery} onValueChange={v => setForm({ ...form, invoice_delivery: v })}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select method" /></SelectTrigger>
                            <SelectContent><SelectItem value="Email">Email</SelectItem><SelectItem value="Portal">Portal</SelectItem><SelectItem value="Both">Both</SelectItem></SelectContent>
                          </Select>
                        </div>
                      </TabsContent>
                      <TabsContent value="contract" className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1"><Label className="text-xs">Contract Type</Label>
                            <Select value={form.contract_type} onValueChange={v => setForm({ ...form, contract_type: v })}>
                              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
                              <SelectContent><SelectItem value="Standard">Standard</SelectItem><SelectItem value="Premium">Premium</SelectItem><SelectItem value="Enterprise">Enterprise</SelectItem></SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1"><Label className="text-xs">Rate Card</Label>
                            <Select value={form.rate_card_id} onValueChange={v => setForm({ ...form, rate_card_id: v })}>
                              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
                              <SelectContent>{rateCards.map(rc => <SelectItem key={rc.id} value={String(rc.id)}>{rc.rate_card_code} {rc.name}</SelectItem>)}</SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1"><Label className="text-xs">Contract Start</Label><Input type="date" className="h-8 text-xs" value={form.contract_start} onChange={e => setForm({ ...form, contract_start: e.target.value })} /></div>
                          <div className="space-y-1"><Label className="text-xs">Contract End</Label><Input type="date" className="h-8 text-xs" value={form.contract_end} onChange={e => setForm({ ...form, contract_end: e.target.value })} /></div>
                        </div>
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50">
                          <Switch id="autoRenew" checked={form.auto_renew} onCheckedChange={v => setForm({ ...form, auto_renew: v })} /><Label htmlFor="autoRenew" className="text-xs font-medium">Auto-renew contract on expiry</Label>
                        </div>
                      </TabsContent>
                    </Tabs>
                    <DialogFooter>
                      <Button variant="outline" size="sm" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                      <Button size="sm" style={{ background: "#009FE3" }} onClick={handleCreate} disabled={createCustomer.isPending}>Create Customer</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
                <Input placeholder="Search by name or code…" className="pl-8 h-8 text-xs" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="text-xs font-semibold">Code</TableHead>
                    <TableHead className="text-xs font-semibold">Customer</TableHead>
                    <TableHead className="text-xs font-semibold">Contact</TableHead>
                    <TableHead className="text-xs font-semibold">Cycle</TableHead>
                    <TableHead className="text-xs font-semibold">Contract</TableHead>
                    <TableHead className="text-xs font-semibold">Status</TableHead>
                    <TableHead className="text-xs font-semibold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((c) => (
                    <TableRow key={c.id} className="hover:bg-slate-50 cursor-pointer">
                      <TableCell className="font-mono text-xs text-slate-500">{c.customer_code}</TableCell>
                      <TableCell>
                        <div className="font-semibold text-xs">{c.name}</div>
                        <div className="text-xs text-slate-400">{c.email}</div>
                      </TableCell>
                      <TableCell className="text-xs">{c.contact_name || "—"}</TableCell>
                      <TableCell className="text-xs">{c.billing_cycle}</TableCell>
                      <TableCell>
                        <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-medium">{c.contract_type}</span>
                      </TableCell>
                      <TableCell>{statusBadge(c.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setSelectedCust(c); setIsViewOpen(true); }}><Eye size={13} /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-600" onClick={() => deleteCustomer.mutate(c.id)}><Trash2 size={13} /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filtered.length === 0 && (
                    <TableRow><TableCell colSpan={7} className="text-center text-xs text-slate-400 py-6">No customers yet.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Revenue by Customer</CardTitle>
            <CardDescription className="text-xs">Billed to date, top 6</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-52 mb-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" barSize={10}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" width={110} axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v: any) => money(Number(v))} />
                  <Bar dataKey="amount" fill="#009FE3" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2 pt-2 border-t">
              {chartData.map(c => (
                <div key={c.name} className="flex justify-between text-xs">
                  <span className="text-slate-600">{c.name.split(' ')[0]}</span>
                  <span className="font-semibold">{money(c.amount)}</span>
                </div>
              ))}
              {chartData.length === 0 && <p className="text-xs text-slate-400">No billed revenue yet.</p>}
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="sm:max-w-[520px]">
          {selectedCust && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Building2 size={16} className="text-[#009FE3]" />
                  {selectedCust.name}
                </DialogTitle>
                <DialogDescription>{selectedCust.customer_code} · {selectedCust.contract_type} Contract</DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-3 py-2">
                {[
                  { label: "Contact", value: selectedCust.contact_name || "—", icon: Users },
                  { label: "Email", value: selectedCust.email || "—", icon: Mail },
                  { label: "Phone", value: selectedCust.phone || "—", icon: Phone },
                  { label: "Billing Cycle", value: selectedCust.billing_cycle, icon: Calendar },
                  { label: "Status", value: selectedCust.status, icon: CheckCircle },
                  { label: "Total Billed", value: money(revenueByCustomer.get(selectedCust.id) || 0), icon: DollarSign },
                ].map(({ label, value, icon: Icon }) => (
                  <div key={label} className="flex items-start gap-2 p-3 rounded-lg bg-slate-50">
                    <Icon size={14} className="text-[#009FE3] mt-0.5" />
                    <div><p className="text-xs text-slate-500">{label}</p><p className="text-xs font-semibold text-slate-800">{value}</p></div>
                  </div>
                ))}
              </div>
              <DialogFooter>
                <Button variant="outline" size="sm" onClick={() => setIsViewOpen(false)}>Close</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// 2. RATE CARDS
// ══════════════════════════════════════════════════════════════════════════════
const emptyRateCardForm = { rate_card_code: "", name: "", category: "Storage", rate: "", unit_of_measure: "", min_qty: "0", applicable_scope: "All", notes: "", status: "Enabled" };

export const RateCardSection = () => {
  const { data: rateCards = [] } = useRateCards();
  const { data: customers = [] } = useBillingCustomers();
  const createRateCard = useCreateRateCard();
  const deleteRateCard = useDeleteRateCard();
  const updateRateCard = useUpdateRateCard();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [form, setForm] = useState(emptyRateCardForm);

  const categories = ["All", "Storage", "Handling", "VAS", "Returns"];
  const filtered = rateCards.filter(r => {
    const matchSearch = r.name.toLowerCase().includes(search.toLowerCase()) || r.rate_card_code.toLowerCase().includes(search.toLowerCase());
    const matchCat = categoryFilter === "All" || r.category === categoryFilter;
    return matchSearch && matchCat;
  });

  const customersUsing = (rateCardId: number) => customers.filter(c => c.rate_card_id === rateCardId).length;
  const storageCards = rateCards.filter(r => r.category === "Storage");
  const handlingCards = rateCards.filter(r => r.category === "Handling");
  const avgStorage = storageCards.length ? storageCards.reduce((s, r) => s + r.rate, 0) / storageCards.length : 0;
  const avgHandling = handlingCards.length ? handlingCards.reduce((s, r) => s + r.rate, 0) / handlingCards.length : 0;

  const handleCreate = () => {
    if (!form.rate_card_code || !form.name || !form.category) return;
    createRateCard.mutate({
      rate_card_code: form.rate_card_code, name: form.name, category: form.category,
      rate: Number(form.rate) || 0, unit_of_measure: form.unit_of_measure || null,
      min_qty: Number(form.min_qty) || 0, applicable_scope: form.applicable_scope,
      notes: form.notes || null, status: form.status,
    }, { onSuccess: () => { setIsAddOpen(false); setForm(emptyRateCardForm); } });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Total Rate Cards" value={String(rateCards.length)} sub={`Across ${new Set(rateCards.map(r => r.category)).size} categories`} color="#009FE3" />
        <KpiCard label="Active Rates" value={String(rateCards.filter(r => r.status === "Enabled").length)} sub={`${rateCards.filter(r => r.status === "Disabled").length} disabled`} color="#0369a1" />
        <KpiCard label="Avg Storage Rate" value={`$${avgStorage.toFixed(2)}`} sub="Per pallet/month" color="#06b6d4" />
        <KpiCard label="Avg Handling Rate" value={`$${avgHandling.toFixed(2)}`} sub="Per transaction" color="#67e8f9" />
      </div>

      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold">Rate Card Management</CardTitle>
              <CardDescription className="text-xs">Define and manage service rates per unit, pallet, or transaction</CardDescription>
            </div>
            <div className="flex gap-2">
              <Dialog open={isAddOpen} onOpenChange={(o) => { setIsAddOpen(o); if (!o) setForm(emptyRateCardForm); }}>
                <DialogTrigger asChild>
                  <Button size="sm" className="h-8 text-xs gap-1" style={{ background: "#009FE3" }}><Plus size={13} />New Rate Card</Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>Create Rate Card</DialogTitle>
                    <DialogDescription>Define a new billing rate for a service category.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-3 py-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1"><Label className="text-xs">Rate Card ID</Label><Input placeholder="RC-009" className="h-8 text-xs" value={form.rate_card_code} onChange={e => setForm({ ...form, rate_card_code: e.target.value })} /></div>
                      <div className="space-y-1"><Label className="text-xs">Service Category</Label>
                        <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Category" /></SelectTrigger>
                          <SelectContent><SelectItem value="Storage">Storage</SelectItem><SelectItem value="Handling">Handling</SelectItem><SelectItem value="VAS">VAS</SelectItem><SelectItem value="Returns">Returns</SelectItem></SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-1"><Label className="text-xs">Rate Card Name</Label><Input placeholder="e.g. Premium Pallet Storage" className="h-8 text-xs" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1"><Label className="text-xs">Rate ($)</Label><Input placeholder="12.50" type="number" className="h-8 text-xs" value={form.rate} onChange={e => setForm({ ...form, rate: e.target.value })} /></div>
                      <div className="space-y-1"><Label className="text-xs">Unit of Measure</Label><Input placeholder="Pallet/Month" className="h-8 text-xs" value={form.unit_of_measure} onChange={e => setForm({ ...form, unit_of_measure: e.target.value })} /></div>
                      <div className="space-y-1"><Label className="text-xs">Minimum Qty</Label><Input placeholder="0" type="number" className="h-8 text-xs" value={form.min_qty} onChange={e => setForm({ ...form, min_qty: e.target.value })} /></div>
                    </div>
                    <div className="space-y-1"><Label className="text-xs">Applicable Customers</Label>
                      <Select value={form.applicable_scope} onValueChange={v => setForm({ ...form, applicable_scope: v })}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="All customers / specific" /></SelectTrigger>
                        <SelectContent><SelectItem value="All">All Customers</SelectItem><SelectItem value="Specific">Specific Customers</SelectItem></SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1"><Label className="text-xs">Notes</Label><Textarea placeholder="Additional terms or conditions..." className="text-xs resize-none h-16" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50">
                      <Switch id="rateStatus" checked={form.status === "Enabled"} onCheckedChange={v => setForm({ ...form, status: v ? "Enabled" : "Disabled" })} /><Label htmlFor="rateStatus" className="text-xs font-medium">Activate rate card immediately</Label>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" size="sm" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                    <Button size="sm" style={{ background: "#009FE3" }} onClick={handleCreate} disabled={createRateCard.isPending}>Save Rate Card</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
              <Input placeholder="Search rate cards…" className="pl-8 h-8 text-xs" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div className="flex gap-1">
              {categories.map(cat => (
                <Button key={cat} variant={categoryFilter === cat ? "default" : "outline"} size="sm" className="h-8 text-xs px-3"
                  style={categoryFilter === cat ? { background: "#009FE3" } : {}}
                  onClick={() => setCategoryFilter(cat)}>
                  {cat}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="text-xs font-semibold">ID</TableHead>
                  <TableHead className="text-xs font-semibold">Service Name</TableHead>
                  <TableHead className="text-xs font-semibold">Category</TableHead>
                  <TableHead className="text-xs font-semibold">Rate</TableHead>
                  <TableHead className="text-xs font-semibold">UoM</TableHead>
                  <TableHead className="text-xs font-semibold">Min Qty</TableHead>
                  <TableHead className="text-xs font-semibold">Customers</TableHead>
                  <TableHead className="text-xs font-semibold">Status</TableHead>
                  <TableHead className="text-xs font-semibold text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.id} className="hover:bg-slate-50">
                    <TableCell className="font-mono text-xs text-slate-500">{r.rate_card_code}</TableCell>
                    <TableCell className="font-semibold text-xs">{r.name}</TableCell>
                    <TableCell>
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                        r.category === 'Storage' ? 'bg-blue-100 text-blue-700' :
                        r.category === 'Handling' ? 'bg-green-100 text-green-700' :
                        r.category === 'VAS' ? 'bg-purple-100 text-purple-700' :
                        'bg-orange-100 text-orange-700'
                      }`}>{r.category}</span>
                    </TableCell>
                    <TableCell className="font-bold text-sm">${r.rate.toFixed(2)}</TableCell>
                    <TableCell className="text-xs text-slate-500">{r.unit_of_measure || "—"}</TableCell>
                    <TableCell className="text-xs">{r.min_qty}</TableCell>
                    <TableCell className="text-xs">{customersUsing(r.id)}</TableCell>
                    <TableCell>{statusBadge(r.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" title={r.status === "Enabled" ? "Disable" : "Enable"}
                          onClick={() => updateRateCard.mutate({ id: r.id, payload: { status: r.status === "Enabled" ? "Disabled" : "Enabled" } })}>
                          <Zap size={13} />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-600" onClick={() => deleteRateCard.mutate(r.id)}><Trash2 size={13} /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={9} className="text-center text-xs text-slate-400 py-6">No rate cards match.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// 3. CHARGE RULES
// ══════════════════════════════════════════════════════════════════════════════
const emptyChargeRuleForm = { rule_code: "", name: "", trigger_event: "Daily EOD", calc_basis: "Per Unit", rate_amount: "", rate_card_id: "", customer_id: "", priority: "1", status: "Enabled" };

export const ChargeRulesSection = () => {
  const { data: chargeRules = [] } = useChargeRules();
  const { data: rateCards = [] } = useRateCards();
  const { data: customers = [] } = useBillingCustomers();
  const { data: charges = [] } = useTransactionalCharges();
  const createRule = useCreateChargeRule();
  const deleteRule = useDeleteChargeRule();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [form, setForm] = useState(emptyChargeRuleForm);

  const rcName = (id: number | null) => rateCards.find(r => r.id === id)?.rate_card_code ?? "—";
  const custName = (id: number | null) => (id ? customers.find(c => c.id === id)?.name ?? `#${id}` : "All Customers");

  const generatedCharges = charges.filter(c => c.charge_rule_id != null);
  const autoBilled = generatedCharges.reduce((s, c) => s + c.total, 0);

  const handleCreate = () => {
    if (!form.rule_code || !form.name) return;
    createRule.mutate({
      rule_code: form.rule_code, name: form.name, trigger_event: form.trigger_event, calc_basis: form.calc_basis,
      rate_amount: Number(form.rate_amount) || 0, rate_card_id: form.rate_card_id ? Number(form.rate_card_id) : null,
      customer_id: form.customer_id ? Number(form.customer_id) : null, priority: Number(form.priority) || 1, status: form.status,
    }, { onSuccess: () => { setIsAddOpen(false); setForm(emptyChargeRuleForm); } });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Total Rules" value={String(chargeRules.length)} sub="Automated triggers" color="#009FE3" />
        <KpiCard label="Active Rules" value={String(chargeRules.filter(r => r.status === "Enabled").length)} sub="Running on schedule" color="#0369a1" />
        <KpiCard label="Charges Generated" value={String(generatedCharges.length)} sub="Linked to a rule" color="#06b6d4" />
        <KpiCard label="Auto-Billed Amount" value={money(autoBilled)} sub="Via charge rules" color="#67e8f9" />
      </div>

      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold">Charge Rules & Automation Logic</CardTitle>
              <CardDescription className="text-xs">Configure automated billing triggers, calculation bases, and customer scope</CardDescription>
            </div>
            <div className="flex gap-2">
              <Dialog open={isAddOpen} onOpenChange={(o) => { setIsAddOpen(o); if (!o) setForm(emptyChargeRuleForm); }}>
                <DialogTrigger asChild>
                  <Button size="sm" className="h-8 text-xs gap-1" style={{ background: "#009FE3" }}><Plus size={13} />New Rule</Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[540px]">
                  <DialogHeader>
                    <DialogTitle>Create Charge Rule</DialogTitle>
                    <DialogDescription>Define a new automated billing logic rule.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-3 py-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1"><Label className="text-xs">Rule ID</Label><Input placeholder="CR-007" className="h-8 text-xs" value={form.rule_code} onChange={e => setForm({ ...form, rule_code: e.target.value })} /></div>
                      <div className="space-y-1"><Label className="text-xs">Rule Name</Label><Input placeholder="e.g. Overflow Storage Fee" className="h-8 text-xs" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1"><Label className="text-xs">Trigger Event</Label>
                        <Select value={form.trigger_event} onValueChange={v => setForm({ ...form, trigger_event: v })}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select event" /></SelectTrigger>
                          <SelectContent><SelectItem value="Daily EOD">Daily EOD</SelectItem><SelectItem value="Outbound Order">Outbound Order</SelectItem><SelectItem value="Inbound Receipt">Inbound Receipt</SelectItem><SelectItem value="Month End">Month End</SelectItem><SelectItem value="VAS Complete">VAS Complete</SelectItem></SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1"><Label className="text-xs">Calculation Basis</Label>
                        <Select value={form.calc_basis} onValueChange={v => setForm({ ...form, calc_basis: v })}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select basis" /></SelectTrigger>
                          <SelectContent><SelectItem value="Location Volume">Location Volume</SelectItem><SelectItem value="Per Pallet">Per Pallet</SelectItem><SelectItem value="Per Unit">Per Unit</SelectItem><SelectItem value="Per Order">Per Order</SelectItem><SelectItem value="Flat Amount">Flat Amount</SelectItem></SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1"><Label className="text-xs">Rate / Amount ($)</Label><Input placeholder="e.g. 3.50" type="number" className="h-8 text-xs" value={form.rate_amount} onChange={e => setForm({ ...form, rate_amount: e.target.value })} /></div>
                      <div className="space-y-1"><Label className="text-xs">Linked Rate Card</Label>
                        <Select value={form.rate_card_id} onValueChange={v => setForm({ ...form, rate_card_id: v })}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
                          <SelectContent>{rateCards.map(rc => <SelectItem key={rc.id} value={String(rc.id)}>{rc.rate_card_code} {rc.name}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-1"><Label className="text-xs">Customer Scope</Label>
                      <Select value={form.customer_id || "all"} onValueChange={v => setForm({ ...form, customer_id: v === "all" ? "" : v })}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="All customers or specific" /></SelectTrigger>
                        <SelectContent><SelectItem value="all">All Customers</SelectItem>{customers.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1"><Label className="text-xs">Priority Order</Label><Input placeholder="1 = highest priority" type="number" className="h-8 text-xs" value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })} /></div>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50">
                      <Switch id="ruleStatus" checked={form.status === "Enabled"} onCheckedChange={v => setForm({ ...form, status: v ? "Enabled" : "Disabled" })} /><Label htmlFor="ruleStatus" className="text-xs font-medium">Enable this rule immediately</Label>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" size="sm" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                    <Button size="sm" style={{ background: "#009FE3" }} onClick={handleCreate} disabled={createRule.isPending}>Save Rule</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="text-xs font-semibold">ID</TableHead>
                  <TableHead className="text-xs font-semibold">Rule Name</TableHead>
                  <TableHead className="text-xs font-semibold">Trigger</TableHead>
                  <TableHead className="text-xs font-semibold">Calc. Basis</TableHead>
                  <TableHead className="text-xs font-semibold">Rate Card</TableHead>
                  <TableHead className="text-xs font-semibold">Scope</TableHead>
                  <TableHead className="text-xs font-semibold">Priority</TableHead>
                  <TableHead className="text-xs font-semibold">Status</TableHead>
                  <TableHead className="text-xs font-semibold text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {chargeRules.map(r => (
                  <TableRow key={r.id} className="hover:bg-slate-50">
                    <TableCell className="font-mono text-xs text-slate-500">{r.rule_code}</TableCell>
                    <TableCell className="font-semibold text-xs">{r.name}</TableCell>
                    <TableCell>
                      <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded font-medium">{r.trigger_event}</span>
                    </TableCell>
                    <TableCell className="text-xs">{r.calc_basis} · ${r.rate_amount.toFixed(2)}</TableCell>
                    <TableCell className="font-mono text-xs text-slate-600">{rcName(r.rate_card_id)}</TableCell>
                    <TableCell className="text-xs">{custName(r.customer_id)}</TableCell>
                    <TableCell>
                      <span className="text-xs font-bold text-slate-600">#{r.priority}</span>
                    </TableCell>
                    <TableCell>{statusBadge(r.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-600" onClick={() => deleteRule.mutate(r.id)}><Trash2 size={13} /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {chargeRules.length === 0 && (
                  <TableRow><TableCell colSpan={9} className="text-center text-xs text-slate-400 py-6">No charge rules yet.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// 4. INVOICES
// ══════════════════════════════════════════════════════════════════════════════
export const InvoicesSection = () => {
  const { data: invoices = [] } = useInvoices();
  const { data: customers = [] } = useBillingCustomers();
  const generateBatch = useGenerateInvoiceBatch();
  const updateInvoice = useUpdateInvoice();
  const deleteInvoice = useDeleteInvoice();

  const [isGenOpen, setIsGenOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("All");
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [selectedInv, setSelectedInv] = useState<Invoice | null>(null);
  const [genForm, setGenForm] = useState({ period_label: "", customer_id: "", due_date: "" });

  const statuses = ["All", "Draft", "Unpaid", "Paid", "Overdue"];
  const custName = (id: number) => customers.find(c => c.id === id)?.name ?? `#${id}`;
  const invTotal = (inv: Invoice) => inv.lines.reduce((s, l) => s + l.amount, 0);

  const filtered = statusFilter === "All" ? invoices : invoices.filter(i => i.status === statusFilter);

  const totals = useMemo(() => ({
    total: invoices.reduce((s, i) => s + invTotal(i), 0),
    paid: invoices.filter(i => i.status === "Paid").reduce((s, i) => s + invTotal(i), 0),
    unpaid: invoices.filter(i => i.status === "Unpaid").reduce((s, i) => s + invTotal(i), 0),
    overdue: invoices.filter(i => i.status === "Overdue").reduce((s, i) => s + invTotal(i), 0),
  }), [invoices]);

  const handleGenerate = () => {
    if (!genForm.period_label) return;
    generateBatch.mutate({
      period_label: genForm.period_label,
      customer_ids: genForm.customer_id ? [Number(genForm.customer_id)] : undefined,
      due_date: genForm.due_date || undefined,
    }, { onSuccess: () => { setIsGenOpen(false); setGenForm({ period_label: "", customer_id: "", due_date: "" }); } });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Total Invoiced" value={money(totals.total)} sub="All periods" color="#009FE3" />
        <KpiCard label="Collected" value={money(totals.paid)} sub={`${invoices.filter(i => i.status === "Paid").length} invoices paid`} color="#10b981" />
        <KpiCard label="Outstanding" value={money(totals.unpaid)} sub={`${invoices.filter(i => i.status === "Unpaid").length} awaiting payment`} color="#f59e0b" />
        <KpiCard label="Overdue" value={money(totals.overdue)} sub="Requires follow-up" color="#ef4444" />
      </div>

      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold">Invoice Management</CardTitle>
              <CardDescription className="text-xs">Generate, review, and track all customer invoices</CardDescription>
            </div>
            <div className="flex gap-2">
              <Dialog open={isGenOpen} onOpenChange={setIsGenOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="h-8 text-xs gap-1" style={{ background: "#009FE3" }}><Plus size={13} />Generate Batch</Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[480px]">
                  <DialogHeader>
                    <DialogTitle>Generate Invoice Batch</DialogTitle>
                    <DialogDescription>Rolls up each customer's un-invoiced transactional charges, grouped by activity, into a new invoice.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-3 py-3">
                    <div className="space-y-1"><Label className="text-xs">Billing Period Label</Label><Input placeholder="e.g. Sep 2026" className="h-8 text-xs" value={genForm.period_label} onChange={e => setGenForm({ ...genForm, period_label: e.target.value })} /></div>
                    <div className="space-y-1"><Label className="text-xs">Customer Selection</Label>
                      <Select value={genForm.customer_id || "all"} onValueChange={v => setGenForm({ ...genForm, customer_id: v === "all" ? "" : v })}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="All customers" /></SelectTrigger>
                        <SelectContent><SelectItem value="all">All Active Customers</SelectItem>{customers.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1"><Label className="text-xs">Due Date</Label><Input type="date" className="h-8 text-xs" value={genForm.due_date} onChange={e => setGenForm({ ...genForm, due_date: e.target.value })} /></div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" size="sm" onClick={() => setIsGenOpen(false)}>Cancel</Button>
                    <Button size="sm" style={{ background: "#009FE3" }} onClick={handleGenerate} disabled={generateBatch.isPending}>Generate Invoices</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
          <div className="flex gap-1 mt-3">
            {statuses.map(s => (
              <Button key={s} variant={statusFilter === s ? "default" : "outline"} size="sm" className="h-7 text-xs px-3"
                style={statusFilter === s ? { background: "#009FE3" } : {}}
                onClick={() => setStatusFilter(s)}>
                {s}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="text-xs font-semibold">Invoice #</TableHead>
                  <TableHead className="text-xs font-semibold">Customer</TableHead>
                  <TableHead className="text-xs font-semibold">Period</TableHead>
                  <TableHead className="text-xs font-semibold">Issued</TableHead>
                  <TableHead className="text-xs font-semibold">Due Date</TableHead>
                  <TableHead className="text-xs font-semibold">Lines</TableHead>
                  <TableHead className="text-xs font-semibold text-right">Amount</TableHead>
                  <TableHead className="text-xs font-semibold">Status</TableHead>
                  <TableHead className="text-xs font-semibold text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(inv => (
                  <TableRow key={inv.id} className="hover:bg-slate-50">
                    <TableCell className="font-mono text-xs font-semibold" style={{ color: "#009FE3" }}>{inv.invoice_number}</TableCell>
                    <TableCell className="font-semibold text-xs">{custName(inv.customer_id)}</TableCell>
                    <TableCell className="text-xs text-slate-500">{inv.period_label || "—"}</TableCell>
                    <TableCell className="text-xs text-slate-500">{fmtDate(inv.issued_date)}</TableCell>
                    <TableCell className="text-xs">{fmtDate(inv.due_date)}</TableCell>
                    <TableCell className="text-xs text-center">{inv.lines.length}</TableCell>
                    <TableCell className="text-right font-bold text-sm">{money(invTotal(inv))}</TableCell>
                    <TableCell>{statusBadge(inv.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setSelectedInv(inv); setIsViewOpen(true); }}><Eye size={13} /></Button>
                        {inv.status === "Draft" && (
                          <Button variant="ghost" size="icon" className="h-7 w-7" title="Mark Unpaid (send)" onClick={() => updateInvoice.mutate({ id: inv.id, payload: { status: "Unpaid" } })}><Send size={13} /></Button>
                        )}
                        {inv.status === "Unpaid" && (
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-emerald-600" title="Mark Paid" onClick={() => updateInvoice.mutate({ id: inv.id, payload: { status: "Paid" } })}><CheckCircle size={13} /></Button>
                        )}
                        {inv.status === "Draft" && (
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-600" onClick={() => deleteInvoice.mutate(inv.id)}><Trash2 size={13} /></Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={9} className="text-center text-xs text-slate-400 py-6">No invoices for this filter.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="sm:max-w-[480px]">
          {selectedInv && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedInv.invoice_number}</DialogTitle>
                <DialogDescription>{custName(selectedInv.customer_id)} · {selectedInv.period_label || "—"}</DialogDescription>
              </DialogHeader>
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader><TableRow className="bg-slate-50"><TableHead className="text-xs">Line</TableHead><TableHead className="text-xs text-center">Qty</TableHead><TableHead className="text-xs text-right">Amount</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {selectedInv.lines.map(l => (
                      <TableRow key={l.id}><TableCell className="text-xs">{l.description}</TableCell><TableCell className="text-xs text-center">{l.qty}</TableCell><TableCell className="text-xs text-right font-semibold">{money(l.amount)}</TableCell></TableRow>
                    ))}
                    <TableRow className="bg-slate-50 font-bold"><TableCell colSpan={2} className="text-xs text-right">Total</TableCell><TableCell className="text-right text-sm" style={{ color: "#009FE3" }}>{money(invTotal(selectedInv))}</TableCell></TableRow>
                  </TableBody>
                </Table>
              </div>
              <DialogFooter>
                <Button variant="outline" size="sm" onClick={() => setIsViewOpen(false)}>Close</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// 5. STORAGE BILLING
// ══════════════════════════════════════════════════════════════════════════════
const emptyStorageForm = { customer_id: "", zone: "", pallets: "", days: "30", rate_card_id: "", period_label: "" };

export const StorageBillingSection = () => {
  const { data: records = [] } = useStorageRecords();
  const { data: customers = [] } = useBillingCustomers();
  const { data: rateCards = [] } = useRateCards();
  const { data: dashboard } = useDashboardSummary();
  const createRecord = useCreateStorageRecord();

  const [calcOpen, setCalcOpen] = useState(false);
  const [form, setForm] = useState(emptyStorageForm);

  const custName = (id: number) => customers.find(c => c.id === id)?.name ?? `#${id}`;
  // Total is computed on the frontend (pallets x rate x days/30) — see billing_ops.py's model docstring —
  // so a rate-card correction never leaves a stale total sitting in the database.
  const total = (r: StorageBillingRecord) => r.pallets * r.rate * (r.days / 30);
  const totalRevenue = records.reduce((s, r) => s + total(r), 0);
  const totalPallets = records.reduce((s, r) => s + r.pallets, 0);

  const chartData = customers
    .map(c => ({ name: c.name, pallets: records.filter(r => r.customer_id === c.id).reduce((s, r) => s + r.pallets, 0) }))
    .filter(c => c.pallets > 0)
    .sort((a, b) => b.pallets - a.pallets);

  const handleCreate = () => {
    if (!form.customer_id || !form.pallets) return;
    const rc = rateCards.find(r => r.id === Number(form.rate_card_id));
    createRecord.mutate({
      customer_id: Number(form.customer_id), zone: form.zone || null, pallets: Number(form.pallets) || 0,
      days: Number(form.days) || 30, rate_card_id: rc ? rc.id : null, rate: rc ? rc.rate : 0,
      period_label: form.period_label || null,
    }, { onSuccess: () => { setCalcOpen(false); setForm(emptyStorageForm); } });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Storage Revenue" value={money(totalRevenue)} sub="Current billing period" color="#009FE3" />
        <KpiCard label="Total Pallets Billed" value={String(totalPallets)} sub="Across all customers" color="#0369a1" />
        <KpiCard label="Warehouse Occupancy" value={dashboard ? `${dashboard.warehouse_utilization_pct.toFixed(1)}%` : "—"} sub={dashboard ? `${dashboard.occupied_locations} / ${dashboard.total_locations} locations` : "Loading…"} color="#06b6d4" />
        <KpiCard label="Avg. Rev/Pallet" value={totalPallets ? `$${(totalRevenue / totalPallets).toFixed(2)}` : "$0.00"} sub="Blended storage rate" color="#67e8f9" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold">Storage Billing Breakdown</CardTitle>
                <CardDescription className="text-xs">Pallet-based charges per customer per zone</CardDescription>
              </div>
              <div className="flex gap-2">
                <Dialog open={calcOpen} onOpenChange={(o) => { setCalcOpen(o); if (!o) setForm(emptyStorageForm); }}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="h-8 text-xs gap-1" style={{ background: "#009FE3" }}><Plus size={13} />New Entry</Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[440px]">
                    <DialogHeader>
                      <DialogTitle>New Storage Billing Entry</DialogTitle>
                      <DialogDescription>Record a pallet-day storage charge for a customer.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 py-3">
                      <div className="space-y-1"><Label className="text-xs">Customer</Label>
                        <Select value={form.customer_id} onValueChange={v => setForm({ ...form, customer_id: v })}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select customer" /></SelectTrigger>
                          <SelectContent>{customers.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1"><Label className="text-xs">Zone</Label><Input placeholder="Zone A" className="h-8 text-xs" value={form.zone} onChange={e => setForm({ ...form, zone: e.target.value })} /></div>
                        <div className="space-y-1"><Label className="text-xs">Rate Card</Label>
                          <Select value={form.rate_card_id} onValueChange={v => setForm({ ...form, rate_card_id: v })}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
                            <SelectContent>{rateCards.filter(r => r.category === "Storage").map(rc => <SelectItem key={rc.id} value={String(rc.id)}>{rc.rate_card_code} (${rc.rate.toFixed(2)})</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1"><Label className="text-xs">Pallets</Label><Input type="number" className="h-8 text-xs" value={form.pallets} onChange={e => setForm({ ...form, pallets: e.target.value })} /></div>
                        <div className="space-y-1"><Label className="text-xs">Days</Label><Input type="number" className="h-8 text-xs" value={form.days} onChange={e => setForm({ ...form, days: e.target.value })} /></div>
                      </div>
                      <div className="space-y-1"><Label className="text-xs">Period Label</Label><Input placeholder="e.g. Sep 2026" className="h-8 text-xs" value={form.period_label} onChange={e => setForm({ ...form, period_label: e.target.value })} /></div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" size="sm" onClick={() => setCalcOpen(false)}>Cancel</Button>
                      <Button size="sm" style={{ background: "#009FE3" }} onClick={handleCreate} disabled={createRecord.isPending}>Save Entry</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="text-xs font-semibold">Customer</TableHead>
                    <TableHead className="text-xs font-semibold">Zone</TableHead>
                    <TableHead className="text-xs font-semibold text-center">Pallets</TableHead>
                    <TableHead className="text-xs font-semibold text-center">Days</TableHead>
                    <TableHead className="text-xs font-semibold text-right">Rate/Pallet</TableHead>
                    <TableHead className="text-xs font-semibold text-right">Total Charge</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((r) => (
                    <TableRow key={r.id} className="hover:bg-slate-50">
                      <TableCell className="font-semibold text-xs">{custName(r.customer_id)}</TableCell>
                      <TableCell>
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-medium">{r.zone || "—"}</span>
                      </TableCell>
                      <TableCell className="text-xs text-center font-bold">{r.pallets}</TableCell>
                      <TableCell className="text-xs text-center">{r.days}</TableCell>
                      <TableCell className="text-xs text-right">${r.rate.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-bold">{money(total(r))}</TableCell>
                    </TableRow>
                  ))}
                  {records.length > 0 && (
                    <TableRow className="bg-slate-50 font-bold">
                      <TableCell colSpan={5} className="text-xs font-bold text-right pr-4">Total Storage Revenue</TableCell>
                      <TableCell className="text-right font-bold text-sm" style={{ color: "#009FE3" }}>{money(totalRevenue)}</TableCell>
                    </TableRow>
                  )}
                  {records.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center text-xs text-slate-400 py-6">No storage billing entries yet.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Pallets by Customer</CardTitle>
            <CardDescription className="text-xs">Current storage billing entries</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-48 mb-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} barSize={18}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9 }} interval={0} angle={-20} textAnchor="end" height={50} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="pallets" fill="#009FE3" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2 pt-2 border-t">
              {chartData.map((r, i) => (
                <div key={i} className="flex justify-between text-xs">
                  <span className="text-slate-500">{r.name.split(' ')[0]}</span>
                  <span className="font-semibold">{r.pallets} pal.</span>
                </div>
              ))}
              {chartData.length === 0 && <p className="text-xs text-slate-400">No data yet.</p>}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// 6. TRANSACTIONAL BILLING
// ══════════════════════════════════════════════════════════════════════════════
const emptyChargeForm = { customer_id: "", category: "Handling", activity: "", qty: "", unit: "Units", rate: "", linked_reference: "" };

export const TransactionalSection = () => {
  const { data: charges = [] } = useTransactionalCharges();
  const { data: customers = [] } = useBillingCustomers();
  const createCharge = useCreateTransactionalCharge();

  const [search, setSearch] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [form, setForm] = useState(emptyChargeForm);

  const custName = (id: number) => customers.find(c => c.id === id)?.name ?? `#${id}`;
  const filtered = charges.filter(t =>
    t.txn_code.toLowerCase().includes(search.toLowerCase()) ||
    custName(t.customer_id).toLowerCase().includes(search.toLowerCase()) ||
    t.activity.toLowerCase().includes(search.toLowerCase())
  );

  const totalRevenue = charges.reduce((s, c) => s + c.total, 0);
  const avgValue = charges.length ? totalRevenue / charges.length : 0;

  const byActivity = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of charges) map.set(c.activity, (map.get(c.activity) || 0) + c.total);
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [charges]);
  const topActivity = byActivity[0]?.[0] ?? "—";
  const activityColors = ["#009FE3", "#0369a1", "#06b6d4", "#67e8f9", "#93c5fd"];

  const byDay = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of charges) {
      const day = new Date(c.occurred_at).toLocaleDateString(undefined, { month: "short", day: "numeric" });
      map.set(day, (map.get(day) || 0) + c.total);
    }
    return Array.from(map.entries()).map(([date, total]) => ({ date, total })).slice(-7);
  }, [charges]);

  const handleCreate = () => {
    if (!form.customer_id || !form.activity || !form.qty) return;
    createCharge.mutate({
      customer_id: Number(form.customer_id), category: form.category, activity: form.activity,
      qty: Number(form.qty) || 0, unit: form.unit || null, rate: Number(form.rate) || 0,
      linked_reference: form.linked_reference || null,
    }, { onSuccess: () => { setIsAddOpen(false); setForm(emptyChargeForm); } });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Total Transactions" value={String(charges.length)} sub="All open + invoiced" color="#009FE3" />
        <KpiCard label="Transactional Revenue" value={money(totalRevenue)} sub="Pick, pack, VAS, returns" color="#0369a1" />
        <KpiCard label="Avg. Transaction Value" value={`$${avgValue.toFixed(2)}`} sub="Per billable event" color="#06b6d4" />
        <KpiCard label="Top Activity" value={topActivity} sub={byActivity[0] ? `${money(byActivity[0][1])} billed` : "No data yet"} color="#67e8f9" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold">Transactional Charge Lines</CardTitle>
                <CardDescription className="text-xs">Individual billable activity lines linked to warehouse events</CardDescription>
              </div>
              <div className="flex gap-2">
                <Dialog open={isAddOpen} onOpenChange={(o) => { setIsAddOpen(o); if (!o) setForm(emptyChargeForm); }}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="h-8 text-xs gap-1" style={{ background: "#009FE3" }}><Plus size={13} />Manual Entry</Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[460px]">
                    <DialogHeader>
                      <DialogTitle>Manual Charge Entry</DialogTitle>
                      <DialogDescription>Total is computed automatically as qty × rate.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 py-3">
                      <div className="space-y-1"><Label className="text-xs">Customer</Label>
                        <Select value={form.customer_id} onValueChange={v => setForm({ ...form, customer_id: v })}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select customer" /></SelectTrigger>
                          <SelectContent>{customers.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1"><Label className="text-xs">Category</Label>
                          <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent><SelectItem value="Storage">Storage</SelectItem><SelectItem value="Handling">Handling</SelectItem><SelectItem value="VAS">VAS</SelectItem><SelectItem value="Returns">Returns</SelectItem><SelectItem value="Other">Other</SelectItem></SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1"><Label className="text-xs">Activity</Label><Input placeholder="Outbound Pick" className="h-8 text-xs" value={form.activity} onChange={e => setForm({ ...form, activity: e.target.value })} /></div>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-1"><Label className="text-xs">Qty</Label><Input type="number" className="h-8 text-xs" value={form.qty} onChange={e => setForm({ ...form, qty: e.target.value })} /></div>
                        <div className="space-y-1"><Label className="text-xs">Unit</Label><Input placeholder="Units" className="h-8 text-xs" value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} /></div>
                        <div className="space-y-1"><Label className="text-xs">Rate ($)</Label><Input type="number" className="h-8 text-xs" value={form.rate} onChange={e => setForm({ ...form, rate: e.target.value })} /></div>
                      </div>
                      <div className="space-y-1"><Label className="text-xs">Linked Reference</Label><Input placeholder="ORD-2291" className="h-8 text-xs" value={form.linked_reference} onChange={e => setForm({ ...form, linked_reference: e.target.value })} /></div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" size="sm" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                      <Button size="sm" style={{ background: "#009FE3" }} onClick={handleCreate} disabled={createCharge.isPending}>Save Charge</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
            <div className="relative mt-3">
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
              <Input placeholder="Search by transaction ID, customer, activity…" className="pl-8 h-8 text-xs" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="text-xs font-semibold">Txn ID</TableHead>
                    <TableHead className="text-xs font-semibold">Date</TableHead>
                    <TableHead className="text-xs font-semibold">Customer</TableHead>
                    <TableHead className="text-xs font-semibold">Activity</TableHead>
                    <TableHead className="text-xs font-semibold text-center">Qty</TableHead>
                    <TableHead className="text-xs font-semibold">UoM</TableHead>
                    <TableHead className="text-xs font-semibold text-right">Rate</TableHead>
                    <TableHead className="text-xs font-semibold text-right">Total</TableHead>
                    <TableHead className="text-xs font-semibold">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(t => (
                    <TableRow key={t.id} className="hover:bg-slate-50">
                      <TableCell className="font-mono text-xs" style={{ color: "#009FE3" }}>{t.txn_code}</TableCell>
                      <TableCell className="text-xs text-slate-500">{fmtDate(t.occurred_at)}</TableCell>
                      <TableCell className="font-semibold text-xs">{custName(t.customer_id)}</TableCell>
                      <TableCell>
                        <span className="text-xs bg-cyan-100 text-cyan-700 px-2 py-0.5 rounded font-medium">{t.activity}</span>
                      </TableCell>
                      <TableCell className="text-xs text-center font-bold">{t.qty}</TableCell>
                      <TableCell className="text-xs text-slate-500">{t.unit || "—"}</TableCell>
                      <TableCell className="text-xs text-right">${t.rate.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-bold">${t.total.toFixed(2)}</TableCell>
                      <TableCell>{t.invoice_id ? statusBadge("Paid") : statusBadge("Pending")}</TableCell>
                    </TableRow>
                  ))}
                  {filtered.length === 0 && (
                    <TableRow><TableCell colSpan={9} className="text-center text-xs text-slate-400 py-6">No transactional charges match.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Recent Charges</CardTitle>
            <CardDescription className="text-xs">Daily billing trend</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-48 mb-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={byDay}>
                  <defs>
                    <linearGradient id="txnGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#009FE3" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#009FE3" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} tickFormatter={v => `$${v}`} />
                  <Tooltip formatter={(v: any) => [`$${Number(v).toFixed(2)}`, "Charges"]} />
                  <Area type="monotone" dataKey="total" stroke="#009FE3" fill="url(#txnGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2 pt-2 border-t">
              {byActivity.slice(0, 4).map(([label, amt], i) => {
                const pct = totalRevenue ? Math.round((amt / totalRevenue) * 100) : 0;
                return (
                  <div key={label} className="space-y-1">
                    <div className="flex justify-between text-xs"><span className="text-slate-600">{label}</span><span className="font-semibold">{pct}%</span></div>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: activityColors[i % activityColors.length] }} />
                    </div>
                  </div>
                );
              })}
              {byActivity.length === 0 && <p className="text-xs text-slate-400">No data yet.</p>}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// 7. REVENUE ANALYTICS
// ══════════════════════════════════════════════════════════════════════════════
export const BillingSummarySection = () => {
  const { data: invoices = [] } = useInvoices();
  const { data: customers = [] } = useBillingCustomers();
  const { data: charges = [] } = useTransactionalCharges();
  const { data: records = [] } = useStorageRecords();

  const invTotal = (inv: Invoice) => inv.lines.reduce((s, l) => s + l.amount, 0);
  const totalRevenue = invoices.reduce((s, i) => s + invTotal(i), 0);

  // Monthly revenue actually billed, grouped by the invoice's period label.
  const byPeriod = useMemo(() => {
    const map = new Map<string, number>();
    for (const inv of invoices) {
      const label = inv.period_label || "Unlabeled";
      map.set(label, (map.get(label) || 0) + invTotal(inv));
    }
    return Array.from(map.entries()).map(([period, revenue]) => ({ period, revenue }));
  }, [invoices]);

  // Revenue by category — from every transactional charge's own category plus
  // the storage ledger, both real billing activity (not fabricated splits).
  const storageTotal = records.reduce((s, r) => s + r.pallets * r.rate * (r.days / 30), 0);
  const categoryTotals = useMemo(() => {
    const map = new Map<string, number>([["Storage", storageTotal]]);
    for (const c of charges) map.set(c.category, (map.get(c.category) || 0) + c.total);
    return Array.from(map.entries()).filter(([, v]) => v > 0);
  }, [charges, storageTotal]);
  const categoryGrandTotal = categoryTotals.reduce((s, [, v]) => s + v, 0) || 1;
  const categoryColors: Record<string, string> = { Storage: '#009FE3', Handling: '#0369a1', VAS: '#06b6d4', Returns: '#67e8f9', Other: '#93c5fd' };
  const revenueByType = categoryTotals.map(([name, value]) => ({ name, value: Math.round((value / categoryGrandTotal) * 100), color: categoryColors[name] || '#94a3b8' }));

  // Customer revenue performance: split each customer's billed total across
  // Storage (their storage ledger) vs Handling/VAS/Returns (their charges by category).
  const customerBreakdown = useMemo(() => {
    return customers.map(c => {
      const storage = records.filter(r => r.customer_id === c.id).reduce((s, r) => s + r.pallets * r.rate * (r.days / 30), 0);
      const custCharges = charges.filter(ch => ch.customer_id === c.id);
      const handling = custCharges.filter(ch => ch.category === "Handling").reduce((s, ch) => s + ch.total, 0);
      const vas = custCharges.filter(ch => ch.category === "VAS").reduce((s, ch) => s + ch.total, 0);
      const other = custCharges.filter(ch => ch.category !== "Handling" && ch.category !== "VAS").reduce((s, ch) => s + ch.total, 0);
      const total = storage + handling + vas + other;
      return { name: c.name, storage, handling, vas, other, total };
    }).filter(r => r.total > 0).sort((a, b) => b.total - a.total);
  }, [customers, records, charges]);
  const grandTotal = customerBreakdown.reduce((s, r) => s + r.total, 0) || 1;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Total Invoiced Revenue" value={money(totalRevenue)} sub="Across all customers" color="#009FE3" />
        <KpiCard label="Open Charges Pipeline" value={money(charges.filter(c => !c.invoice_id).reduce((s, c) => s + c.total, 0))} sub="Not yet invoiced" color="#0369a1" />
        <KpiCard label="Storage Revenue" value={money(storageTotal)} sub="Pallet-day ledger" color="#06b6d4" />
        <KpiCard label="Active Invoices" value={String(invoices.length)} sub={`${invoices.filter(i => i.status === "Draft").length} in draft`} color="#67e8f9" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold">Revenue by Billing Period</CardTitle>
            <CardDescription className="text-xs">Sum of invoiced amounts per period label</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={byPeriod}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#009FE3" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#009FE3" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="period" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={v => `$${Number(v) / 1000}k`} />
                  <Tooltip formatter={(v: any) => money(Number(v))} />
                  <Area type="monotone" dataKey="revenue" stroke="#009FE3" fill="url(#revGrad)" strokeWidth={2} name="Revenue" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            {byPeriod.length === 0 && <p className="text-xs text-slate-400 mt-2">No invoices generated yet.</p>}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Revenue by Category</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <RPieChart>
                    <Pie data={revenueByType} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                      {revenueByType.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip formatter={(v: any) => `${v}%`} />
                  </RPieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2">
                {revenueByType.map(item => (
                  <div key={item.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: item.color }} />
                      <span className="text-slate-600">{item.name}</span>
                    </div>
                    <span className="font-semibold">{item.value}%</span>
                  </div>
                ))}
                {revenueByType.length === 0 && <p className="text-xs text-slate-400">No billing activity yet.</p>}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold">Customer Revenue Performance</CardTitle>
              <CardDescription className="text-xs">Billed revenue per customer by category</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="text-xs font-semibold">Customer</TableHead>
                  <TableHead className="text-xs font-semibold text-right">Storage Rev</TableHead>
                  <TableHead className="text-xs font-semibold text-right">Handling Rev</TableHead>
                  <TableHead className="text-xs font-semibold text-right">VAS Rev</TableHead>
                  <TableHead className="text-xs font-semibold text-right">Total</TableHead>
                  <TableHead className="text-xs font-semibold">Share</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customerBreakdown.map((r, i) => {
                  const share = ((r.total / grandTotal) * 100).toFixed(1);
                  return (
                    <TableRow key={i} className="hover:bg-slate-50">
                      <TableCell className="font-semibold text-xs">{r.name}</TableCell>
                      <TableCell className="text-xs text-right">{money(r.storage)}</TableCell>
                      <TableCell className="text-xs text-right">{money(r.handling)}</TableCell>
                      <TableCell className="text-xs text-right">{money(r.vas)}</TableCell>
                      <TableCell className="text-right font-bold">{money(r.total)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-slate-100 h-1.5 rounded-full">
                            <div className="h-full rounded-full" style={{ width: `${share}%`, background: "#009FE3" }} />
                          </div>
                          <span className="text-xs text-slate-500 w-8">{share}%</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {customerBreakdown.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center text-xs text-slate-400 py-6">No billing activity yet.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
