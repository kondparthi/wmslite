import { useState } from 'react';
import {
  Building2, Plus, Search, Pencil, Trash2, Eye, X, Check,
  ChevronLeft, ChevronRight, MapPin, DoorOpen, Grid3X3,
  AlertCircle, Settings, ToggleLeft, Package, Thermometer
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  useWarehouses, useCreateWarehouse, useUpdateWarehouse, useDeleteWarehouse,
  useAdminZones, useCreateAdminZone, useUpdateAdminZone, useDeleteAdminZone,
  useAdminDocks, useCreateAdminDock, useUpdateAdminDock, useDeleteAdminDock,
  useAisles, useBulkGenerateLocations,
} from '@/hooks/useAdminConfigApi';

const BRAND = "#009FE3";

type SubView = 'warehouses' | 'zones' | 'docks' | 'aisles';

const dockStatusColor: Record<string, string> = {
  'Empty': 'bg-emerald-50 text-emerald-700',
  'Occupied': 'bg-blue-50 text-blue-700',
  'Reserved': 'bg-amber-50 text-amber-700',
};

export default function WarehouseConfigSection() {
  const [activeView, setActiveView] = useState<SubView>('warehouses');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<any>(null);

  const { data: warehouses = [] } = useWarehouses();
  const { data: zones = [] } = useAdminZones();
  const { data: docks = [] } = useAdminDocks();
  const { data: aisles = [] } = useAisles();

  const createWarehouse = useCreateWarehouse();
  const updateWarehouse = useUpdateWarehouse();
  const deleteWarehouse = useDeleteWarehouse();
  const createZone = useCreateAdminZone();
  const updateZone = useUpdateAdminZone();
  const deleteZone = useDeleteAdminZone();
  const createDock = useCreateAdminDock();
  const updateDock = useUpdateAdminDock();
  const deleteDock = useDeleteAdminDock();
  const bulkGenerate = useBulkGenerateLocations();

  const [whForm, setWhForm] = useState({ name: '', code: '', city: '', country: 'India', sqft: '', type: 'General Purpose', temp_class: 'Ambient', status: 'Active' });
  const [znForm, setZnForm] = useState({ name: '', code: '', warehouse_id: undefined as number | undefined, zone_type: 'Storage', pick_priority: 'Medium', status: 'Active' });
  const [dkForm, setDkForm] = useState({ door_code: '', warehouse_id: undefined as number | undefined, direction: 'Inbound', load_type: 'FTL', dimensions: '4.8m x 4.2m' });
  const [alForm, setAlForm] = useState({ zone_id: undefined as number | undefined, aisle: '', bays: '10', levels: '3', location_type: 'Storage' });

  const views: { id: SubView; label: string; icon: any }[] = [
    { id: 'warehouses', label: 'Warehouses', icon: Building2 },
    { id: 'zones', label: 'Zones & Areas', icon: Grid3X3 },
    { id: 'docks', label: 'Dock Doors', icon: DoorOpen },
    { id: 'aisles', label: 'Aisle / Bay / Level', icon: MapPin },
  ];

  const openNew = () => { setEditTarget(null); setShowForm(true); };
  const openEdit = (item: any) => { setEditTarget(item); setShowForm(true); };
  const closeForm = () => { setShowForm(false); setEditTarget(null); };

  const handleSaveWarehouse = () => {
    if (!whForm.name || !whForm.code) return;
    const payload = { ...whForm, sqft: Number(whForm.sqft) || 0 };
    if (editTarget) updateWarehouse.mutate({ id: editTarget.id, payload });
    else createWarehouse.mutate(payload);
    closeForm();
  };
  const handleSaveZone = () => {
    if (!znForm.name || !znForm.code) return;
    if (editTarget) updateZone.mutate({ id: editTarget.id, payload: znForm });
    else createZone.mutate(znForm);
    closeForm();
  };
  const handleSaveDock = () => {
    if (!dkForm.door_code) return;
    if (editTarget) updateDock.mutate({ id: editTarget.id, payload: dkForm });
    else createDock.mutate(dkForm);
    closeForm();
  };
  const handleSaveAisle = () => {
    if (!alForm.aisle || !alForm.zone_id) return;
    bulkGenerate.mutate({ zone_id: alForm.zone_id, aisle: alForm.aisle, bays: Number(alForm.bays), levels: Number(alForm.levels), location_type: alForm.location_type });
    closeForm();
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-neutral-900">Warehouse Configuration</h2>
          <p className="text-sm text-neutral-500 mt-0.5">Manage warehouses, zones, dock doors and storage locations end-to-end</p>
        </div>
      </div>

      {/* KPI bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Warehouses', value: warehouses.filter(w => w.status === 'Active').length, icon: Building2, color: BRAND },
          { label: 'Zones', value: zones.filter(z => z.status === 'Active').length, icon: Grid3X3, color: '#10B981' },
          { label: 'Dock Doors', value: docks.length, icon: DoorOpen, color: '#F59E0B' },
          { label: 'Total Locations', value: aisles.reduce((a, x) => a + x.total_locations, 0), icon: MapPin, color: '#8B5CF6' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl border border-neutral-200 px-4 py-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${color}18` }}>
              <Icon size={16} style={{ color }} />
            </div>
            <div>
              <p className="text-lg font-bold text-neutral-900">{value}</p>
              <p className="text-xs text-neutral-500">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Sub-view tabs */}
      <div className="flex gap-1 flex-wrap">
        {views.map(v => {
          const Icon = v.icon;
          return (
            <button key={v.id} onClick={() => { setActiveView(v.id); setShowForm(false); setSelected(null); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${activeView === v.id ? 'bg-neutral-900 text-white border-neutral-900' : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-400'}`}>
              <Icon size={13} />{v.label}
            </button>
          );
        })}
      </div>

      {/* ── WAREHOUSES ── */}
      {activeView === 'warehouses' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-white rounded-xl border border-neutral-200">
            <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between flex-wrap gap-2">
              <h3 className="text-sm font-semibold text-neutral-900 flex items-center gap-2">
                <Building2 size={14} style={{ color: BRAND }} /> Warehouse Master
              </h3>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 border border-neutral-200 rounded-lg px-3 py-1.5 bg-neutral-50">
                  <Search size={12} className="text-neutral-400" />
                  <input className="bg-transparent text-xs text-neutral-700 placeholder-neutral-400 focus:outline-none w-28"
                    placeholder="Search warehouses..." value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <Button size="sm" className="bg-neutral-900 hover:bg-neutral-800 text-white gap-1.5 text-xs" onClick={() => { setWhForm({ name: '', code: '', city: '', country: 'India', sqft: '', type: 'General Purpose', temp_class: 'Ambient', status: 'Active' }); openNew(); }}>
                  <Plus size={12} /> Add Warehouse
                </Button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-neutral-50 border-b border-neutral-100">
                    <th className="text-left py-2.5 px-4 text-neutral-500">Code</th>
                    <th className="text-left py-2.5 px-3 text-neutral-500">Name</th>
                    <th className="text-left py-2.5 px-3 text-neutral-500">City</th>
                    <th className="text-left py-2.5 px-3 text-neutral-500">Type</th>
                    <th className="text-left py-2.5 px-3 text-neutral-500">Sq.Ft</th>
                    <th className="text-left py-2.5 px-3 text-neutral-500">Zones</th>
                    <th className="text-left py-2.5 px-3 text-neutral-500">Docks</th>
                    <th className="text-left py-2.5 px-3 text-neutral-500">Status</th>
                    <th className="text-left py-2.5 px-3 text-neutral-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-50">
                  {warehouses.filter(w => w.name.toLowerCase().includes(search.toLowerCase())).map(w => (
                    <tr key={w.id} className={`hover:bg-blue-50/20 cursor-pointer transition-colors ${selected === w.id ? 'bg-blue-50/40' : ''}`}
                      style={selected === w.id ? { borderLeft: `3px solid ${BRAND}` } : {}} onClick={() => setSelected(w.id)}>
                      <td className="py-2.5 px-4 font-medium text-neutral-900">{w.code}</td>
                      <td className="py-2.5 px-3 text-neutral-800">{w.name}</td>
                      <td className="py-2.5 px-3 text-neutral-600">{w.city}</td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded text-xs" style={{ background: '#009FE315', color: BRAND }}>{w.type}</span>
                      </td>
                      <td className="py-2.5 px-3 text-neutral-600">{w.sqft?.toLocaleString()}</td>
                      <td className="py-2.5 px-3 text-neutral-600">{w.zones_count}</td>
                      <td className="py-2.5 px-3 text-neutral-600">{w.docks_count}</td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${w.status === 'Active' ? 'bg-emerald-50 text-emerald-700' : 'bg-neutral-100 text-neutral-500'}`}>{w.status}</span>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5">
                          <button onClick={e => { e.stopPropagation(); setSelected(w.id); }} className="text-neutral-400 hover:text-blue-500 transition-colors"><Eye size={12} /></button>
                          <button onClick={e => { e.stopPropagation(); setWhForm({ name: w.name, code: w.code, city: w.city || '', country: w.country || 'India', sqft: String(w.sqft), type: w.type, temp_class: w.temp_class, status: w.status }); openEdit(w); }} className="text-neutral-400 hover:text-amber-500 transition-colors"><Pencil size={12} /></button>
                          <button onClick={e => { e.stopPropagation(); deleteWarehouse.mutate(w.id); }} className="text-neutral-400 hover:text-red-500 transition-colors"><Trash2 size={12} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div>
            {showForm ? (
              <Card className="border border-neutral-200 shadow-none">
                <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-sm font-semibold">{editTarget ? 'Edit Warehouse' : 'Add Warehouse'}</CardTitle>
                  <button onClick={closeForm} className="text-neutral-400 hover:text-neutral-700"><X size={14} /></button>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1"><Label className="text-xs">Code *</Label>
                      <Input className="h-8 text-xs font-mono" placeholder="e.g. WH-004" value={whForm.code} onChange={e => setWhForm(f => ({ ...f, code: e.target.value }))} /></div>
                    <div className="space-y-1"><Label className="text-xs">Warehouse Name *</Label>
                      <Input className="h-8 text-xs" placeholder="e.g. North Hub" value={whForm.name} onChange={e => setWhForm(f => ({ ...f, name: e.target.value }))} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1"><Label className="text-xs">City</Label>
                      <Input className="h-8 text-xs" value={whForm.city} onChange={e => setWhForm(f => ({ ...f, city: e.target.value }))} /></div>
                    <div className="space-y-1"><Label className="text-xs">Country</Label>
                      <Input className="h-8 text-xs" value={whForm.country} onChange={e => setWhForm(f => ({ ...f, country: e.target.value }))} /></div>
                  </div>
                  <div className="space-y-1"><Label className="text-xs">Area (sq.ft)</Label>
                    <Input className="h-8 text-xs" type="number" value={whForm.sqft} onChange={e => setWhForm(f => ({ ...f, sqft: e.target.value }))} /></div>
                  <div className="space-y-1"><Label className="text-xs">Warehouse Type</Label>
                    <Select value={whForm.type} onValueChange={v => setWhForm(f => ({ ...f, type: v }))}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {['General Purpose', 'Cold Storage', 'Bonded', 'Hazmat', 'Cross-Dock', '3PL'].map(t => <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1"><Label className="text-xs">Temperature Class</Label>
                    <Select value={whForm.temp_class} onValueChange={v => setWhForm(f => ({ ...f, temp_class: v }))}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {['Ambient', 'Refrigerated', 'Frozen', 'Controlled', 'Mixed'].map(t => <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1"><Label className="text-xs">Status</Label>
                    <Select value={whForm.status} onValueChange={v => setWhForm(f => ({ ...f, status: v }))}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Active" className="text-xs">Active</SelectItem>
                        <SelectItem value="Inactive" className="text-xs">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" className="flex-1 bg-neutral-900 hover:bg-neutral-800 text-white gap-1 text-xs" onClick={handleSaveWarehouse}>
                      <Check size={11} /> {editTarget ? 'Save' : 'Create'}
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={closeForm}>Cancel</Button>
                  </div>
                </CardContent>
              </Card>
            ) : selected ? (
              <Card className="border border-neutral-200 shadow-none">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold">{warehouses.find(w => w.id === selected)?.name}</CardTitle>
                  <CardDescription className="text-xs">{warehouses.find(w => w.id === selected)?.code}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2.5">
                  {(() => {
                    const w = warehouses.find(x => x.id === selected);
                    if (!w) return null;
                    return (
                      <>
                        {[['City', w.city], ['Country', w.country], ['Type', w.type], ['Temperature', w.temp_class], ['Area', `${w.sqft?.toLocaleString()} sq.ft`], ['Zones', w.zones_count], ['Dock Doors', w.docks_count]].map(([k, v]) => (
                          <div key={k as string} className="flex justify-between text-xs">
                            <span className="text-neutral-500">{k}</span>
                            <span className="font-medium text-neutral-900">{v}</span>
                          </div>
                        ))}
                        <div className="flex gap-2 pt-2">
                          <Button size="sm" className="flex-1 bg-neutral-900 hover:bg-neutral-800 text-white text-xs gap-1" onClick={() => { setWhForm({ name: w.name, code: w.code, city: w.city || '', country: w.country || 'India', sqft: String(w.sqft), type: w.type, temp_class: w.temp_class, status: w.status }); openEdit(w); }}>
                            <Pencil size={10} /> Edit
                          </Button>
                          <Button size="sm" variant="outline" className="flex-1 text-xs text-red-600 border-red-200 hover:bg-red-50"
                            onClick={() => { deleteWarehouse.mutate(w.id); setSelected(null); }}>
                            <Trash2 size={10} className="mr-1" /> Delete
                          </Button>
                        </div>
                      </>
                    );
                  })()}
                </CardContent>
              </Card>
            ) : (
              <Card className="border border-neutral-200 shadow-none p-8 text-center">
                <Building2 size={28} className="mx-auto mb-2 text-neutral-300" />
                <p className="text-xs text-neutral-400">Select a warehouse to view details</p>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* ── ZONES ── */}
      {activeView === 'zones' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-white rounded-xl border border-neutral-200">
            <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between flex-wrap gap-2">
              <h3 className="text-sm font-semibold text-neutral-900 flex items-center gap-2">
                <Grid3X3 size={14} style={{ color: BRAND }} /> Zone & Area Configuration
              </h3>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 border border-neutral-200 rounded-lg px-3 py-1.5 bg-neutral-50">
                  <Search size={12} className="text-neutral-400" />
                  <input className="bg-transparent text-xs text-neutral-700 placeholder-neutral-400 focus:outline-none w-28"
                    placeholder="Search zones..." value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <Button size="sm" className="bg-neutral-900 hover:bg-neutral-800 text-white gap-1.5 text-xs" onClick={() => { setZnForm({ name: '', code: '', warehouse_id: warehouses[0]?.id, zone_type: 'Storage', pick_priority: 'Medium', status: 'Active' }); openNew(); }}>
                  <Plus size={12} /> Add Zone
                </Button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-neutral-50 border-b border-neutral-100">
                    <th className="text-left py-2.5 px-4 text-neutral-500">Code</th>
                    <th className="text-left py-2.5 px-3 text-neutral-500">Zone Name</th>
                    <th className="text-left py-2.5 px-3 text-neutral-500">Warehouse</th>
                    <th className="text-left py-2.5 px-3 text-neutral-500">Type</th>
                    <th className="text-left py-2.5 px-3 text-neutral-500">Locations</th>
                    <th className="text-left py-2.5 px-3 text-neutral-500">Occupancy %</th>
                    <th className="text-left py-2.5 px-3 text-neutral-500">Pick Priority</th>
                    <th className="text-left py-2.5 px-3 text-neutral-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-50">
                  {zones.filter(z => z.name.toLowerCase().includes(search.toLowerCase())).map(z => (
                    <tr key={z.id} className={`hover:bg-blue-50/20 cursor-pointer transition-colors ${selected === z.id ? 'bg-blue-50/40' : ''}`}
                      style={selected === z.id ? { borderLeft: `3px solid ${BRAND}` } : {}} onClick={() => setSelected(z.id)}>
                      <td className="py-2.5 px-4 font-medium text-neutral-900">{z.code}</td>
                      <td className="py-2.5 px-3 text-neutral-800">{z.name}</td>
                      <td className="py-2.5 px-3 text-neutral-600">{z.warehouse_code || '—'}</td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded text-xs" style={{ background: '#009FE315', color: BRAND }}>{z.zone_type}</span>
                      </td>
                      <td className="py-2.5 px-3 text-neutral-600">{z.locations_count}</td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-neutral-100 rounded-full h-1.5 flex-shrink-0">
                            <div className="h-1.5 rounded-full" style={{ width: `${z.occupancy_pct}%`, background: z.occupancy_pct > 85 ? '#EF4444' : BRAND }} />
                          </div>
                          <span className={`text-xs font-medium ${z.occupancy_pct > 85 ? 'text-red-600' : 'text-neutral-700'}`}>{z.occupancy_pct}%</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${z.pick_priority === 'High' ? 'bg-emerald-50 text-emerald-700' : z.pick_priority === 'Medium' ? 'bg-amber-50 text-amber-700' : 'bg-neutral-100 text-neutral-500'}`}>{z.pick_priority}</span>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5">
                          <button onClick={e => { e.stopPropagation(); setZnForm({ name: z.name, code: z.code, warehouse_id: z.warehouse_id ?? undefined, zone_type: z.zone_type || 'Storage', pick_priority: z.pick_priority, status: z.status }); openEdit(z); }} className="text-neutral-400 hover:text-amber-500 transition-colors"><Pencil size={12} /></button>
                          <button onClick={e => { e.stopPropagation(); deleteZone.mutate(z.id); }} className="text-neutral-400 hover:text-red-500 transition-colors"><Trash2 size={12} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div>
            {showForm ? (
              <Card className="border border-neutral-200 shadow-none">
                <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-sm font-semibold">{editTarget ? 'Edit Zone' : 'Add Zone'}</CardTitle>
                  <button onClick={closeForm} className="text-neutral-400 hover:text-neutral-700"><X size={14} /></button>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1"><Label className="text-xs">Code *</Label>
                      <Input className="h-8 text-xs font-mono" placeholder="e.g. ZONE-G" value={znForm.code} onChange={e => setZnForm(f => ({ ...f, code: e.target.value }))} /></div>
                    <div className="space-y-1"><Label className="text-xs">Zone Name *</Label>
                      <Input className="h-8 text-xs" placeholder="e.g. Returns" value={znForm.name} onChange={e => setZnForm(f => ({ ...f, name: e.target.value }))} /></div>
                  </div>
                  <div className="space-y-1"><Label className="text-xs">Warehouse</Label>
                    <Select value={String(znForm.warehouse_id ?? '')} onValueChange={v => setZnForm(f => ({ ...f, warehouse_id: v ? Number(v) : undefined }))}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {warehouses.map(w => <SelectItem key={w.id} value={String(w.id)} className="text-xs">{w.code} – {w.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1"><Label className="text-xs">Zone Type</Label>
                    <Select value={znForm.zone_type} onValueChange={v => setZnForm(f => ({ ...f, zone_type: v }))}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {['Receiving', 'Storage', 'Dispatch', 'Hazmat', 'Cold Storage', 'Returns', 'Staging', 'Bulk', 'Pick'].map(t => <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1"><Label className="text-xs">Pick Priority</Label>
                    <Select value={znForm.pick_priority} onValueChange={v => setZnForm(f => ({ ...f, pick_priority: v }))}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {['High', 'Medium', 'Low'].map(t => <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" className="flex-1 bg-neutral-900 hover:bg-neutral-800 text-white gap-1 text-xs" onClick={handleSaveZone}>
                      <Check size={11} /> {editTarget ? 'Save' : 'Create'}
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={closeForm}>Cancel</Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border border-neutral-200 shadow-none p-8 text-center">
                <Grid3X3 size={28} className="mx-auto mb-2 text-neutral-300" />
                <p className="text-xs text-neutral-400">Click Add Zone to create a new zone</p>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* ── DOCK DOORS ── */}
      {activeView === 'docks' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-1.5 border border-neutral-200 rounded-lg px-3 py-1.5 bg-white">
              <Search size={12} className="text-neutral-400" />
              <input className="bg-transparent text-xs text-neutral-700 placeholder-neutral-400 focus:outline-none w-32"
                placeholder="Search dock doors..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Button size="sm" className="bg-neutral-900 hover:bg-neutral-800 text-white gap-1.5 text-xs" onClick={() => { setDkForm({ door_code: '', warehouse_id: warehouses[0]?.id, direction: 'Inbound', load_type: 'FTL', dimensions: '4.8m x 4.2m' }); openNew(); }}>
              <Plus size={12} /> Add Dock Door
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {docks.filter(d => d.door_code.toLowerCase().includes(search.toLowerCase())).map(d => (
              <Card key={d.id} className={`border shadow-none cursor-pointer transition-all ${selected === d.id ? 'border-[#009FE3] bg-blue-50/20' : 'border-neutral-200'}`}
                onClick={() => setSelected(d.id)}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#009FE318' }}>
                        <DoorOpen size={14} style={{ color: BRAND }} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-neutral-900">{d.door_code}</p>
                        <p className="text-xs text-neutral-500">{d.warehouse_code || '—'}</p>
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${dockStatusColor[d.status] || 'bg-neutral-100 text-neutral-500'}`}>{d.status}</span>
                  </div>
                  <div className="space-y-1.5 text-xs">
                    {[['Direction', d.direction], ['Load Type', d.load_type], ['Dimensions', d.dimensions], ['Current Trailer', d.current_trailer || '—']].map(([k, v]) => (
                      <div key={k as string} className="flex justify-between">
                        <span className="text-neutral-500">{k}</span>
                        <span className="font-medium text-neutral-800">{v}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-neutral-100">
                    <Button size="sm" variant="outline" className="flex-1 text-xs gap-1 h-7" onClick={e => { e.stopPropagation(); setDkForm({ door_code: d.door_code, warehouse_id: d.warehouse_id ?? undefined, direction: d.direction || 'Inbound', load_type: d.load_type || 'FTL', dimensions: d.dimensions || '' }); openEdit(d); }}>
                      <Pencil size={10} /> Edit
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1 text-xs gap-1 h-7 text-red-600 border-red-200 hover:bg-red-50"
                      onClick={e => { e.stopPropagation(); deleteDock.mutate(d.id); }}>
                      <Trash2 size={10} /> Remove
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {showForm && (
              <Card className="border border-neutral-300 shadow-none">
                <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-sm font-semibold">{editTarget ? 'Edit Dock' : 'New Dock Door'}</CardTitle>
                  <button onClick={closeForm} className="text-neutral-400 hover:text-neutral-700"><X size={14} /></button>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1"><Label className="text-xs">Door Code *</Label>
                    <Input className="h-8 text-xs font-mono" placeholder="e.g. DK-07" value={dkForm.door_code} onChange={e => setDkForm(f => ({ ...f, door_code: e.target.value }))} /></div>
                  <div className="space-y-1"><Label className="text-xs">Warehouse</Label>
                    <Select value={String(dkForm.warehouse_id ?? '')} onValueChange={v => setDkForm(f => ({ ...f, warehouse_id: v ? Number(v) : undefined }))}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>{warehouses.map(w => <SelectItem key={w.id} value={String(w.id)} className="text-xs">{w.code}</SelectItem>)}</SelectContent>
                    </Select></div>
                  <div className="space-y-1"><Label className="text-xs">Direction</Label>
                    <Select value={dkForm.direction} onValueChange={v => setDkForm(f => ({ ...f, direction: v }))}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>{['Inbound', 'Outbound', 'Inbound/Outbound'].map(t => <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>)}</SelectContent>
                    </Select></div>
                  <div className="space-y-1"><Label className="text-xs">Load Type</Label>
                    <Select value={dkForm.load_type} onValueChange={v => setDkForm(f => ({ ...f, load_type: v }))}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>{['FTL', 'LTL', 'Both'].map(t => <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>)}</SelectContent>
                    </Select></div>
                  <div className="space-y-1"><Label className="text-xs">Dimensions</Label>
                    <Input className="h-8 text-xs" placeholder="e.g. 4.8m x 4.2m" value={dkForm.dimensions} onChange={e => setDkForm(f => ({ ...f, dimensions: e.target.value }))} /></div>
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" className="flex-1 bg-neutral-900 hover:bg-neutral-800 text-white gap-1 text-xs" onClick={handleSaveDock}>
                      <Check size={11} /> {editTarget ? 'Save' : 'Create'}
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={closeForm}>Cancel</Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* ── AISLES / BAYS / LEVELS ── */}
      {activeView === 'aisles' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-white rounded-xl border border-neutral-200">
            <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between flex-wrap gap-2">
              <h3 className="text-sm font-semibold text-neutral-900 flex items-center gap-2">
                <MapPin size={14} style={{ color: BRAND }} /> Aisle / Bay / Level Matrix
              </h3>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 border border-neutral-200 rounded-lg px-3 py-1.5 bg-neutral-50">
                  <Search size={12} className="text-neutral-400" />
                  <input className="bg-transparent text-xs text-neutral-700 placeholder-neutral-400 focus:outline-none w-24"
                    placeholder="Search aisles..." value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <Button size="sm" className="bg-neutral-900 hover:bg-neutral-800 text-white gap-1.5 text-xs" onClick={() => { setAlForm({ zone_id: zones[0]?.id, aisle: '', bays: '10', levels: '3', location_type: 'Storage' }); openNew(); }}>
                  <Plus size={12} /> Generate Aisle
                </Button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-neutral-50 border-b border-neutral-100">
                    <th className="text-left py-2.5 px-4 text-neutral-500">Zone</th>
                    <th className="text-left py-2.5 px-3 text-neutral-500">Aisle</th>
                    <th className="text-left py-2.5 px-3 text-neutral-500">Bays</th>
                    <th className="text-left py-2.5 px-3 text-neutral-500">Levels</th>
                    <th className="text-left py-2.5 px-3 text-neutral-500">Total Locs</th>
                    <th className="text-left py-2.5 px-3 text-neutral-500">Occupied</th>
                    <th className="text-left py-2.5 px-3 text-neutral-500">Location Type</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-50">
                  {aisles.filter(a => a.aisle.toLowerCase().includes(search.toLowerCase()) || a.zone_code.toLowerCase().includes(search.toLowerCase())).map(a => (
                    <tr key={`${a.zone_id}-${a.aisle}`} className="hover:bg-blue-50/20 transition-colors">
                      <td className="py-2.5 px-4"><span className="px-2 py-0.5 rounded text-xs" style={{ background: '#009FE315', color: BRAND }}>{a.zone_code}</span></td>
                      <td className="py-2.5 px-3 font-bold text-neutral-800">{a.aisle}</td>
                      <td className="py-2.5 px-3 text-neutral-600">{a.bays}</td>
                      <td className="py-2.5 px-3 text-neutral-600">{a.levels}</td>
                      <td className="py-2.5 px-3 text-neutral-700 font-medium">{a.total_locations}</td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <div className="w-12 bg-neutral-100 rounded-full h-1.5">
                            <div className="h-1.5 rounded-full" style={{ width: `${a.total_locations ? Math.round((a.occupied / a.total_locations) * 100) : 0}%`, background: BRAND }} />
                          </div>
                          <span className="text-neutral-700">{a.occupied}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-neutral-600">{a.location_type}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-5 py-3 border-t border-neutral-100 flex items-center justify-between">
              <span className="text-xs text-neutral-400">Total locations configured: <strong>{aisles.reduce((a, x) => a + x.total_locations, 0)}</strong> | Occupied: <strong>{aisles.reduce((a, x) => a + x.occupied, 0)}</strong></span>
            </div>
          </div>
          <div>
            {showForm ? (
              <Card className="border border-neutral-200 shadow-none">
                <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-sm font-semibold">Bulk-Generate Locations</CardTitle>
                  <button onClick={closeForm} className="text-neutral-400 hover:text-neutral-700"><X size={14} /></button>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1"><Label className="text-xs">Zone</Label>
                    <Select value={String(alForm.zone_id ?? '')} onValueChange={v => setAlForm(f => ({ ...f, zone_id: v ? Number(v) : undefined }))}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>{zones.map(z => <SelectItem key={z.id} value={String(z.id)} className="text-xs">{z.code} – {z.name}</SelectItem>)}</SelectContent>
                    </Select></div>
                  <div className="space-y-1"><Label className="text-xs">Aisle Letter *</Label>
                    <Input className="h-8 text-xs" placeholder="e.g. G" value={alForm.aisle} onChange={e => setAlForm(f => ({ ...f, aisle: e.target.value }))} /></div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1"><Label className="text-xs">No. of Bays</Label>
                      <Input className="h-8 text-xs" type="number" min="1" value={alForm.bays} onChange={e => setAlForm(f => ({ ...f, bays: e.target.value }))} /></div>
                    <div className="space-y-1"><Label className="text-xs">No. of Levels</Label>
                      <Input className="h-8 text-xs" type="number" min="1" value={alForm.levels} onChange={e => setAlForm(f => ({ ...f, levels: e.target.value }))} /></div>
                  </div>
                  <div className="p-2 bg-blue-50 rounded text-xs text-blue-700">
                    Locations to create: <strong>{Number(alForm.bays) * Number(alForm.levels)}</strong> (existing codes are skipped)
                  </div>
                  <div className="space-y-1"><Label className="text-xs">Location Type</Label>
                    <Select value={alForm.location_type} onValueChange={v => setAlForm(f => ({ ...f, location_type: v }))}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>{['Storage', 'Pick Face', 'Staging', 'Dock'].map(t => <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>)}</SelectContent>
                    </Select></div>
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" className="flex-1 bg-neutral-900 hover:bg-neutral-800 text-white gap-1 text-xs" onClick={handleSaveAisle}>
                      <Check size={11} /> Generate
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={closeForm}>Cancel</Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                <Card className="border border-neutral-200 shadow-none">
                  <CardContent className="p-4">
                    <p className="text-xs font-semibold text-neutral-700 mb-3 flex items-center gap-2"><AlertCircle size={12} style={{ color: BRAND }} /> Location Naming Convention</p>
                    <p className="text-xs text-neutral-500 leading-relaxed">Auto-generated location codes follow the pattern: <code className="bg-neutral-100 px-1 rounded font-mono text-neutral-700">[Zone]-[Aisle][Bay]-L[Level]</code></p>
                    <p className="text-xs text-neutral-500 mt-2 leading-relaxed">This table is computed live from real Location rows grouped by zone + aisle — nothing here is stored separately.</p>
                  </CardContent>
                </Card>
                <Card className="border border-neutral-200 shadow-none">
                  <CardContent className="p-4 space-y-2">
                    <p className="text-xs font-semibold text-neutral-700 mb-2">Capacity Summary</p>
                    {zones.filter(z => aisles.some(a => a.zone_id === z.id)).map(z => {
                      const zAisles = aisles.filter(a => a.zone_id === z.id);
                      const total = zAisles.reduce((s, a) => s + a.total_locations, 0);
                      const occ = zAisles.reduce((s, a) => s + a.occupied, 0);
                      const pct = total > 0 ? Math.round((occ / total) * 100) : 0;
                      return (
                        <div key={z.id}>
                          <div className="flex justify-between text-xs mb-0.5">
                            <span className="text-neutral-600">{z.code}</span>
                            <span className="text-neutral-800 font-medium">{occ}/{total} ({pct}%)</span>
                          </div>
                          <div className="w-full bg-neutral-100 rounded-full h-1.5">
                            <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, background: pct > 85 ? '#EF4444' : BRAND }} />
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
