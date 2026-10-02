import { useMemo, useState } from 'react';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Truck, Plus, Search, Eye, X, Save, CheckCircle,
  Printer, Package, BarChart3, AlertTriangle, FileText, Tag,
  MapPin, Zap, MoreHorizontal, RefreshCw, DollarSign, Globe
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useMasterDataList } from '@/hooks/useMasterDataApi';
import { useOutboundOrders, useShipments, useCreateShipment, useDispatchShipment, type Shipment } from '@/hooks/useOutboundOpsApi';
import {
  useShippingCarriers, useUpdateShippingCarrier,
  useManifests, useCreateManifest, useAssignToManifest, useCloseManifest,
  usePrintLabel, useRateShop, type RateQuote,
} from '@/hooks/useShippingOpsApi';

interface ShipToRecord { id: number; name: string; party_type: string; }

const TABS = [
  { id: 'shipments', label: 'Shipments', icon: Truck },
  { id: 'labels', label: 'Label Generation', icon: Tag },
  { id: 'manifests', label: 'Manifests', icon: FileText },
  { id: 'carriers', label: 'Carrier Integration', icon: Globe },
  { id: 'rate-shop', label: 'Rate Shopping', icon: DollarSign },
  { id: 'reports', label: 'Reports', icon: BarChart3 },
];

const COLORS = ['#003A78', '#009FE3', '#059669', '#F59E0B', '#94a3b8'];

const statusColor: Record<string, string> = {
  'Dispatched': 'bg-blue-100 text-blue-700 border-blue-200',
  'Ready to Ship': 'bg-emerald-100 text-emerald-700 border-emerald-200',
  'Packing': 'bg-amber-100 text-amber-700 border-amber-200',
  'In Transit': 'bg-purple-100 text-purple-700 border-purple-200',
  'Delivered': 'bg-emerald-100 text-emerald-700 border-emerald-200',
  'Exception': 'bg-red-100 text-red-700 border-red-200',
};

