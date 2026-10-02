import { useState } from 'react';
import {
  ShieldCheck, Search, Eye, FileDown, AlertCircle,
  ChevronLeft, ChevronRight, Filter, Clock, User,
  Database, Tag, BarChart2, Lock, CheckCircle, Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  useAuditLog,
  useComplianceReports, useRerunComplianceReport,
  useDataClassifications,
  useSecurityPolicies, useUpdateSecurityPolicy,
} from '@/hooks/useAdminConfigApi2';

const BRAND = "#009FE3";
type SubView = 'audittrail' | 'compliance' | 'dataclass' | 'secpolicies';

const severityStyle: Record<string, string> = {
  'Info': 'bg-blue-50 text-blue-700',
  'Medium': 'bg-amber-50 text-amber-700',
  'High': 'bg-orange-50 text-orange-700',
  'Critical': 'bg-red-100 text-red-800',
};

const complianceStyle: Record<string, string> = {
  'Compliant': 'bg-emerald-50 text-emerald-700',
  'Review Required': 'bg-amber-50 text-amber-700',
  'Action Needed': 'bg-red-50 text-red-700',
  'Not Applicable': 'bg-neutral-100 text-neutral-500',
};

function fmtDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export default function AuditSecuritySection() {
  const [activeView, setActiveView] = useState<SubView>('audittrail');
  const [search, setSearch] = useState('');
  const [filterModule, setFilterModule] = useState('All');
  const [filterSeverity, setFilterSeverity] = useState('All');

  const { data: auditTrail = [] } = useAuditLog({ module: filterModule, severity: filterSeverity, search });
  const { data: complianceReports = [] } = useComplianceReports();
  const rerunCompliance = useRerunComplianceReport();
  const { data: dataClassList = [] } = useDataClassifications();
  const { data: policies = [] } = useSecurityPolicies();
  const updatePolicy = useUpdateSecurityPolicy();

  const views: { id: SubView; label: string; icon: any }[] = [
    { id: 'audittrail', label: 'Audit Trail', icon: Clock },
    { id: 'compliance', label: 'Compliance Reports', icon: BarChart2 },
    { id: 'dataclass', label: 'Data Classification', icon: Tag },
    { id: 'secpolicies', label: 'Security Policies', icon: Lock },
  ];

  const modules = ['All', 'Inbound', 'Outbound', 'Inventory', '3PL Billing', 'Admin Config', 'Integrations', 'Auth'];
  const severities = ['All', 'Info', 'Medium', 'High', 'Critical'];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-neutral-900">Audit Trail & Security</h2>
          <p className="text-sm text-neutral-500 mt-0.5">Complete audit logs, compliance reports, data classification and security policy management</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Audit Events', value: auditTrail.length, color: BRAND },
          { label: 'Critical Events', value: auditTrail.filter(a => a.severity === 'Critical').length, color: '#EF4444' },
          { label: 'Compliance Issues', value: complianceReports.reduce((s, r) => s + r.findings, 0), color: '#F59E0B' },
          { label: 'Active Policies', value: policies.filter(p => p.enabled).length, color: '#10B981' },
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
            <button key={v.id} onClick={() => { setActiveView(v.id); setSearch(''); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${activeView === v.id ? 'bg-neutral-900 text-white border-neutral-900' : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-400'}`}>
              <Icon size={13} />{v.label}
            </button>
          );
        })}
      </div>

      {/* ── AUDIT TRAIL ── */}
      {activeView === 'audittrail' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 border border-neutral-200 rounded-lg px-3 py-1.5 bg-white">
                <Search size={12} className="text-neutral-400" />
                <input className="bg-transparent text-xs focus:outline-none w-32" placeholder="Search user / entity..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <Select value={filterModule} onValueChange={setFilterModule}>
                <SelectTrigger className="h-8 text-xs w-32"><SelectValue placeholder="Module" /></SelectTrigger>
                <SelectContent>{modules.map(m => <SelectItem key={m} value={m} className="text-xs">{m}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={filterSeverity} onValueChange={setFilterSeverity}>
                <SelectTrigger className="h-8 text-xs w-28"><SelectValue placeholder="Severity" /></SelectTrigger>
                <SelectContent>{severities.map(s => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8"><FileDown size={12} /> Export</Button>
            </div>
          </div>

          {auditTrail.some(a => a.severity === 'Critical') && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertCircle size={14} className="text-red-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-red-700"><strong>Critical security event detected.</strong> Review the flagged event in the table below immediately.</p>
            </div>
          )}

          <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-100">
                  {['Audit ID', 'User', 'Action', 'Entity', 'Entity ID', 'Module', 'Change Detail', 'Timestamp', 'IP', 'Severity'].map(h => (
                    <th key={h} className="text-left py-2.5 px-3 text-neutral-500 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50">
                {auditTrail.map(a => (
                  <tr key={a.id} className="hover:bg-blue-50/10 transition-colors">
                    <td className="py-2.5 px-3 font-medium text-neutral-900">{a.log_code}</td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-medium flex-shrink-0" style={{ background: BRAND }}>{(a.username || '?').charAt(0)}</div>
                        <span className="text-neutral-800">{a.username || 'Unknown'}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-neutral-100 text-neutral-700">{a.action}</span>
                    </td>
                    <td className="py-2.5 px-3 text-neutral-700">{a.entity_type}</td>
                    <td className="py-2.5 px-3"><code className="font-mono text-neutral-600 bg-neutral-100 px-1.5 rounded">{a.entity_id || '—'}</code></td>
                    <td className="py-2.5 px-3"><span className="px-2 py-0.5 rounded text-xs" style={{ background: '#009FE315', color: BRAND }}>{a.module}</span></td>
                    <td className="py-2.5 px-3 text-neutral-600 max-w-xs truncate" title={a.field_detail || ''}>{a.field_detail || '—'}</td>
                    <td className="py-2.5 px-3 text-neutral-500 whitespace-nowrap">{fmtDate(a.created_at)}</td>
                    <td className="py-2.5 px-3"><code className="font-mono text-neutral-500 text-xs">{a.ip_address || '—'}</code></td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${severityStyle[a.severity] || 'bg-neutral-100 text-neutral-600'}`}>{a.severity}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-5 py-3 border-t border-neutral-100 flex items-center justify-between">
              <span className="text-xs text-neutral-400">Showing {auditTrail.length} events · Retained for 365 days</span>
              <div className="flex items-center gap-1">
                <button className="w-7 h-7 flex items-center justify-center rounded border border-neutral-200 text-neutral-500 hover:bg-neutral-50"><ChevronLeft size={12} /></button>
                <button className="w-7 h-7 flex items-center justify-center rounded text-white text-xs" style={{ background: BRAND }}>1</button>
                <button className="w-7 h-7 flex items-center justify-center rounded border border-neutral-200 text-neutral-500 hover:bg-neutral-50"><ChevronRight size={12} /></button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── COMPLIANCE REPORTS ── */}
      {activeView === 'compliance' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {complianceReports.map(rpt => (
              <Card key={rpt.id} className="border border-neutral-200 shadow-none">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#009FE318' }}>
                        <ShieldCheck size={15} style={{ color: BRAND }} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-neutral-900">{rpt.name}</p>
                        <p className="text-xs text-neutral-400">{rpt.standard} · {rpt.period || '—'}</p>
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${complianceStyle[rpt.status] || 'bg-neutral-100 text-neutral-600'}`}>{rpt.status}</span>
                  </div>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Last Run</span>
                      <span className="text-neutral-800">{fmtDate(rpt.last_run_at)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Findings</span>
                      <span className={`font-medium ${rpt.findings > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                        {rpt.findings > 0 ? `${rpt.findings} issue(s) found` : 'No issues'}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3 pt-3 border-t border-neutral-100">
                    <Button size="sm" variant="outline" className="flex-1 text-xs h-7 gap-1"><Eye size={10} /> View Report</Button>
                    {rpt.exportable && <Button size="sm" variant="outline" className="flex-1 text-xs h-7 gap-1"><FileDown size={10} /> Export PDF</Button>}
                    <Button size="sm" variant="outline" className="text-xs h-7 gap-1" style={{ borderColor: BRAND, color: BRAND }} onClick={() => rerunCompliance.mutate(rpt.id)}>Re-run</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ── DATA CLASSIFICATION ── */}
      {activeView === 'dataclass' && (
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-2">
            <Info size={14} className="text-blue-600 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-blue-700">Data classification levels define how data is handled, stored, encrypted and accessed across the platform. Assign entities to the appropriate classification level.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {dataClassList.map(dc => (
              <Card key={dc.id} className="border shadow-none" style={{ borderColor: `${dc.color}40` }}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: dc.color }} />
                      <p className="text-sm font-semibold text-neutral-900">{dc.name}</p>
                      <code className="text-xs font-mono text-neutral-400">{dc.code}</code>
                    </div>
                  </div>
                  <p className="text-xs text-neutral-500 mb-3">{dc.description}</p>
                  <div className="flex flex-wrap gap-1 mb-3">
                    {dc.entities.map(e => (
                      <span key={e} className="px-2 py-0.5 rounded text-xs font-medium border" style={{ borderColor: `${dc.color}40`, color: dc.color, background: `${dc.color}10` }}>{e}</span>
                    ))}
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs border-t border-neutral-100 pt-3">
                    {[
                      { label: 'Encrypted', value: dc.encryption },
                      { label: 'Masked in UI', value: dc.mask_display },
                      { label: 'Full Audit', value: dc.audit_all },
                    ].map(({ label, value }) => (
                      <div key={label} className="text-center">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center mx-auto mb-1 ${value ? 'bg-emerald-100' : 'bg-neutral-100'}`}>
                          {value ? <CheckCircle size={10} className="text-emerald-600" /> : <span className="text-neutral-400 text-xs">—</span>}
                        </div>
                        <p className="text-neutral-500">{label}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ── SECURITY POLICIES ── */}
      {activeView === 'secpolicies' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-neutral-500">Enable or disable security policies. Changes take effect immediately.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {policies.map(pol => (
              <Card key={pol.id} className="border border-neutral-200 shadow-none">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${pol.enabled ? '' : 'opacity-40'}`}
                        style={{ background: `${BRAND}18` }}>
                        <Lock size={14} style={{ color: BRAND }} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-neutral-900">{pol.name}</p>
                        <p className="text-xs text-neutral-500 mt-0.5 leading-relaxed">{pol.description}</p>
                        <p className="text-xs text-neutral-400 mt-1">Last updated: {fmtDate(pol.updated_at)}</p>
                      </div>
                    </div>
                    <Switch
                      checked={pol.enabled}
                      onCheckedChange={v => updatePolicy.mutate({ id: pol.id, enabled: v })}
                    />
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
