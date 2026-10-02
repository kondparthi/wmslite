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
import { Switch } from '@/components/ui/switch';
import {
  Plus, Search, Pencil, Trash2, X, Save, CheckCircle, Mail,
  Smartphone, Monitor, AlertTriangle, Clock, Settings, TestTube,
  BarChart3, Zap, Eye, MoreHorizontal, ArrowRight, RefreshCw, Loader2, Send,
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import {
  useNotificationRules, useCreateRule, useUpdateRule, useDeleteRule, useCheckRules, useSendTestForRule,
  useNotificationChannels, useUpdateChannel, useTestChannel,
  useEscalationRules, useCreateEscalation, useUpdateEscalation, useDeleteEscalation, useFireEscalation,
  useDigestSettings, useUpdateDigest, useSendDigestNow,
  useNotificationLog, useNotificationReportSummary,
  type NotificationRule, type EscalationRule, type NotificationChannel,
} from '@/hooks/useNotificationOpsApi';

const TABS = [
  { id: 'rules', label: 'Notification Rules', icon: Zap },
  { id: 'channels', label: 'Channels & Templates', icon: Mail },
  { id: 'escalation', label: 'Escalation Rules', icon: ArrowRight },
  { id: 'digest', label: 'Digest & Frequency', icon: Clock },
  { id: 'log', label: 'Notification Log', icon: Eye },
  { id: 'reports', label: 'Analytics', icon: BarChart3 },
];

type Channel = 'email' | 'sms' | 'inapp' | 'webhook';

const priorityColor: Record<string, string> = {
  Critical: 'bg-red-100 text-red-700 border-red-200',
  High: 'bg-orange-100 text-orange-700 border-orange-200',
  Medium: 'bg-amber-100 text-amber-700 border-amber-200',
  Low: 'bg-neutral-100 text-neutral-600 border-neutral-200',
};

const channelIcon = (ch: string) => {
  if (ch === 'email') return <Mail className="w-3 h-3" />;
  if (ch === 'sms') return <Smartphone className="w-3 h-3" />;
  if (ch === 'webhook') return <Settings className="w-3 h-3" />;
  return <Monitor className="w-3 h-3" />;
};
const channelBadgeClass = (ch: string) => ch === 'email' ? 'bg-blue-100 text-blue-700' : ch === 'sms' ? 'bg-purple-100 text-purple-700' : ch === 'webhook' ? 'bg-neutral-200 text-neutral-700' : 'bg-neutral-100 text-neutral-600';

const emptyRuleForm = { name: '', event: '', module: 'Inventory', condition_type: 'manual', threshold: '', channels: [] as Channel[], recipients: '', frequency: 'Immediate', priority: 'Medium' };
const emptyEscForm = { name: '', rule_id: '', escalate_to: '', channel: [] as Channel[], delay_minutes: '60' };

const MODULES = ['Inventory', 'Inbound', 'Outbound', 'Replenishment', '3PL Billing', 'System', 'Returns', 'Shipping'];
const CONDITION_TYPES = [
  { value: 'low_stock', label: 'Low Stock (live-checked)' },
  { value: 'asn_overdue', label: 'ASN Overdue (live-checked)' },
  { value: 'invoice_overdue', label: 'Invoice Overdue (live-checked)' },
  { value: 'manual', label: 'Manual only (no live check)' },
];

export default function WmsLiteNotificationsConfig() {
  const [activeTab, setActiveTab] = useState('rules');
  const [search, setSearch] = useState('');

  const [showRuleDrawer, setShowRuleDrawer] = useState(false);
  const [editRule, setEditRule] = useState<NotificationRule | null>(null);
  const [ruleForm, setRuleForm] = useState<any>(emptyRuleForm);

  const [showEscDrawer, setShowEscDrawer] = useState(false);
  const [editEsc, setEditEsc] = useState<EscalationRule | null>(null);
  const [escForm, setEscForm] = useState<any>(emptyEscForm);

  const [showChannelDrawer, setShowChannelDrawer] = useState(false);
  const [editChannel, setEditChannel] = useState<NotificationChannel | null>(null);
  const [channelForm, setChannelForm] = useState<any>({ provider: '', from_address: '', status: 'Active' });

  const { data: rules = [], isLoading: rulesLoading } = useNotificationRules();
  const { data: channels = [], isLoading: channelsLoading } = useNotificationChannels();
  const { data: escalations = [], isLoading: escLoading } = useEscalationRules();
  const { data: digests = [], isLoading: digestsLoading } = useDigestSettings();
  const { data: log = [], isLoading: logLoading } = useNotificationLog();
  const { data: report } = useNotificationReportSummary();

  const createRule = useCreateRule();
  const updateRule = useUpdateRule();
  const deleteRule = useDeleteRule();
  const checkRules = useCheckRules();
  const sendTest = useSendTestForRule();

  const updateChannel = useUpdateChannel();
  const testChannel = useTestChannel();

  const createEsc = useCreateEscalation();
  const updateEsc = useUpdateEscalation();
  const deleteEsc = useDeleteEscalation();
  const fireEsc = useFireEscalation();

  const updateDigest = useUpdateDigest();
  const sendDigestNow = useSendDigestNow();

  const filteredRules = useMemo(() => rules.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase()) || r.module.toLowerCase().includes(search.toLowerCase())
  ), [rules, search]);

  const today = new Date().toDateString();
  const sentToday = log.filter(l => new Date(l.created_at).toDateString() === today).length;
  const failedToday = log.filter(l => l.status === 'Failed' && new Date(l.created_at).toDateString() === today).length;

  const openCreateRule = () => { setEditRule(null); setRuleForm(emptyRuleForm); setShowRuleDrawer(true); };
  const openEditRule = (r: NotificationRule) => {
    setEditRule(r);
    setRuleForm({ name: r.name, event: r.event, module: r.module, condition_type: r.condition_type, threshold: r.threshold || '', channels: r.channels.split(',').filter(Boolean) as Channel[], recipients: r.recipients || '', frequency: r.frequency, priority: r.priority });
    setShowRuleDrawer(true);
  };
  const handleSaveRule = () => {
    if (!ruleForm.name || !ruleForm.event) return;
    const payload = { ...ruleForm, channels: ruleForm.channels.join(',') || 'inapp' };
    if (editRule) {
      updateRule.mutate({ id: editRule.id, payload }, { onSuccess: () => setShowRuleDrawer(false) });
    } else {
      createRule.mutate(payload, { onSuccess: () => setShowRuleDrawer(false) });
    }
  };

  const openCreateEsc = () => { setEditEsc(null); setEscForm(emptyEscForm); setShowEscDrawer(true); };
  const openEditEsc = (e: EscalationRule) => {
    setEditEsc(e);
    setEscForm({ name: e.name, rule_id: String(e.rule_id), escalate_to: e.escalate_to, channel: e.channel.split(',').filter(Boolean) as Channel[], delay_minutes: String(e.delay_minutes) });
    setShowEscDrawer(true);
  };
  const handleSaveEsc = () => {
    if (!escForm.name || !escForm.rule_id) return;
    const payload = { name: escForm.name, rule_id: Number(escForm.rule_id), escalate_to: escForm.escalate_to, channel: escForm.channel.join(',') || 'email', delay_minutes: Number(escForm.delay_minutes) || 60 };
    if (editEsc) {
      updateEsc.mutate({ id: editEsc.id, payload }, { onSuccess: () => setShowEscDrawer(false) });
    } else {
      createEsc.mutate(payload, { onSuccess: () => setShowEscDrawer(false) });
    }
  };

  const openConfigureChannel = (c: NotificationChannel) => {
    setEditChannel(c);
    setChannelForm({ provider: c.provider || '', from_address: c.from_address || '', status: c.status });
    setShowChannelDrawer(true);
  };

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
              { label: 'Total Rules', value: rules.length, color: 'text-neutral-900' },
              { label: 'Active Rules', value: rules.filter(r => r.active).length, color: 'text-emerald-600' },
              { label: 'Critical Rules', value: rules.filter(r => r.priority === 'Critical').length, color: 'text-red-600' },
              { label: 'Sent Today', value: sentToday, color: 'text-blue-600' },
              { label: 'Failed Today', value: failedToday, color: 'text-amber-600' },
            ].map(k => (
              <Card key={k.label} className="border border-neutral-200 shadow-none">
                <CardContent className="p-4">
                  <p className="text-xs text-neutral-500">{k.label}</p>
                  <p className={`text-2xl font-bold mt-1 ${k.color}`}>{k.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Notification Rules */}
          {activeTab === 'rules' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2 border border-neutral-200 rounded-lg px-3 py-2 bg-white w-64">
                  <Search className="w-3.5 h-3.5 text-neutral-400" />
                  <input className="bg-transparent text-xs text-neutral-700 placeholder-neutral-400 focus:outline-none w-full" placeholder="Search rules, modules..." value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8" onClick={() => checkRules.mutate()} disabled={checkRules.isPending}>
                    {checkRules.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}Check Rules Now
                  </Button>
                  <Button size="sm" className="gap-1.5 text-xs bg-neutral-900 hover:bg-neutral-800 text-white" onClick={openCreateRule}><Plus className="w-3.5 h-3.5" />Add Rule</Button>
                </div>
              </div>

              {checkRules.isSuccess && (
                <div className="px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-700">
                  {checkRules.data && checkRules.data.length > 0 ? `${checkRules.data.length} rule(s) fired against live data — see the Notification Log.` : 'No checkable rule is currently true, or all already logged within the last 10 minutes.'}
                </div>
              )}

              <Card className="border border-neutral-200 shadow-none">
                <Table>
                  <TableHeader><TableRow className="bg-neutral-50">
                    <TableHead className="text-xs font-semibold">Rule</TableHead>
                    <TableHead className="text-xs font-semibold">Trigger Event</TableHead>
                    <TableHead className="text-xs font-semibold">Module</TableHead>
                    <TableHead className="text-xs font-semibold">Channels</TableHead>
                    <TableHead className="text-xs font-semibold">Recipients</TableHead>
                    <TableHead className="text-xs font-semibold">Frequency</TableHead>
                    <TableHead className="text-xs font-semibold">Priority</TableHead>
                    <TableHead className="text-xs font-semibold">Active</TableHead>
                    <TableHead className="text-xs font-semibold">Last Triggered</TableHead>
                    <TableHead className="text-xs font-semibold text-right">Actions</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {rulesLoading ? (
                      <TableRow><TableCell colSpan={10} className="text-center py-8 text-xs text-neutral-400"><Loader2 className="inline w-3.5 h-3.5 animate-spin mr-1.5" />Loading rules…</TableCell></TableRow>
                    ) : filteredRules.length === 0 ? (
                      <TableRow><TableCell colSpan={10} className="text-center py-8 text-xs text-neutral-400">No rules match.</TableCell></TableRow>
                    ) : filteredRules.map(r => (
                      <TableRow key={r.id} className="hover:bg-neutral-50">
                        <TableCell>
                          <p className="text-xs font-mono font-semibold text-[#003A78]">{r.rule_code}</p>
                          <p className="text-xs font-medium text-neutral-900">{r.name}</p>
                        </TableCell>
                        <TableCell className="text-xs text-neutral-600 max-w-[180px] truncate" title={r.event}>{r.event}</TableCell>
                        <TableCell><Badge variant="outline" className="text-xs">{r.module}</Badge></TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {r.channels.split(',').filter(Boolean).map(ch => (
                              <span key={ch} className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium ${channelBadgeClass(ch)}`}>
                                {channelIcon(ch)}{ch}
                              </span>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-neutral-600 max-w-[140px] truncate">{r.recipients}</TableCell>
                        <TableCell className="text-xs text-neutral-600">{r.frequency}</TableCell>
                        <TableCell><Badge className={`text-xs ${priorityColor[r.priority]}`}>{r.priority}</Badge></TableCell>
                        <TableCell>
                          <Switch checked={r.active} className="data-[state=checked]:bg-emerald-500" onCheckedChange={checked => updateRule.mutate({ id: r.id, payload: { active: checked } })} />
                        </TableCell>
                        <TableCell className="text-xs text-neutral-500">{r.last_triggered_at ? new Date(r.last_triggered_at).toLocaleString() : '—'}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0"><MoreHorizontal className="w-3.5 h-3.5" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem className="text-xs" onClick={() => openEditRule(r)}><Pencil className="w-3.5 h-3.5 mr-2" />Edit Rule</DropdownMenuItem>
                              <DropdownMenuItem className="text-xs" onClick={() => sendTest.mutate(r.id)}><TestTube className="w-3.5 h-3.5 mr-2" />Send Test</DropdownMenuItem>
                              <DropdownMenuItem className="text-xs" onClick={() => setActiveTab('log')}><Eye className="w-3.5 h-3.5 mr-2" />View Log</DropdownMenuItem>
                              <DropdownMenuItem className="text-xs text-red-600" onClick={() => { if (confirm('Delete this rule?')) deleteRule.mutate(r.id); }}><Trash2 className="w-3.5 h-3.5 mr-2" />Delete</DropdownMenuItem>
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

          {/* Channels */}
          {activeTab === 'channels' && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Notification Channels</h3>
              <div className="grid grid-cols-2 gap-4">
                {channelsLoading ? (
                  <p className="text-xs text-neutral-400"><Loader2 className="inline w-3.5 h-3.5 animate-spin mr-1.5" />Loading channels…</p>
                ) : channels.map(c => (
                  <Card key={c.id} className="border border-neutral-200 shadow-none">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${c.type === 'Email' ? 'bg-blue-50 border-blue-200' : c.type === 'SMS' ? 'bg-purple-50 border-purple-200' : c.type === 'In-App' ? 'bg-emerald-50 border-emerald-200' : 'bg-neutral-50 border-neutral-200'}`}>
                            {c.type === 'Email' ? <Mail className="w-4 h-4 text-blue-600" /> : c.type === 'SMS' ? <Smartphone className="w-4 h-4 text-purple-600" /> : c.type === 'In-App' ? <Monitor className="w-4 h-4 text-emerald-600" /> : <Settings className="w-4 h-4 text-neutral-600" />}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-neutral-900">{c.type}</p>
                            <p className="text-xs text-neutral-500 mt-0.5">{c.provider}</p>
                          </div>
                        </div>
                        <Badge className={`text-xs ${c.status === 'Active' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-neutral-100 text-neutral-600 border-neutral-200'}`}>{c.status}</Badge>
                      </div>
                      <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between"><span className="text-neutral-500">Sender / From</span><span className="font-medium text-neutral-700">{c.from_address}</span></div>
                        <div className="flex justify-between"><span className="text-neutral-500">Last Test</span><span className="font-medium text-neutral-700">{c.last_test_at ? new Date(c.last_test_at).toLocaleString() : '—'}</span></div>
                      </div>
                      <div className="flex gap-2 mt-3">
                        <Button size="sm" variant="outline" className="flex-1 text-xs h-7" onClick={() => testChannel.mutate(c.id)} disabled={testChannel.isPending}><TestTube className="w-3 h-3 mr-1" />Test</Button>
                        <Button size="sm" variant="outline" className="flex-1 text-xs h-7" onClick={() => openConfigureChannel(c)}><Pencil className="w-3 h-3 mr-1" />Configure</Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Escalation Rules */}
          {activeTab === 'escalation' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold">Escalation Rules</h3>
                  <p className="text-xs text-neutral-500 mt-0.5">If a rule's condition is still true after the delay, it's ready to escalate — computed live, not scheduled.</p>
                </div>
                <Button size="sm" className="gap-1.5 text-xs bg-neutral-900 hover:bg-neutral-800 text-white" onClick={openCreateEsc}><Plus className="w-3.5 h-3.5" />Add Escalation</Button>
              </div>
              <Card className="border border-neutral-200 shadow-none">
                <Table>
                  <TableHeader><TableRow className="bg-neutral-50">
                    <TableHead className="text-xs font-semibold">Name</TableHead>
                    <TableHead className="text-xs font-semibold">Watching Rule</TableHead>
                    <TableHead className="text-xs font-semibold">Escalate To</TableHead>
                    <TableHead className="text-xs font-semibold">Channel</TableHead>
                    <TableHead className="text-xs font-semibold">Delay</TableHead>
                    <TableHead className="text-xs font-semibold">Active</TableHead>
                    <TableHead className="text-xs font-semibold">Status</TableHead>
                    <TableHead className="text-xs font-semibold text-right">Actions</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {escLoading ? (
                      <TableRow><TableCell colSpan={8} className="text-center py-8 text-xs text-neutral-400"><Loader2 className="inline w-3.5 h-3.5 animate-spin mr-1.5" />Loading…</TableCell></TableRow>
                    ) : escalations.map(e => (
                      <TableRow key={e.id} className={`hover:bg-neutral-50 ${e.is_due ? 'bg-red-50/30' : ''}`}>
                        <TableCell className="text-xs font-medium text-neutral-900">{e.name}</TableCell>
                        <TableCell className="text-xs text-neutral-700">{e.rule_name}</TableCell>
                        <TableCell className="text-xs text-neutral-700">{e.escalate_to}</TableCell>
                        <TableCell><Badge variant="outline" className="text-xs">{e.channel}</Badge></TableCell>
                        <TableCell><Badge className="text-xs bg-amber-100 text-amber-700 border-amber-200">{e.delay_minutes} min</Badge></TableCell>
                        <TableCell><Switch checked={e.active} className="data-[state=checked]:bg-emerald-500" onCheckedChange={checked => updateEsc.mutate({ id: e.id, payload: { active: checked } })} /></TableCell>
                        <TableCell>
                          {e.is_due ? <Badge className="text-xs bg-red-100 text-red-700 border-red-200">Escalation Due</Badge> : <Badge className="text-xs bg-neutral-100 text-neutral-500">Not Due</Badge>}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {e.is_due && (
                              <Button size="sm" variant="outline" className="h-7 text-xs border-red-300 text-red-700" onClick={() => fireEsc.mutate(e.id)} disabled={fireEsc.isPending}><Send className="w-3 h-3 mr-1" />Escalate</Button>
                            )}
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEditEsc(e)}><Pencil className="w-3.5 h-3.5" /></Button>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500" onClick={() => { if (confirm('Delete this escalation rule?')) deleteEsc.mutate(e.id); }}><Trash2 className="w-3.5 h-3.5" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            </div>
          )}

          {/* Digest & Frequency */}
          {activeTab === 'digest' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold">Digest & Scheduled Reports</h3>
                <p className="text-xs text-neutral-500 mt-0.5">"Send Now" aggregates real notification log entries since the last send — nothing here is a background scheduler in this build.</p>
              </div>
              <div className="space-y-3">
                {digestsLoading ? (
                  <p className="text-xs text-neutral-400"><Loader2 className="inline w-3.5 h-3.5 animate-spin mr-1.5" />Loading digests…</p>
                ) : digests.map(d => (
                  <Card key={d.id} className="border border-neutral-200 shadow-none">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between flex-wrap gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center">
                            <Clock className="w-4 h-4 text-blue-600" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-neutral-900">{d.name}</p>
                            <div className="flex items-center gap-4 mt-0.5 flex-wrap">
                              <span className="text-xs text-neutral-500">Schedule: <span className="font-medium text-neutral-700">{d.schedule}</span></span>
                              <span className="text-xs text-neutral-500">Modules: <span className="font-medium text-neutral-700">{d.modules}</span></span>
                              <span className="text-xs text-neutral-500">Recipients: <span className="font-medium text-neutral-700">{d.recipients}</span></span>
                            </div>
                            <p className="text-xs text-neutral-400 mt-0.5">Last sent: {d.last_sent_at ? new Date(d.last_sent_at).toLocaleString() : 'Never'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch checked={d.active} className="data-[state=checked]:bg-emerald-500" onCheckedChange={checked => updateDigest.mutate({ id: d.id, payload: { active: checked } })} />
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => sendDigestNow.mutate(d.id)} disabled={sendDigestNow.isPending}><Send className="w-3 h-3 mr-1" />Send Now</Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Notification Log */}
          {activeTab === 'log' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Notification Delivery Log</h3>
                <div className="flex items-center gap-2 border border-neutral-200 rounded-lg px-3 py-2 bg-white w-56">
                  <Search className="w-3.5 h-3.5 text-neutral-400" />
                  <input className="bg-transparent text-xs text-neutral-700 placeholder-neutral-400 focus:outline-none w-full" placeholder="Search log..." value={search} onChange={e => setSearch(e.target.value)} />
                </div>
              </div>
              <Card className="border border-neutral-200 shadow-none">
                <Table>
                  <TableHeader><TableRow className="bg-neutral-50">
                    <TableHead className="text-xs font-semibold">Log ID</TableHead>
                    <TableHead className="text-xs font-semibold">Kind</TableHead>
                    <TableHead className="text-xs font-semibold">Rule</TableHead>
                    <TableHead className="text-xs font-semibold">Event</TableHead>
                    <TableHead className="text-xs font-semibold">Channels</TableHead>
                    <TableHead className="text-xs font-semibold text-center">Recipients</TableHead>
                    <TableHead className="text-xs font-semibold">Sent At</TableHead>
                    <TableHead className="text-xs font-semibold">Status</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {logLoading ? (
                      <TableRow><TableCell colSpan={8} className="text-center py-8 text-xs text-neutral-400"><Loader2 className="inline w-3.5 h-3.5 animate-spin mr-1.5" />Loading log…</TableCell></TableRow>
                    ) : log.filter(l => l.event_detail.toLowerCase().includes(search.toLowerCase()) || l.rule_name.toLowerCase().includes(search.toLowerCase())).length === 0 ? (
                      <TableRow><TableCell colSpan={8} className="text-center py-8 text-xs text-neutral-400">No log entries match.</TableCell></TableRow>
                    ) : log.filter(l => l.event_detail.toLowerCase().includes(search.toLowerCase()) || l.rule_name.toLowerCase().includes(search.toLowerCase())).map(l => (
                      <TableRow key={l.id} className="hover:bg-neutral-50">
                        <TableCell className="text-xs font-mono text-[#003A78] font-semibold">{l.log_code}</TableCell>
                        <TableCell><Badge variant="outline" className="text-xs">{l.kind}</Badge></TableCell>
                        <TableCell className="text-xs font-medium text-neutral-900">{l.rule_name || '—'}</TableCell>
                        <TableCell className="text-xs text-neutral-600 max-w-[260px] truncate" title={l.event_detail}>{l.event_detail}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {l.channels.split(',').filter(Boolean).map(ch => (
                              <span key={ch} className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium ${channelBadgeClass(ch)}`}>{channelIcon(ch)}</span>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-center">{l.recipients_count}</TableCell>
                        <TableCell className="text-xs text-neutral-500">{new Date(l.created_at).toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge className={`text-xs ${l.status === 'Delivered' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-red-100 text-red-700 border-red-200'}`}>{l.status}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            </div>
          )}

          {/* Analytics */}
          {activeTab === 'reports' && report && (
            <div className="space-y-5">
              <Card className="border border-neutral-200 shadow-none">
                <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Notifications Sent – Last 7 Days by Channel</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={report.daily_by_channel}>
                      <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Bar dataKey="email" fill="#3B82F6" radius={[4, 4, 0, 0]} name="Email" />
                      <Bar dataKey="sms" fill="#7C3AED" radius={[4, 4, 0, 0]} name="SMS" />
                      <Bar dataKey="inapp" fill="#059669" radius={[4, 4, 0, 0]} name="In-App" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: 'Notifications Sent (MTD)', value: String(report.sent_mtd), sub: 'Across all channels' },
                  { label: 'Delivery Success Rate', value: `${report.delivery_success_pct}%`, sub: 'Email + SMS + In-App' },
                  { label: 'Escalations Triggered', value: String(report.escalations_triggered_mtd), sub: 'This month' },
                  { label: 'Digest Sends', value: String(report.digest_sends_mtd), sub: 'This month' },
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

      {/* Rule Create/Edit Drawer */}
      {showRuleDrawer && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/30" onClick={() => setShowRuleDrawer(false)} />
          <div className="w-[500px] bg-white h-full flex flex-col shadow-2xl">
            <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between" style={{ background: 'linear-gradient(135deg,#003A78,#005BAA)' }}>
              <div><p className="text-white font-semibold text-sm">{editRule ? 'Edit Notification Rule' : 'Add Notification Rule'}</p><p className="text-blue-200 text-xs mt-0.5">Define trigger events and delivery channels</p></div>
              <button onClick={() => setShowRuleDrawer(false)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20"><X className="w-4 h-4 text-white" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5 col-span-2"><Label className="text-xs font-medium">Rule Name</Label><Input value={ruleForm.name || ''} onChange={e => setRuleForm({ ...ruleForm, name: e.target.value })} className="h-8 text-sm" /></div>
                <div className="space-y-1.5"><Label className="text-xs font-medium">Module</Label>
                  <Select value={ruleForm.module} onValueChange={v => setRuleForm({ ...ruleForm, module: v })}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>{MODULES.map(m => <SelectItem key={m} value={m} className="text-xs">{m}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5"><Label className="text-xs font-medium">Priority</Label>
                  <Select value={ruleForm.priority} onValueChange={v => setRuleForm({ ...ruleForm, priority: v })}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="Critical">Critical</SelectItem><SelectItem value="High">High</SelectItem><SelectItem value="Medium">Medium</SelectItem><SelectItem value="Low">Low</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 col-span-2"><Label className="text-xs font-medium">Trigger Event Description</Label><Input value={ruleForm.event || ''} onChange={e => setRuleForm({ ...ruleForm, event: e.target.value })} className="h-8 text-sm" placeholder="e.g. Inventory below reorder point" /></div>
                <div className="space-y-1.5 col-span-2"><Label className="text-xs font-medium">Live Condition</Label>
                  <Select value={ruleForm.condition_type} onValueChange={v => setRuleForm({ ...ruleForm, condition_type: v })}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>{CONDITION_TYPES.map(c => <SelectItem key={c.value} value={c.value} className="text-xs">{c.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 col-span-2"><Label className="text-xs font-medium">Threshold / Condition (display)</Label><Input value={ruleForm.threshold || ''} onChange={e => setRuleForm({ ...ruleForm, threshold: e.target.value })} className="h-8 text-sm" placeholder="e.g. Qty < Reorder Point" /></div>
                <div className="space-y-1.5 col-span-2"><Label className="text-xs font-medium">Recipients</Label><Input value={ruleForm.recipients || ''} onChange={e => setRuleForm({ ...ruleForm, recipients: e.target.value })} className="h-8 text-sm" placeholder="Role names, comma-separated" /></div>
                <div className="space-y-1.5"><Label className="text-xs font-medium">Frequency</Label>
                  <Select value={ruleForm.frequency} onValueChange={v => setRuleForm({ ...ruleForm, frequency: v })}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="Immediate">Immediate</SelectItem><SelectItem value="Hourly Digest">Hourly Digest</SelectItem><SelectItem value="Daily Digest">Daily Digest</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
                  <Label className="text-xs font-medium block mb-2">Channels</Label>
                  <div className="flex gap-2">
                    {(['email', 'sms', 'inapp', 'webhook'] as Channel[]).map(ch => (
                      <button key={ch} type="button"
                        onClick={() => {
                          const current: Channel[] = ruleForm.channels || [];
                          const updated = current.includes(ch) ? current.filter((c: Channel) => c !== ch) : [...current, ch];
                          setRuleForm({ ...ruleForm, channels: updated });
                        }}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${(ruleForm.channels || []).includes(ch) ? 'bg-neutral-900 text-white border-neutral-900' : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-400'}`}>
                        {channelIcon(ch)}{ch}
                      </button>
                    ))}
                  </div>
                </div>
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

      {/* Escalation Create/Edit Drawer */}
      {showEscDrawer && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/30" onClick={() => setShowEscDrawer(false)} />
          <div className="w-[460px] bg-white h-full flex flex-col shadow-2xl">
            <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between" style={{ background: 'linear-gradient(135deg,#003A78,#005BAA)' }}>
              <div><p className="text-white font-semibold text-sm">{editEsc ? 'Edit Escalation Rule' : 'Add Escalation Rule'}</p></div>
              <button onClick={() => setShowEscDrawer(false)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20"><X className="w-4 h-4 text-white" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="space-y-1.5"><Label className="text-xs font-medium">Name</Label><Input value={escForm.name || ''} onChange={e => setEscForm({ ...escForm, name: e.target.value })} className="h-8 text-sm" /></div>
              <div className="space-y-1.5"><Label className="text-xs font-medium">Watching Rule</Label>
                <Select value={escForm.rule_id} onValueChange={v => setEscForm({ ...escForm, rule_id: v })}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select rule" /></SelectTrigger>
                  <SelectContent>{rules.map(r => <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label className="text-xs font-medium">Escalate To</Label><Input value={escForm.escalate_to || ''} onChange={e => setEscForm({ ...escForm, escalate_to: e.target.value })} className="h-8 text-sm" placeholder="Role names, comma-separated" /></div>
              <div className="space-y-1.5"><Label className="text-xs font-medium">Delay (minutes)</Label><Input value={escForm.delay_minutes || ''} onChange={e => setEscForm({ ...escForm, delay_minutes: e.target.value })} className="h-8 text-sm" type="number" /></div>
              <div>
                <Label className="text-xs font-medium block mb-2">Channel</Label>
                <div className="flex gap-2">
                  {(['email', 'sms', 'inapp'] as Channel[]).map(ch => (
                    <button key={ch} type="button"
                      onClick={() => {
                        const current: Channel[] = escForm.channel || [];
                        const updated = current.includes(ch) ? current.filter((c: Channel) => c !== ch) : [...current, ch];
                        setEscForm({ ...escForm, channel: updated });
                      }}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${(escForm.channel || []).includes(ch) ? 'bg-neutral-900 text-white border-neutral-900' : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-400'}`}>
                      {channelIcon(ch)}{ch}
                    </button>
                  ))}
                </div>
              </div>
              {(createEsc.isError || updateEsc.isError) && <p className="text-xs text-red-600">{((createEsc.error || updateEsc.error) as Error).message}</p>}
            </div>
            <div className="px-6 py-4 border-t border-neutral-200 flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowEscDrawer(false)}><X className="w-3.5 h-3.5 mr-1" />Cancel</Button>
              <Button size="sm" className="bg-neutral-900 hover:bg-neutral-800 text-white" onClick={handleSaveEsc} disabled={createEsc.isPending || updateEsc.isPending}>
                {(createEsc.isPending || updateEsc.isPending) ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1" />}Save
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Channel Configure Drawer */}
      {showChannelDrawer && editChannel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowChannelDrawer(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-[420px] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 flex items-center justify-between border-b border-neutral-200" style={{ background: 'linear-gradient(135deg,#003A78,#005BAA)' }}>
              <p className="text-white font-semibold text-sm">Configure {editChannel.type}</p>
              <button onClick={() => setShowChannelDrawer(false)} className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20"><X className="w-3.5 h-3.5 text-white" /></button>
            </div>
            <div className="p-5 space-y-3">
              <div className="space-y-1.5"><Label className="text-xs font-medium">Provider</Label><Input className="h-8 text-sm" value={channelForm.provider} onChange={e => setChannelForm({ ...channelForm, provider: e.target.value })} /></div>
              <div className="space-y-1.5"><Label className="text-xs font-medium">From / Sender</Label><Input className="h-8 text-sm" value={channelForm.from_address} onChange={e => setChannelForm({ ...channelForm, from_address: e.target.value })} /></div>
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">Active</Label>
                <Switch checked={channelForm.status === 'Active'} className="data-[state=checked]:bg-emerald-500" onCheckedChange={checked => setChannelForm({ ...channelForm, status: checked ? 'Active' : 'Inactive' })} />
              </div>
              <Button className="w-full bg-neutral-900 hover:bg-neutral-800 text-white gap-1.5 text-xs" size="sm"
                onClick={() => updateChannel.mutate({ id: editChannel.id, payload: channelForm }, { onSuccess: () => setShowChannelDrawer(false) })} disabled={updateChannel.isPending}>
                {updateChannel.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}Save Channel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
