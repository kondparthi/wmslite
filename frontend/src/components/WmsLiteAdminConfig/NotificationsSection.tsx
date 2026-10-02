import { useState } from 'react';
import {
  Bell, Plus, Pencil, Trash2, X, Check, Search,
  Mail, MessageSquare, Smartphone, AlertCircle,
  Clock, ChevronUp, ChevronDown, Save, Play, Pause
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  useNotificationRules, useCreateRule, useUpdateRule, useDeleteRule,
  useNotificationChannels, useUpdateChannel, useTestChannel,
  useEscalationRules, useCreateEscalation, useUpdateEscalation, useDeleteEscalation, useFireEscalation,
} from '@/hooks/useNotificationOpsApi';
import {
  useNotificationTemplates, useCreateNotificationTemplate, useUpdateNotificationTemplate, useDeleteNotificationTemplate,
} from '@/hooks/useAdminConfigApi2';

const BRAND = "#009FE3";
type SubView = 'rules' | 'templates' | 'channels' | 'escalation';

const channelStatusStyle: Record<string, string> = {
  'Active': 'bg-emerald-50 text-emerald-700',
  'Inactive': 'bg-amber-50 text-amber-700',
  'Not Configured': 'bg-neutral-100 text-neutral-500',
};

function fmtDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function NotificationsSection() {
  const [activeView, setActiveView] = useState<SubView>('rules');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<any>(null);
  const [saved, setSaved] = useState(false);
  const [editTpl, setEditTpl] = useState<number | null>(null);
  const [showTplForm, setShowTplForm] = useState(false);
  const [editTplTarget, setEditTplTarget] = useState<any>(null);

  const { data: rules = [] } = useNotificationRules();
  const createRule = useCreateRule();
  const updateRule = useUpdateRule();
  const deleteRule = useDeleteRule();

  const { data: templates = [] } = useNotificationTemplates();
  const createTemplate = useCreateNotificationTemplate();
  const updateTemplate = useUpdateNotificationTemplate();
  const deleteTemplate = useDeleteNotificationTemplate();

  const { data: channels = [] } = useNotificationChannels();
  const updateChannel = useUpdateChannel();
  const testChannel = useTestChannel();

  const { data: escalations = [] } = useEscalationRules();
  const updateEscalation = useUpdateEscalation();
  const fireEscalation = useFireEscalation();

  const [ruleForm, setRuleForm] = useState({ name: '', module: 'Inbound', event: '', channelList: [] as string[], recipients: '', frequency: 'Immediate', priority: 'Medium' });
  const [tplForm, setTplForm] = useState({ name: '', module: 'Inbound', channel: 'Email', subject: '', body: '' });

  const notify = () => { setSaved(true); setTimeout(() => setSaved(false), 2000); };
  const closeForm = () => { setShowForm(false); setEditTarget(null); };
  const closeTplForm = () => { setShowTplForm(false); setEditTplTarget(null); };

  const views: { id: SubView; label: string; icon: any }[] = [
    { id: 'rules', label: 'Notification Rules', icon: Bell },
    { id: 'templates', label: 'Message Templates', icon: Mail },
    { id: 'channels', label: 'Channels & Delivery', icon: MessageSquare },
    { id: 'escalation', label: 'Escalation Rules', icon: ChevronUp },
  ];

  const moduleList = ['Inbound', 'Outbound', 'Inventory', '3PL Billing', 'Labor Management', 'Yard Management', 'Cross Docking', 'Returns/RMA', 'Replenishment', 'Admin Config'];
  const frequencies = ['Immediate', 'Every 15 min', 'Every 30 min', 'Every 1h', 'Every 4h', 'Daily Summary', 'Weekly Digest', 'Day of event'];
  const channelOptions = ['email', 'sms', 'inapp'];
  const channelLabels: Record<string, string> = { email: 'Email', sms: 'SMS', inapp: 'In-App' };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-neutral-900">Notifications & Alerts Configuration</h2>
          <p className="text-sm text-neutral-500 mt-0.5">Define notification rules, message templates, delivery channels and escalation workflows</p>
        </div>
        {saved && <div className="flex items-center gap-1.5 text-emerald-600 text-sm"><Check className="w-4 h-4" />Saved</div>}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Active Rules', value: rules.filter(r => r.active).length, color: BRAND },
          { label: 'Templates', value: templates.filter(t => t.status === 'Active').length, color: '#10B981' },
          { label: 'Active Channels', value: channels.filter(c => c.status === 'Active').length, color: '#F59E0B' },
          { label: 'Escalation Rules', value: escalations.filter(e => e.active).length, color: '#8B5CF6' },
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

      {/* ── NOTIFICATION RULES ── */}
      {activeView === 'rules' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-white rounded-xl border border-neutral-200">
            <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between flex-wrap gap-2">
              <h3 className="text-sm font-semibold text-neutral-900 flex items-center gap-2"><Bell size={14} style={{ color: BRAND }} /> Notification Rules</h3>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 border border-neutral-200 rounded-lg px-3 py-1.5 bg-neutral-50">
                  <Search size={12} className="text-neutral-400" />
                  <input className="bg-transparent text-xs focus:outline-none w-28" placeholder="Search rules..." value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <Button size="sm" className="bg-neutral-900 hover:bg-neutral-800 text-white gap-1.5 text-xs" onClick={() => { setRuleForm({ name: '', module: 'Inbound', event: '', channelList: [], recipients: '', frequency: 'Immediate', priority: 'Medium' }); setShowForm(true); setEditTarget(null); }}><Plus size={12} /> Add Rule</Button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-neutral-50 border-b border-neutral-100">
                    {['Rule Name', 'Module', 'Trigger Condition', 'Channels', 'Frequency', 'Status', 'Actions'].map(h => (
                      <th key={h} className="text-left py-2.5 px-3 text-neutral-500 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-50">
                  {rules.filter(r => r.name.toLowerCase().includes(search.toLowerCase())).map(r => (
                    <tr key={r.id} className="hover:bg-blue-50/10 transition-colors">
                      <td className="py-2.5 px-3 font-medium text-neutral-900">{r.name}</td>
                      <td className="py-2.5 px-3"><span className="px-2 py-0.5 rounded text-xs" style={{ background: '#009FE315', color: BRAND }}>{r.module}</span></td>
                      <td className="py-2.5 px-3 text-neutral-600 max-w-xs truncate" title={r.event}>{r.event}</td>
                      <td className="py-2.5 px-3">
                        <div className="flex gap-1 flex-wrap">
                          {r.channels.split(',').filter(Boolean).map(ch => (
                            <span key={ch} className="px-1.5 py-0.5 rounded text-xs bg-neutral-100 text-neutral-600">{channelLabels[ch.trim()] || ch}</span>
                          ))}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-neutral-600">{r.frequency}</td>
                      <td className="py-2.5 px-3">
                        <button onClick={() => updateRule.mutate({ id: r.id, payload: { active: !r.active } })}
                          className={`px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${r.active ? 'bg-emerald-50 text-emerald-700' : 'bg-neutral-100 text-neutral-500'}`}>
                          {r.active ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex gap-1.5">
                          <button onClick={() => {
                            setRuleForm({ name: r.name, module: r.module, event: r.event, channelList: r.channels.split(',').filter(Boolean).map(c => c.trim()), recipients: r.recipients || '', frequency: r.frequency, priority: r.priority });
                            setEditTarget(r); setShowForm(true);
                          }} className="text-neutral-400 hover:text-amber-500 transition-colors"><Pencil size={12} /></button>
                          <button onClick={() => deleteRule.mutate(r.id)} className="text-neutral-400 hover:text-red-500 transition-colors"><Trash2 size={12} /></button>
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
                  <CardTitle className="text-sm font-semibold">{editTarget ? 'Edit Rule' : 'New Rule'}</CardTitle>
                  <button onClick={closeForm} className="text-neutral-400 hover:text-neutral-700"><X size={14} /></button>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1"><Label className="text-xs">Rule Name *</Label><Input className="h-8 text-xs" value={ruleForm.name} onChange={e => setRuleForm(f => ({ ...f, name: e.target.value }))} /></div>
                  <div className="space-y-1"><Label className="text-xs">Module</Label>
                    <Select value={ruleForm.module} onValueChange={v => setRuleForm(f => ({ ...f, module: v }))}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>{moduleList.map(m => <SelectItem key={m} value={m} className="text-xs">{m}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1"><Label className="text-xs">Trigger Condition</Label>
                    <Textarea className="text-xs resize-none" rows={2} placeholder="Describe when this alert fires..." value={ruleForm.event} onChange={e => setRuleForm(f => ({ ...f, event: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Delivery Channels</Label>
                    <div className="flex flex-wrap gap-2">
                      {channelOptions.map(ch => (
                        <div key={ch} className="flex items-center gap-1.5">
                          <Checkbox id={`ch-${ch}`} checked={ruleForm.channelList.includes(ch)}
                            onCheckedChange={checked => setRuleForm(f => ({ ...f, channelList: checked ? [...f.channelList, ch] : f.channelList.filter(c => c !== ch) }))} />
                          <label htmlFor={`ch-${ch}`} className="text-xs text-neutral-700 cursor-pointer">{channelLabels[ch]}</label>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1"><Label className="text-xs">Recipients (Roles)</Label><Input className="h-8 text-xs" placeholder="e.g. Warehouse Manager" value={ruleForm.recipients} onChange={e => setRuleForm(f => ({ ...f, recipients: e.target.value }))} /></div>
                  <div className="space-y-1"><Label className="text-xs">Frequency</Label>
                    <Select value={ruleForm.frequency} onValueChange={v => setRuleForm(f => ({ ...f, frequency: v }))}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>{frequencies.map(f => <SelectItem key={f} value={f} className="text-xs">{f}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" className="flex-1 bg-neutral-900 hover:bg-neutral-800 text-white gap-1 text-xs" onClick={() => {
                      if (!ruleForm.name) return;
                      const payload = { name: ruleForm.name, module: ruleForm.module, event: ruleForm.event, channels: ruleForm.channelList.join(','), recipients: ruleForm.recipients, frequency: ruleForm.frequency, priority: ruleForm.priority };
                      if (editTarget) { updateRule.mutate({ id: editTarget.id, payload }, { onSuccess: notify }); }
                      else { createRule.mutate(payload, { onSuccess: notify }); }
                      closeForm();
                    }}><Check size={11} /> {editTarget ? 'Save' : 'Create'}</Button>
                    <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={closeForm}>Cancel</Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border border-neutral-200 shadow-none p-8 text-center">
                <Bell size={28} className="mx-auto mb-2 text-neutral-300" />
                <p className="text-xs text-neutral-400">Click Add Rule to create a notification trigger</p>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* ── TEMPLATES ── */}
      {activeView === 'templates' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-xs text-neutral-500">Customise message templates. Use <code className="font-mono bg-neutral-100 px-1 rounded">{'{{variable}}'}</code> placeholders for dynamic values.</p>
            <Button size="sm" className="bg-neutral-900 hover:bg-neutral-800 text-white gap-1.5 text-xs" onClick={() => { setTplForm({ name: '', module: 'Inbound', channel: 'Email', subject: '', body: '' }); setEditTplTarget(null); setShowTplForm(true); }}><Plus size={12} /> Add Template</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {templates.map(tpl => (
              <Card key={tpl.id} className={`border shadow-none ${editTpl === tpl.id ? 'border-[#009FE3]' : 'border-neutral-200'}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-sm font-semibold text-neutral-900">{tpl.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="px-2 py-0.5 rounded text-xs" style={{ background: '#009FE315', color: BRAND }}>{tpl.module || '—'}</span>
                        <span className="px-2 py-0.5 rounded text-xs bg-neutral-100 text-neutral-600">{tpl.channel}</span>
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${tpl.status === 'Active' ? 'bg-emerald-50 text-emerald-700' : 'bg-neutral-100 text-neutral-500'}`}>{tpl.status}</span>
                  </div>
                  {tpl.subject && (
                    <div className="mb-2">
                      <p className="text-xs text-neutral-400 mb-0.5">Subject</p>
                      <p className="text-xs font-medium text-neutral-800">{tpl.subject}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-neutral-400 mb-0.5">Body</p>
                    <pre className="text-xs text-neutral-700 bg-neutral-50 rounded-lg p-2 whitespace-pre-wrap font-sans leading-relaxed max-h-24 overflow-y-auto">{tpl.body}</pre>
                  </div>
                  <div className="flex gap-2 mt-3 pt-3 border-t border-neutral-100">
                    <Button size="sm" variant="outline" className="flex-1 text-xs h-7 gap-1" onClick={() => {
                      setTplForm({ name: tpl.name, module: tpl.module || 'Inbound', channel: tpl.channel, subject: tpl.subject || '', body: tpl.body });
                      setEditTplTarget(tpl); setShowTplForm(true);
                    }}><Pencil size={10} /> Edit</Button>
                    <Button size="sm" variant="outline" className="flex-1 text-xs h-7 gap-1" onClick={() => updateTemplate.mutate({ id: tpl.id, payload: { status: tpl.status === 'Active' ? 'Inactive' : 'Active' } })}>
                      {tpl.status === 'Active' ? <><Pause size={10} /> Disable</> : <><Play size={10} /> Enable</>}
                    </Button>
                    <Button size="sm" variant="outline" className="text-xs h-7 text-red-600 border-red-200 hover:bg-red-50" onClick={() => deleteTemplate.mutate(tpl.id)}><Trash2 size={10} /></Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {showTplForm && (
              <Card className="border border-neutral-300 shadow-none">
                <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-sm font-semibold">{editTplTarget ? 'Edit Template' : 'New Template'}</CardTitle>
                  <button onClick={closeTplForm} className="text-neutral-400 hover:text-neutral-700"><X size={14} /></button>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1"><Label className="text-xs">Template Name *</Label><Input className="h-8 text-xs" value={tplForm.name} onChange={e => setTplForm(f => ({ ...f, name: e.target.value }))} /></div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1"><Label className="text-xs">Module</Label>
                      <Select value={tplForm.module} onValueChange={v => setTplForm(f => ({ ...f, module: v }))}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>{moduleList.map(m => <SelectItem key={m} value={m} className="text-xs">{m}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1"><Label className="text-xs">Channel</Label>
                      <Select value={tplForm.channel} onValueChange={v => setTplForm(f => ({ ...f, channel: v }))}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>{['Email', 'SMS', 'In-App'].map(c => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-1"><Label className="text-xs">Subject (optional)</Label><Input className="h-8 text-xs" value={tplForm.subject} onChange={e => setTplForm(f => ({ ...f, subject: e.target.value }))} /></div>
                  <div className="space-y-1"><Label className="text-xs">Body *</Label><Textarea className="text-xs resize-none" rows={4} value={tplForm.body} onChange={e => setTplForm(f => ({ ...f, body: e.target.value }))} /></div>
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" className="flex-1 bg-neutral-900 hover:bg-neutral-800 text-white gap-1 text-xs" onClick={() => {
                      if (!tplForm.name || !tplForm.body) return;
                      if (editTplTarget) { updateTemplate.mutate({ id: editTplTarget.id, payload: tplForm }, { onSuccess: notify }); }
                      else { createTemplate.mutate(tplForm, { onSuccess: notify }); }
                      closeTplForm();
                    }}><Check size={11} /> {editTplTarget ? 'Save' : 'Create'}</Button>
                    <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={closeTplForm}>Cancel</Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* ── CHANNELS ── */}
      {activeView === 'channels' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {channels.map(ch => (
              <Card key={ch.id} className="border border-neutral-200 shadow-none">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {ch.type === 'email' && <Mail size={16} style={{ color: BRAND }} />}
                      {ch.type === 'sms' && <Smartphone size={16} style={{ color: BRAND }} />}
                      {ch.type === 'inapp' && <MessageSquare size={16} style={{ color: BRAND }} />}
                      <p className="text-sm font-semibold text-neutral-900">{channelLabels[ch.type] || ch.type}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${channelStatusStyle[ch.status] || 'bg-neutral-100 text-neutral-600'}`}>{ch.status}</span>
                  </div>
                  <div className="space-y-1.5 text-xs mb-3">
                    {[['Provider', ch.provider || '—'], ['From / Channel', ch.from_address || '—'], ['Last Tested', fmtDate(ch.last_test_at)]].map(([k, v]) => (
                      <div key={k as string}>
                        <span className="text-neutral-400">{k}: </span>
                        <span className="text-neutral-700">{v}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2 pt-3 border-t border-neutral-100">
                    <Button size="sm" variant="outline" className="flex-1 text-xs h-7 gap-1" onClick={() => testChannel.mutate(ch.id, { onSuccess: notify })}><Play size={10} /> Test</Button>
                    <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => updateChannel.mutate({ id: ch.id, payload: { status: ch.status === 'Active' ? 'Inactive' : 'Active' } })}>
                      {ch.status === 'Active' ? <Pause size={10} /> : <Play size={10} />}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ── ESCALATION ── */}
      {activeView === 'escalation' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-xs text-neutral-500">Define escalation chains when alerts are not actioned within a defined interval.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {escalations.map(esc => (
              <Card key={esc.id} className="border border-neutral-200 shadow-none">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-sm font-semibold text-neutral-900">{esc.name}</p>
                      <p className="text-xs text-neutral-400">{esc.esc_code} · for rule: {esc.rule_name}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${esc.active ? 'bg-emerald-50 text-emerald-700' : 'bg-neutral-100 text-neutral-500'}`}>{esc.active ? 'Active' : 'Inactive'}</span>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Escalate To</span>
                      <span className="font-medium text-neutral-800">{esc.escalate_to}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Channel</span>
                      <span className="font-medium text-neutral-800">{esc.channel}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Delay</span>
                      <span className="font-medium text-neutral-800">{esc.delay_minutes} min</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Last Escalated</span>
                      <span className="font-medium text-neutral-800">{fmtDate(esc.last_escalated_at)}</span>
                    </div>
                    {esc.is_due && (
                      <div className="p-2 bg-amber-50 border border-amber-200 rounded text-amber-700">Due for escalation now</div>
                    )}
                  </div>
                  <div className="flex gap-2 mt-3 pt-3 border-t border-neutral-100">
                    <Button size="sm" variant="outline" className="flex-1 text-xs h-7 gap-1" onClick={() => fireEscalation.mutate(esc.id, { onSuccess: notify })}><ChevronUp size={10} /> Escalate Now</Button>
                    <Button size="sm" variant="outline" className="flex-1 text-xs h-7" onClick={() => updateEscalation.mutate({ id: esc.id, payload: { active: !esc.active } })}>
                      {esc.active ? 'Disable' : 'Enable'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
