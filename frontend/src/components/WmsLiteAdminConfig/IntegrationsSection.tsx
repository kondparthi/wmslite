import { useState } from 'react';
import {
  Link, Plus, Pencil, Trash2, X, Check, Search, Eye,
  RefreshCw, CheckCircle, AlertCircle, XCircle, Clock,
  ChevronLeft, ChevronRight, Zap, Settings, Play, Pause,
  FileDown, Activity
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  useIntegrationConnectors, useCreateConnector, useUpdateConnector, useDeleteConnector, useSyncConnector,
  useSyncLogs,
  useWebhooks, useCreateWebhook, useUpdateWebhook, useDeleteWebhook, useTestWebhook,
  useApiKeys, useCreateApiKey, useRotateApiKey, useRevokeApiKey, useDeleteApiKey,
  type IntegrationConnector,
} from '@/hooks/useAdminConfigApi2';
import { useShippingCarriers } from '@/hooks/useShippingOpsApi';

const BRAND = "#009FE3";
type SubView = 'connectors' | 'synclog' | 'webhooks' | 'apikeys';

const connStatusStyle: Record<string, string> = {
  'Connected': 'bg-emerald-50 text-emerald-700',
  'Warning': 'bg-amber-50 text-amber-700',
  'Disconnected': 'bg-red-50 text-red-700',
};

const syncStatusStyle: Record<string, string> = {
  'Success': 'bg-emerald-50 text-emerald-700',
  'Partial': 'bg-amber-50 text-amber-700',
  'Failed': 'bg-red-50 text-red-700',
};

function fmtDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function IntegrationsSection() {
  const [activeView, setActiveView] = useState<SubView>('connectors');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<IntegrationConnector | any>(null);
  const [saved, setSaved] = useState(false);
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);

  const { data: connectors = [] } = useIntegrationConnectors();
  const createConnector = useCreateConnector();
  const updateConnector = useUpdateConnector();
  const deleteConnector = useDeleteConnector();
  const syncConnector = useSyncConnector();

  const { data: syncLogData = [] } = useSyncLogs();

  const { data: webhooks = [] } = useWebhooks();
  const createWebhook = useCreateWebhook();
  const updateWebhook = useUpdateWebhook();
  const testWebhook = useTestWebhook();

  const { data: apiKeys = [] } = useApiKeys();
  const createApiKey = useCreateApiKey();
  const rotateApiKey = useRotateApiKey();
  const revokeApiKey = useRevokeApiKey();
  const deleteApiKey = useDeleteApiKey();

  const { data: carriers = [] } = useShippingCarriers();

  const [connForm, setConnForm] = useState({ name: '', type: 'ERP', protocol: 'REST API', direction: 'Bidirectional', syncFreq: 'Real-time', env: 'Production', carrierId: null as number | null });
  const [webhookForm, setWebhookForm] = useState({ name: '', url: '', event: '', source: 'WMS' });
  const [keyForm, setKeyForm] = useState({ name: '', scope: 'Read Only', expiry: '' });

  const notify = () => { setSaved(true); setTimeout(() => setSaved(false), 2000); };
  const closeForm = () => { setShowForm(false); setEditTarget(null); };

  const views: { id: SubView; label: string; icon: any }[] = [
    { id: 'connectors', label: 'Connectors', icon: Link },
    { id: 'synclog', label: 'Sync Log', icon: Activity },
    { id: 'webhooks', label: 'Webhooks', icon: Zap },
    { id: 'apikeys', label: 'API Keys', icon: Settings },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-neutral-900">Integrations & Connectivity</h2>
          <p className="text-sm text-neutral-500 mt-0.5">Manage ERP, TMS, Carrier and eCommerce connectors, webhooks and API keys</p>
        </div>
        {saved && <div className="flex items-center gap-1.5 text-emerald-600 text-sm"><CheckCircle className="w-4 h-4" />Saved</div>}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Active Connectors', value: connectors.filter(c => c.status === 'Connected').length, color: BRAND },
          { label: 'Warnings', value: connectors.filter(c => c.status === 'Warning').length, color: '#F59E0B' },
          { label: 'Sync Errors (24h)', value: syncLogData.filter(s => s.status === 'Failed' || s.status === 'Partial').length, color: '#EF4444' },
          { label: 'Active Webhooks', value: webhooks.filter(w => w.status === 'Active').length, color: '#8B5CF6' },
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
            <button key={v.id} onClick={() => { setActiveView(v.id); setShowForm(false); setSearch(''); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${activeView === v.id ? 'bg-neutral-900 text-white border-neutral-900' : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-400'}`}>
              <Icon size={13} />{v.label}
            </button>
          );
        })}
      </div>

      {/* ── CONNECTORS ── */}
      {activeView === 'connectors' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-1.5 border border-neutral-200 rounded-lg px-3 py-1.5 bg-white">
                <Search size={12} className="text-neutral-400" />
                <input className="bg-transparent text-xs focus:outline-none w-32" placeholder="Search integrations..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <Button size="sm" className="bg-neutral-900 hover:bg-neutral-800 text-white gap-1.5 text-xs" onClick={() => {
                setConnForm({ name: '', type: 'ERP', protocol: 'REST API', direction: 'Bidirectional', syncFreq: 'Real-time', env: 'Production', carrierId: null });
                setShowForm(true); setEditTarget(null);
              }}><Plus size={12} /> Add Connector</Button>
            </div>
            {connectors.filter(c => c.name.toLowerCase().includes(search.toLowerCase())).map(c => (
              <Card key={c.id} className={`border shadow-none cursor-pointer transition-all ${selected === c.id ? 'border-[#009FE3] bg-blue-50/10' : 'border-neutral-200'}`}
                onClick={() => setSelected(c.id)}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#009FE318' }}>
                        <Link size={15} style={{ color: BRAND }} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-neutral-900">{c.name}</p>
                          <Badge variant="outline" className="text-xs">{c.type}</Badge>
                          {c.env === 'Staging' && <Badge className="text-xs bg-purple-100 text-purple-700 border-purple-200">Staging</Badge>}
                        </div>
                        <p className="text-xs text-neutral-400">{c.code} · {c.protocol} · {c.direction}</p>
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${connStatusStyle[c.status] || 'bg-neutral-100 text-neutral-600'}`}>{c.status}</span>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-3 text-xs">
                    {[['Last Sync', fmtDate(c.last_sync_at)], ['Records', c.records.toLocaleString()], ['Errors (24h)', c.errors]].map(([k, v]) => (
                      <div key={k as string}>
                        <p className="text-neutral-400">{k}</p>
                        <p className={`font-medium ${k === 'Errors (24h)' && Number(v) > 0 ? 'text-red-600' : 'text-neutral-800'}`}>{v}</p>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2 mt-3 pt-3 border-t border-neutral-100">
                    <Button size="sm" variant="outline" className="flex-1 text-xs h-7 gap-1" onClick={e => { e.stopPropagation(); syncConnector.mutate(c.id, { onSuccess: notify }); }}><RefreshCw size={10} /> Sync Now</Button>
                    <Button size="sm" variant="outline" className="flex-1 text-xs h-7 gap-1" onClick={e => {
                      e.stopPropagation();
                      setConnForm({ name: c.name, type: c.type, protocol: c.protocol, direction: c.direction, syncFreq: c.sync_freq, env: c.env, carrierId: c.carrier_id });
                      setEditTarget(c); setShowForm(true);
                    }}><Pencil size={10} /> Configure</Button>
                    <Button size="sm" variant="outline" className="text-xs h-7 text-red-600 border-red-200 hover:bg-red-50" onClick={e => { e.stopPropagation(); deleteConnector.mutate(c.id); if (selected === c.id) setSelected(null); }}><Trash2 size={10} /></Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <div>
            {showForm ? (
              <Card className="border border-neutral-200 shadow-none sticky top-4">
                <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-sm font-semibold">{editTarget ? 'Edit Connector' : 'New Connector'}</CardTitle>
                  <button onClick={closeForm} className="text-neutral-400 hover:text-neutral-700"><X size={14} /></button>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1"><Label className="text-xs">Integration Name *</Label><Input className="h-8 text-xs" value={connForm.name} onChange={e => setConnForm(f => ({ ...f, name: e.target.value }))} /></div>
                  <div className="space-y-1"><Label className="text-xs">Type</Label>
                    <Select value={connForm.type} onValueChange={v => setConnForm(f => ({ ...f, type: v }))}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>{['ERP', 'TMS', 'Carrier', 'eCommerce', 'Finance', 'Analytics', 'Custom'].map(t => <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  {connForm.type === 'Carrier' && (
                    <div className="space-y-1"><Label className="text-xs">Linked Carrier</Label>
                      <Select value={connForm.carrierId ? String(connForm.carrierId) : ''} onValueChange={v => setConnForm(f => ({ ...f, carrierId: v ? parseInt(v) : null }))}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select carrier" /></SelectTrigger>
                        <SelectContent>{carriers.map((c: any) => <SelectItem key={c.id} value={String(c.id)} className="text-xs">{c.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="space-y-1"><Label className="text-xs">Protocol</Label>
                    <Select value={connForm.protocol} onValueChange={v => setConnForm(f => ({ ...f, protocol: v }))}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>{['REST API', 'SOAP', 'Webhook', 'SFTP', 'OData', 'GraphQL', 'EDI'].map(p => <SelectItem key={p} value={p} className="text-xs">{p}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1"><Label className="text-xs">Data Direction</Label>
                    <Select value={connForm.direction} onValueChange={v => setConnForm(f => ({ ...f, direction: v }))}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>{['Inbound', 'Outbound', 'Bidirectional'].map(d => <SelectItem key={d} value={d} className="text-xs">{d}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1"><Label className="text-xs">Sync Frequency</Label>
                    <Select value={connForm.syncFreq} onValueChange={v => setConnForm(f => ({ ...f, syncFreq: v }))}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>{['Real-time', 'Every 5 min', 'Every 15 min', 'Hourly', 'Daily', 'On-demand'].map(s => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1"><Label className="text-xs">Environment</Label>
                    <Select value={connForm.env} onValueChange={v => setConnForm(f => ({ ...f, env: v }))}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>{['Production', 'Staging', 'Development'].map(e => <SelectItem key={e} value={e} className="text-xs">{e}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" className="flex-1 bg-neutral-900 hover:bg-neutral-800 text-white gap-1 text-xs" onClick={() => {
                      if (!connForm.name) return;
                      const payload = {
                        name: connForm.name, type: connForm.type, protocol: connForm.protocol, direction: connForm.direction,
                        sync_freq: connForm.syncFreq, env: connForm.env, carrier_id: connForm.type === 'Carrier' ? connForm.carrierId : null,
                      };
                      if (editTarget) { updateConnector.mutate({ id: editTarget.id, payload }, { onSuccess: notify }); }
                      else { createConnector.mutate(payload, { onSuccess: notify }); }
                      closeForm();
                    }}><Check size={11} /> {editTarget ? 'Save' : 'Create'}</Button>
                    <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={closeForm}>Cancel</Button>
                  </div>
                </CardContent>
              </Card>
            ) : selected ? (
              (() => {
                const c = connectors.find(x => x.id === selected);
                return c ? (
                  <Card className="border border-neutral-200 shadow-none">
                    <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">{c.name}</CardTitle><CardDescription className="text-xs">{c.code}</CardDescription></CardHeader>
                    <CardContent className="space-y-2.5">
                      {[['Type', c.type], ['Protocol', c.protocol], ['Direction', c.direction], ['Sync Frequency', c.sync_freq], ['Environment', c.env], ['Last Sync', fmtDate(c.last_sync_at)], ['Records Synced', c.records], ['Errors', c.errors]].map(([k, v]) => (
                        <div key={k as string} className="flex justify-between text-xs">
                          <span className="text-neutral-500">{k as string}</span>
                          <span className={`font-medium ${k === 'Errors' && Number(v) > 0 ? 'text-red-600' : 'text-neutral-900'}`}>{v as any}</span>
                        </div>
                      ))}
                      <div className="flex gap-2 pt-2">
                        <Button size="sm" className="flex-1 bg-neutral-900 hover:bg-neutral-800 text-white text-xs gap-1" onClick={() => syncConnector.mutate(c.id, { onSuccess: notify })}><RefreshCw size={10} /> Sync</Button>
                        <Button size="sm" variant="outline" className="flex-1 text-xs gap-1" onClick={() => {
                          setConnForm({ name: c.name, type: c.type, protocol: c.protocol, direction: c.direction, syncFreq: c.sync_freq, env: c.env, carrierId: c.carrier_id });
                          setEditTarget(c); setShowForm(true);
                        }}><Pencil size={10} /> Edit</Button>
                      </div>
                    </CardContent>
                  </Card>
                ) : null;
              })()
            ) : (
              <Card className="border border-neutral-200 shadow-none p-8 text-center">
                <Link size={28} className="mx-auto mb-2 text-neutral-300" />
                <p className="text-xs text-neutral-400">Select an integration to view details</p>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* ── SYNC LOG ── */}
      {activeView === 'synclog' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-1.5 border border-neutral-200 rounded-lg px-3 py-1.5 bg-white">
              <Search size={12} className="text-neutral-400" />
              <input className="bg-transparent text-xs focus:outline-none w-36" placeholder="Search integration..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8"><FileDown size={12} /> Export Log</Button>
          </div>
          <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-100">
                  {['Log ID', 'Integration', 'Direction', 'Type', 'Records', 'Status', 'Started', 'Duration', 'Error Note'].map(h => (
                    <th key={h} className="text-left py-2.5 px-3 text-neutral-500 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50">
                {syncLogData.filter(l => l.connector_name.toLowerCase().includes(search.toLowerCase())).map(l => (
                  <tr key={l.id} className="hover:bg-blue-50/10 transition-colors">
                    <td className="py-2.5 px-3 font-medium text-neutral-900">{l.log_code}</td>
                    <td className="py-2.5 px-3 text-neutral-800">{l.connector_name}</td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded text-xs" style={{ background: '#009FE315', color: BRAND }}>{l.direction}</span>
                    </td>
                    <td className="py-2.5 px-3 text-neutral-600">{l.type}</td>
                    <td className="py-2.5 px-3 font-medium text-neutral-800">{l.records}</td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${syncStatusStyle[l.status] || 'bg-neutral-100 text-neutral-600'}`}>{l.status}</span>
                    </td>
                    <td className="py-2.5 px-3 text-neutral-500">{fmtDate(l.started_at)}</td>
                    <td className="py-2.5 px-3 font-mono text-neutral-600">{l.duration_seconds.toFixed(1)}s</td>
                    <td className="py-2.5 px-3 text-neutral-500 max-w-xs truncate" title={l.error || '—'}>{l.error || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-5 py-3 border-t border-neutral-100 flex items-center justify-between">
              <span className="text-xs text-neutral-400">Showing last {syncLogData.length} sync events</span>
              <div className="flex items-center gap-1">
                <button className="w-7 h-7 flex items-center justify-center rounded border border-neutral-200 text-neutral-500 hover:bg-neutral-50"><ChevronLeft size={12} /></button>
                <button className="w-7 h-7 flex items-center justify-center rounded text-white text-xs" style={{ background: BRAND }}>1</button>
                <button className="w-7 h-7 flex items-center justify-center rounded border border-neutral-200 text-neutral-500 hover:bg-neutral-50"><ChevronRight size={12} /></button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── WEBHOOKS ── */}
      {activeView === 'webhooks' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-xs text-neutral-500">Configure event-driven webhooks for real-time push notifications to external systems.</p>
            <Button size="sm" className="bg-neutral-900 hover:bg-neutral-800 text-white gap-1.5 text-xs" onClick={() => { setWebhookForm({ name: '', url: '', event: '', source: 'WMS' }); setShowForm(true); setEditTarget(null); }}><Plus size={12} /> Add Webhook</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {webhooks.map(wh => (
              <Card key={wh.id} className="border border-neutral-200 shadow-none">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Zap size={14} style={{ color: BRAND }} />
                      <p className="text-sm font-semibold text-neutral-900">{wh.name}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${wh.status === 'Active' ? 'bg-emerald-50 text-emerald-700' : 'bg-neutral-100 text-neutral-500'}`}>{wh.status}</span>
                  </div>
                  <div className="space-y-1.5 text-xs mb-3">
                    <div><span className="text-neutral-400">Event: </span><code className="font-mono bg-neutral-100 px-1.5 rounded text-neutral-700">{wh.event}</code></div>
                    <div><span className="text-neutral-400">Source: </span><span className="text-neutral-700">{wh.source}</span></div>
                    <div><span className="text-neutral-400">Endpoint: </span><span className="text-neutral-600 break-all">{wh.url}</span></div>
                    <div className="flex justify-between">
                      <span className="text-neutral-400">Last Triggered: </span>
                      <span className="text-neutral-700">{fmtDate(wh.last_triggered_at)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-400">Total Deliveries: </span>
                      <span className="text-neutral-700 font-medium">{wh.deliveries}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-3 border-t border-neutral-100">
                    <Button size="sm" variant="outline" className="flex-1 text-xs h-7 gap-1" onClick={() => testWebhook.mutate(wh.id, { onSuccess: notify })}><Play size={10} /> Test</Button>
                    <Button size="sm" variant="outline" className="flex-1 text-xs h-7 gap-1" onClick={() => {
                      setWebhookForm({ name: wh.name, url: wh.url, event: wh.event, source: wh.source });
                      setEditTarget(wh); setShowForm(true);
                    }}><Pencil size={10} /> Edit</Button>
                    <Button size="sm" variant="outline" className="text-xs h-7 gap-1" onClick={() => updateWebhook.mutate({ id: wh.id, payload: { status: wh.status === 'Active' ? 'Inactive' : 'Active' } })}>
                      {wh.status === 'Active' ? <Pause size={10} /> : <Play size={10} />}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {showForm && (
              <Card className="border border-neutral-300 shadow-none">
                <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-sm font-semibold">{editTarget ? 'Edit Webhook' : 'New Webhook'}</CardTitle>
                  <button onClick={closeForm} className="text-neutral-400 hover:text-neutral-700"><X size={14} /></button>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1"><Label className="text-xs">Name *</Label><Input className="h-8 text-xs" value={webhookForm.name} onChange={e => setWebhookForm(f => ({ ...f, name: e.target.value }))} /></div>
                  <div className="space-y-1"><Label className="text-xs">Endpoint URL *</Label><Input className="h-8 text-xs" placeholder="https://..." value={webhookForm.url} onChange={e => setWebhookForm(f => ({ ...f, url: e.target.value }))} /></div>
                  <div className="space-y-1"><Label className="text-xs">Event Name</Label><Input className="h-8 text-xs font-mono" placeholder="e.g. order.created" value={webhookForm.event} onChange={e => setWebhookForm(f => ({ ...f, event: e.target.value }))} /></div>
                  <div className="space-y-1"><Label className="text-xs">Source</Label>
                    <Select value={webhookForm.source} onValueChange={v => setWebhookForm(f => ({ ...f, source: v }))}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>{['WMS', 'SAP ERP', 'Shopify', 'Custom'].map(s => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" className="flex-1 bg-neutral-900 hover:bg-neutral-800 text-white gap-1 text-xs" onClick={() => {
                      if (!webhookForm.name || !webhookForm.url) return;
                      if (editTarget) { updateWebhook.mutate({ id: editTarget.id, payload: webhookForm }, { onSuccess: notify }); }
                      else { createWebhook.mutate(webhookForm, { onSuccess: notify }); }
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

      {/* ── API KEYS ── */}
      {activeView === 'apikeys' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-xs text-neutral-500">Manage API keys for external system authentication. Keys are shown once upon creation.</p>
            <Button size="sm" className="bg-neutral-900 hover:bg-neutral-800 text-white gap-1.5 text-xs" onClick={() => { setGeneratedKey(null); setKeyForm({ name: '', scope: 'Read Only', expiry: '' }); setShowForm(true); setEditTarget(null); }}><Plus size={12} /> Generate Key</Button>
          </div>
          {apiKeys.some(k => k.status === 'Expired') && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle size={14} className="text-amber-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-amber-700"><strong>{apiKeys.filter(k => k.status === 'Expired').length} API key(s) expired.</strong> Rotate or revoke expired keys to maintain security compliance.</p>
            </div>
          )}
          <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-100">
                  {['Key', 'Name', 'Scope', 'Created By', 'Created', 'Expiry', 'Last Used', 'Status', 'Actions'].map(h => (
                    <th key={h} className="text-left py-2.5 px-3 text-neutral-500 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50">
                {apiKeys.map(k => (
                  <tr key={k.id} className="hover:bg-blue-50/10 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-medium text-neutral-900">{k.key_preview}</td>
                    <td className="py-2.5 px-3 text-neutral-800">{k.name}</td>
                    <td className="py-2.5 px-3"><span className="px-2 py-0.5 rounded text-xs" style={{ background: '#009FE315', color: BRAND }}>{k.scope}</span></td>
                    <td className="py-2.5 px-3 text-neutral-600">{k.created_by || '—'}</td>
                    <td className="py-2.5 px-3 text-neutral-500">{fmtDate(k.created_at)}</td>
                    <td className="py-2.5 px-3 text-neutral-500">{fmtDate(k.expiry_at)}</td>
                    <td className="py-2.5 px-3 text-neutral-500">{fmtDate(k.last_used_at)}</td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${k.status === 'Active' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>{k.status}</span>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex gap-1.5">
                        <button className="text-neutral-400 hover:text-amber-500 transition-colors" title="Rotate" onClick={() => rotateApiKey.mutate(k.id, { onSuccess: (res: any) => { setGeneratedKey(res.full_key); setShowForm(true); setEditTarget(null); notify(); } })}><RefreshCw size={12} /></button>
                        <button className="text-neutral-400 hover:text-red-500 transition-colors" title="Revoke" onClick={() => revokeApiKey.mutate(k.id, { onSuccess: notify })}><XCircle size={12} /></button>
                        <button className="text-neutral-400 hover:text-red-500 transition-colors" title="Delete" onClick={() => deleteApiKey.mutate(k.id)}><Trash2 size={12} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {showForm && (
            <Card className="border border-neutral-300 shadow-none max-w-md">
              <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-semibold">{generatedKey ? 'API Key Generated' : 'Generate New API Key'}</CardTitle>
                <button onClick={() => { setShowForm(false); setGeneratedKey(null); }} className="text-neutral-400 hover:text-neutral-700"><X size={14} /></button>
              </CardHeader>
              <CardContent className="space-y-3">
                {generatedKey ? (
                  <>
                    <p className="text-xs text-neutral-500">Copy this key now — it will not be shown again.</p>
                    <code className="block text-xs bg-neutral-100 border border-neutral-200 rounded p-2 break-all font-mono text-neutral-800">{generatedKey}</code>
                    <Button size="sm" className="w-full bg-neutral-900 hover:bg-neutral-800 text-white text-xs" onClick={() => { setShowForm(false); setGeneratedKey(null); }}>Done</Button>
                  </>
                ) : (
                  <>
                    <div className="space-y-1"><Label className="text-xs">Key Name *</Label><Input className="h-8 text-xs" placeholder="e.g. Shopify Integration Key" value={keyForm.name} onChange={e => setKeyForm(f => ({ ...f, name: e.target.value }))} /></div>
                    <div className="space-y-1"><Label className="text-xs">Scope</Label>
                      <Select value={keyForm.scope} onValueChange={v => setKeyForm(f => ({ ...f, scope: v }))}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>{['Read Only', 'Write Only', 'Read + Write'].map(s => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1"><Label className="text-xs">Expiry Date</Label><Input className="h-8 text-xs" type="date" value={keyForm.expiry} onChange={e => setKeyForm(f => ({ ...f, expiry: e.target.value }))} /></div>
                    <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg">
                      <p className="text-xs text-amber-700">The API key will only be displayed once. Copy and store it securely.</p>
                    </div>
                    <div className="flex gap-2 pt-1">
                      <Button size="sm" className="flex-1 bg-neutral-900 hover:bg-neutral-800 text-white gap-1 text-xs" onClick={() => {
                        if (!keyForm.name) return;
                        createApiKey.mutate({ name: keyForm.name, scope: keyForm.scope, expiry_at: keyForm.expiry || null }, {
                          onSuccess: (res: any) => { setGeneratedKey(res.full_key); notify(); },
                        });
                      }}><Check size={11} /> Generate Key</Button>
                      <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={closeForm}>Cancel</Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
