import { useState } from 'react';
import {
  Database, Plus, Search, Pencil, Trash2, Eye, X, Check,
  Package, Tag, Ruler, Users, AlertCircle, ChevronLeft, ChevronRight,
  RefreshCw, FileDown, FileUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  useMaterialTypes, useCreateMaterialType, useUpdateMaterialType, useDeleteMaterialType,
  useUnitsOfMeasure, useCreateUnitOfMeasure, useUpdateUnitOfMeasure, useDeleteUnitOfMeasure,
  usePackKeyTemplates, useCreatePackKeyTemplate, useUpdatePackKeyTemplate, useDeletePackKeyTemplate,
  useAdminMaterialOwners, useUpdateAdminMaterialOwner,
  useMaterialCategories, useCreateMaterialCategory, useUpdateMaterialCategory, useDeleteMaterialCategory,
} from '@/hooks/useAdminConfigApi2';

const BRAND = "#009FE3";
type SubView = 'sku-types' | 'uom' | 'pack-keys' | 'owners' | 'categories';

export default function MasterDataConfigSection() {
  const [activeView, setActiveView] = useState<SubView>('sku-types');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<any>(null);
  const [saved, setSaved] = useState(false);

  const { data: skuTypes = [] } = useMaterialTypes();
  const createSkuType = useCreateMaterialType();
  const updateSkuType = useUpdateMaterialType();
  const deleteSkuType = useDeleteMaterialType();

  const { data: uoms = [] } = useUnitsOfMeasure();
  const createUom = useCreateUnitOfMeasure();
  const updateUom = useUpdateUnitOfMeasure();
  const deleteUom = useDeleteUnitOfMeasure();

  const { data: packKeys = [] } = usePackKeyTemplates();
  const createPackKey = useCreatePackKeyTemplate();
  const updatePackKey = useUpdatePackKeyTemplate();
  const deletePackKey = useDeletePackKeyTemplate();

  const { data: owners = [] } = useAdminMaterialOwners();
  const updateOwner = useUpdateAdminMaterialOwner();

  const { data: categories = [] } = useMaterialCategories();
  const createCategory = useCreateMaterialCategory();
  const updateCategory = useUpdateMaterialCategory();
  const deleteCategory = useDeleteMaterialCategory();

  // Forms
  const [stForm, setStForm] = useState({ name: '', code: '', track_expiry: false, track_serial: false, track_batch: false, hazmat: false, cold_chain: false, status: 'Active' });
  const [uomForm, setUomForm] = useState({ name: '', abbreviation: '', type: 'Count', is_base: false, conversion_factor: '1', status: 'Active' });
  const [pkForm, setPkForm] = useState({ name: '', code: '', inner_pack: '1', outer_pack: '1', pallet_qty: '100', weight: '', dimensions: '', status: 'Active' });
  const [ownForm, setOwnForm] = useState({ contact_email: '', type: 'Internal', country: '', status: 'Active' });
  const [catForm, setCatForm] = useState({ name: '', code: '', parent_id: null as number | null, status: 'Active' });

  const openNew = () => { setEditTarget(null); setShowForm(true); };
  const openEdit = (item: any) => { setEditTarget(item); setShowForm(true); };
  const closeForm = () => { setShowForm(false); setEditTarget(null); };
  const notify = () => { setSaved(true); setTimeout(() => setSaved(false), 2000); };

  const views: { id: SubView; label: string; icon: any }[] = [
    { id: 'sku-types', label: 'SKU / Material Types', icon: Package },
    { id: 'uom', label: 'Units of Measure', icon: Ruler },
    { id: 'pack-keys', label: 'Pack Keys', icon: Tag },
    { id: 'owners', label: 'Material Owners', icon: Users },
    { id: 'categories', label: 'Categories', icon: Database },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-neutral-900">Master Data Configuration</h2>
          <p className="text-sm text-neutral-500 mt-0.5">Configure SKU types, units of measure, pack keys, owners and product categories</p>
        </div>
        {saved && <div className="flex items-center gap-1.5 text-emerald-600 text-sm"><Check className="w-4 h-4" />Saved successfully</div>}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'SKU Types', value: skuTypes.filter(s => s.status === 'Active').length, color: BRAND },
          { label: 'UOM Records', value: uoms.filter(u => u.status === 'Active').length, color: '#10B981' },
          { label: 'Pack Keys', value: packKeys.filter(p => p.status === 'Active').length, color: '#F59E0B' },
          { label: 'Owners', value: owners.filter(o => o.status === 'Active').length, color: '#8B5CF6' },
          { label: 'Categories', value: categories.filter(c => c.status === 'Active').length, color: '#EF4444' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-xl border border-neutral-200 px-4 py-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${color}18` }}>
              <span className="text-sm font-bold" style={{ color }}>{value}</span>
            </div>
            <p className="text-xs text-neutral-500">{label}</p>
          </div>
        ))}
      </div>

      {/* Sub-view tabs */}
      <div className="flex gap-1 flex-wrap">
        {views.map(v => {
          const Icon = v.icon;
          return (
            <button key={v.id} onClick={() => { setActiveView(v.id); setShowForm(false); setSelected(null); setSearch(''); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${activeView === v.id ? 'bg-neutral-900 text-white border-neutral-900' : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-400'}`}>
              <Icon size={13} />{v.label}
            </button>
          );
        })}
      </div>

      {/* ── SKU TYPES ── */}
      {activeView === 'sku-types' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-white rounded-xl border border-neutral-200">
            <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between flex-wrap gap-2">
              <h3 className="text-sm font-semibold text-neutral-900 flex items-center gap-2"><Package size={14} style={{ color: BRAND }} /> SKU / Material Types</h3>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 border border-neutral-200 rounded-lg px-3 py-1.5 bg-neutral-50">
                  <Search size={12} className="text-neutral-400" />
                  <input className="bg-transparent text-xs focus:outline-none w-28" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <Button size="sm" className="bg-neutral-900 hover:bg-neutral-800 text-white gap-1.5 text-xs" onClick={() => { setStForm({ name: '', code: '', track_expiry: false, track_serial: false, track_batch: false, hazmat: false, cold_chain: false, status: 'Active' }); openNew(); }}><Plus size={12} /> Add Type</Button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-neutral-50 border-b border-neutral-100">
                    {['ID', 'Name', 'Code', 'Track Expiry', 'Track Serial', 'Track Batch', 'Hazmat', 'Cold Chain', 'Status', 'Actions'].map(h => (
                      <th key={h} className="text-left py-2.5 px-3 text-neutral-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-50">
                  {skuTypes.filter(s => s.name.toLowerCase().includes(search.toLowerCase())).map(s => (
                    <tr key={s.id} className={`hover:bg-blue-50/20 cursor-pointer transition-colors ${selected === s.id ? 'bg-blue-50/40' : ''}`}
                      style={selected === s.id ? { borderLeft: `3px solid ${BRAND}` } : {}} onClick={() => setSelected(s.id)}>
                      <td className="py-2.5 px-3 font-medium text-neutral-900">{s.id}</td>
                      <td className="py-2.5 px-3 text-neutral-800">{s.name}</td>
                      <td className="py-2.5 px-3"><code className="bg-neutral-100 px-1.5 py-0.5 rounded text-neutral-700 font-mono">{s.code}</code></td>
                      {[s.track_expiry, s.track_serial, s.track_batch, s.hazmat, s.cold_chain].map((v, i) => (
                        <td key={i} className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${v ? 'bg-emerald-50 text-emerald-700' : 'bg-neutral-100 text-neutral-400'}`}>{v ? 'Yes' : 'No'}</span>
                        </td>
                      ))}
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.status === 'Active' ? 'bg-emerald-50 text-emerald-700' : 'bg-neutral-100 text-neutral-500'}`}>{s.status}</span>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex gap-1.5">
                          <button onClick={e => { e.stopPropagation(); setStForm({ name: s.name, code: s.code, track_expiry: s.track_expiry, track_serial: s.track_serial, track_batch: s.track_batch, hazmat: s.hazmat, cold_chain: s.cold_chain, status: s.status }); openEdit(s); }} className="text-neutral-400 hover:text-amber-500 transition-colors"><Pencil size={12} /></button>
                          <button onClick={e => { e.stopPropagation(); deleteSkuType.mutate(s.id); if (selected === s.id) setSelected(null); }} className="text-neutral-400 hover:text-red-500 transition-colors"><Trash2 size={12} /></button>
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
                  <CardTitle className="text-sm font-semibold">{editTarget ? 'Edit SKU Type' : 'New SKU Type'}</CardTitle>
                  <button onClick={closeForm} className="text-neutral-400 hover:text-neutral-700"><X size={14} /></button>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1"><Label className="text-xs">Type Name *</Label><Input className="h-8 text-xs" placeholder="e.g. Serialised Product" value={stForm.name} onChange={e => setStForm(f => ({ ...f, name: e.target.value }))} /></div>
                  <div className="space-y-1"><Label className="text-xs">Short Code *</Label><Input className="h-8 text-xs" placeholder="e.g. SRLZ" value={stForm.code} onChange={e => setStForm(f => ({ ...f, code: e.target.value }))} /></div>
                  {[
                    { key: 'track_expiry', label: 'Track Expiry Date' },
                    { key: 'track_serial', label: 'Track Serial Number' },
                    { key: 'track_batch', label: 'Track Batch / Lot' },
                    { key: 'hazmat', label: 'Hazardous Material' },
                    { key: 'cold_chain', label: 'Requires Cold Chain' },
                  ].map(({ key, label }) => (
                    <div key={key} className="flex items-center justify-between py-0.5">
                      <Label className="text-xs text-neutral-700">{label}</Label>
                      <Switch checked={(stForm as any)[key]} onCheckedChange={v => setStForm(f => ({ ...f, [key]: v }))} />
                    </div>
                  ))}
                  <div className="space-y-1"><Label className="text-xs">Status</Label>
                    <Select value={stForm.status} onValueChange={v => setStForm(f => ({ ...f, status: v }))}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="Active" className="text-xs">Active</SelectItem><SelectItem value="Inactive" className="text-xs">Inactive</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" className="flex-1 bg-neutral-900 hover:bg-neutral-800 text-white gap-1 text-xs" onClick={() => {
                      if (!stForm.name) return;
                      if (editTarget) { updateSkuType.mutate({ id: editTarget.id, payload: stForm }, { onSuccess: notify }); }
                      else { createSkuType.mutate(stForm, { onSuccess: notify }); }
                      closeForm();
                    }}><Check size={11} /> {editTarget ? 'Save' : 'Create'}</Button>
                    <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={closeForm}>Cancel</Button>
                  </div>
                </CardContent>
              </Card>
            ) : selected ? (
              (() => {
                const s = skuTypes.find(x => x.id === selected);
                return s ? (
                  <Card className="border border-neutral-200 shadow-none">
                    <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">{s.name}</CardTitle><CardDescription className="text-xs"><code>{s.code}</code></CardDescription></CardHeader>
                    <CardContent className="space-y-2">
                      {[['Track Expiry', s.track_expiry], ['Track Serial', s.track_serial], ['Track Batch', s.track_batch], ['Hazmat', s.hazmat], ['Cold Chain', s.cold_chain]].map(([k, v]) => (
                        <div key={k as string} className="flex justify-between text-xs">
                          <span className="text-neutral-500">{k as string}</span>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${v ? 'bg-emerald-50 text-emerald-700' : 'bg-neutral-100 text-neutral-400'}`}>{v ? 'Yes' : 'No'}</span>
                        </div>
                      ))}
                      <div className="flex gap-2 pt-2">
                        <Button size="sm" className="flex-1 bg-neutral-900 hover:bg-neutral-800 text-white text-xs gap-1" onClick={() => { setStForm({ name: s.name, code: s.code, track_expiry: s.track_expiry, track_serial: s.track_serial, track_batch: s.track_batch, hazmat: s.hazmat, cold_chain: s.cold_chain, status: s.status }); openEdit(s); }}><Pencil size={10} /> Edit</Button>
                        <Button size="sm" variant="outline" className="flex-1 text-xs text-red-600 border-red-200 hover:bg-red-50" onClick={() => { deleteSkuType.mutate(selected); setSelected(null); }}><Trash2 size={10} /> Delete</Button>
                      </div>
                    </CardContent>
                  </Card>
                ) : null;
              })()
            ) : (
              <Card className="border border-neutral-200 shadow-none p-8 text-center">
                <Package size={28} className="mx-auto mb-2 text-neutral-300" />
                <p className="text-xs text-neutral-400">Select or create an SKU type</p>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* ── UOM ── */}
      {activeView === 'uom' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-white rounded-xl border border-neutral-200">
            <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between flex-wrap gap-2">
              <h3 className="text-sm font-semibold text-neutral-900 flex items-center gap-2"><Ruler size={14} style={{ color: BRAND }} /> Units of Measure</h3>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 border border-neutral-200 rounded-lg px-3 py-1.5 bg-neutral-50">
                  <Search size={12} className="text-neutral-400" />
                  <input className="bg-transparent text-xs focus:outline-none w-24" placeholder="Search UOM..." value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <Button size="sm" className="bg-neutral-900 hover:bg-neutral-800 text-white gap-1.5 text-xs" onClick={() => { setUomForm({ name: '', abbreviation: '', type: 'Count', is_base: false, conversion_factor: '1', status: 'Active' }); openNew(); }}><Plus size={12} /> Add UOM</Button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-neutral-50 border-b border-neutral-100">
                    {['ID', 'Name', 'Abbr.', 'Type', 'Base UOM', 'Conv. Factor', 'Example', 'Status', 'Actions'].map(h => (
                      <th key={h} className="text-left py-2.5 px-3 text-neutral-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-50">
                  {uoms.filter(u => u.name.toLowerCase().includes(search.toLowerCase())).map(u => (
                    <tr key={u.id} className={`hover:bg-blue-50/20 cursor-pointer transition-colors ${selected === u.id ? 'bg-blue-50/40' : ''}`}
                      style={selected === u.id ? { borderLeft: `3px solid ${BRAND}` } : {}} onClick={() => setSelected(u.id)}>
                      <td className="py-2.5 px-3 font-medium text-neutral-900">{u.id}</td>
                      <td className="py-2.5 px-3 text-neutral-800">{u.name}</td>
                      <td className="py-2.5 px-3"><code className="bg-neutral-100 px-1.5 py-0.5 rounded text-neutral-700 font-mono">{u.abbreviation}</code></td>
                      <td className="py-2.5 px-3"><span className="px-2 py-0.5 rounded text-xs" style={{ background: '#009FE315', color: BRAND }}>{u.type}</span></td>
                      <td className="py-2.5 px-3"><span className={`px-2 py-0.5 rounded text-xs font-medium ${u.is_base ? 'bg-emerald-50 text-emerald-700' : 'bg-neutral-100 text-neutral-400'}`}>{u.is_base ? 'Yes' : 'No'}</span></td>
                      <td className="py-2.5 px-3 text-neutral-700 font-mono">{u.conversion_factor}</td>
                      <td className="py-2.5 px-3 text-neutral-500">1 {u.abbreviation} = {u.conversion_factor} {u.type === 'Count' ? 'EA' : u.type === 'Weight' ? 'KG' : u.type === 'Volume' ? 'LTR' : 'MTR'}</td>
                      <td className="py-2.5 px-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${u.status === 'Active' ? 'bg-emerald-50 text-emerald-700' : 'bg-neutral-100 text-neutral-500'}`}>{u.status}</span></td>
                      <td className="py-2.5 px-3">
                        <div className="flex gap-1.5">
                          <button onClick={e => { e.stopPropagation(); setUomForm({ name: u.name, abbreviation: u.abbreviation, type: u.type, is_base: u.is_base, conversion_factor: String(u.conversion_factor), status: u.status }); openEdit(u); }} className="text-neutral-400 hover:text-amber-500 transition-colors"><Pencil size={12} /></button>
                          <button onClick={e => { e.stopPropagation(); deleteUom.mutate(u.id); }} className="text-neutral-400 hover:text-red-500 transition-colors"><Trash2 size={12} /></button>
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
                  <CardTitle className="text-sm font-semibold">{editTarget ? 'Edit UOM' : 'New UOM'}</CardTitle>
                  <button onClick={closeForm} className="text-neutral-400 hover:text-neutral-700"><X size={14} /></button>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1"><Label className="text-xs">Full Name *</Label><Input className="h-8 text-xs" placeholder="e.g. Dozen" value={uomForm.name} onChange={e => setUomForm(f => ({ ...f, name: e.target.value }))} /></div>
                  <div className="space-y-1"><Label className="text-xs">Abbreviation *</Label><Input className="h-8 text-xs" placeholder="e.g. DZ" value={uomForm.abbreviation} onChange={e => setUomForm(f => ({ ...f, abbreviation: e.target.value }))} /></div>
                  <div className="space-y-1"><Label className="text-xs">Type</Label>
                    <Select value={uomForm.type} onValueChange={v => setUomForm(f => ({ ...f, type: v }))}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>{['Count', 'Weight', 'Volume', 'Length', 'Area'].map(t => <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1"><Label className="text-xs">Conversion Factor (to base UOM)</Label><Input className="h-8 text-xs" type="number" step="0.001" value={uomForm.conversion_factor} onChange={e => setUomForm(f => ({ ...f, conversion_factor: e.target.value }))} /></div>
                  <div className="flex items-center justify-between py-0.5">
                    <Label className="text-xs">Is Base UOM</Label>
                    <Switch checked={uomForm.is_base} onCheckedChange={v => setUomForm(f => ({ ...f, is_base: v }))} />
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" className="flex-1 bg-neutral-900 hover:bg-neutral-800 text-white gap-1 text-xs" onClick={() => {
                      if (!uomForm.name) return;
                      const payload = { ...uomForm, conversion_factor: Number(uomForm.conversion_factor) };
                      if (editTarget) { updateUom.mutate({ id: editTarget.id, payload }, { onSuccess: notify }); }
                      else { createUom.mutate(payload, { onSuccess: notify }); }
                      closeForm();
                    }}><Check size={11} /> {editTarget ? 'Save' : 'Create'}</Button>
                    <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={closeForm}>Cancel</Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border border-neutral-200 shadow-none p-8 text-center">
                <Ruler size={28} className="mx-auto mb-2 text-neutral-300" />
                <p className="text-xs text-neutral-400">Select or create a Unit of Measure</p>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* ── PACK KEYS ── */}
      {activeView === 'pack-keys' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-1.5 border border-neutral-200 rounded-lg px-3 py-1.5 bg-white">
              <Search size={12} className="text-neutral-400" />
              <input className="bg-transparent text-xs focus:outline-none w-32" placeholder="Search pack keys..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Button size="sm" className="bg-neutral-900 hover:bg-neutral-800 text-white gap-1.5 text-xs" onClick={() => { setPkForm({ name: '', code: '', inner_pack: '1', outer_pack: '1', pallet_qty: '100', weight: '', dimensions: '', status: 'Active' }); openNew(); }}><Plus size={12} /> Add Pack Key</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {packKeys.filter(p => p.name.toLowerCase().includes(search.toLowerCase())).map(pk => (
              <Card key={pk.id} className={`border shadow-none ${selected === pk.id ? 'border-[#009FE3] bg-blue-50/20' : 'border-neutral-200'}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-sm font-semibold text-neutral-900">{pk.name}</p>
                      <code className="text-xs text-neutral-500 font-mono">{pk.code}</code>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${pk.status === 'Active' ? 'bg-emerald-50 text-emerald-700' : 'bg-neutral-100 text-neutral-500'}`}>{pk.status}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {[['Inner Pack', pk.inner_pack], ['Outer Pack', pk.outer_pack], ['Pallet Qty', pk.pallet_qty], ['Weight (kg)', pk.weight], ['Dimensions', pk.dimensions || '—']].map(([k, v]) => (
                      <div key={k as string} className={k === 'Dimensions' ? 'col-span-2' : ''}>
                        <p className="text-neutral-400">{k}</p>
                        <p className="font-medium text-neutral-800">{v}</p>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2 mt-3 pt-3 border-t border-neutral-100">
                    <Button size="sm" variant="outline" className="flex-1 text-xs gap-1 h-7" onClick={() => {
                      setPkForm({ name: pk.name, code: pk.code, inner_pack: String(pk.inner_pack), outer_pack: String(pk.outer_pack), pallet_qty: String(pk.pallet_qty), weight: String(pk.weight), dimensions: pk.dimensions || '', status: pk.status });
                      openEdit(pk);
                    }}><Pencil size={10} /> Edit</Button>
                    <Button size="sm" variant="outline" className="flex-1 text-xs gap-1 h-7 text-red-600 border-red-200 hover:bg-red-50" onClick={() => deletePackKey.mutate(pk.id)}><Trash2 size={10} /> Delete</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {showForm && (
              <Card className="border border-neutral-300 shadow-none">
                <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-sm font-semibold">{editTarget ? 'Edit Pack Key' : 'New Pack Key'}</CardTitle>
                  <button onClick={closeForm} className="text-neutral-400 hover:text-neutral-700"><X size={14} /></button>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1"><Label className="text-xs">Pack Name *</Label><Input className="h-8 text-xs" placeholder="e.g. Master Carton 12" value={pkForm.name} onChange={e => setPkForm(f => ({ ...f, name: e.target.value }))} /></div>
                  <div className="space-y-1"><Label className="text-xs">Pack Code *</Label><Input className="h-8 text-xs" placeholder="e.g. MC12" value={pkForm.code} onChange={e => setPkForm(f => ({ ...f, code: e.target.value }))} /></div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1"><Label className="text-xs">Inner Pack</Label><Input className="h-8 text-xs" type="number" value={pkForm.inner_pack} onChange={e => setPkForm(f => ({ ...f, inner_pack: e.target.value }))} /></div>
                    <div className="space-y-1"><Label className="text-xs">Outer Pack</Label><Input className="h-8 text-xs" type="number" value={pkForm.outer_pack} onChange={e => setPkForm(f => ({ ...f, outer_pack: e.target.value }))} /></div>
                    <div className="space-y-1"><Label className="text-xs">Pallet Qty</Label><Input className="h-8 text-xs" type="number" value={pkForm.pallet_qty} onChange={e => setPkForm(f => ({ ...f, pallet_qty: e.target.value }))} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1"><Label className="text-xs">Weight (kg)</Label><Input className="h-8 text-xs" type="number" step="0.1" value={pkForm.weight} onChange={e => setPkForm(f => ({ ...f, weight: e.target.value }))} /></div>
                    <div className="space-y-1"><Label className="text-xs">Dimensions</Label><Input className="h-8 text-xs" placeholder="L×W×H cm" value={pkForm.dimensions} onChange={e => setPkForm(f => ({ ...f, dimensions: e.target.value }))} /></div>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" className="flex-1 bg-neutral-900 hover:bg-neutral-800 text-white gap-1 text-xs" onClick={() => {
                      if (!pkForm.name) return;
                      const payload = { ...pkForm, inner_pack: Number(pkForm.inner_pack), outer_pack: Number(pkForm.outer_pack), pallet_qty: Number(pkForm.pallet_qty), weight: Number(pkForm.weight) };
                      if (editTarget) { updatePackKey.mutate({ id: editTarget.id, payload }, { onSuccess: notify }); }
                      else { createPackKey.mutate(payload, { onSuccess: notify }); }
                      closeForm();
                    }}><Check size={11} /> {editTarget ? 'Save' : 'Create'}</Button>
                    <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={closeForm}>Cancel</Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* ── OWNERS ── */}
      {activeView === 'owners' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-white rounded-xl border border-neutral-200">
            <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between flex-wrap gap-2">
              <h3 className="text-sm font-semibold text-neutral-900 flex items-center gap-2"><Users size={14} style={{ color: BRAND }} /> Material Owners / 3PL Clients</h3>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 border border-neutral-200 rounded-lg px-3 py-1.5 bg-neutral-50">
                  <Search size={12} className="text-neutral-400" />
                  <input className="bg-transparent text-xs focus:outline-none w-28" placeholder="Search owners..." value={search} onChange={e => setSearch(e.target.value)} />
                </div>
              </div>
            </div>
            <p className="px-5 pt-3 text-xs text-neutral-400">Owners are sourced from Master Data. Configure their admin attributes here.</p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-neutral-50 border-b border-neutral-100">
                    {['ID', 'Owner Name', 'Code', 'Type', 'Contact Email', 'Country', 'Status', 'Actions'].map(h => (
                      <th key={h} className="text-left py-2.5 px-3 text-neutral-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-50">
                  {owners.filter(o => o.name.toLowerCase().includes(search.toLowerCase())).map(o => (
                    <tr key={o.id} className={`hover:bg-blue-50/20 cursor-pointer transition-colors ${selected === o.id ? 'bg-blue-50/40' : ''}`}
                      style={selected === o.id ? { borderLeft: `3px solid ${BRAND}` } : {}} onClick={() => setSelected(o.id)}>
                      <td className="py-2.5 px-3 font-medium text-neutral-900">{o.id}</td>
                      <td className="py-2.5 px-3 text-neutral-800">{o.name}</td>
                      <td className="py-2.5 px-3"><code className="bg-neutral-100 px-1.5 py-0.5 rounded text-neutral-700 font-mono">{o.code}</code></td>
                      <td className="py-2.5 px-3"><Badge variant="outline" className="text-xs">{o.type || '—'}</Badge></td>
                      <td className="py-2.5 px-3 text-neutral-600">{o.contact_email || '—'}</td>
                      <td className="py-2.5 px-3 text-neutral-600">{o.country || '—'}</td>
                      <td className="py-2.5 px-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${o.status === 'Active' ? 'bg-emerald-50 text-emerald-700' : 'bg-neutral-100 text-neutral-500'}`}>{o.status}</span></td>
                      <td className="py-2.5 px-3">
                        <div className="flex gap-1.5">
                          <button onClick={e => { e.stopPropagation(); setOwnForm({ contact_email: o.contact_email || '', type: o.type || 'Internal', country: o.country || '', status: o.status }); openEdit(o); }} className="text-neutral-400 hover:text-amber-500 transition-colors"><Pencil size={12} /></button>
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
                  <CardTitle className="text-sm font-semibold">Edit Owner: {editTarget?.name}</CardTitle>
                  <button onClick={closeForm} className="text-neutral-400 hover:text-neutral-700"><X size={14} /></button>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1"><Label className="text-xs">Owner Type</Label>
                    <Select value={ownForm.type} onValueChange={v => setOwnForm(f => ({ ...f, type: v }))}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>{['Internal', '3PL Client', 'Supplier', 'Government'].map(t => <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1"><Label className="text-xs">Contact Email</Label><Input className="h-8 text-xs" type="email" value={ownForm.contact_email} onChange={e => setOwnForm(f => ({ ...f, contact_email: e.target.value }))} /></div>
                  <div className="space-y-1"><Label className="text-xs">Country</Label><Input className="h-8 text-xs" value={ownForm.country} onChange={e => setOwnForm(f => ({ ...f, country: e.target.value }))} /></div>
                  <div className="space-y-1"><Label className="text-xs">Status</Label>
                    <Select value={ownForm.status} onValueChange={v => setOwnForm(f => ({ ...f, status: v }))}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="Active" className="text-xs">Active</SelectItem><SelectItem value="Inactive" className="text-xs">Inactive</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" className="flex-1 bg-neutral-900 hover:bg-neutral-800 text-white gap-1 text-xs" onClick={() => {
                      updateOwner.mutate({ id: editTarget.id, payload: ownForm }, { onSuccess: notify });
                      closeForm();
                    }}><Check size={11} /> Save</Button>
                    <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={closeForm}>Cancel</Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border border-neutral-200 shadow-none p-8 text-center">
                <Users size={28} className="mx-auto mb-2 text-neutral-300" />
                <p className="text-xs text-neutral-400">Select an owner to edit its attributes</p>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* ── CATEGORIES ── */}
      {activeView === 'categories' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-white rounded-xl border border-neutral-200">
            <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between flex-wrap gap-2">
              <h3 className="text-sm font-semibold text-neutral-900 flex items-center gap-2"><Database size={14} style={{ color: BRAND }} /> Product Categories</h3>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 border border-neutral-200 rounded-lg px-3 py-1.5 bg-neutral-50">
                  <Search size={12} className="text-neutral-400" />
                  <input className="bg-transparent text-xs focus:outline-none w-28" placeholder="Search categories..." value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <Button size="sm" className="bg-neutral-900 hover:bg-neutral-800 text-white gap-1.5 text-xs" onClick={() => { setCatForm({ name: '', code: '', parent_id: null, status: 'Active' }); openNew(); }}><Plus size={12} /> Add Category</Button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-neutral-50 border-b border-neutral-100">
                    {['ID', 'Category Name', 'Code', 'Parent', 'SKU Count', 'Status', 'Actions'].map(h => (
                      <th key={h} className="text-left py-2.5 px-3 text-neutral-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-50">
                  {categories.filter(c => c.name.toLowerCase().includes(search.toLowerCase())).map(c => (
                    <tr key={c.id} className={`hover:bg-blue-50/20 cursor-pointer transition-colors ${selected === c.id ? 'bg-blue-50/40' : ''}`}
                      style={selected === c.id ? { borderLeft: `3px solid ${BRAND}` } : {}} onClick={() => setSelected(c.id)}>
                      <td className="py-2.5 px-3 font-medium text-neutral-900">{c.id}</td>
                      <td className="py-2.5 px-3 text-neutral-800">{c.name}</td>
                      <td className="py-2.5 px-3"><code className="bg-neutral-100 px-1.5 py-0.5 rounded text-neutral-700 font-mono">{c.code}</code></td>
                      <td className="py-2.5 px-3 text-neutral-500">{c.parent_code || '—'}</td>
                      <td className="py-2.5 px-3"><span className="px-2 py-0.5 rounded text-xs font-medium" style={{ background: '#009FE315', color: BRAND }}>{c.sku_count}</span></td>
                      <td className="py-2.5 px-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${c.status === 'Active' ? 'bg-emerald-50 text-emerald-700' : 'bg-neutral-100 text-neutral-500'}`}>{c.status}</span></td>
                      <td className="py-2.5 px-3">
                        <div className="flex gap-1.5">
                          <button onClick={e => { e.stopPropagation(); setCatForm({ name: c.name, code: c.code, parent_id: c.parent_id, status: c.status }); openEdit(c); }} className="text-neutral-400 hover:text-amber-500 transition-colors"><Pencil size={12} /></button>
                          <button onClick={e => { e.stopPropagation(); deleteCategory.mutate(c.id); }} className="text-neutral-400 hover:text-red-500 transition-colors"><Trash2 size={12} /></button>
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
                  <CardTitle className="text-sm font-semibold">{editTarget ? 'Edit Category' : 'New Category'}</CardTitle>
                  <button onClick={closeForm} className="text-neutral-400 hover:text-neutral-700"><X size={14} /></button>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1"><Label className="text-xs">Category Name *</Label><Input className="h-8 text-xs" value={catForm.name} onChange={e => setCatForm(f => ({ ...f, name: e.target.value }))} /></div>
                  <div className="space-y-1"><Label className="text-xs">Code *</Label><Input className="h-8 text-xs" placeholder="e.g. FMCG" value={catForm.code} onChange={e => setCatForm(f => ({ ...f, code: e.target.value }))} /></div>
                  <div className="space-y-1"><Label className="text-xs">Parent Category</Label>
                    <Select value={catForm.parent_id ? String(catForm.parent_id) : '—'} onValueChange={v => setCatForm(f => ({ ...f, parent_id: v === '—' ? null : parseInt(v) }))}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="—" className="text-xs">— None (Top Level) —</SelectItem>
                        {categories.filter(c => c.id !== editTarget?.id).map(c => <SelectItem key={c.id} value={String(c.id)} className="text-xs">{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" className="flex-1 bg-neutral-900 hover:bg-neutral-800 text-white gap-1 text-xs" onClick={() => {
                      if (!catForm.name) return;
                      if (editTarget) { updateCategory.mutate({ id: editTarget.id, payload: catForm }, { onSuccess: notify }); }
                      else { createCategory.mutate(catForm, { onSuccess: notify }); }
                      closeForm();
                    }}><Check size={11} /> {editTarget ? 'Save' : 'Create'}</Button>
                    <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={closeForm}>Cancel</Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border border-neutral-200 shadow-none p-8 text-center">
                <Database size={28} className="mx-auto mb-2 text-neutral-300" />
                <p className="text-xs text-neutral-400">Select or create a category</p>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
