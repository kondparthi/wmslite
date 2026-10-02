import { useMemo, useState } from 'react';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import {
  ArrowsUpFromLine, Plus, Search, Download, Pencil, Trash2, X, Save,
  CheckCircle, AlertTriangle, Clock, Zap, BarChart3, RefreshCw,
  Play, Pause, StopCircle, MoreHorizontal, Loader2,
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import {
  useMasterDataList, useMasterDataCreate, useMasterDataUpdate, useMasterDataDelete,
} from '@/hooks/useMasterDataApi';
import {
  useReplenishmentTasks, useCreateTask, useAutoGenerateTasks, useStartTask, useHoldTask,
  useResumeTask, useReassignTask, useCancelTask, useCompleteTask,
  useReplenishmentTriggers, useCreateTaskFromTrigger, useReplenishmentReportSummary,
  type ReplenishmentTask,
} from '@/hooks/useReplenishmentOpsApi';

const TABS = [
  { id: 'tasks', label: 'Replenishment Tasks', icon: ArrowsUpFromLine },
  { id: 'rules', label: 'Replenishment Rules', icon: Zap },
  { id: 'triggers', label: 'Trigger Monitor', icon: AlertTriangle },
  { id: 'history', label: 'Execution History', icon: Clock },
  { id: 'reports', label: 'Reports', icon: BarChart3 },
];

interface MaterialRecord { id: number; sku: string; description: string; }
interface LocationRecord { id: number; code: string; }
interface RuleRecord {
  id: number; material_id: number; location_id: number | null;
  min_qty: number; max_qty: number; reorder_point: number | null; status: string;
}

const RULES_RESOURCE = '/master-data/replenishment-rules';
const MATERIALS_RESOURCE = '/master-data/materials';
const LOCATIONS_RESOURCE = '/master-data/locations';

const statusColor: Record<string, string> = {
  Ready: 'bg-blue-100 text-blue-700 border-blue-200',
  'In Progress': 'bg-amber-100 text-amber-700 border-amber-200',
  Completed: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  Pending: 'bg-neutral-100 text-neutral-600 border-neutral-200',
  'On Hold': 'bg-orange-100 text-orange-700 border-orange-200',
  Cancelled: 'bg-red-100 text-red-700 border-red-200',
};
const priorityColor: Record<string, string> = {
  Critical: 'bg-red-100 text-red-700 border-red-200',
  High: 'bg-orange-100 text-orange-700 border-orange-200',
  Medium: 'bg-amber-100 text-amber-700 border-amber-200',
  Low: 'bg-neutral-100 text-neutral-600 border-neutral-200',
};
const severityColor: Record<string, string> = {
  Critical: 'bg-red-100 text-red-700 border-red-200',
  High: 'bg-orange-100 text-orange-700 border-orange-200',
  Medium: 'bg-amber-100 text-amber-700 border-amber-200',
};

const emptyRuleForm = { material_id: '', location_id: '', min_qty: '', max_qty: '', reorder_point: '', status: 'Active' };
const emptyTaskForm = { material_id: '', from_location_id: '', to_location_id: '', qty_required: '', priority: 'High', assignee: '' };

export default function WmsLiteReplenishment() {
  const [activeTab, setActiveTab] = useState('tasks');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [bulkSelected, setBulkSelected] = useState<number[]>([]);

  const [showTaskDrawer, setShowTaskDrawer] = useState(false);
  const [taskForm, setTaskForm] = useState<any>(emptyTaskForm);

  const [showRuleDrawer, setShowRuleDrawer] = useState(false);
  const [editRule, setEditRule] = useState<RuleRecord | null>(null);
  const [ruleForm, setRuleForm] = useState<any>(emptyRuleForm);

  const { data: tasks = [], isLoading: tasksLoading } = useReplenishmentTasks();
  const { data: rules = [], isLoading: rulesLoading } = useMasterDataList<RuleRecord>(RULES_RESOURCE);
  const { data: materials = [] } = useMasterDataList<MaterialRecord>(MATERIALS_RESOURCE);
  const { data: locations = [] } = useMasterDataList<LocationRecord>(LOCATIONS_RESOURCE);
  const { data: triggers = [], isLoading: triggersLoading } = useReplenishmentTriggers();
  const { data: report } = useReplenishmentReportSummary();

  const createTask = useCreateTask();
  const autoGenerate = useAutoGenerateTasks();
  const startTask = useStartTask();
  const holdTask = useHoldTask();
  const resumeTask = useResumeTask();
  const reassignTask = useReassignTask();
  const cancelTask = useCancelTask();
  const completeTask = useCompleteTask();
  const createFromTrigger = useCreateTaskFromTrigger();

  const createRule = useMasterDataCreate<RuleRecord>(RULES_RESOURCE);
  const updateRule = useMasterDataUpdate<RuleRecord>(RULES_RESOURCE);
  const deleteRule = useMasterDataDelete(RULES_RESOURCE);

  const skuFor = (id: number) => materials.find(m => m.id === id)?.sku ?? `#${id}`;
  const locCodeFor = (id: number | null) => locations.find(l => l.id === id)?.code ?? '—';

  const openCreateTask = () => { setTaskForm(emptyTaskForm); setShowTaskDrawer(true); };
  const openCreateRule = () => { setEditRule(null); setRuleForm(emptyRuleForm); setShowRuleDrawer(true); };
  const openEditRule = (r: RuleRecord) => {
    setEditRule(r);
    setRuleForm({
      material_id: String(r.material_id), location_id: r.location_id ? String(r.location_id) : '',
      min_qty: String(r.min_qty), max_qty: String(r.max_qty), reorder_point: r.reorder_point?.toString() ?? '', status: r.status,
    });
    setShowRuleDrawer(true);
  };
  const toggleBulk = (id: number) => setBulkSelected(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  const filtered = useMemo(() => tasks.filter(t =>
    (statusFilter === 'all' || t.status === statusFilter) &&
    (t.task_number.toLowerCase().includes(search.toLowerCase()) || t.sku.toLowerCase().includes(search.toLowerCase()) || t.description.toLowerCase().includes(search.toLowerCase()))
  ), [tasks, search, statusFilter]);

  const today = new Date().toDateString();
  const completedToday = tasks.filter(t => t.status === 'Completed' && t.completed_at && new Date(t.completed_at).toDateString() === today).length;
  const inProgress = tasks.filter(t => t.status === 'In Progress').length;
  const pending = tasks.filter(t => t.status === 'Pending').length;
  const critical = tasks.filter(t => t.priority === 'Critical' && !['Completed', 'Cancelled'].includes(t.status)).length;
  const activeCount = tasks.filter(t => !['Completed', 'Cancelled'].includes(t.status)).length;

  const handleCreateTask = () => {
    if (!taskForm.material_id || !taskForm.from_location_id || !taskForm.to_location_id || !taskForm.qty_required) return;
    createTask.mutate({
      material_id: Number(taskForm.material_id), from_location_id: Number(taskForm.from_location_id),
      to_location_id: Number(taskForm.to_location_id), qty_required: Number(taskForm.qty_required),
      priority: taskForm.priority, assignee: taskForm.assignee || undefined,
    }, { onSuccess: () => setShowTaskDrawer(false) });
  };

  const ruleToPayload = () => ({
    material_id: Number(ruleForm.material_id), location_id: ruleForm.location_id ? Number(ruleForm.location_id) : null,
    min_qty: Number(ruleForm.min_qty) || 0, max_qty: Number(ruleForm.max_qty) || 0,
    reorder_point: ruleForm.reorder_point ? Number(ruleForm.reorder_point) : null, status: ruleForm.status,
  });
  const handleSaveRule = () => {
    if (!ruleForm.material_id) return;
    if (editRule) {
      updateRule.mutate({ id: editRule.id, payload: ruleToPayload() }, { onSuccess: () => setShowRuleDrawer(false) });
    } else {
      createRule.mutate(ruleToPayload(), { onSuccess: () => setShowRuleDrawer(false) });
    }
  };

  const handleReassign = (t: ReplenishmentTask) => {
    const name = prompt('Reassign to:', t.assignee || '');
    if (name) reassignTask.mutate({ id: t.id, assignee: name });
  };
  const handleStart = (t: ReplenishmentTask) => {
    if (t.assignee) { startTask.mutate({ id: t.id }); return; }
    const name = prompt('Assign to (required to start):');
    if (name) startTask.mutate({ id: t.id, assignee: name });
  };
  const bulkStart = () => {
    bulkSelected.forEach(id => {
      const t = tasks.find(x => x.id === id);
      if (t && ['Pending', 'Ready'].includes(t.status) && t.assignee) startTask.mutate({ id });
    });
    setBulkSelected([]);
  };

  const completedTasks = tasks.filter(t => t.status === 'Completed');

  return (
    <div className="flex h-screen bg-neutral-50 overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <div className="bg-white border-b border-neutral-200 px-6 py-2.5 flex flex-wrap gap-1.5">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setActiveTab(id)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border ${activeTab === id ? 'text-white border-[#009FE3]' : 'bg-neutral-50 text-neutral-600 border-neutral-200 hover:border-neutral-400'}`}
              style={activeTab === id ? { background: '#009FE3', borderColor: '#009FE3' } : {}}>
              <Icon size={12} />{label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* KPI */}
          <div className="grid grid-cols-5 gap-3">
            {[
              { label: 'Total Active Tasks', value: activeCount, color: 'text-neutral-900' },
              { label: 'Critical', value: critical, color: 'text-red-600' },
              { label: 'In Progress', value: inProgress, color: 'text-amber-600' },
              { label: 'Pending Assignment', value: pending, color: 'text-blue-600' },
              { label: 'Completed Today', value: completedToday, color: 'text-emerald-600' },
            ].map(k => (
              <Card key={k.label} className="border border-neutral-200 shadow-none">
                <CardContent className="p-4">
                  <p className="text-xs text-neutral-500">{k.label}</p>
                  <p className={`text-2xl font-bold mt-1 ${k.color}`}>{k.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Tasks Tab */}
          {activeTab === 'tasks' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 border border-neutral-200 rounded-lg px-3 py-2 bg-white w-64">
                    <Search className="w-3.5 h-3.5 text-neutral-400" />
                    <input className="bg-transparent text-xs text-neutral-700 placeholder-neutral-400 focus:outline-none w-full" placeholder="Search tasks, SKU..." value={search} onChange={e => setSearch(e.target.value)} />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="h-8 text-xs w-40"><SelectValue placeholder="All Statuses" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      {Object.keys(statusColor).map(s => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  {bulkSelected.length > 0 && (
                    <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8 border-amber-300 text-amber-700" onClick={bulkStart}>
                      <Play className="w-3.5 h-3.5" />Bulk Start ({bulkSelected.length})
                    </Button>
                  )}
                  <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8" onClick={() => autoGenerate.mutate()} disabled={autoGenerate.isPending}>
                    {autoGenerate.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}Auto-Generate
                  </Button>
                  <Button size="sm" className="gap-1.5 text-xs bg-neutral-900 hover:bg-neutral-800 text-white" onClick={openCreateTask}><Plus className="w-3.5 h-3.5" />New Task</Button>
                </div>
              </div>

              {autoGenerate.isSuccess && autoGenerate.data && (
                <div className="px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-700">
                  {autoGenerate.data.length > 0 ? `Created ${autoGenerate.data.length} task(s) from active rule deficits.` : 'No new tasks needed — all active rules are within threshold, or already have an open task.'}
                </div>
              )}

              <Card className="border border-neutral-200 shadow-none">
                <Table>
                  <TableHeader><TableRow className="bg-neutral-50">
                    <TableHead className="w-8"></TableHead>
                    <TableHead className="text-xs font-semibold text-neutral-600">Task ID</TableHead>
                    <TableHead className="text-xs font-semibold text-neutral-600">SKU / Item</TableHead>
                    <TableHead className="text-xs font-semibold text-neutral-600">From</TableHead>
                    <TableHead className="text-xs font-semibold text-neutral-600">To</TableHead>
                    <TableHead className="text-xs font-semibold text-neutral-600 text-center">Qty</TableHead>
                    <TableHead className="text-xs font-semibold text-neutral-600">Priority</TableHead>
                    <TableHead className="text-xs font-semibold text-neutral-600">Status</TableHead>
                    <TableHead className="text-xs font-semibold text-neutral-600">Assigned To</TableHead>
                    <TableHead className="text-xs font-semibold text-neutral-600 text-right">Actions</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {tasksLoading ? (
                      <TableRow><TableCell colSpan={10} className="text-center py-8 text-xs text-neutral-400"><Loader2 className="inline w-3.5 h-3.5 animate-spin mr-1.5" />Loading tasks…</TableCell></TableRow>
                    ) : filtered.length === 0 ? (
                      <TableRow><TableCell colSpan={10} className="text-center py-8 text-xs text-neutral-400">No tasks match.</TableCell></TableRow>
                    ) : filtered.map(t => (
                      <TableRow key={t.id} className="hover:bg-neutral-50">
                        <TableCell>
                          {['Pending', 'Ready'].includes(t.status) && (
                            <input type="checkbox" className="rounded" checked={bulkSelected.includes(t.id)} onChange={() => toggleBulk(t.id)} />
                          )}
                        </TableCell>
                        <TableCell className="text-xs font-mono font-semibold text-[#003A78]">{t.task_number}</TableCell>
                        <TableCell><div><p className="text-xs font-mono text-neutral-700">{t.sku}</p><p className="text-[10px] text-neutral-500">{t.description}</p></div></TableCell>
                        <TableCell className="text-xs font-mono text-neutral-600">{t.from_location_code}</TableCell>
                        <TableCell className="text-xs font-mono text-neutral-600">{t.to_location_code}</TableCell>
                        <TableCell className="text-xs text-center font-semibold text-neutral-900">{t.qty_assigned}</TableCell>
                        <TableCell><Badge className={`text-xs ${priorityColor[t.priority] || ''}`}>{t.priority}</Badge></TableCell>
                        <TableCell><Badge className={`text-xs ${statusColor[t.status] || ''}`}>{t.status}</Badge></TableCell>
                        <TableCell className="text-xs text-neutral-600">{t.assignee || '—'}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0"><MoreHorizontal className="w-3.5 h-3.5" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {['Pending', 'Ready'].includes(t.status) && (
                                <DropdownMenuItem className="text-xs" onClick={() => handleStart(t)}><Play className="w-3.5 h-3.5 mr-2" />Start Task</DropdownMenuItem>
                              )}
                              {t.status === 'In Progress' && (
                                <>
                                  <DropdownMenuItem className="text-xs" onClick={() => holdTask.mutate(t.id)}><Pause className="w-3.5 h-3.5 mr-2" />Hold</DropdownMenuItem>
                                  <DropdownMenuItem className="text-xs" onClick={() => completeTask.mutate(t.id)}><CheckCircle className="w-3.5 h-3.5 mr-2" />Mark Complete</DropdownMenuItem>
                                </>
                              )}
                              {t.status === 'On Hold' && (
                                <DropdownMenuItem className="text-xs" onClick={() => resumeTask.mutate(t.id)}><Play className="w-3.5 h-3.5 mr-2" />Resume</DropdownMenuItem>
                              )}
                              {!['Completed', 'Cancelled'].includes(t.status) && (
                                <>
                                  <DropdownMenuItem className="text-xs" onClick={() => handleReassign(t)}><Pencil className="w-3.5 h-3.5 mr-2" />Reassign</DropdownMenuItem>
                                  <DropdownMenuItem className="text-xs text-red-600" onClick={() => cancelTask.mutate(t.id)}><StopCircle className="w-3.5 h-3.5 mr-2" />Cancel</DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            </div>
          )}

          {/* Rules Tab */}
          {activeTab === 'rules' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-neutral-800">Replenishment Rules Configuration</h3>
                  <p className="text-xs text-neutral-500 mt-0.5">Min/Max + reorder point rules (per project scope — no demand forecasting). Shared with Master Data.</p>
                </div>
                <Button size="sm" className="gap-1.5 text-xs bg-neutral-900 hover:bg-neutral-800 text-white" onClick={openCreateRule}><Plus className="w-3.5 h-3.5" />Add Rule</Button>
              </div>
              <Card className="border border-neutral-200 shadow-none">
                <Table>
                  <TableHeader><TableRow className="bg-neutral-50">
                    <TableHead className="text-xs font-semibold">SKU / Item</TableHead>
                    <TableHead className="text-xs font-semibold">Location</TableHead>
                    <TableHead className="text-xs font-semibold text-center">Min Qty</TableHead>
                    <TableHead className="text-xs font-semibold text-center">Max Qty</TableHead>
                    <TableHead className="text-xs font-semibold text-center">Reorder Point</TableHead>
                    <TableHead className="text-xs font-semibold">Status</TableHead>
                    <TableHead className="text-xs font-semibold text-right">Actions</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {rulesLoading ? (
                      <TableRow><TableCell colSpan={7} className="text-center py-8 text-xs text-neutral-400"><Loader2 className="inline w-3.5 h-3.5 animate-spin mr-1.5" />Loading rules…</TableCell></TableRow>
                    ) : rules.length === 0 ? (
                      <TableRow><TableCell colSpan={7} className="text-center py-8 text-xs text-neutral-400">No rules yet.</TableCell></TableRow>
                    ) : rules.map(r => (
                      <TableRow key={r.id} className="hover:bg-neutral-50">
                        <TableCell className="text-xs font-mono font-semibold text-[#003A78]">{skuFor(r.material_id)}</TableCell>
                        <TableCell className="text-xs font-mono text-neutral-600">{locCodeFor(r.location_id)}</TableCell>
                        <TableCell className="text-xs text-center font-semibold">{r.min_qty}</TableCell>
                        <TableCell className="text-xs text-center font-semibold">{r.max_qty}</TableCell>
                        <TableCell className="text-xs text-center font-semibold text-amber-600">{r.reorder_point ?? '—'}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Switch checked={r.status === 'Active'} className="data-[state=checked]:bg-emerald-500"
                              onCheckedChange={(checked) => updateRule.mutate({ id: r.id, payload: { status: checked ? 'Active' : 'Inactive' } })} />
                            <span className="text-xs text-neutral-600">{r.status}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEditRule(r)}><Pencil className="w-3.5 h-3.5" /></Button>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500" onClick={() => { if (confirm('Delete this rule?')) deleteRule.mutate(r.id); }}><Trash2 className="w-3.5 h-3.5" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            </div>
          )}

          {/* Trigger Monitor */}
          {activeTab === 'triggers' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-neutral-800">Live Trigger Monitor</h3>
                <div className="flex items-center gap-1.5 text-xs text-emerald-600"><div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />Computed live against current stock</div>
              </div>
              <Card className="border border-neutral-200 shadow-none">
                <Table>
                  <TableHeader><TableRow className="bg-neutral-50">
                    <TableHead className="text-xs font-semibold">SKU</TableHead>
                    <TableHead className="text-xs font-semibold">Location</TableHead>
                    <TableHead className="text-xs font-semibold text-center">Current Qty</TableHead>
                    <TableHead className="text-xs font-semibold text-center">Min Qty</TableHead>
                    <TableHead className="text-xs font-semibold text-center">Deficit</TableHead>
                    <TableHead className="text-xs font-semibold">Level</TableHead>
                    <TableHead className="text-xs font-semibold">RPL Task</TableHead>
                    <TableHead className="text-xs font-semibold">Status</TableHead>
                    <TableHead className="text-xs font-semibold text-right">Actions</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {triggersLoading ? (
                      <TableRow><TableCell colSpan={9} className="text-center py-8 text-xs text-neutral-400"><Loader2 className="inline w-3.5 h-3.5 animate-spin mr-1.5" />Checking stock levels…</TableCell></TableRow>
                    ) : triggers.length === 0 ? (
                      <TableRow><TableCell colSpan={9} className="text-center py-8 text-xs text-neutral-400">No active rule is currently below its threshold.</TableCell></TableRow>
                    ) : triggers.map(t => (
                      <TableRow key={t.rule_id} className={`hover:bg-neutral-50 ${t.severity === 'Critical' ? 'bg-red-50/30' : ''}`}>
                        <TableCell className="text-xs font-mono font-medium text-neutral-900">{t.sku}</TableCell>
                        <TableCell className="text-xs font-mono text-neutral-600">{t.location_code}</TableCell>
                        <TableCell className="text-xs text-center font-bold text-red-600">{t.current_qty}</TableCell>
                        <TableCell className="text-xs text-center text-neutral-700">{t.min_qty}</TableCell>
                        <TableCell className="text-xs text-center font-bold text-amber-600">{t.deficit}</TableCell>
                        <TableCell><Badge className={`text-xs ${severityColor[t.severity] || ''}`}>{t.severity}</Badge></TableCell>
                        <TableCell className="text-xs font-mono text-[#009FE3]">{t.open_task_number || '—'}</TableCell>
                        <TableCell><Badge className={`text-xs ${t.status === 'Task Created' ? 'bg-emerald-100 text-emerald-700' : t.status === 'No Source Available' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{t.status}</Badge></TableCell>
                        <TableCell className="text-right">
                          {t.status === 'Pending Review' && (
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => createFromTrigger.mutate(t.rule_id)} disabled={createFromTrigger.isPending}>Create Task</Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>

              {triggers.length > 0 && (
                <Card className="border border-neutral-200 shadow-none">
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Pick Face Stock Levels – Below Threshold</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    {triggers.map(t => (
                      <div key={t.rule_id} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="font-medium text-neutral-800">{t.sku} · {t.location_code}</span>
                          <span className="font-semibold text-neutral-600">{t.current_qty} / {t.min_qty} min</span>
                        </div>
                        <Progress value={(t.current_qty / t.min_qty) * 100} className="h-2" />
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* History */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Execution History</h3>
                <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8"><Download className="w-3.5 h-3.5" />Export History</Button>
              </div>
              <Card className="border border-neutral-200 shadow-none">
                <Table>
                  <TableHeader><TableRow className="bg-neutral-50">
                    <TableHead className="text-xs font-semibold">Task ID</TableHead>
                    <TableHead className="text-xs font-semibold">SKU</TableHead>
                    <TableHead className="text-xs font-semibold">From → To</TableHead>
                    <TableHead className="text-xs font-semibold text-center">Qty Moved</TableHead>
                    <TableHead className="text-xs font-semibold">Completed By</TableHead>
                    <TableHead className="text-xs font-semibold">Completed On</TableHead>
                    <TableHead className="text-xs font-semibold">Duration</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {completedTasks.length === 0 ? (
                      <TableRow><TableCell colSpan={7} className="text-center py-8 text-xs text-neutral-400">No completed tasks yet.</TableCell></TableRow>
                    ) : completedTasks.map(t => {
                      const mins = t.completed_at && t.created_at ? Math.round((new Date(t.completed_at).getTime() - new Date(t.created_at).getTime()) / 60000) : null;
                      return (
                        <TableRow key={t.id} className="hover:bg-neutral-50">
                          <TableCell className="text-xs font-mono font-semibold text-[#003A78]">{t.task_number}</TableCell>
                          <TableCell className="text-xs font-mono">{t.sku}</TableCell>
                          <TableCell className="text-xs text-neutral-600">{t.from_location_code} → {t.to_location_code}</TableCell>
                          <TableCell className="text-xs text-center font-semibold">{t.qty_assigned}</TableCell>
                          <TableCell className="text-xs text-neutral-600">{t.assignee || '—'}</TableCell>
                          <TableCell className="text-xs text-neutral-500">{t.completed_at ? new Date(t.completed_at).toLocaleString() : '—'}</TableCell>
                          <TableCell className="text-xs text-neutral-600">{mins != null ? `${mins} min` : '—'}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </Card>
            </div>
          )}

          {/* Reports */}
          {activeTab === 'reports' && report && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <Card className="border border-neutral-200 shadow-none">
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Monthly Replenishment Volume</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={report.monthly_volume}>
                        <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                        <Tooltip />
                        <Bar dataKey="tasks" fill="#009FE3" radius={[4, 4, 0, 0]} name="Tasks Completed" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
                <Card className="border border-neutral-200 shadow-none">
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Top Replenished SKUs (Qty Moved)</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={report.top_skus} layout="vertical">
                        <XAxis type="number" tick={{ fontSize: 11 }} />
                        <YAxis dataKey="sku" type="category" tick={{ fontSize: 11 }} width={75} />
                        <Tooltip />
                        <Bar dataKey="qty" fill="#003A78" radius={[0, 4, 4, 0]} name="Qty Moved" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: 'Tasks Completed MTD', value: String(report.tasks_completed_mtd), sub: 'Month to date' },
                  { label: 'Avg Task Duration', value: `${report.avg_task_duration_minutes} min`, sub: 'From create to complete' },
                  { label: 'Auto-Triggered', value: `${report.auto_triggered_pct}%`, sub: 'Of all replenishment tasks' },
                  { label: 'Rule Accuracy', value: `${report.rule_accuracy_pct}%`, sub: 'No overstock post replenish' },
                ].map(m => (
                  <Card key={m.label} className="border border-neutral-200 shadow-none">
                    <CardContent className="p-4">
                      <p className="text-xs text-neutral-500">{m.label}</p>
                      <p className="text-2xl font-bold text-neutral-900 mt-1">{m.value}</p>
                      <p className="text-[10px] text-neutral-400 mt-0.5">{m.sub}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Task Drawer */}
      {showTaskDrawer && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/30" onClick={() => setShowTaskDrawer(false)} />
          <div className="w-[460px] bg-white h-full flex flex-col shadow-2xl">
            <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between" style={{ background: 'linear-gradient(135deg,#003A78,#005BAA)' }}>
              <div><p className="text-white font-semibold text-sm">Create Replenishment Task</p><p className="text-blue-200 text-xs mt-0.5">Manual task creation</p></div>
              <button onClick={() => setShowTaskDrawer(false)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20"><X className="w-4 h-4 text-white" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5 col-span-2">
                  <Label className="text-xs font-medium">SKU</Label>
                  <Select value={taskForm.material_id} onValueChange={v => setTaskForm({ ...taskForm, material_id: v })}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select material" /></SelectTrigger>
                    <SelectContent>{materials.map(m => <SelectItem key={m.id} value={String(m.id)}>{m.sku} — {m.description}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">From Location</Label>
                  <Select value={taskForm.from_location_id} onValueChange={v => setTaskForm({ ...taskForm, from_location_id: v })}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Source" /></SelectTrigger>
                    <SelectContent>{locations.map(l => <SelectItem key={l.id} value={String(l.id)}>{l.code}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">To Location</Label>
                  <Select value={taskForm.to_location_id} onValueChange={v => setTaskForm({ ...taskForm, to_location_id: v })}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Destination" /></SelectTrigger>
                    <SelectContent>{locations.map(l => <SelectItem key={l.id} value={String(l.id)}>{l.code}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5"><Label className="text-xs font-medium">Qty Required</Label><Input value={taskForm.qty_required || ''} onChange={e => setTaskForm({ ...taskForm, qty_required: e.target.value })} className="h-8 text-sm" type="number" /></div>
                <div className="space-y-1.5"><Label className="text-xs font-medium">Priority</Label>
                  <Select value={taskForm.priority} onValueChange={v => setTaskForm({ ...taskForm, priority: v })}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="Critical">Critical</SelectItem><SelectItem value="High">High</SelectItem><SelectItem value="Medium">Medium</SelectItem><SelectItem value="Low">Low</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 col-span-2"><Label className="text-xs font-medium">Assign To (optional)</Label><Input value={taskForm.assignee || ''} onChange={e => setTaskForm({ ...taskForm, assignee: e.target.value })} className="h-8 text-sm" placeholder="Employee name" /></div>
              </div>
              {createTask.isError && <p className="text-xs text-red-600">{(createTask.error as Error).message}</p>}
            </div>
            <div className="px-6 py-4 border-t border-neutral-200 flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowTaskDrawer(false)}><X className="w-3.5 h-3.5 mr-1" />Cancel</Button>
              <Button size="sm" className="bg-neutral-900 hover:bg-neutral-800 text-white" onClick={handleCreateTask} disabled={createTask.isPending}>
                {createTask.isPending ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1" />}Create Task
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Rule Drawer */}
      {showRuleDrawer && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/30" onClick={() => setShowRuleDrawer(false)} />
          <div className="w-[460px] bg-white h-full flex flex-col shadow-2xl">
            <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between" style={{ background: 'linear-gradient(135deg,#003A78,#005BAA)' }}>
              <div><p className="text-white font-semibold text-sm">{editRule ? 'Edit Rule' : 'Add Replenishment Rule'}</p></div>
              <button onClick={() => setShowRuleDrawer(false)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20"><X className="w-4 h-4 text-white" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5 col-span-2">
                  <Label className="text-xs font-medium">SKU</Label>
                  <Select value={ruleForm.material_id} onValueChange={v => setRuleForm({ ...ruleForm, material_id: v })}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select material" /></SelectTrigger>
                    <SelectContent>{materials.map(m => <SelectItem key={m.id} value={String(m.id)}>{m.sku} — {m.description}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 col-span-2">
                  <Label className="text-xs font-medium">Location</Label>
                  <Select value={ruleForm.location_id} onValueChange={v => setRuleForm({ ...ruleForm, location_id: v })}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select location" /></SelectTrigger>
                    <SelectContent>{locations.map(l => <SelectItem key={l.id} value={String(l.id)}>{l.code}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5"><Label className="text-xs font-medium">Min Qty</Label><Input value={ruleForm.min_qty || ''} onChange={e => setRuleForm({ ...ruleForm, min_qty: e.target.value })} className="h-8 text-sm" type="number" /></div>
                <div className="space-y-1.5"><Label className="text-xs font-medium">Max Qty</Label><Input value={ruleForm.max_qty || ''} onChange={e => setRuleForm({ ...ruleForm, max_qty: e.target.value })} className="h-8 text-sm" type="number" /></div>
                <div className="space-y-1.5"><Label className="text-xs font-medium">Reorder Point</Label><Input value={ruleForm.reorder_point || ''} onChange={e => setRuleForm({ ...ruleForm, reorder_point: e.target.value })} className="h-8 text-sm" type="number" /></div>
              </div>
              {(createRule.isError || updateRule.isError) && <p className="text-xs text-red-600">{((createRule.error || updateRule.error) as Error).message}</p>}
            </div>
            <div className="px-6 py-4 border-t border-neutral-200 flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowRuleDrawer(false)}><X className="w-3.5 h-3.5 mr-1" />Cancel</Button>
              <Button size="sm" className="bg-neutral-900 hover:bg-neutral-800 text-white" onClick={handleSaveRule} disabled={createRule.isPending || updateRule.isPending}>
                {(createRule.isPending || updateRule.isPending) ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1" />}Save Rule
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
