import { useState } from 'react';
import {
  Globe, Plus, Pencil, Trash2, X, Check, Search,
  Languages, Clock, DollarSign, MapPin, FileText, AlertCircle, Save
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  useLanguages, useCreateLanguage, useUpdateLanguage, useDeleteLanguage,
  useDateTimeProfiles, useCreateDateTimeProfile, useUpdateDateTimeProfile, useDeleteDateTimeProfile,
  useCurrencies, useCreateCurrency, useUpdateCurrency, useDeleteCurrency,
  useAddressFormats, useCreateAddressFormat, useUpdateAddressFormat,
  useTranslations, useTranslationCompleteness, useUpdateTranslation,
} from '@/hooks/useAdminConfigApi2';

const BRAND = "#009FE3";
type SubView = 'languages' | 'datetime' | 'currencies' | 'address' | 'translations';

export default function LocalizationSection() {
  const [activeView, setActiveView] = useState<SubView>('languages');
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<any>(null);
  const [saved, setSaved] = useState(false);
  const [transSearch, setTransSearch] = useState('');
  const [transModule, setTransModule] = useState('All');
  const [editKey, setEditKey] = useState<string | null>(null);

  const { data: languages = [] } = useLanguages();
  const createLanguage = useCreateLanguage();
  const updateLanguage = useUpdateLanguage();
  const deleteLanguage = useDeleteLanguage();

  const { data: dtProfiles = [] } = useDateTimeProfiles();
  const createDtp = useCreateDateTimeProfile();
  const updateDtp = useUpdateDateTimeProfile();
  const deleteDtp = useDeleteDateTimeProfile();

  const { data: currencies = [] } = useCurrencies();
  const createCurrency = useCreateCurrency();
  const updateCurrency = useUpdateCurrency();
  const deleteCurrency = useDeleteCurrency();

  const { data: addrProfiles = [] } = useAddressFormats();
  const createAddr = useCreateAddressFormat();
  const updateAddr = useUpdateAddressFormat();

  const { data: translations = [] } = useTranslations(transModule);
  const { data: completeness = [] } = useTranslationCompleteness();
  const updateTranslation = useUpdateTranslation();

  const [langForm, setLangForm] = useState({ name: '', native_name: '', code: '', direction: 'LTR' });
  const [dtpForm, setDtpForm] = useState({ name: '', timezone: 'Asia/Kolkata', date_format: 'DD/MM/YYYY', time_format: '24h', week_start: 'Monday' });
  const [curForm, setCurForm] = useState({ name: '', code: '', symbol: '', decimal_places: '2', thousand_sep: ',', decimal_sep: '.' });
  const [addrForm, setAddrForm] = useState({ name: '', fields_display: '', postal_label: 'PIN Code', state_label: 'State', phone_format: '' });

  const notify = () => { setSaved(true); setTimeout(() => setSaved(false), 2000); };
  const closeForm = () => { setShowForm(false); setEditTarget(null); };

  const views: { id: SubView; label: string; icon: any }[] = [
    { id: 'languages', label: 'Languages', icon: Languages },
    { id: 'datetime', label: 'Date & Time Profiles', icon: Clock },
    { id: 'currencies', label: 'Currencies', icon: DollarSign },
    { id: 'address', label: 'Address Formats', icon: MapPin },
    { id: 'translations', label: 'Translation Editor', icon: FileText },
  ];

  const timezones = ['Asia/Kolkata', 'UTC', 'America/New_York', 'America/Los_Angeles', 'Europe/London', 'Europe/Berlin', 'Asia/Dubai', 'Asia/Singapore', 'Asia/Tokyo'];
  const dateFormats = ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD', 'DD.MM.YYYY', 'DD-MM-YYYY'];
  const transModules = ['All', 'Navigation', 'Common', 'Inbound', 'Outbound', 'Inventory', 'Billing', 'Labor'];

  const filteredTrans = translations.filter(t =>
    t.key.toLowerCase().includes(transSearch.toLowerCase()) || (t.en || '').toLowerCase().includes(transSearch.toLowerCase())
  );

  const completenessFor = (code: string) => completeness.find(c => c.code === code)?.completeness_pct ?? 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-neutral-900">Localization & Internationalization</h2>
          <p className="text-sm text-neutral-500 mt-0.5">Configure languages, date/time profiles, currencies, address formats and translations</p>
        </div>
        {saved && <div className="flex items-center gap-1.5 text-emerald-600 text-sm"><Check className="w-4 h-4" />Saved</div>}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Languages', value: languages.filter(l => l.enabled).length, color: BRAND },
          { label: 'Date/Time Profiles', value: dtProfiles.length, color: '#10B981' },
          { label: 'Currencies', value: currencies.filter(c => c.enabled).length, color: '#F59E0B' },
          { label: 'Translation Keys', value: translations.length, color: '#8B5CF6' },
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
            <button key={v.id} onClick={() => { setActiveView(v.id); setShowForm(false); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${activeView === v.id ? 'bg-neutral-900 text-white border-neutral-900' : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-400'}`}>
              <Icon size={13} />{v.label}
            </button>
          );
        })}
      </div>

      {/* ── LANGUAGES ── */}
      {activeView === 'languages' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-xs text-neutral-500">Manage supported UI languages. The default language cannot be disabled.</p>
            <Button size="sm" className="bg-neutral-900 hover:bg-neutral-800 text-white gap-1.5 text-xs" onClick={() => { setLangForm({ name: '', native_name: '', code: '', direction: 'LTR' }); setShowForm(true); setEditTarget(null); }}><Plus size={12} /> Add Language</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {languages.map(lang => {
              const pct = completenessFor(lang.code) || lang.completeness_pct;
              return (
                <Card key={lang.id} className="border border-neutral-200 shadow-none">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-sm font-semibold text-neutral-900">{lang.name}</p>
                        <p className="text-xs text-neutral-400">{lang.native_name} · <code className="font-mono">{lang.code}</code></p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {lang.is_default && <Badge className="text-xs bg-blue-100 text-blue-700 border-blue-200">Default</Badge>}
                        <span className={`w-2 h-2 rounded-full ${lang.enabled ? 'bg-emerald-500' : 'bg-neutral-300'}`} />
                      </div>
                    </div>
                    <div className="flex items-center justify-between mb-3 text-xs">
                      <span className="text-neutral-500">Direction: <strong className="text-neutral-800">{lang.direction}</strong></span>
                      <span className="text-neutral-500">Completeness: <strong className="text-neutral-800">{pct}%</strong></span>
                    </div>
                    <div className="w-full bg-neutral-100 rounded-full h-1.5 mb-3">
                      <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, background: pct === 100 ? '#10B981' : BRAND }} />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-neutral-500">Enabled</span>
                        <Switch checked={lang.enabled} disabled={lang.is_default} onCheckedChange={v => updateLanguage.mutate({ id: lang.id, payload: { enabled: v } })} />
                      </div>
                      <div className="flex gap-1.5">
                        <button onClick={() => { setLangForm({ name: lang.name, native_name: lang.native_name || '', code: lang.code, direction: lang.direction }); setEditTarget(lang); setShowForm(true); }} className="text-neutral-400 hover:text-amber-500 transition-colors"><Pencil size={12} /></button>
                        {!lang.is_default && <button onClick={() => deleteLanguage.mutate(lang.id)} className="text-neutral-400 hover:text-red-500 transition-colors"><Trash2 size={12} /></button>}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          {showForm && (
            <Card className="border border-neutral-300 shadow-none max-w-md">
              <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-semibold">{editTarget ? 'Edit Language' : 'Add Language'}</CardTitle>
                <button onClick={closeForm} className="text-neutral-400 hover:text-neutral-700"><X size={14} /></button>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1"><Label className="text-xs">Language Name *</Label><Input className="h-8 text-xs" placeholder="e.g. Japanese" value={langForm.name} onChange={e => setLangForm(f => ({ ...f, name: e.target.value }))} /></div>
                  <div className="space-y-1"><Label className="text-xs">Native Name</Label><Input className="h-8 text-xs" placeholder="e.g. 日本語" value={langForm.native_name} onChange={e => setLangForm(f => ({ ...f, native_name: e.target.value }))} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1"><Label className="text-xs">Language Code</Label><Input className="h-8 text-xs" placeholder="e.g. ja-JP" value={langForm.code} onChange={e => setLangForm(f => ({ ...f, code: e.target.value }))} /></div>
                  <div className="space-y-1"><Label className="text-xs">Text Direction</Label>
                    <Select value={langForm.direction} onValueChange={v => setLangForm(f => ({ ...f, direction: v }))}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="LTR" className="text-xs">LTR (Left to Right)</SelectItem><SelectItem value="RTL" className="text-xs">RTL (Right to Left)</SelectItem></SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <Button size="sm" className="flex-1 bg-neutral-900 hover:bg-neutral-800 text-white gap-1 text-xs" onClick={() => {
                    if (!langForm.name) return;
                    if (editTarget) { updateLanguage.mutate({ id: editTarget.id, payload: langForm }, { onSuccess: notify }); }
                    else { createLanguage.mutate(langForm, { onSuccess: notify }); }
                    closeForm();
                  }}><Check size={11} /> {editTarget ? 'Save' : 'Add'}</Button>
                  <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={closeForm}>Cancel</Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ── DATE & TIME ── */}
      {activeView === 'datetime' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-xs text-neutral-500">Date/Time profiles define formatting for each regional site or warehouse.</p>
            <Button size="sm" className="bg-neutral-900 hover:bg-neutral-800 text-white gap-1.5 text-xs" onClick={() => { setDtpForm({ name: '', timezone: 'Asia/Kolkata', date_format: 'DD/MM/YYYY', time_format: '24h', week_start: 'Monday' }); setShowForm(true); setEditTarget(null); }}><Plus size={12} /> Add Profile</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {dtProfiles.map(dtp => (
              <Card key={dtp.id} className={`border shadow-none ${dtp.is_default ? 'border-[#009FE3]' : 'border-neutral-200'}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-sm font-semibold text-neutral-900">{dtp.name}</p>
                    </div>
                    {dtp.is_default && <Badge className="text-xs bg-blue-100 text-blue-700 border-blue-200">Default</Badge>}
                  </div>
                  <div className="space-y-1.5 text-xs">
                    {[['Timezone', dtp.timezone], ['Date Format', dtp.date_format], ['Time Format', dtp.time_format], ['Week Starts', dtp.week_start]].map(([k, v]) => (
                      <div key={k as string} className="flex justify-between">
                        <span className="text-neutral-500">{k}</span>
                        <code className="font-mono text-neutral-800 bg-neutral-100 px-1.5 rounded">{v}</code>
                      </div>
                    ))}
                    <div className="pt-2 border-t border-neutral-100 text-neutral-400">
                      Preview: <strong className="text-neutral-700">{new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}</strong>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3 pt-3 border-t border-neutral-100">
                    {!dtp.is_default && <Button size="sm" variant="outline" className="flex-1 text-xs h-7 gap-1" onClick={() => updateDtp.mutate({ id: dtp.id, payload: { is_default: true } }, { onSuccess: notify })}><Check size={10} /> Set Default</Button>}
                    <Button size="sm" variant="outline" className="flex-1 text-xs h-7 gap-1" onClick={() => {
                      setDtpForm({ name: dtp.name, timezone: dtp.timezone, date_format: dtp.date_format, time_format: dtp.time_format, week_start: dtp.week_start });
                      setEditTarget(dtp); setShowForm(true);
                    }}><Pencil size={10} /> Edit</Button>
                    {!dtp.is_default && <Button size="sm" variant="outline" className="text-xs h-7 text-red-600 border-red-200 hover:bg-red-50" onClick={() => deleteDtp.mutate(dtp.id)}><Trash2 size={10} /></Button>}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          {showForm && (
            <Card className="border border-neutral-300 shadow-none max-w-md">
              <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-semibold">{editTarget ? 'Edit Profile' : 'New Date/Time Profile'}</CardTitle>
                <button onClick={closeForm} className="text-neutral-400 hover:text-neutral-700"><X size={14} /></button>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1"><Label className="text-xs">Profile Name *</Label><Input className="h-8 text-xs" value={dtpForm.name} onChange={e => setDtpForm(f => ({ ...f, name: e.target.value }))} /></div>
                <div className="space-y-1"><Label className="text-xs">Timezone</Label>
                  <Select value={dtpForm.timezone} onValueChange={v => setDtpForm(f => ({ ...f, timezone: v }))}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>{timezones.map(t => <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1"><Label className="text-xs">Date Format</Label>
                    <Select value={dtpForm.date_format} onValueChange={v => setDtpForm(f => ({ ...f, date_format: v }))}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>{dateFormats.map(d => <SelectItem key={d} value={d} className="text-xs">{d}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1"><Label className="text-xs">Time Format</Label>
                    <Select value={dtpForm.time_format} onValueChange={v => setDtpForm(f => ({ ...f, time_format: v }))}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="24h" className="text-xs">24-Hour</SelectItem><SelectItem value="12h" className="text-xs">12-Hour (AM/PM)</SelectItem></SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1"><Label className="text-xs">Week Starts On</Label>
                  <Select value={dtpForm.week_start} onValueChange={v => setDtpForm(f => ({ ...f, week_start: v }))}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="Monday" className="text-xs">Monday</SelectItem><SelectItem value="Sunday" className="text-xs">Sunday</SelectItem><SelectItem value="Saturday" className="text-xs">Saturday</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2 pt-1">
                  <Button size="sm" className="flex-1 bg-neutral-900 hover:bg-neutral-800 text-white gap-1 text-xs" onClick={() => {
                    if (!dtpForm.name) return;
                    if (editTarget) { updateDtp.mutate({ id: editTarget.id, payload: dtpForm }, { onSuccess: notify }); }
                    else { createDtp.mutate(dtpForm, { onSuccess: notify }); }
                    closeForm();
                  }}><Check size={11} /> {editTarget ? 'Save' : 'Create'}</Button>
                  <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={closeForm}>Cancel</Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ── CURRENCIES ── */}
      {activeView === 'currencies' && (
        <div className="bg-white rounded-xl border border-neutral-200">
          <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between flex-wrap gap-2">
            <h3 className="text-sm font-semibold text-neutral-900 flex items-center gap-2"><DollarSign size={14} style={{ color: BRAND }} /> Currency Configuration</h3>
            <Button size="sm" className="bg-neutral-900 hover:bg-neutral-800 text-white gap-1.5 text-xs" onClick={() => { setCurForm({ name: '', code: '', symbol: '', decimal_places: '2', thousand_sep: ',', decimal_sep: '.' }); setShowForm(true); setEditTarget(null); }}><Plus size={12} /> Add Currency</Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-100">
                  {['ID', 'Currency Name', 'Code', 'Symbol', 'Decimals', 'Thousand Sep.', 'Decimal Sep.', 'Preview', 'Default', 'Enabled', 'Actions'].map(h => (
                    <th key={h} className="text-left py-2.5 px-3 text-neutral-500 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50">
                {currencies.map(c => (
                  <tr key={c.id} className="hover:bg-blue-50/20 transition-colors">
                    <td className="py-2.5 px-3 font-medium text-neutral-900">{c.id}</td>
                    <td className="py-2.5 px-3 text-neutral-800">{c.name}</td>
                    <td className="py-2.5 px-3"><code className="bg-neutral-100 px-1.5 py-0.5 rounded text-neutral-700 font-mono">{c.code}</code></td>
                    <td className="py-2.5 px-3 text-lg text-neutral-700">{c.symbol}</td>
                    <td className="py-2.5 px-3 text-neutral-600">{c.decimal_places}</td>
                    <td className="py-2.5 px-3 text-neutral-600 font-mono">"{c.thousand_sep}"</td>
                    <td className="py-2.5 px-3 text-neutral-600 font-mono">"{c.decimal_sep}"</td>
                    <td className="py-2.5 px-3"><code className="bg-neutral-100 px-1.5 py-0.5 rounded font-mono text-neutral-700">{c.symbol}1{c.thousand_sep}234{c.decimal_sep}56</code></td>
                    <td className="py-2.5 px-3">
                      {c.is_default ? <Badge className="text-xs bg-blue-100 text-blue-700 border-blue-200">Default</Badge>
                        : <button className="text-xs text-neutral-400 hover:text-blue-600" onClick={() => updateCurrency.mutate({ id: c.id, payload: { is_default: true } })}>Set</button>}
                    </td>
                    <td className="py-2.5 px-3"><Switch checked={c.enabled} disabled={c.is_default} onCheckedChange={v => updateCurrency.mutate({ id: c.id, payload: { enabled: v } })} /></td>
                    <td className="py-2.5 px-3">
                      <div className="flex gap-1.5">
                        <button onClick={() => { setCurForm({ name: c.name, code: c.code, symbol: c.symbol, decimal_places: String(c.decimal_places), thousand_sep: c.thousand_sep, decimal_sep: c.decimal_sep }); setEditTarget(c); setShowForm(true); }} className="text-neutral-400 hover:text-amber-500 transition-colors"><Pencil size={12} /></button>
                        {!c.is_default && <button onClick={() => deleteCurrency.mutate(c.id)} className="text-neutral-400 hover:text-red-500 transition-colors"><Trash2 size={12} /></button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {showForm && (
            <div className="p-4 border-t border-neutral-100">
              <Card className="border border-neutral-300 shadow-none max-w-md">
                <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-sm font-semibold">{editTarget ? 'Edit Currency' : 'Add Currency'}</CardTitle>
                  <button onClick={closeForm} className="text-neutral-400 hover:text-neutral-700"><X size={14} /></button>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1"><Label className="text-xs">Currency Name *</Label><Input className="h-8 text-xs" value={curForm.name} onChange={e => setCurForm(f => ({ ...f, name: e.target.value }))} /></div>
                    <div className="space-y-1"><Label className="text-xs">Code</Label><Input className="h-8 text-xs" placeholder="e.g. JPY" value={curForm.code} onChange={e => setCurForm(f => ({ ...f, code: e.target.value }))} /></div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1"><Label className="text-xs">Symbol</Label><Input className="h-8 text-xs" value={curForm.symbol} onChange={e => setCurForm(f => ({ ...f, symbol: e.target.value }))} /></div>
                    <div className="space-y-1"><Label className="text-xs">Decimals</Label><Input type="number" className="h-8 text-xs" value={curForm.decimal_places} onChange={e => setCurForm(f => ({ ...f, decimal_places: e.target.value }))} /></div>
                    <div className="space-y-1"><Label className="text-xs">Thousand Sep.</Label><Input className="h-8 text-xs" value={curForm.thousand_sep} onChange={e => setCurForm(f => ({ ...f, thousand_sep: e.target.value }))} /></div>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" className="flex-1 bg-neutral-900 hover:bg-neutral-800 text-white gap-1 text-xs" onClick={() => {
                      if (!curForm.name || !curForm.code) return;
                      const payload = { ...curForm, decimal_places: parseInt(curForm.decimal_places) || 2 };
                      if (editTarget) { updateCurrency.mutate({ id: editTarget.id, payload }, { onSuccess: notify }); }
                      else { createCurrency.mutate(payload, { onSuccess: notify }); }
                      closeForm();
                    }}><Check size={11} /> {editTarget ? 'Save' : 'Add'}</Button>
                    <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={closeForm}>Cancel</Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* ── ADDRESS FORMATS ── */}
      {activeView === 'address' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-xs text-neutral-500">Configure address field labels and validation patterns for different countries/regions.</p>
            <Button size="sm" className="bg-neutral-900 hover:bg-neutral-800 text-white gap-1.5 text-xs" onClick={() => { setAddrForm({ name: '', fields_display: '', postal_label: 'PIN Code', state_label: 'State', phone_format: '' }); setShowForm(true); setEditTarget(null); }}><Plus size={12} /> Add Address Format</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {addrProfiles.map(addr => (
              <Card key={addr.id} className={`border shadow-none ${addr.active ? 'border-neutral-200' : 'border-neutral-100 opacity-60'}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Globe size={14} style={{ color: BRAND }} />
                      <p className="text-sm font-semibold text-neutral-900">{addr.name}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${addr.active ? 'bg-emerald-50 text-emerald-700' : 'bg-neutral-100 text-neutral-500'}`}>{addr.active ? 'Active' : 'Inactive'}</span>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div><span className="text-neutral-400">Field Order: </span><span className="text-neutral-700">{addr.fields_display}</span></div>
                    <div className="grid grid-cols-2 gap-2">
                      {[['Postal Code Label', addr.postal_label], ['State Label', addr.state_label], ['Phone Format', addr.phone_format]].map(([k, v]) => (
                        <div key={k as string} className={k === 'Phone Format' ? 'col-span-2' : ''}>
                          <p className="text-neutral-400">{k}</p>
                          <p className="font-medium text-neutral-800">{v}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3 pt-3 border-t border-neutral-100">
                    <Button size="sm" variant="outline" className="flex-1 text-xs gap-1 h-7" onClick={() => {
                      setAddrForm({ name: addr.name, fields_display: addr.fields_display, postal_label: addr.postal_label, state_label: addr.state_label, phone_format: addr.phone_format || '' });
                      setEditTarget(addr); setShowForm(true);
                    }}><Pencil size={10} /> Edit</Button>
                    <Button size="sm" variant="outline" className="flex-1 text-xs gap-1 h-7" onClick={() => updateAddr.mutate({ id: addr.id, payload: { active: !addr.active } }, { onSuccess: notify })}>
                      {addr.active ? 'Disable' : 'Enable'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {showForm && (
              <Card className="border border-neutral-300 shadow-none">
                <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-sm font-semibold">{editTarget ? 'Edit Address Format' : 'Add Address Format'}</CardTitle>
                  <button onClick={closeForm} className="text-neutral-400 hover:text-neutral-700"><X size={14} /></button>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1"><Label className="text-xs">Country/Region Name *</Label><Input className="h-8 text-xs" value={addrForm.name} onChange={e => setAddrForm(f => ({ ...f, name: e.target.value }))} /></div>
                  <div className="space-y-1"><Label className="text-xs">Field Order</Label><Input className="h-8 text-xs" placeholder="Line1, Line2, City, State, PIN, Country" value={addrForm.fields_display} onChange={e => setAddrForm(f => ({ ...f, fields_display: e.target.value }))} /></div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1"><Label className="text-xs">Postal Code Label</Label><Input className="h-8 text-xs" value={addrForm.postal_label} onChange={e => setAddrForm(f => ({ ...f, postal_label: e.target.value }))} /></div>
                    <div className="space-y-1"><Label className="text-xs">State Label</Label><Input className="h-8 text-xs" value={addrForm.state_label} onChange={e => setAddrForm(f => ({ ...f, state_label: e.target.value }))} /></div>
                  </div>
                  <div className="space-y-1"><Label className="text-xs">Phone Format</Label><Input className="h-8 text-xs" placeholder="+91 XXXXX XXXXX" value={addrForm.phone_format} onChange={e => setAddrForm(f => ({ ...f, phone_format: e.target.value }))} /></div>
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" className="flex-1 bg-neutral-900 hover:bg-neutral-800 text-white gap-1 text-xs" onClick={() => {
                      if (!addrForm.name) return;
                      if (editTarget) { updateAddr.mutate({ id: editTarget.id, payload: addrForm }, { onSuccess: notify }); }
                      else { createAddr.mutate(addrForm, { onSuccess: notify }); }
                      closeForm();
                    }}><Check size={11} /> {editTarget ? 'Save' : 'Add'}</Button>
                    <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={closeForm}>Cancel</Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* ── TRANSLATION EDITOR ── */}
      {activeView === 'translations' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 border border-neutral-200 rounded-lg px-3 py-1.5 bg-white">
                <Search size={12} className="text-neutral-400" />
                <input className="bg-transparent text-xs focus:outline-none w-32" placeholder="Search translation keys..." value={transSearch} onChange={e => setTransSearch(e.target.value)} />
              </div>
              <Select value={transModule} onValueChange={setTransModule}>
                <SelectTrigger className="h-8 text-xs w-32"><SelectValue /></SelectTrigger>
                <SelectContent>{transModules.map(m => <SelectItem key={m} value={m} className="text-xs">{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8">Export JSON</Button>
            </div>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
            <AlertCircle size={14} className="text-amber-600 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-amber-700">Translations marked in <span className="text-red-600 font-medium">red</span> are missing and will fall back to English. Click any cell to edit inline.</p>
          </div>
          <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-100">
                  <th className="text-left py-2.5 px-3 text-neutral-500 w-40">Key</th>
                  <th className="text-left py-2.5 px-3 text-neutral-500 w-20">Module</th>
                  <th className="text-left py-2.5 px-3 text-neutral-500">English (Base)</th>
                  <th className="text-left py-2.5 px-3 text-neutral-500">Hindi (hi-IN)</th>
                  <th className="text-left py-2.5 px-3 text-neutral-500">Arabic (ar-AE)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50">
                {filteredTrans.map(t => (
                  <tr key={t.id} className="hover:bg-blue-50/10 transition-colors">
                    <td className="py-2 px-3"><code className="text-neutral-600 font-mono text-xs">{t.key}</code></td>
                    <td className="py-2 px-3"><span className="px-2 py-0.5 rounded text-xs" style={{ background: '#009FE315', color: BRAND }}>{t.module}</span></td>
                    <td className="py-2 px-3 font-medium text-neutral-900">{t.en}</td>
                    <td className="py-2 px-3" onClick={() => setEditKey(`${t.id}-hi`)}>
                      {editKey === `${t.id}-hi` ? (
                        <input autoFocus className="border border-[#009FE3] rounded px-2 py-0.5 text-xs w-full focus:outline-none"
                          defaultValue={t.hi || ''} onBlur={e => { updateTranslation.mutate({ id: t.id, payload: { hi: e.target.value } }, { onSuccess: notify }); setEditKey(null); }} />
                      ) : (
                        <span className={`cursor-pointer hover:bg-neutral-100 px-1 rounded ${!t.hi ? 'text-red-400 italic' : 'text-neutral-800'}`}>{t.hi || '— missing —'}</span>
                      )}
                    </td>
                    <td className="py-2 px-3" onClick={() => setEditKey(`${t.id}-ar`)}>
                      {editKey === `${t.id}-ar` ? (
                        <input autoFocus className="border border-[#009FE3] rounded px-2 py-0.5 text-xs w-full focus:outline-none"
                          defaultValue={t.ar || ''} onBlur={e => { updateTranslation.mutate({ id: t.id, payload: { ar: e.target.value } }, { onSuccess: notify }); setEditKey(null); }} />
                      ) : (
                        <span className={`cursor-pointer hover:bg-neutral-100 px-1 rounded ${!t.ar ? 'text-red-400 italic' : 'text-neutral-800'} text-right block`} dir="rtl">{t.ar || '— missing —'}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-5 py-3 border-t border-neutral-100 flex justify-between items-center">
              <span className="text-xs text-neutral-400">{filteredTrans.length} translation keys shown</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
