import { useState } from 'react';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import {
  Plus, Search, Download, Eye, Pencil, Trash2, X, Save,
  CheckCircle, Clock, Package, Truck, ClipboardList,
  ArrowRight, MoreHorizontal, BarChart3, RefreshCw,
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { useMasterDataList } from '@/hooks/useMasterDataApi';
import {
  useRMARequests, useCreateRMA, useTransitionRMA,
  useInspections, useCreateInspection, useGradeInspection, useApproveInspection,
  useDispositions, useCompleteDisposition,
  usePendingAdjustments, usePostAdjustment,
  useReturnsReportSummary,
  type RMARequest, type InspectionRecord,
} from '@/hooks/useReturnsOpsApi';

interface MaterialOption { id: number; sku: string; description: string }

const TABS = [
  { id: 'rma-requests', label: 'RMA Requests', icon: ClipboardList },
  { id: 'receiving', label: 'Returns Receiving', icon: Package },
  { id: 'inspection', label: 'Inspection & Grading', icon: Eye },
  { id: 'disposition', label: 'Disposition', icon: ArrowRight },
  { id: 'inventory-adj', label: 'Inventory Adjustment', icon: RefreshCw },
  { id: 'reports', label: 'Reports & Analytics', icon: BarChart3 },
];

const REASON_OPTIONS = ['Defective', 'Wrong Item', 'Damaged', 'Not Described', 'Expired', 'Other'];

const statusColor: Record<string, string> = {
  'Pending Approval': 'bg-amber-100 text-amber-700 border-amber-200',
  'Approved': 'bg-blue-100 text-blue-700 border-blue-200',
  'In Transit': 'bg-purple-100 text-purple-700 border-purple-200',
  'Received': 'bg-sky-100 text-sky-700 border-sky-200',
  'Inspection': 'bg-orange-100 text-orange-700 border-orange-200',
  'Closed': 'bg-emerald-100 text-emerald-700 border-emerald-200',
};

const priorityColor: Record<string, string> = {
  High: 'bg-red-100 text-red-700 border-red-200',
  Medium: 'bg-amber-100 text-amber-700 border-amber-200',
  Low: 'bg-neutral-100 text-neutral-600 border-neutral-200',
};

const gradeColor = (grade: string | null) =>
  grade?.startsWith('A') ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
    : grade?.startsWith('B') ? 'bg-amber-100 text-amber-700 border-amber-200'
    : grade?.startsWith('C') ? 'bg-red-100 text-red-700 border-red-200'
    : 'bg-neutral-100 text-neutral-500 border-neutral-200';

const actionColor = (action: string) =>
  action === 'Return to Stock' ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
    : action === 'Repair & Relist' ? 'bg-blue-100 text-blue-700 border-blue-200'
    : action === 'Vendor Return' ? 'bg-amber-100 text-amber-700 border-amber-200'
    : 'bg-red-100 text-red-700 border-red-200';

const fmtDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');

const emptyCreateForm = { order_reference: '', customer: '', material_id: '', qty: '', reason: 'Defective', return_type: 'Customer Return', priority: 'Medium' };

export default function WmsLiteReturnsRMA() {
  const [activeTab, setActiveTab] = useState('rma-requests');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [showDrawer, setShowDrawer] = useState(false);
  const [showDetailDrawer, setShowDetailDrawer] = useState(false);
  const [selectedRMA, setSelectedRMA] = useState<RMARequest | null>(null);
  const [form, setForm] = useState<any>(emptyCreateForm);

  const [showInspectionDrawer, setShowInspectionDrawer] = useState(false);
  const [inspectForm, setInspectForm] = useState<any>({ rma_id: '', qty_received: '', inspector: '' });

  const [gradeTarget, setGradeTarget] = useState<InspectionRecord | null>(null);
  const [gradeForm, setGradeForm] = useState<any>({ qty_inspected: '', grade: 'A - Resellable', notes: '', inspector: '' });

  const { data: rmas = [] } = useRMARequests();
  const { data: inspections = [] } = useInspections();
  const { data: dispositions = [] } = useDispositions();
  const { data: adjustments = [] } = usePendingAdjustments();
  const { data: report } = useReturnsReportSummary();
  const { data: materials = [] } = useMasterDataList<MaterialOption>('/master-data/materials');

  const createRMA = useCreateRMA();
  const transitionRMA = useTransitionRMA();
  const createInspection = useCreateInspection();
  const gradeInspection = useGradeInspection();
  const approveInspection = useApproveInspection();
  const completeDisposition = useCompleteDisposition();
  const postAdjustment = usePostAdjustment();

  const openCreate = () => { setForm(emptyCreateForm); setShowDrawer(true); };
  const openDetail = (item: RMARequest) => { setSelectedRMA(item); setShowDetailDrawer(true); };

  const filtered = rmas.filter(r =>
    (statusFilter === 'all' || r.status === statusFilter) &&
    (r.rma_number.toLowerCase().includes(search.toLowerCase()) || r.customer.toLowerCase().includes(search.toLowerCase()) || r.sku.toLowerCase().includes(search.toLowerCase()))
  );

  const handleCreateRMA = () => {
    if (!form.customer || !form.material_id || !form.qty) return;
    createRMA.mutate({
      order_reference: form.order_reference || null,
      customer: form.customer,
      material_id: Number(form.material_id),
      qty: Number(form.qty),
      reason: form.reason,
      return_type: form.return_type,
      priority: form.priority,
    }, { onSuccess: () => setShowDrawer(false) });
  };

  const receivingCards = rmas.filter(r => ['Approved', 'In Transit', 'Received'].includes(r.status));

  const submitInspection = () => {
    if (!inspectForm.rma_id || !inspectForm.qty_received) return;
    createInspection.mutate({
      rma_id: Number(inspectForm.rma_id),
      qty_received: Number(inspectForm.qty_received),
      inspector: inspectForm.inspector || undefined,
    }, { onSuccess: () => setShowInspectionDrawer(false) });
  };

  const submitGrade = () => {
    if (!gradeTarget || !gradeForm.qty_inspected || !gradeForm.grade) return;
    gradeInspection.mutate({
      id: gradeTarget.id,
      payload: {
        qty_inspected: Number(gradeForm.qty_inspected),
        grade: gradeForm.grade,
        notes: gradeForm.notes || undefined,
        inspector: gradeForm.inspector || undefined,
      },
    }, { onSuccess: () => setGradeTarget(null) });
  };

  const receivableRmas = rmas.filter(r => r.status === 'Received');

  return (
    <div className="flex h-screen bg-neutral-50 overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        {/* Tab Nav */}
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
          {/* KPI Row */}
          <div className="grid grid-cols-5 gap-3">
            {[
              { label: 'Total RMAs', value: rmas.length, sub: 'All time', color: 'text-neutral-900' },
              { label: 'Pending Approval', value: rmas.filter(r => r.status === 'Pending Approval').length, sub: 'Awaiting action', color: 'text-amber-600' },
              { label: 'In Transit', value: rmas.filter(r => r.status === 'In Transit').length, sub: 'Inbound returns', color: 'text-purple-600' },
              { label: 'Under Inspection', value: rmas.filter(r => r.status === 'Inspection').length, sub: 'Quality check', color: 'text-orange-600' },
              { label: 'Closed', value: rmas.filter(r => r.status === 'Closed').length, sub: 'Fully resolved', color: 'text-emerald-600' },
            ].map(k => (
              <Card key={k.label} className="border border-neutral-200 shadow-none">
                <CardContent className="p-4">
                  <p className="text-xs text-neutral-500">{k.label}</p>
                  <p className={`text-2xl font-bold mt-1 ${k.color}`}>{k.value}</p>
                  <p className="text-[10px] text-neutral-400 mt-0.5">{k.sub}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* RMA Requests Tab */}
          {activeTab === 'rma-requests' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 border border-neutral-200 rounded-lg px-3 py-2 bg-white w-64">
                    <Search className="w-3.5 h-3.5 text-neutral-400" />
                    <input className="bg-transparent text-xs text-neutral-700 placeholder-neutral-400 focus:outline-none w-full" placeholder="Search RMA, SKU, customer..." value={search} onChange={e => setSearch(e.target.value)} />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="h-8 text-xs w-44"><SelectValue placeholder="All Statuses" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      {Object.keys(statusColor).map(s => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8"><Download className="w-3.5 h-3.5" />Export</Button>
                  <Button size="sm" className="gap-1.5 text-xs bg-neutral-900 hover:bg-neutral-800 text-white" onClick={openCreate}><Plus className="w-3.5 h-3.5" />New RMA</Button>
                </div>
              </div>

              <Card className="border border-neutral-200 shadow-none">
                <Table>
                  <TableHeader><TableRow className="bg-neutral-50">
                    <TableHead className="text-xs font-semibold text-neutral-600">RMA ID</TableHead>
                    <TableHead className="text-xs font-semibold text-neutral-600">Order Ref</TableHead>
                    <TableHead className="text-xs font-semibold text-neutral-600">Customer</TableHead>
                    <TableHead className="text-xs font-semibold text-neutral-600">SKU / Item</TableHead>
                    <TableHead className="text-xs font-semibold text-neutral-600 text-center">Qty</TableHead>
                    <TableHead className="text-xs font-semibold text-neutral-600">Reason</TableHead>
                    <TableHead className="text-xs font-semibold text-neutral-600">Priority</TableHead>
                    <TableHead className="text-xs font-semibold text-neutral-600">Status</TableHead>
                    <TableHead className="text-xs font-semibold text-neutral-600">Raised On</TableHead>
                    <TableHead className="text-xs font-semibold text-neutral-600 text-right">Actions</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {filtered.map(r => (
                      <TableRow key={r.id} className="hover:bg-neutral-50">
                        <TableCell className="text-xs font-mono font-semibold text-[#003A78] cursor-pointer hover:underline" onClick={() => openDetail(r)}>{r.rma_number}</TableCell>
                        <TableCell className="text-xs font-mono text-neutral-600">{r.order_reference || '—'}</TableCell>
                        <TableCell className="text-xs font-medium text-neutral-900">{r.customer}</TableCell>
                        <TableCell>
                          <div><p className="text-xs font-mono text-neutral-700">{r.sku}</p><p className="text-[10px] text-neutral-500">{r.description}</p></div>
                        </TableCell>
                        <TableCell className="text-xs text-center font-semibold text-neutral-900">{r.qty}</TableCell>
                        <TableCell className="text-xs text-neutral-600 max-w-[150px] truncate">{r.reason}</TableCell>
                        <TableCell><Badge className={`text-xs ${priorityColor[r.priority]}`}>{r.priority}</Badge></TableCell>
                        <TableCell><Badge className={`text-xs ${statusColor[r.status] || 'bg-neutral-100 text-neutral-600'}`}>{r.status}</Badge></TableCell>
                        <TableCell className="text-xs text-neutral-500">{fmtDate(r.created_at)}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0"><MoreHorizontal className="w-3.5 h-3.5" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem className="text-xs" onClick={() => openDetail(r)}><Eye className="w-3.5 h-3.5 mr-2" />View Details</DropdownMenuItem>
                              {r.status === 'Pending Approval' && (
                                <DropdownMenuItem className="text-xs" onClick={() => transitionRMA.mutate({ id: r.id, action: 'approve' })}><CheckCircle className="w-3.5 h-3.5 mr-2" />Approve</DropdownMenuItem>
                              )}
                              {r.status === 'Approved' && (
                                <DropdownMenuItem className="text-xs" onClick={() => transitionRMA.mutate({ id: r.id, action: 'ship' })}><Truck className="w-3.5 h-3.5 mr-2" />Mark In Transit</DropdownMenuItem>
                              )}
                              {r.status === 'In Transit' && (
                                <DropdownMenuItem className="text-xs" onClick={() => transitionRMA.mutate({ id: r.id, action: 'receive' })}><Package className="w-3.5 h-3.5 mr-2" />Mark Received</DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filtered.length === 0 && (
                      <TableRow><TableCell colSpan={10} className="text-center text-xs text-neutral-400 py-8">No RMAs match this filter</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </Card>
            </div>
          )}

          {/* Returns Receiving */}
          {activeTab === 'receiving' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-neutral-800">Returns Receiving Queue</h3>
              </div>
              <div className="grid grid-cols-3 gap-4">
                {receivingCards.map(r => (
                  <Card key={r.id} className="border border-neutral-200 shadow-none hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="text-xs font-mono font-bold text-[#003A78]">{r.rma_number}</p>
                          <p className="text-xs text-neutral-600 mt-0.5">{r.customer}</p>
                        </div>
                        <Badge className={`text-xs ${statusColor[r.status]}`}>{r.status}</Badge>
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs"><span className="text-neutral-500">SKU</span><span className="font-mono font-medium">{r.sku}</span></div>
                        <div className="flex justify-between text-xs"><span className="text-neutral-500">Item</span><span className="font-medium text-right max-w-[140px] truncate">{r.description}</span></div>
                        <div className="flex justify-between text-xs"><span className="text-neutral-500">Qty Expected</span><span className="font-semibold">{r.qty} units</span></div>
                        <div className="flex justify-between text-xs"><span className="text-neutral-500">Return Type</span><span>{r.return_type}</span></div>
                      </div>
                      <Separator className="my-3" />
                      {r.status === 'Approved' && (
                        <Button size="sm" className="w-full text-xs h-7 bg-neutral-900 hover:bg-neutral-800 text-white" onClick={() => transitionRMA.mutate({ id: r.id, action: 'ship' })}>Mark In Transit</Button>
                      )}
                      {r.status === 'In Transit' && (
                        <Button size="sm" className="w-full text-xs h-7 bg-neutral-900 hover:bg-neutral-800 text-white" onClick={() => transitionRMA.mutate({ id: r.id, action: 'receive' })}>Mark Received</Button>
                      )}
                      {r.status === 'Received' && (
                        <Button size="sm" variant="outline" className="w-full text-xs h-7" onClick={() => { setInspectForm({ rma_id: String(r.id), qty_received: String(r.qty), inspector: '' }); setShowInspectionDrawer(true); }}>Start Inspection</Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
                {receivingCards.length === 0 && (
                  <p className="text-xs text-neutral-400 col-span-3 text-center py-8">No returns in the receiving queue right now</p>
                )}
              </div>
            </div>
          )}

          {/* Inspection & Grading */}
          {activeTab === 'inspection' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-neutral-800">Inspection & Quality Grading</h3>
                <Button size="sm" className="gap-1.5 text-xs bg-neutral-900 hover:bg-neutral-800 text-white"
                  disabled={receivableRmas.length === 0}
                  onClick={() => { setInspectForm({ rma_id: receivableRmas[0] ? String(receivableRmas[0].id) : '', qty_received: '', inspector: '' }); setShowInspectionDrawer(true); }}>
                  <Plus className="w-3.5 h-3.5" />Start Inspection
                </Button>
              </div>
              <Card className="border border-neutral-200 shadow-none">
                <Table>
                  <TableHeader><TableRow className="bg-neutral-50">
                    <TableHead className="text-xs font-semibold">Inspection ID</TableHead>
                    <TableHead className="text-xs font-semibold">RMA Ref</TableHead>
                    <TableHead className="text-xs font-semibold">SKU / Item</TableHead>
                    <TableHead className="text-xs font-semibold text-center">Qty Received</TableHead>
                    <TableHead className="text-xs font-semibold text-center">Qty Inspected</TableHead>
                    <TableHead className="text-xs font-semibold">Grade</TableHead>
                    <TableHead className="text-xs font-semibold">Inspector</TableHead>
                    <TableHead className="text-xs font-semibold">Status</TableHead>
                    <TableHead className="text-xs font-semibold text-right">Actions</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {inspections.map(i => (
                      <TableRow key={i.id} className="hover:bg-neutral-50">
                        <TableCell className="text-xs font-mono font-semibold text-[#003A78]">{i.inspection_number}</TableCell>
                        <TableCell className="text-xs font-mono text-neutral-600">{i.rma_number}</TableCell>
                        <TableCell><div><p className="text-xs font-mono text-neutral-700">{i.sku}</p><p className="text-[10px] text-neutral-500">{i.description}</p></div></TableCell>
                        <TableCell className="text-xs text-center">{i.qty_received}</TableCell>
                        <TableCell className="text-xs text-center">{i.qty_inspected || '—'}</TableCell>
                        <TableCell>{i.grade ? <Badge className={`text-xs ${gradeColor(i.grade)}`}>{i.grade}</Badge> : <span className="text-xs text-neutral-400">Not graded</span>}</TableCell>
                        <TableCell className="text-xs text-neutral-600">{i.inspector || '—'}</TableCell>
                        <TableCell><Badge className={`text-xs ${i.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' : i.status === 'Graded' ? 'bg-amber-100 text-amber-700' : 'bg-neutral-100 text-neutral-600'}`}>{i.status}</Badge></TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {i.status === 'Pending' && (
                              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-[#009FE3]"
                                onClick={() => { setGradeTarget(i); setGradeForm({ qty_inspected: String(i.qty_received), grade: 'A - Resellable', notes: '', inspector: i.inspector || '' }); }}>
                                Grade
                              </Button>
                            )}
                            {i.status === 'Graded' && (
                              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-emerald-600" onClick={() => approveInspection.mutate(i.id)}>Approve</Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {inspections.length === 0 && (
                      <TableRow><TableCell colSpan={9} className="text-center text-xs text-neutral-400 py-8">No inspections yet</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </Card>
              {/* Grade Reference */}
              <Card className="border border-neutral-200 shadow-none bg-neutral-50">
                <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Grading Reference</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-3 gap-3">
                  {[
                    { grade: 'Grade A – Resellable', desc: 'Item is fully functional and in original or near-original condition. Returned to stock and resold as new.', color: 'border-emerald-300 bg-emerald-50' },
                    { grade: 'Grade B – Refurbishable', desc: 'Item has minor cosmetic damage or requires minor repair. Sent to the refurb bay before relisting.', color: 'border-amber-300 bg-amber-50' },
                    { grade: 'Grade C – Scrap/Dispose', desc: 'Item is non-functional, heavily damaged, or expired. Disposed of or destroyed.', color: 'border-red-300 bg-red-50' },
                  ].map(g => (
                    <div key={g.grade} className={`p-3 rounded-lg border ${g.color}`}>
                      <p className="text-xs font-semibold text-neutral-900 mb-1">{g.grade}</p>
                      <p className="text-[11px] text-neutral-600">{g.desc}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Disposition */}
          {activeTab === 'disposition' && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-neutral-800">Disposition Actions</h3>
              <div className="grid grid-cols-4 gap-3 mb-4">
                {[
                  { label: 'Return to Stock', count: dispositions.filter(d => d.action === 'Return to Stock').length, icon: Package, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
                  { label: 'Repair & Relist', count: dispositions.filter(d => d.action === 'Repair & Relist').length, icon: RefreshCw, color: 'text-blue-600 bg-blue-50 border-blue-200' },
                  { label: 'Dispose / Destroy', count: dispositions.filter(d => d.action === 'Dispose / Destroy').length, icon: Trash2, color: 'text-red-600 bg-red-50 border-red-200' },
                  { label: 'Vendor Return', count: dispositions.filter(d => d.action === 'Vendor Return').length, icon: Truck, color: 'text-amber-600 bg-amber-50 border-amber-200' },
                ].map(d => (
                  <Card key={d.label} className={`border ${d.color.split(' ')[2]} shadow-none`}>
                    <CardContent className={`p-4 flex items-center gap-3 ${d.color.split(' ')[1]}`}>
                      <d.icon className={`w-5 h-5 ${d.color.split(' ')[0]}`} />
                      <div><p className="text-xs font-medium text-neutral-700">{d.label}</p><p className={`text-xl font-bold ${d.color.split(' ')[0]}`}>{d.count}</p></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <Card className="border border-neutral-200 shadow-none">
                <Table>
                  <TableHeader><TableRow className="bg-neutral-50">
                    <TableHead className="text-xs font-semibold">Disposition ID</TableHead>
                    <TableHead className="text-xs font-semibold">RMA Ref</TableHead>
                    <TableHead className="text-xs font-semibold">SKU</TableHead>
                    <TableHead className="text-xs font-semibold text-center">Qty</TableHead>
                    <TableHead className="text-xs font-semibold">Action</TableHead>
                    <TableHead className="text-xs font-semibold">Target Location</TableHead>
                    <TableHead className="text-xs font-semibold">Status</TableHead>
                    <TableHead className="text-xs font-semibold">Completed On</TableHead>
                    <TableHead className="text-xs font-semibold text-right">Actions</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {dispositions.map(d => (
                      <TableRow key={d.id} className="hover:bg-neutral-50">
                        <TableCell className="text-xs font-mono font-semibold text-[#003A78]">{d.disposition_number}</TableCell>
                        <TableCell className="text-xs font-mono text-neutral-600">{d.rma_number}</TableCell>
                        <TableCell className="text-xs font-mono text-neutral-700">{d.sku}</TableCell>
                        <TableCell className="text-xs text-center font-semibold">{d.qty}</TableCell>
                        <TableCell><Badge className={`text-xs ${actionColor(d.action)}`}>{d.action}</Badge></TableCell>
                        <TableCell className="text-xs font-mono text-neutral-600">{d.target_location_code || '—'}</TableCell>
                        <TableCell><Badge className={`text-xs ${d.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' : d.status === 'In Progress' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>{d.status}</Badge></TableCell>
                        <TableCell className="text-xs text-neutral-500">{fmtDate(d.completed_at)}</TableCell>
                        <TableCell className="text-right">
                          {d.status !== 'Completed' && (
                            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-emerald-600" onClick={() => completeDisposition.mutate(d.id)}>Complete</Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {dispositions.length === 0 && (
                      <TableRow><TableCell colSpan={9} className="text-center text-xs text-neutral-400 py-8">No dispositions yet — approve an inspection to create one</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </Card>
            </div>
          )}

          {/* Inventory Adjustment */}
          {activeTab === 'inventory-adj' && (
            <div className="space-y-4">
              <Card className="border border-neutral-200 shadow-none">
                <CardHeader>
                  <CardTitle className="text-sm font-semibold">Inventory Adjustment from Returns</CardTitle>
                  <CardDescription className="text-xs">Rows here are completed dispositions. Posting one writes a real inventory transaction and updates the on-hand balance at its target location.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader><TableRow className="bg-neutral-50">
                      <TableHead className="text-xs font-semibold">Disposition Ref</TableHead>
                      <TableHead className="text-xs font-semibold">RMA</TableHead>
                      <TableHead className="text-xs font-semibold">SKU</TableHead>
                      <TableHead className="text-xs font-semibold">Type</TableHead>
                      <TableHead className="text-xs font-semibold text-center">Qty</TableHead>
                      <TableHead className="text-xs font-semibold">Location</TableHead>
                      <TableHead className="text-xs font-semibold">Reason</TableHead>
                      <TableHead className="text-xs font-semibold">Status</TableHead>
                      <TableHead className="text-xs font-semibold text-right">Actions</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {adjustments.map(a => {
                        const isWriteOff = a.action === 'Dispose / Destroy';
                        return (
                          <TableRow key={a.id} className="hover:bg-neutral-50">
                            <TableCell className="text-xs font-mono font-semibold text-[#003A78]">{a.disposition_number}</TableCell>
                            <TableCell className="text-xs font-mono text-neutral-600">{a.rma_number}</TableCell>
                            <TableCell className="text-xs font-mono text-neutral-700">{a.sku}</TableCell>
                            <TableCell><Badge variant="outline" className="text-xs">{isWriteOff ? 'Write-Off' : a.action === 'Return to Stock' ? 'Receipt' : 'Transfer'}</Badge></TableCell>
                            <TableCell className={`text-xs text-center font-bold ${isWriteOff ? 'text-red-600' : 'text-emerald-600'}`}>{isWriteOff ? '-' : '+'}{a.qty}</TableCell>
                            <TableCell className="text-xs font-mono text-neutral-600">{a.target_location_code || '—'}</TableCell>
                            <TableCell className="text-xs text-neutral-600">{a.action}</TableCell>
                            <TableCell><Badge className={`text-xs ${a.posted_txn_id ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{a.posted_txn_id ? 'Posted' : 'Pending'}</Badge></TableCell>
                            <TableCell className="text-right">
                              {!a.posted_txn_id && (
                                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-[#009FE3]" onClick={() => postAdjustment.mutate(a.id)}>Post</Button>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {adjustments.length === 0 && (
                        <TableRow><TableCell colSpan={9} className="text-center text-xs text-neutral-400 py-8">No completed dispositions ready for the ledger yet</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Reports */}
          {activeTab === 'reports' && report && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <Card className="border border-neutral-200 shadow-none">
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Returns Volume Trend</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={220}>
                      <AreaChart data={report.monthly_trend}>
                        <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Area type="monotone" dataKey="returns" stroke="#003A78" fill="#003A78" fillOpacity={0.1} strokeWidth={2} name="Returns" />
                        <Area type="monotone" dataKey="processed" stroke="#009FE3" fill="#009FE3" fillOpacity={0.1} strokeWidth={2} name="Processed" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
                <Card className="border border-neutral-200 shadow-none">
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Returns by Reason</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={report.reason_breakdown} layout="vertical">
                        <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                        <YAxis dataKey="reason" type="category" tick={{ fontSize: 11 }} width={80} />
                        <Tooltip />
                        <Bar dataKey="count" fill="#009FE3" radius={[0, 4, 4, 0]} name="Count" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { title: 'Returns Rate', value: `${report.returns_rate_pct}%`, sub: 'RMAs vs. outbound orders shipped' },
                  { title: 'Avg Processing Time', value: `${(report.avg_processing_hours / 24).toFixed(1)} days`, sub: 'RMA raised to disposition closed' },
                  { title: 'Recovery Rate', value: `${report.recovery_rate_pct}%`, sub: 'Completed qty returned to stock or repaired' },
                ].map(m => (
                  <Card key={m.title} className="border border-neutral-200 shadow-none">
                    <CardContent className="p-5">
                      <p className="text-xs text-neutral-500">{m.title}</p>
                      <p className="text-3xl font-bold text-neutral-900 mt-1">{m.value}</p>
                      <p className="text-xs text-neutral-500 mt-0.5">{m.sub}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Card className="border border-neutral-200 shadow-none">
                  <CardContent className="p-4 flex justify-between text-xs">
                    <span className="text-neutral-500">Open RMAs</span><span className="font-semibold text-neutral-900">{report.open_rmas}</span>
                  </CardContent>
                </Card>
                <Card className="border border-neutral-200 shadow-none">
                  <CardContent className="p-4 flex justify-between text-xs">
                    <span className="text-neutral-500">Closed RMAs</span><span className="font-semibold text-neutral-900">{report.closed_rmas}</span>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create RMA Drawer */}
      {showDrawer && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/30" onClick={() => setShowDrawer(false)} />
          <div className="w-[480px] bg-white h-full flex flex-col shadow-2xl">
            <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between" style={{ background: 'linear-gradient(135deg,#003A78,#005BAA)' }}>
              <div><p className="text-white font-semibold text-sm">New RMA Request</p><p className="text-blue-200 text-xs mt-0.5">Fill all required fields</p></div>
              <button onClick={() => setShowDrawer(false)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20"><X className="w-4 h-4 text-white" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5 col-span-2"><Label className="text-xs font-medium">Order Reference (optional)</Label><Input value={form.order_reference} onChange={e => setForm({ ...form, order_reference: e.target.value })} className="h-8 text-sm" placeholder="SO-2026-XXXX" /></div>
                <div className="space-y-1.5 col-span-2"><Label className="text-xs font-medium">Customer</Label><Input value={form.customer} onChange={e => setForm({ ...form, customer: e.target.value })} className="h-8 text-sm" /></div>
                <div className="space-y-1.5 col-span-2"><Label className="text-xs font-medium">SKU / Item</Label>
                  <Select value={form.material_id} onValueChange={v => setForm({ ...form, material_id: v })}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select a SKU" /></SelectTrigger>
                    <SelectContent>
                      {materials.map(m => <SelectItem key={m.id} value={String(m.id)} className="text-xs">{m.sku} — {m.description}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5"><Label className="text-xs font-medium">Quantity</Label><Input value={form.qty} onChange={e => setForm({ ...form, qty: e.target.value })} className="h-8 text-sm" type="number" min={1} /></div>
                <div className="space-y-1.5"><Label className="text-xs font-medium">Priority</Label>
                  <Select value={form.priority} onValueChange={v => setForm({ ...form, priority: v })}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="High">High</SelectItem><SelectItem value="Medium">Medium</SelectItem><SelectItem value="Low">Low</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 col-span-2"><Label className="text-xs font-medium">Return Type</Label>
                  <Select value={form.return_type} onValueChange={v => setForm({ ...form, return_type: v })}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Customer Return">Customer Return</SelectItem>
                      <SelectItem value="Carrier Damage">Carrier Damage</SelectItem>
                      <SelectItem value="Vendor Recall">Vendor Recall</SelectItem>
                      <SelectItem value="Expired Product">Expired Product</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 col-span-2"><Label className="text-xs font-medium">Reason for Return</Label>
                  <Select value={form.reason} onValueChange={v => setForm({ ...form, reason: v })}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>{REASON_OPTIONS.map(r => <SelectItem key={r} value={r} className="text-xs">{r}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-neutral-200 flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowDrawer(false)}><X className="w-3.5 h-3.5 mr-1" />Cancel</Button>
              <Button size="sm" className="bg-neutral-900 hover:bg-neutral-800 text-white" onClick={handleCreateRMA} disabled={createRMA.isPending}><Save className="w-3.5 h-3.5 mr-1" />Save RMA</Button>
            </div>
          </div>
        </div>
      )}

      {/* Start Inspection Drawer */}
      {showInspectionDrawer && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/30" onClick={() => setShowInspectionDrawer(false)} />
          <div className="w-[420px] bg-white h-full flex flex-col shadow-2xl">
            <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between" style={{ background: 'linear-gradient(135deg,#003A78,#005BAA)' }}>
              <div><p className="text-white font-semibold text-sm">Start Inspection</p><p className="text-blue-200 text-xs mt-0.5">RMA must be Received first</p></div>
              <button onClick={() => setShowInspectionDrawer(false)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20"><X className="w-4 h-4 text-white" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">RMA</Label>
                <Select value={inspectForm.rma_id} onValueChange={v => {
                  const rma = receivableRmas.find(r => String(r.id) === v);
                  setInspectForm({ ...inspectForm, rma_id: v, qty_received: rma ? String(rma.qty) : inspectForm.qty_received });
                }}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select a received RMA" /></SelectTrigger>
                  <SelectContent>
                    {receivableRmas.map(r => <SelectItem key={r.id} value={String(r.id)} className="text-xs">{r.rma_number} — {r.sku}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label className="text-xs font-medium">Qty Received</Label><Input value={inspectForm.qty_received} onChange={e => setInspectForm({ ...inspectForm, qty_received: e.target.value })} className="h-8 text-sm" type="number" min={1} /></div>
              <div className="space-y-1.5"><Label className="text-xs font-medium">Inspector</Label><Input value={inspectForm.inspector} onChange={e => setInspectForm({ ...inspectForm, inspector: e.target.value })} className="h-8 text-sm" /></div>
            </div>
            <div className="px-6 py-4 border-t border-neutral-200 flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowInspectionDrawer(false)}>Cancel</Button>
              <Button size="sm" className="bg-neutral-900 hover:bg-neutral-800 text-white" onClick={submitInspection} disabled={createInspection.isPending}>Start Inspection</Button>
            </div>
          </div>
        </div>
      )}

      {/* Grade Inspection Drawer */}
      {gradeTarget && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/30" onClick={() => setGradeTarget(null)} />
          <div className="w-[420px] bg-white h-full flex flex-col shadow-2xl">
            <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between" style={{ background: 'linear-gradient(135deg,#003A78,#005BAA)' }}>
              <div><p className="text-white font-semibold text-sm">Grade {gradeTarget.inspection_number}</p><p className="text-blue-200 text-xs mt-0.5">{gradeTarget.sku} — {gradeTarget.description}</p></div>
              <button onClick={() => setGradeTarget(null)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20"><X className="w-4 h-4 text-white" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="space-y-1.5"><Label className="text-xs font-medium">Qty Inspected</Label><Input value={gradeForm.qty_inspected} onChange={e => setGradeForm({ ...gradeForm, qty_inspected: e.target.value })} className="h-8 text-sm" type="number" min={0} max={gradeTarget.qty_received} /></div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Grade</Label>
                <Select value={gradeForm.grade} onValueChange={v => setGradeForm({ ...gradeForm, grade: v })}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A - Resellable" className="text-xs">A – Resellable (returns to stock)</SelectItem>
                    <SelectItem value="B - Refurbishable" className="text-xs">B – Refurbishable (repair & relist)</SelectItem>
                    <SelectItem value="C - Scrap" className="text-xs">C – Scrap (dispose / destroy)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label className="text-xs font-medium">Inspector</Label><Input value={gradeForm.inspector} onChange={e => setGradeForm({ ...gradeForm, inspector: e.target.value })} className="h-8 text-sm" /></div>
              <div className="space-y-1.5"><Label className="text-xs font-medium">Notes</Label><Textarea value={gradeForm.notes} onChange={e => setGradeForm({ ...gradeForm, notes: e.target.value })} className="text-sm resize-none" rows={3} /></div>
            </div>
            <div className="px-6 py-4 border-t border-neutral-200 flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setGradeTarget(null)}>Cancel</Button>
              <Button size="sm" className="bg-neutral-900 hover:bg-neutral-800 text-white" onClick={submitGrade} disabled={gradeInspection.isPending}>Save Grade</Button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Drawer */}
      {showDetailDrawer && selectedRMA && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/30" onClick={() => setShowDetailDrawer(false)} />
          <div className="w-[520px] bg-white h-full flex flex-col shadow-2xl">
            <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between" style={{ background: 'linear-gradient(135deg,#003A78,#005BAA)' }}>
              <div><p className="text-white font-semibold text-sm">{selectedRMA.rma_number}</p><p className="text-blue-200 text-xs mt-0.5">{selectedRMA.customer} · {selectedRMA.return_type}</p></div>
              <button onClick={() => setShowDetailDrawer(false)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20"><X className="w-4 h-4 text-white" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              <div className="flex items-center gap-2">
                <Badge className={`text-xs ${statusColor[selectedRMA.status]}`}>{selectedRMA.status}</Badge>
                <Badge className={`text-xs ${priorityColor[selectedRMA.priority]}`}>{selectedRMA.priority} Priority</Badge>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  ['Order Reference', selectedRMA.order_reference || '—'], ['SKU', selectedRMA.sku],
                  ['Item', selectedRMA.description], ['Quantity', `${selectedRMA.qty} units`],
                  ['Raised On', fmtDate(selectedRMA.created_at)], ['Return Type', selectedRMA.return_type],
                  ['Reason', selectedRMA.reason], ['Received On', fmtDate(selectedRMA.received_at)],
                ].map(([label, val]) => (
                  <div key={label} className="bg-neutral-50 rounded-lg p-3 border border-neutral-100">
                    <p className="text-[10px] text-neutral-400 font-medium">{label}</p>
                    <p className="text-xs font-semibold text-neutral-900 mt-0.5">{val}</p>
                  </div>
                ))}
              </div>
              <div>
                <p className="text-xs font-semibold text-neutral-700 mb-2">Timeline</p>
                <div className="space-y-2">
                  {[
                    { step: 'RMA Raised', date: fmtDate(selectedRMA.created_at), done: true },
                    { step: 'Approved', date: '—', done: ['Approved', 'In Transit', 'Received', 'Inspection', 'Closed'].includes(selectedRMA.status) },
                    { step: 'In Transit', date: '—', done: ['In Transit', 'Received', 'Inspection', 'Closed'].includes(selectedRMA.status) },
                    { step: 'Received', date: fmtDate(selectedRMA.received_at), done: ['Received', 'Inspection', 'Closed'].includes(selectedRMA.status) },
                    { step: 'Inspection', date: '—', done: ['Inspection', 'Closed'].includes(selectedRMA.status) },
                    { step: 'Closed', date: fmtDate(selectedRMA.closed_at), done: selectedRMA.status === 'Closed' },
                  ].map(t => (
                    <div key={t.step} className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${t.done ? 'bg-emerald-500' : 'bg-neutral-200'}`}>
                        {t.done ? <CheckCircle className="w-3 h-3 text-white" /> : <Clock className="w-3 h-3 text-neutral-400" />}
                      </div>
                      <div className="flex-1 flex justify-between">
                        <p className={`text-xs font-medium ${t.done ? 'text-neutral-900' : 'text-neutral-400'}`}>{t.step}</p>
                        <p className="text-[10px] text-neutral-400">{t.date}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-neutral-200 flex gap-2">
              {selectedRMA.status === 'Pending Approval' && (
                <Button size="sm" className="flex-1 bg-neutral-900 hover:bg-neutral-800 text-white" onClick={() => { transitionRMA.mutate({ id: selectedRMA.id, action: 'approve' }); setShowDetailDrawer(false); }}>Approve</Button>
              )}
              {selectedRMA.status === 'Approved' && (
                <Button size="sm" className="flex-1 bg-neutral-900 hover:bg-neutral-800 text-white" onClick={() => { transitionRMA.mutate({ id: selectedRMA.id, action: 'ship' }); setShowDetailDrawer(false); }}>Mark In Transit</Button>
              )}
              {selectedRMA.status === 'In Transit' && (
                <Button size="sm" className="flex-1 bg-neutral-900 hover:bg-neutral-800 text-white" onClick={() => { transitionRMA.mutate({ id: selectedRMA.id, action: 'receive' }); setShowDetailDrawer(false); }}>Mark Received</Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
