import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, Plus, Zap, AlertCircle, TrendingUp, BarChart3, PieChart as PieChartIcon, PlayCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import {
  useCrossDockPlans, useMatchCandidates, useCreatePlan, useRunMatchEngine, useConfirmPlan, useCancelPlan,
  useCrossDockTasks, useStageTask, useStartTask, useCompleteTask,
  useOpportunisticRules, useToggleRule, useDetectedOpportunities, useRunDetection,
  useStagingZones,
  useCrossDockReportSummary,
} from '@/hooks/useCrossDockOpsApi';

const priorityBadge = (p: string) =>
  p === 'Urgent' ? 'bg-red-100 text-red-700' : p === 'High' ? 'bg-orange-100 text-orange-700' : p === 'Low' ? 'bg-neutral-100 text-neutral-600' : 'bg-amber-100 text-amber-700';

const statusBadge = (s: string) =>
  s === 'Proposed' ? 'bg-blue-100 text-blue-700' : s === 'Confirmed' ? 'bg-emerald-100 text-emerald-700'
    : s === 'Cancelled' ? 'bg-neutral-100 text-neutral-500' : s === 'Pending' ? 'bg-neutral-100 text-neutral-600'
    : s === 'Staged' ? 'bg-blue-100 text-blue-700' : s === 'In Progress' ? 'bg-amber-100 text-amber-700'
    : s === 'Completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-neutral-100 text-neutral-600';

const PIE_COLORS: Record<string, string> = { Proposed: '#3b82f6', Confirmed: '#10b981', Cancelled: '#94a3b8' };

interface SectionProps {
  onNavigate?: (tab: string) => void;
}