export default function WmsLiteShippingExecution() {
  const [activeTab, setActiveTab] = useState('shipments');
  const [search, setSearch] = useState('');
  const [showDrawer, setShowDrawer] = useState(false);
  const [showLabelModal, setShowLabelModal] = useState(false);
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
  const [rateShopForm, setRateShopForm] = useState({ weight: '', service: 'any' });
  const [rateShopResults, setRateShopResults] = useState<RateQuote[] | null>(null);
  const [bulkSelected, setBulkSelected] = useState<number[]>([]);
  const [newShipmentForm, setNewShipmentForm] = useState({ order_id: '', carrier_id: '', service: 'Standard', pkgs: '1', weight: '' });

  const { data: shipments = [] } = useShipments();
  const { data: orders = [] } = useOutboundOrders();
  const { data: carriers = [] } = useShippingCarriers();
  const { data: shipTos = [] } = useMasterDataList<ShipToRecord>('/master-data/ship-to-from');
  const { data: manifests = [] } = useManifests();
  const createShipment = useCreateShipment();
  const dispatchShipment = useDispatchShipment();
  const printLabel = usePrintLabel();
  const createManifest = useCreateManifest();
  const assignToManifest = useAssignToManifest();
  const closeManifest = useCloseManifest();
  const updateCarrier = useUpdateShippingCarrier();
  const rateShop = useRateShop();

  const shipToById = useMemo(() => new Map(shipTos.filter(s => s.party_type === 'Ship To').map(s => [s.id, s.name])), [shipTos]);
  const orderById = useMemo(() => new Map(orders.map(o => [o.id, o])), [orders]);
  const carrierById = useMemo(() => new Map(carriers.map(c => [c.id, c])), [carriers]);

  const customerFor = (orderId: number) => {
    const order = orderById.get(orderId);
    if (!order) return `Order #${orderId}`;
    return order.ship_to_id ? shipToById.get(order.ship_to_id) || `#${order.ship_to_id}` : order.order_number;
  };

  const openLabel = (s: Shipment) => { setSelectedShipment(s); setShowLabelModal(true); };
  const toggleBulk = (id: number) => setBulkSelected(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  const filtered = shipments.filter(s =>
    s.ship_number.toLowerCase().includes(search.toLowerCase()) ||
    customerFor(s.order_id).toLowerCase().includes(search.toLowerCase()) ||
    (s.tracking_no || '').toLowerCase().includes(search.toLowerCase())
  );

  const handlePrintLabel = (s: Shipment) => {
    printLabel.mutate({ id: s.id, service: s.service || undefined, pkgs: s.pkgs }, { onSuccess: () => openLabel({ ...s, label_printed: true }) });
  };

  const handleBulkPrint = () => {
    bulkSelected.forEach(id => {
      const s = shipments.find(x => x.id === id);
      if (s && !s.label_printed) printLabel.mutate({ id: s.id });
    });
    setBulkSelected([]);
  };

  const handleCreateShipment = () => {
    if (!newShipmentForm.order_id) return;
    createShipment.mutate({
      order_id: Number(newShipmentForm.order_id),
      carrier_id: newShipmentForm.carrier_id ? Number(newShipmentForm.carrier_id) : undefined,
      weight: newShipmentForm.weight ? Number(newShipmentForm.weight) : undefined,
    }, {
      onSuccess: (created: any) => {
        printLabel.mutate({ id: created.id, service: newShipmentForm.service, pkgs: Number(newShipmentForm.pkgs) || 1 });
        setShowDrawer(false);
        setNewShipmentForm({ order_id: '', carrier_id: '', service: 'Standard', pkgs: '1', weight: '' });
      },
    });
  };

  const handleGetRates = () => {
    if (!newShipmentForm.weight && !rateShopForm.weight) return;
    rateShop.mutate({
      weight: Number(rateShopForm.weight) || 1,
      service: rateShopForm.service === 'any' ? undefined : rateShopForm.service,
    }, { onSuccess: (data) => setRateShopResults(data) });
  };

  const eligibleOrders = orders.filter(o => o.status === 'Packed' || o.status === 'Shipped');
  const readyToShip = shipments.filter(s => s.status === 'Ready to Ship');
  const dispatched = shipments.filter(s => s.status === 'Dispatched');
  const labelsPending = shipments.filter(s => !s.label_printed);

  const carrierServiceRows = carriers.filter(c => c.active).map(c => ({
    ...c, servicesList: (c.services || '').split(',').map(s => s.trim()).filter(Boolean),
  }));

  // Real dispatch-volume-by-carrier trend, grouped by weekday from actual dispatched_at timestamps.
  const shipVolumeData = useMemo(() => {
    const byDay = new Map<string, Record<string, number>>();
    for (const s of shipments) {
      if (!s.dispatched_at) continue;
      const day = new Date(s.dispatched_at).toLocaleDateString(undefined, { weekday: 'short' });
      const carrier = carrierById.get(s.carrier_id || -1)?.name || 'Other';
      const row = byDay.get(day) || {};
      row[carrier] = (row[carrier] || 0) + 1;
      byDay.set(day, row);
    }
    return Array.from(byDay.entries()).map(([day, counts]) => ({ day, ...counts }));
  }, [shipments, carrierById]);
  const carrierNamesInVolume = Array.from(new Set(shipVolumeData.flatMap(r => Object.keys(r).filter(k => k !== 'day'))));

  const carrierSplitData = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of shipments) {
      const name = carrierById.get(s.carrier_id || -1)?.name || 'Other';
      counts.set(name, (counts.get(name) || 0) + 1);
    }
    const total = shipments.length || 1;
    return Array.from(counts.entries()).map(([name, count]) => ({ name, value: Math.round((count / total) * 100) }));
  }, [shipments, carrierById]);

  const onTimePct = dispatched.length ? Math.round((shipments.filter(s => s.status === 'Delivered').length / (dispatched.length + shipments.filter(s => s.status === 'Delivered').length)) * 1000) / 10 : 0;
  const avgFreight = shipments.length ? shipments.reduce((sum, s) => sum + (s.weight || 0), 0) / shipments.length : 0;
  const closedManifests = manifests.filter(m => m.status === 'Closed').length;

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
          <div className="grid grid-cols-5 gap-3">
            {[
              { label: 'Total Shipments', value: shipments.length, color: 'text-neutral-900' },
              { label: 'Ready to Ship', value: readyToShip.length, color: 'text-emerald-600' },
              { label: 'Dispatched', value: dispatched.length, color: 'text-purple-600' },
              { label: 'Delivered', value: shipments.filter(s => s.status === 'Delivered').length, color: 'text-blue-600' },
              { label: 'Labels Pending', value: labelsPending.length, color: 'text-amber-600' },
            ].map(k => (
              <Card key={k.label} className="border border-neutral-200 shadow-none">
                <CardContent className="p-4">
                  <p className="text-xs text-neutral-500">{k.label}</p>
                  <p className={`text-2xl font-bold mt-1 ${k.color}`}>{k.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Shipments */}
          {activeTab === 'shipments' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 border border-neutral-200 rounded-lg px-3 py-2 bg-white w-64">
                    <Search className="w-3.5 h-3.5 text-neutral-400" />
                    <input className="bg-transparent text-xs text-neutral-700 placeholder-neutral-400 focus:outline-none w-full" placeholder="Search shipment, tracking..." value={search} onChange={e => setSearch(e.target.value)} />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {bulkSelected.length > 0 && (
                    <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8 border-blue-300 text-blue-700" onClick={handleBulkPrint}>
                      <Printer className="w-3.5 h-3.5" />Print Labels ({bulkSelected.length})
                    </Button>
                  )}
                  <Button size="sm" className="gap-1.5 text-xs bg-neutral-900 hover:bg-neutral-800 text-white" onClick={() => setShowDrawer(true)}><Plus className="w-3.5 h-3.5" />New Shipment</Button>
                </div>
              </div>
              <Card className="border border-neutral-200 shadow-none">
                <Table>
                  <TableHeader><TableRow className="bg-neutral-50">
                    <TableHead className="w-8"></TableHead>
                    <TableHead className="text-xs font-semibold">Shipment ID</TableHead>
                    <TableHead className="text-xs font-semibold">Order</TableHead>
                    <TableHead className="text-xs font-semibold">Customer</TableHead>
                    <TableHead className="text-xs font-semibold">Carrier / Service</TableHead>
                    <TableHead className="text-xs font-semibold">Tracking No.</TableHead>
                    <TableHead className="text-xs font-semibold text-center">Pkgs</TableHead>
                    <TableHead className="text-xs font-semibold">Weight</TableHead>
                    <TableHead className="text-xs font-semibold">Label</TableHead>
                    <TableHead className="text-xs font-semibold">Status</TableHead>
                    <TableHead className="text-xs font-semibold text-right">Actions</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {filtered.map(s => {
                      const order = orderById.get(s.order_id);
                      const carrier = carrierById.get(s.carrier_id || -1);
                      return (
                        <TableRow key={s.id} className="hover:bg-neutral-50">
                          <TableCell><input type="checkbox" className="rounded" checked={bulkSelected.includes(s.id)} onChange={() => toggleBulk(s.id)} /></TableCell>
                          <TableCell className="text-xs font-mono font-semibold text-[#003A78]">{s.ship_number}</TableCell>
                          <TableCell className="text-xs font-mono text-neutral-600">{order?.order_number || `#${s.order_id}`}</TableCell>
                          <TableCell className="text-xs font-medium text-neutral-900">{customerFor(s.order_id)}</TableCell>
                          <TableCell><div><p className="text-xs font-medium">{carrier?.name || '—'}</p><p className="text-[10px] text-neutral-400">{s.service || '—'}</p></div></TableCell>
                          <TableCell className="text-xs font-mono text-neutral-600">{s.tracking_no || '—'}</TableCell>
                          <TableCell className="text-xs text-center">{s.pkgs}</TableCell>
                          <TableCell className="text-xs text-neutral-600">{s.weight ? `${s.weight} kg` : '—'}</TableCell>
                          <TableCell>
                            {s.label_printed
                              ? <Badge className="text-xs bg-emerald-100 text-emerald-700 border-emerald-200">Printed</Badge>
                              : <Button size="sm" variant="outline" className="h-6 text-xs gap-1" onClick={() => handlePrintLabel(s)}><Printer className="w-3 h-3" />Print</Button>
                            }
                          </TableCell>
                          <TableCell><Badge className={`text-xs ${statusColor[s.status] || ''}`}>{s.status}</Badge></TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0"><MoreHorizontal className="w-3.5 h-3.5" /></Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem className="text-xs" onClick={() => openLabel(s)}><Eye className="w-3.5 h-3.5 mr-2" />View Label</DropdownMenuItem>
                                {!s.label_printed && <DropdownMenuItem className="text-xs" onClick={() => handlePrintLabel(s)}><Printer className="w-3.5 h-3.5 mr-2" />Print Label</DropdownMenuItem>}
                                {s.status === 'Ready to Ship' && <DropdownMenuItem className="text-xs" onClick={() => dispatchShipment.mutate(s.id)}><CheckCircle className="w-3.5 h-3.5 mr-2" />Mark Dispatched</DropdownMenuItem>}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {filtered.length === 0 && (
                      <TableRow><TableCell colSpan={11} className="text-center text-xs text-neutral-400 py-6">No shipments match.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </Card>
            </div>
          )}

          {/* Label Generation */}
          {activeTab === 'labels' && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-neutral-800">Label Generation Queue</h3>
              <div className="grid grid-cols-2 gap-4">
                <Card className="border border-neutral-200 shadow-none">
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Pending Labels</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {labelsPending.map(s => (
                        <div key={s.id} className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-lg">
                          <div>
                            <p className="text-xs font-mono font-semibold text-neutral-900">{s.ship_number}</p>
                            <p className="text-xs text-neutral-600 mt-0.5">{customerFor(s.order_id)} · {carrierById.get(s.carrier_id || -1)?.name || '—'} {s.service || ''}</p>
                            <p className="text-[10px] text-neutral-500">{s.pkgs} pkg(s) · {s.weight ? `${s.weight} kg` : '—'}</p>
                          </div>
                          <Button size="sm" className="gap-1.5 text-xs bg-neutral-900 hover:bg-neutral-800 text-white" onClick={() => handlePrintLabel(s)}><Printer className="w-3.5 h-3.5" />Print</Button>
                        </div>
                      ))}
                      {labelsPending.length === 0 && <p className="text-xs text-neutral-400">No pending labels — every shipment has been printed.</p>}
                    </div>
                  </CardContent>
                </Card>
                <Card className="border border-neutral-200 shadow-none">
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Recently Printed</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {shipments.filter(s => s.label_printed).slice(0, 6).map(s => (
                        <div key={s.id} className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                          <div>
                            <p className="text-xs font-mono font-semibold text-neutral-900">{s.ship_number}</p>
                            <p className="text-xs text-neutral-600 mt-0.5">{s.tracking_no}</p>
                          </div>
                          <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => openLabel(s)}><Eye className="w-3.5 h-3.5" />View</Button>
                        </div>
                      ))}
                      {shipments.filter(s => s.label_printed).length === 0 && <p className="text-xs text-neutral-400">Nothing printed yet.</p>}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Manifests */}
          {activeTab === 'manifests' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Carrier Manifests</h3>
                <Select onValueChange={v => createManifest.mutate({ carrier_id: Number(v) })}>
                  <SelectTrigger className="h-8 text-xs w-56"><SelectValue placeholder="+ Create Manifest for carrier..." /></SelectTrigger>
                  <SelectContent>{carriers.filter(c => c.active).map(c => <SelectItem key={c.id} value={String(c.id)} className="text-xs">{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <Card className="border border-neutral-200 shadow-none">
                <Table>
                  <TableHeader><TableRow className="bg-neutral-50">
                    <TableHead className="text-xs font-semibold">Manifest ID</TableHead>
                    <TableHead className="text-xs font-semibold">Carrier</TableHead>
                    <TableHead className="text-xs font-semibold text-center">Shipments</TableHead>
                    <TableHead className="text-xs font-semibold text-center">Packages</TableHead>
                    <TableHead className="text-xs font-semibold">Total Weight</TableHead>
                    <TableHead className="text-xs font-semibold">Created On</TableHead>
                    <TableHead className="text-xs font-semibold">Closed On</TableHead>
                    <TableHead className="text-xs font-semibold">Status</TableHead>
                    <TableHead className="text-xs font-semibold text-right">Actions</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {manifests.map(mf => (
                      <TableRow key={mf.id} className="hover:bg-neutral-50">
                        <TableCell className="text-xs font-mono font-semibold text-[#003A78]">{mf.manifest_number}</TableCell>
                        <TableCell className="text-xs font-medium text-neutral-900">{carrierById.get(mf.carrier_id)?.name || `#${mf.carrier_id}`}</TableCell>
                        <TableCell className="text-xs text-center">{mf.shipment_count}</TableCell>
                        <TableCell className="text-xs text-center">{mf.total_packages}</TableCell>
                        <TableCell className="text-xs text-neutral-600">{mf.total_weight ? `${mf.total_weight.toFixed(1)} kg` : '—'}</TableCell>
                        <TableCell className="text-xs text-neutral-500">{new Date(mf.created_at).toLocaleString()}</TableCell>
                        <TableCell className="text-xs text-neutral-500">{mf.closed_at ? new Date(mf.closed_at).toLocaleString() : '—'}</TableCell>
                        <TableCell><Badge className={`text-xs ${mf.status === 'Closed' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-amber-100 text-amber-700 border-amber-200'}`}>{mf.status}</Badge></TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {mf.status === 'Open' && (
                              <Select onValueChange={v => assignToManifest.mutate({ manifestId: mf.id, shipmentIds: [Number(v)] })}>
                                <SelectTrigger className="h-7 text-xs w-36"><SelectValue placeholder="+ Add shipment" /></SelectTrigger>
                                <SelectContent>{shipments.filter(s => s.carrier_id === mf.carrier_id && s.manifest_id !== mf.id).map(s => <SelectItem key={s.id} value={String(s.id)} className="text-xs">{s.ship_number}</SelectItem>)}</SelectContent>
                              </Select>
                            )}
                            {mf.status === 'Open' && <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-emerald-600" onClick={() => closeManifest.mutate(mf.id)}>Close</Button>}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {manifests.length === 0 && (
                      <TableRow><TableCell colSpan={9} className="text-center text-xs text-neutral-400 py-6">No manifests yet.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </Card>
            </div>
          )}

          {/* Carrier Integration */}
          {activeTab === 'carriers' && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Carrier Integration Management</h3>
              <div className="grid grid-cols-1 gap-4">
                {carrierServiceRows.map(c => (
                  <Card key={c.id} className="border border-neutral-200 shadow-none hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-neutral-100 border border-neutral-200 flex items-center justify-center flex-shrink-0">
                            <Truck className="w-5 h-5 text-neutral-600" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold text-neutral-900">{c.name}</p>
                              <Badge variant="outline" className="text-xs">{c.code}</Badge>
                              <Badge className={`text-xs ${c.api_status === 'Connected' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : c.api_status === 'Error' ? 'bg-red-100 text-red-700 border-red-200' : 'bg-neutral-100 text-neutral-600 border-neutral-200'}`}>
                                <div className={`w-1.5 h-1.5 rounded-full mr-1.5 inline-block ${c.api_status === 'Connected' ? 'bg-emerald-500' : c.api_status === 'Error' ? 'bg-red-500' : 'bg-neutral-400'}`} />
                                {c.api_status}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 mt-1">
                              <span className="text-xs text-neutral-500">Account: <span className="font-mono font-medium text-neutral-700">{c.account_no || '—'}</span></span>
                              <span className="text-xs text-neutral-500">Label: <span className="font-medium text-neutral-700">{c.label_format || '—'}</span></span>
                              <span className="text-xs text-neutral-500">Services: <span className="font-medium text-neutral-700">{c.servicesList.join(', ') || '—'}</span></span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" className="text-xs h-7"
                            onClick={() => updateCarrier.mutate({ id: c.id, payload: { api_status: c.api_status === 'Connected' ? 'Error' : 'Connected' } })}>
                            Test API
                          </Button>
                        </div>
                      </div>
                      {c.api_status === 'Error' && (
                        <div className="mt-3 flex items-center gap-2 p-2.5 bg-red-50 border border-red-200 rounded-lg">
                          <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                          <p className="text-xs text-red-700">API connection error. Check credentials or contact carrier support.</p>
                          <Button size="sm" variant="outline" className="ml-auto h-6 text-xs border-red-300 text-red-600"
                            onClick={() => updateCarrier.mutate({ id: c.id, payload: { api_status: 'Connected' } })}>
                            Reconnect
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
                {carrierServiceRows.length === 0 && <p className="text-xs text-neutral-400">No active carriers configured in Master Data yet.</p>}
              </div>
            </div>
          )}

          {/* Rate Shopping */}
          {activeTab === 'rate-shop' && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <Card className="col-span-1 border border-neutral-200 shadow-none">
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Rate Shopping Parameters</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-1.5"><Label className="text-xs font-medium">Weight (kg)</Label><Input value={rateShopForm.weight} onChange={e => setRateShopForm({ ...rateShopForm, weight: e.target.value })} className="h-8 text-sm" type="number" /></div>
                    <div className="space-y-1.5"><Label className="text-xs font-medium">Service Type</Label>
                      <Select value={rateShopForm.service} onValueChange={v => setRateShopForm({ ...rateShopForm, service: v })}>
                        <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="any">Any</SelectItem>{Array.from(new Set(carriers.flatMap(c => (c.services || '').split(',').map(s => s.trim()).filter(Boolean)))).map(svc => <SelectItem key={svc} value={svc}>{svc}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <Button className="w-full bg-neutral-900 hover:bg-neutral-800 text-white gap-1.5 text-xs" size="sm" onClick={handleGetRates} disabled={rateShop.isPending}>
                      <Zap className="w-3.5 h-3.5" />Get Rates
                    </Button>
                  </CardContent>
                </Card>
                <Card className="col-span-2 border border-neutral-200 shadow-none">
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Rate Results</CardTitle></CardHeader>
                  <CardContent>
                    {rateShopResults ? (
                      <div className="space-y-3">
                        {rateShopResults.map((r, i) => (
                          <div key={i} className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${r.recommended ? 'bg-emerald-50 border-emerald-300' : 'bg-white border-neutral-200 hover:border-neutral-300'}`}>
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-neutral-100 border border-neutral-200 flex items-center justify-center">
                                <Truck className="w-4 h-4 text-neutral-600" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="text-xs font-semibold text-neutral-900">{r.carrier_name}</p>
                                  <Badge variant="outline" className="text-xs">{r.service}</Badge>
                                  {r.recommended && <Badge className="text-xs bg-emerald-100 text-emerald-700 border-emerald-200">Best Value</Badge>}
                                </div>
                                <p className="text-[10px] text-neutral-500 mt-0.5">Transit: {r.transit_days || '—'}</p>
                              </div>
                            </div>
                            <p className="text-sm font-bold text-neutral-900">₹ {r.rate.toFixed(2)}</p>
                          </div>
                        ))}
                        {rateShopResults.length === 0 && <p className="text-xs text-neutral-400">No active carrier rates match this service filter.</p>}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-16 text-neutral-400">
                        <DollarSign className="w-10 h-10 mb-3 text-neutral-200" />
                        <p className="text-sm font-medium">Enter shipment weight to compare carrier rates</p>
                        <p className="text-xs mt-1">Computed from configured carrier rate cards</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Reports */}
          {activeTab === 'reports' && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <Card className="border border-neutral-200 shadow-none">
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Dispatch Volume by Carrier</CardTitle></CardHeader>
                  <CardContent>
                    {shipVolumeData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={shipVolumeData}>
                          <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                          <Tooltip />
                          {carrierNamesInVolume.map((name, i) => (
                            <Bar key={name} dataKey={name} fill={COLORS[i % COLORS.length]} name={name} radius={[4, 4, 0, 0]} />
                          ))}
                        </BarChart>
                      </ResponsiveContainer>
                    ) : <p className="text-xs text-neutral-400 py-16 text-center">No dispatched shipments yet.</p>}
                  </CardContent>
                </Card>
                <Card className="border border-neutral-200 shadow-none">
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Carrier Split</CardTitle></CardHeader>
                  <CardContent className="flex items-center justify-center">
                    {carrierSplitData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={220}>
                        <PieChart>
                          <Pie data={carrierSplitData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" nameKey="name" label={({ name, value }) => `${name} ${value}%`} labelLine={true}>
                            {carrierSplitData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : <p className="text-xs text-neutral-400 py-16 text-center">No shipments yet.</p>}
                  </CardContent>
                </Card>
              </div>
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: 'Delivered Rate', value: `${onTimePct}%`, color: 'text-emerald-600' },
                  { label: 'Avg Weight/Shipment', value: `${avgFreight.toFixed(1)} kg`, color: 'text-neutral-900' },
                  { label: 'Labels Pending', value: String(labelsPending.length), color: 'text-amber-600' },
                  { label: 'Manifests Closed', value: String(closedManifests), color: 'text-blue-600' },
                ].map(m => (
                  <Card key={m.label} className="border border-neutral-200 shadow-none">
                    <CardContent className="p-4">
                      <p className="text-xs text-neutral-500">{m.label}</p>
                      <p className={`text-2xl font-bold mt-1 ${m.color}`}>{m.value}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* New Shipment Drawer */}
      {showDrawer && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/30" onClick={() => setShowDrawer(false)} />
          <div className="w-[480px] bg-white h-full flex flex-col shadow-2xl">
            <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between" style={{ background: 'linear-gradient(135deg,#003A78,#005BAA)' }}>
              <div><p className="text-white font-semibold text-sm">Create New Shipment</p><p className="text-blue-200 text-xs mt-0.5">Link to a Packed/Shipped order</p></div>
              <button onClick={() => setShowDrawer(false)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20"><X className="w-4 h-4 text-white" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5 col-span-2"><Label className="text-xs font-medium">Order</Label>
                  <Select value={newShipmentForm.order_id} onValueChange={v => setNewShipmentForm({ ...newShipmentForm, order_id: v })}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder={eligibleOrders.length ? 'Select order' : 'No Packed/Shipped orders yet'} /></SelectTrigger>
                    <SelectContent>{eligibleOrders.map(o => <SelectItem key={o.id} value={String(o.id)}>{o.order_number}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5"><Label className="text-xs font-medium">Carrier</Label>
                  <Select value={newShipmentForm.carrier_id} onValueChange={v => setNewShipmentForm({ ...newShipmentForm, carrier_id: v })}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{carriers.filter(c => c.active).map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5"><Label className="text-xs font-medium">Service</Label>
                  <Select value={newShipmentForm.service} onValueChange={v => setNewShipmentForm({ ...newShipmentForm, service: v })}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent><SelectItem value="Express">Express</SelectItem><SelectItem value="Standard">Standard</SelectItem><SelectItem value="Economy">Economy</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5"><Label className="text-xs font-medium">No. of Packages</Label><Input className="h-8 text-sm" type="number" value={newShipmentForm.pkgs} onChange={e => setNewShipmentForm({ ...newShipmentForm, pkgs: e.target.value })} /></div>
                <div className="space-y-1.5"><Label className="text-xs font-medium">Total Weight (kg)</Label><Input className="h-8 text-sm" type="number" value={newShipmentForm.weight} onChange={e => setNewShipmentForm({ ...newShipmentForm, weight: e.target.value })} /></div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-neutral-200 flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowDrawer(false)}><X className="w-3.5 h-3.5 mr-1" />Cancel</Button>
              <Button size="sm" className="bg-neutral-900 hover:bg-neutral-800 text-white" onClick={handleCreateShipment} disabled={createShipment.isPending}><Save className="w-3.5 h-3.5 mr-1" />Create & Generate Label</Button>
            </div>
          </div>
        </div>
      )}

      {/* Label Preview Modal */}
      {showLabelModal && selectedShipment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowLabelModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-[380px] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 flex items-center justify-between border-b border-neutral-200" style={{ background: 'linear-gradient(135deg,#003A78,#005BAA)' }}>
              <p className="text-white font-semibold text-sm">Shipping Label Preview</p>
              <button onClick={() => setShowLabelModal(false)} className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20"><X className="w-3.5 h-3.5 text-white" /></button>
            </div>
            <div className="p-6">
              <div className="border-2 border-neutral-900 rounded-lg p-4 font-mono text-xs bg-white space-y-2">
                <div className="text-center font-bold text-base border-b-2 border-neutral-900 pb-2">{carrierById.get(selectedShipment.carrier_id || -1)?.name || 'Carrier'}</div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div><p className="font-bold">FROM:</p><p>Delaplex WH01</p><p>Mumbai, Maharashtra 400001</p><p>India</p></div>
                  <div><p className="font-bold">TO:</p><p>{customerFor(selectedShipment.order_id)}</p><p>India</p></div>
                </div>
                <div className="text-center py-2 border-y border-neutral-300">
                  <div className="flex justify-center gap-0.5">{Array(28).fill(0).map((_, i) => <div key={i} className={`h-8 w-${i % 3 === 0 ? '1' : '0.5'} bg-neutral-900`} />)}</div>
                  <p className="mt-1 text-xs font-semibold tracking-widest">{selectedShipment.tracking_no || '—'}</p>
                </div>
                <div className="grid grid-cols-2 text-[11px]">
                  <div><p className="text-neutral-500">Shipment</p><p className="font-semibold">{selectedShipment.ship_number}</p></div>
                  <div><p className="text-neutral-500">Service</p><p className="font-semibold">{selectedShipment.service || '—'}</p></div>
                  <div><p className="text-neutral-500">Pkgs</p><p className="font-semibold">{selectedShipment.pkgs}</p></div>
                  <div><p className="text-neutral-500">Weight</p><p className="font-semibold">{selectedShipment.weight ? `${selectedShipment.weight} kg` : '—'}</p></div>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button variant="outline" size="sm" className="flex-1 gap-1.5 text-xs" onClick={() => setShowLabelModal(false)}>Close</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