const PlanningSection: React.FC<SectionProps> = () => {
  const [isNewPlanOpen, setIsNewPlanOpen] = useState(false);
  const [candidateKey, setCandidateKey] = useState('');
  const [qty, setQty] = useState('');
  const [transferType, setTransferType] = useState('Pure Cross Dock');

  const { data: plans = [] } = useCrossDockPlans();
  const { data: candidates = [] } = useMatchCandidates();
  const createPlan = useCreatePlan();
  const runMatchEngine = useRunMatchEngine();
  const confirmPlan = useConfirmPlan();
  const cancelPlan = useCancelPlan();

  const proposed = plans.filter(p => p.status === 'Proposed');
  const statusCounts = ['Proposed', 'Confirmed', 'Cancelled'].map(name => ({
    name, value: plans.filter(p => p.status === name).length, fill: PIE_COLORS[name],
  })).filter(s => s.value > 0);
  const totalPlans = plans.length || 1;

  const selectedCandidate = candidates.find(c => `${c.receipt_id}-${c.order_line_id}` === candidateKey);

  const submitNewPlan = () => {
    if (!selectedCandidate || !qty) return;
    createPlan.mutate({
      receipt_id: selectedCandidate.receipt_id, order_line_id: selectedCandidate.order_line_id,
      qty: Number(qty), transfer_type: transferType, match_level: 'Exact SKU Match', priority: 'Medium',
    }, { onSuccess: () => { setIsNewPlanOpen(false); setCandidateKey(''); setQty(''); } });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 items-end justify-between">
        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
          <div className="space-y-2 md:col-span-1">
            <Label className="text-xs font-bold uppercase text-muted-foreground">Open Candidates</Label>
            <div className="relative flex items-center h-10 px-3 border rounded-md bg-neutral-50 text-xs text-neutral-500">
              <Search className="h-4 w-4 text-gray-400 mr-2" /> {candidates.length} unconsumed receipt / open-order pairs
            </div>
          </div>
          <div className="flex items-end pb-0.5">
            <Button className="w-full h-10 bg-blue-600 hover:bg-blue-700 font-bold" disabled={runMatchEngine.isPending} onClick={() => runMatchEngine.mutate()}>
              <Zap className="h-4 w-4 mr-2" />Run Match Engine
            </Button>
          </div>
          <div className="flex items-end pb-0.5">
            <Dialog open={isNewPlanOpen} onOpenChange={setIsNewPlanOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full h-10 border-dashed border-2 font-bold">
                  <Plus className="h-4 w-4 mr-2" /> New Plan
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Create Cross Dock Plan</DialogTitle>
                  <DialogDescription>Manually link an unconsumed inbound receipt to an open outbound line.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label>Receipt / Order Match</Label>
                    <Select value={candidateKey} onValueChange={v => { setCandidateKey(v); const c = candidates.find(cc => `${cc.receipt_id}-${cc.order_line_id}` === v); if (c) setQty(String(c.qty)); }}>
                      <SelectTrigger><SelectValue placeholder="Select an open pair" /></SelectTrigger>
                      <SelectContent>
                        {candidates.map(c => (
                          <SelectItem key={`${c.receipt_id}-${c.order_line_id}`} value={`${c.receipt_id}-${c.order_line_id}`}>
                            {c.sku} — {c.asn_number} → {c.order_number} (max {c.qty})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="qty">Transfer Quantity</Label>
                      <Input_ value={qty} onChange={setQty} max={selectedCandidate?.qty} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="type">Transfer Type</Label>
                      <Select value={transferType} onValueChange={setTransferType}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Pure Cross Dock">Pure Cross Dock</SelectItem>
                          <SelectItem value="Merge-in-Transit">Merge-in-Transit</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsNewPlanOpen(false)}>Cancel</Button>
                  <Button onClick={submitNewPlan} disabled={createPlan.isPending || !selectedCandidate}>Confirm Plan</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2 shadow-sm border-neutral-200">
          <CardHeader className="bg-neutral-50/50 pb-3">
            <CardTitle className="text-lg font-bold">Planning Board</CardTitle>
            <CardDescription className="text-xs uppercase font-bold text-muted-foreground">Matching Inbound Receipts with Open Order Lines</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-neutral-50/50">
                <TableRow>
                  <TableHead className="font-bold">Inbound ASN</TableHead>
                  <TableHead className="font-bold">SKU</TableHead>
                  <TableHead className="font-bold">Matched Order</TableHead>
                  <TableHead className="font-bold">Priority</TableHead>
                  <TableHead className="font-bold">Status</TableHead>
                  <TableHead className="text-right font-bold">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plans.map(row => (
                  <TableRow key={row.id} className="hover:bg-neutral-50/30 transition-colors">
                    <TableCell className="font-mono text-xs font-bold text-blue-600">{row.asn_number}</TableCell>
                    <TableCell className="text-xs font-medium">{row.sku}</TableCell>
                    <TableCell className="font-mono text-xs font-bold">{row.order_number}</TableCell>
                    <TableCell>
                      <Badge className={`text-[10px] font-bold border-none ${priorityBadge(row.priority)}`}>{row.priority.toUpperCase()}</Badge>
                    </TableCell>
                    <TableCell><Badge className={`text-[10px] font-bold border-none ${statusBadge(row.status)}`}>{row.status}</Badge></TableCell>
                    <TableCell className="text-right">
                      {row.status === 'Proposed' && (
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" className="text-blue-600 text-xs h-7 font-bold" onClick={() => confirmPlan.mutate(row.id)}>ASSIGN</Button>
                          <Button variant="ghost" size="sm" className="text-neutral-400 text-xs h-7" onClick={() => cancelPlan.mutate(row.id)}>Cancel</Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {plans.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center text-xs text-neutral-400 py-8">No plans yet — run the match engine or create one manually</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Planning Status Distribution</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusCounts.length ? statusCounts : [{ name: 'None', value: 1, fill: '#e2e8f0' }]} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5}>
                    {(statusCounts.length ? statusCounts : [{ name: 'None', value: 1, fill: '#e2e8f0' }]).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-full space-y-2 mt-4">
              {statusCounts.map(s => (
                <div key={s.name} className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.fill }} />
                    <span className="font-medium">{s.name}</span>
                  </div>
                  <span className="font-bold">{Math.round((s.value / totalPlans) * 100)}%</span>
                </div>
              ))}
              {proposed.length === 0 && statusCounts.length === 0 && <p className="text-xs text-neutral-400 text-center">No plans yet</p>}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// Small local numeric input (kept out of shadcn's Input to avoid pulling in
// an unrelated import name clash with lucide's icon set used above).
const Input_: React.FC<{ value: string; onChange: (v: string) => void; max?: number }> = ({ value, onChange, max }) => (
  <input
    type="number" min={0} max={max} value={value} onChange={e => onChange(e.target.value)}
    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
    placeholder="0"
  />
);

const ExecutionSection: React.FC<SectionProps> = ({ onNavigate }) => {
  const { data: tasks = [] } = useCrossDockTasks();
  const { data: summary } = useCrossDockReportSummary();
  const stageTask = useStageTask();
  const startTask = useStartTask();
  const completeTask = useCompleteTask();

  const active = tasks.filter(t => t.status !== 'Completed');

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <Card className="shadow-sm border-neutral-200">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg font-bold">Active CD Tasks</CardTitle>
              <CardDescription className="text-xs uppercase font-bold text-muted-foreground">Real-time floor movements</CardDescription>
            </div>
            <Badge className="bg-green-100 text-green-700 border-none font-bold">{active.length} ACTIVE</Badge>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {active.map(t => (
                <div key={t.id} className="flex items-center justify-between p-4 border rounded-xl hover:bg-neutral-50/50 transition-colors group">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-blue-100 rounded-lg text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                      <Zap className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-bold text-sm">Direct Transfer: {t.from_door_code || '—'} → {t.to_door_code || '—'}</p>
                      <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">LPN #{t.lpn || '—'} • SKU: {t.sku} • Qty: {t.qty}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <Badge variant="outline" className="mb-1 text-[9px] font-extrabold uppercase">{t.status}</Badge>
                      <p className="text-[10px] text-muted-foreground font-medium">{t.assignee ? `Assigned: ${t.assignee}` : 'Unassigned'}</p>
                    </div>
                    {t.status === 'Pending' && <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => stageTask.mutate(t.id)}>Stage</Button>}
                    {t.status === 'Staged' && <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => startTask.mutate({ id: t.id })}>Start</Button>}
                    {t.status === 'In Progress' && <Button size="sm" className="text-xs h-7 bg-neutral-900 hover:bg-neutral-800 text-white" onClick={() => completeTask.mutate(t.id)}>Complete</Button>}
                  </div>
                </div>
              ))}
              {active.length === 0 && <p className="text-xs text-neutral-400 text-center py-8">No active tasks — confirm a plan on CD Planning to create one</p>}
            </div>
          </CardContent>
        </Card>
      </div>
      <div className="space-y-6">
        <Card className="bg-neutral-900 text-white shadow-xl relative overflow-hidden">
          <CardHeader>
            <CardTitle className="text-sm font-bold uppercase tracking-widest text-neutral-400">CD Throughput</CardTitle>
            <CardDescription className="text-neutral-500 text-xs uppercase font-bold tracking-tight">All-time real totals</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 relative z-10">
            <div className="flex justify-between items-center border-b border-neutral-800 pb-3">
              <span className="text-xs font-medium text-neutral-400">Units Diverted</span>
              <span className="font-bold text-2xl">{summary?.storage_avoided_units ?? 0}</span>
            </div>
            <div className="flex justify-between items-center border-b border-neutral-800 pb-3">
              <span className="text-xs font-medium text-neutral-400">Avg. Cycle Time</span>
              <span className="font-bold text-2xl">{summary ? Math.round(summary.avg_cycle_minutes) : 0}m</span>
            </div>
            <div className="flex justify-between items-center pb-3">
              <span className="text-xs font-medium text-neutral-400">Completed Tasks</span>
              <div className="text-right">
                 <span className="font-bold text-2xl text-green-400">{summary?.completed_tasks ?? 0}</span>
                 <p className="text-[9px] text-neutral-500 font-bold uppercase">Total to date</p>
              </div>
            </div>
            <Button variant="outline" className="w-full bg-white/5 border-white/10 hover:bg-white/10 text-white font-bold h-10" onClick={() => onNavigate?.('analytics')}>View Full Analytics</Button>
          </CardContent>
          <Zap size={150} className="absolute top-[-40px] right-[-40px] opacity-[0.03]" />
        </Card>
      </div>
    </div>
  );
};

const OpportunisticSection: React.FC<SectionProps> = () => {
  const { data: rules = [] } = useOpportunisticRules();
  const { data: detected = [] } = useDetectedOpportunities();
  const toggleRule = useToggleRule();
  const runDetection = useRunDetection();

  return (
    <div className="space-y-6">
      <Card className="border-orange-200 bg-orange-50/20 shadow-none">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-orange-600" />
              <CardTitle className="text-lg font-bold text-orange-900">Opportunistic Logic Rules</CardTitle>
            </div>
            <Button size="sm" className="bg-orange-600 hover:bg-orange-700 text-white gap-1.5" disabled={runDetection.isPending} onClick={() => runDetection.mutate()}>
              <PlayCircle className="w-4 h-4" />Detect Opportunities
            </Button>
          </div>
          <CardDescription className="text-orange-700 text-xs font-medium">Auto-trigger cross-docking when inbound matches a real backorder condition.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {rules.map(rule => (
              <div key={rule.id} className="p-4 bg-white border border-orange-100 rounded-xl flex justify-between items-start shadow-sm">
                <div>
                  <p className="font-bold text-sm text-neutral-900">{rule.name}</p>
                  <p className="text-[10px] text-muted-foreground mt-1 font-medium">{rule.description}</p>
                </div>
                <button onClick={() => toggleRule.mutate({ id: rule.id, status: rule.status === 'Active' ? 'Inactive' : 'Active' })}>
                  <Badge variant="default" className={`${rule.status === 'Active' ? 'bg-orange-500 hover:bg-orange-500' : 'bg-neutral-300 hover:bg-neutral-300'} text-[10px] font-bold cursor-pointer`}>{rule.status.toUpperCase()}</Badge>
                </button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm border-neutral-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-md font-bold">Recently Detected Opportunities</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-neutral-50/50">
              <TableRow>
                <TableHead className="font-bold">SKU</TableHead>
                <TableHead className="font-bold">Inbound Ref</TableHead>
                <TableHead className="font-bold">Target Order</TableHead>
                <TableHead className="font-bold">Rule Applied</TableHead>
                <TableHead className="text-right font-bold">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {detected.map(row => (
                <TableRow key={row.id} className="hover:bg-neutral-50/30 transition-colors">
                  <TableCell className="font-medium text-xs">{row.sku}</TableCell>
                  <TableCell className="font-mono text-xs">{row.asn_number}</TableCell>
                  <TableCell className="font-mono text-xs font-bold text-blue-600">{row.order_number}</TableCell>
                  <TableCell><Badge variant="outline" className="text-[10px] font-bold">{(row.rule_applied || '').toUpperCase()}</Badge></TableCell>
                  <TableCell className="text-right"><Badge className={`text-[9px] font-extrabold border-none uppercase ${statusBadge(row.status)}`}>{row.status}</Badge></TableCell>
                </TableRow>
              ))}
              {detected.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-xs text-neutral-400 py-8">No opportunities detected yet — click "Detect Opportunities"</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

const StagingSection: React.FC<SectionProps> = () => {
  const { data: zones = [] } = useStagingZones();
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {zones.map(z => {
        const pct = z.capacity ? Math.round((z.occupied / z.capacity) * 100) : 0;
        return (
          <Card key={z.zone} className="hover:shadow-md transition-shadow group">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                 <CardTitle className="text-sm font-bold uppercase tracking-tight">{z.zone_name}</CardTitle>
                 <Badge variant="outline" className="text-[9px] font-bold">CAP: {z.capacity} PL</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-1.5 w-full bg-neutral-100 rounded-full mb-4 overflow-hidden">
                <div className="h-full bg-blue-600 transition-all duration-1000" style={{ width: `${pct}%` }}></div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between text-[10px] font-bold">
                  <span className="text-muted-foreground uppercase">Occupied</span>
                  <span className="font-bold text-blue-600">{z.occupied} / {z.capacity}</span>
                </div>
                <div className="flex justify-between text-[10px] font-bold border-t border-dashed pt-3">
                  <span className="text-muted-foreground uppercase">Next Priority</span>
                  <span className="font-bold">{z.next_priority}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
      {zones.length === 0 && <p className="text-xs text-neutral-400 col-span-4 text-center py-8">No staging zones configured</p>}
    </div>
  );
};

const AnalyticsSection: React.FC<SectionProps> = () => {
  const { data: summary } = useCrossDockReportSummary();
  if (!summary) return null;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Total CD Savings', value: `$${summary.total_savings_usd.toLocaleString()}`, sub: `${summary.completed_tasks} completed transfers`, color: 'text-green-600', icon: TrendingUp },
          { label: 'Avg Cycle Time (CD)', value: `${Math.round(summary.avg_cycle_minutes)} mins`, sub: 'Confirm to completion', color: 'text-blue-600', icon: BarChart3 },
          { label: 'Storage Avoided', value: `${summary.storage_avoided_units} units`, sub: 'Diverted from putaway', color: 'text-purple-600', icon: PieChartIcon },
        ].map((stat, i) => (
          <Card key={i} className="shadow-sm border-neutral-200">
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{stat.label}</p>
                  <h3 className={`text-3xl font-bold mt-1 ${stat.color}`}>{stat.value}</h3>
                  <p className="text-[10px] text-muted-foreground mt-1 font-medium">{stat.sub}</p>
                </div>
                <stat.icon className={`h-4 w-4 ${stat.color} opacity-40`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="shadow-sm border-neutral-200">
        <CardHeader className="pb-0">
          <CardTitle className="text-md font-bold">Volume Trend: Cross Dock vs Standard Receipt</CardTitle>
          <CardDescription className="text-xs">Last 7 days — direct-transfer tasks vs receipts routed to normal putaway.</CardDescription>
        </CardHeader>
        <CardContent className="h-[350px] p-6">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={summary.volume_trend}>
              <defs>
                <linearGradient id="colorCD" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorStd" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#94a3b8" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="day" axisLine={false} tickLine={false} style={{ fontSize: '12px' }} />
              <YAxis axisLine={false} tickLine={false} style={{ fontSize: '12px' }} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
              <Area type="monotone" dataKey="cd" stroke="#3b82f6" fillOpacity={1} fill="url(#colorCD)" strokeWidth={3} name="Cross Dock" />
              <Area type="monotone" dataKey="std" stroke="#94a3b8" fillOpacity={1} fill="url(#colorStd)" strokeWidth={2} name="Standard Receipt" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

const CrossDockSections: React.FC<{ activeTab: string; onNavigate?: (tab: string) => void }> = ({ activeTab, onNavigate }) => {
  switch (activeTab) {
    case 'planning': return <PlanningSection />;
    case 'execution': return <ExecutionSection onNavigate={onNavigate} />;
    case 'opportunistic': return <OpportunisticSection />;
    case 'staging': return <StagingSection />;
    case 'analytics': return <AnalyticsSection />;
    default: return <PlanningSection />;
  }
};

export default CrossDockSections;
