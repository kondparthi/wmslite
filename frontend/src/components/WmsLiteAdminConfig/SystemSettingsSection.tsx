import { useEffect, useState } from 'react';
import { Save, RefreshCw, AlertTriangle, CheckCircle, Upload, Settings, Hash, ToggleLeft, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import {
  useSystemSettings, useUpdateSystemSettings,
  useBranding, useUpdateBranding,
  useModuleToggles, useUpdateModuleToggle,
  useNumberingSequences, useUpdateNumberingSequence,
  useWarehouses,
} from '@/hooks/useAdminConfigApi';

type ViewType = 'general' | 'branding' | 'modules' | 'sequences';

export default function SystemSettingsSection() {
  const [activeView, setActiveView] = useState<ViewType>('general');
  const [saved, setSaved] = useState(false);

  const { data: settingsData } = useSystemSettings();
  const updateSettings = useUpdateSystemSettings();
  const { data: brandingData } = useBranding();
  const updateBranding = useUpdateBranding();
  const { data: moduleToggles = [] } = useModuleToggles();
  const updateModuleToggle = useUpdateModuleToggle();
  const { data: sequenceData = [] } = useNumberingSequences();
  const updateSequence = useUpdateNumberingSequence();
  const { data: warehouses = [] } = useWarehouses();

  const [settings, setSettings] = useState({
    systemName: 'WMS Lite',
    companyName: 'DELAPLEX Logistics',
    defaultWarehouseId: null as number | null,
    timezone: 'Asia/Kolkata',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '24h',
    currency: 'INR',
    fiscalYearStart: '04',
    sessionTimeout: '30',
    maxLoginAttempts: '5',
    autoLogout: true,
    maintenanceMode: false,
    debugMode: false,
    apiRateLimit: '1000',
    dataRetentionDays: '365',
    backupFrequency: 'daily',
  });

  const [branding, setBranding] = useState({
    primaryColor: '#111827',
    secondaryColor: '#6B7280',
    accentColor: '#3B82F6',
    logoText: 'WMS Lite',
    tagline: 'Intelligent Warehouse Operations',
    faviconText: 'WL',
    footerText: '© 2026 DELAPLEX Logistics Pvt. Ltd. All rights reserved.',
    sidebarStyle: 'dark',
    fontFamily: 'Inter',
  });

  const [seqData, setSeqData] = useState<typeof sequenceData>([]);

  useEffect(() => {
    if (settingsData) {
      setSettings({
        systemName: settingsData.system_name,
        companyName: settingsData.company_name,
        defaultWarehouseId: settingsData.default_warehouse_id,
        timezone: settingsData.timezone,
        dateFormat: settingsData.date_format,
        timeFormat: settingsData.time_format,
        currency: settingsData.currency,
        fiscalYearStart: settingsData.fiscal_year_start,
        sessionTimeout: String(settingsData.session_timeout_minutes),
        maxLoginAttempts: String(settingsData.max_login_attempts),
        autoLogout: settingsData.auto_logout,
        maintenanceMode: settingsData.maintenance_mode,
        debugMode: settingsData.debug_mode,
        apiRateLimit: String(settingsData.api_rate_limit),
        dataRetentionDays: String(settingsData.data_retention_days),
        backupFrequency: settingsData.backup_frequency,
      });
    }
  }, [settingsData]);

  useEffect(() => {
    if (brandingData) {
      setBranding({
        primaryColor: brandingData.primary_color,
        secondaryColor: brandingData.secondary_color,
        accentColor: brandingData.accent_color,
        logoText: brandingData.logo_text,
        tagline: brandingData.tagline,
        faviconText: brandingData.favicon_text,
        footerText: brandingData.footer_text,
        sidebarStyle: brandingData.sidebar_style,
        fontFamily: brandingData.font_family,
      });
    }
  }, [brandingData]);

  useEffect(() => {
    setSeqData(sequenceData);
  }, [sequenceData]);

  const showSaved = () => { setSaved(true); setTimeout(() => setSaved(false), 3000); };

  const handleSaveGeneral = () => {
    updateSettings.mutate({
      system_name: settings.systemName,
      company_name: settings.companyName,
      default_warehouse_id: settings.defaultWarehouseId,
      timezone: settings.timezone,
      date_format: settings.dateFormat,
      time_format: settings.timeFormat,
      currency: settings.currency,
      fiscal_year_start: settings.fiscalYearStart,
      session_timeout_minutes: parseInt(settings.sessionTimeout) || 0,
      max_login_attempts: parseInt(settings.maxLoginAttempts) || 0,
      auto_logout: settings.autoLogout,
      maintenance_mode: settings.maintenanceMode,
      debug_mode: settings.debugMode,
      api_rate_limit: parseInt(settings.apiRateLimit) || 0,
      data_retention_days: parseInt(settings.dataRetentionDays) || 0,
      backup_frequency: settings.backupFrequency,
    }, { onSuccess: showSaved });
  };

  const handleSaveBranding = () => {
    updateBranding.mutate({
      primary_color: branding.primaryColor,
      secondary_color: branding.secondaryColor,
      accent_color: branding.accentColor,
      logo_text: branding.logoText,
      tagline: branding.tagline,
      favicon_text: branding.faviconText,
      footer_text: branding.footerText,
      sidebar_style: branding.sidebarStyle,
      font_family: branding.fontFamily,
    }, { onSuccess: showSaved });
  };

  const handleSaveSequences = () => {
    Promise.all(seqData.map(s => updateSequence.mutateAsync({
      id: s.id,
      payload: { prefix: s.prefix, suffix: s.suffix, next_seq: s.next_seq, pad_length: s.pad_length, active: s.active },
    }))).then(showSaved);
  };

  const handleSave = () => {
    if (activeView === 'general') handleSaveGeneral();
    else if (activeView === 'branding') handleSaveBranding();
    else if (activeView === 'sequences') handleSaveSequences();
    else showSaved();
  };

  const views = [
    { id: 'general', label: 'General', icon: Settings },
    { id: 'branding', label: 'Branding & UI', icon: Palette },
    { id: 'modules', label: 'Module Toggles', icon: ToggleLeft },
    { id: 'sequences', label: 'Numbering Sequences', icon: Hash },
  ];

  const toggleModule = (id: number, current: boolean, core: boolean) => {
    if (core) return;
    updateModuleToggle.mutate({ id, enabled: !current });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-neutral-900">System Settings</h2>
          <p className="text-sm text-neutral-500 mt-0.5">Configure global system parameters, branding, modules and numbering</p>
        </div>
        <div className="flex items-center gap-2">
          {saved && (
            <div className="flex items-center gap-1.5 text-emerald-600 text-sm">
              <CheckCircle className="w-4 h-4" />
              <span>Saved successfully</span>
            </div>
          )}
          <Button variant="outline" size="sm" className="gap-2">
            <RefreshCw className="w-3.5 h-3.5" />Reset Defaults
          </Button>
          <Button size="sm" className="gap-2 bg-neutral-900 hover:bg-neutral-800 text-white" onClick={handleSave}>
            <Save className="w-3.5 h-3.5" />Save Changes
          </Button>
        </div>
      </div>

      {/* Sub nav */}
      <div className="flex gap-1 flex-wrap">
        {views.map(v => {
          const Icon = v.icon;
          return (
            <button key={v.id} onClick={() => setActiveView(v.id as ViewType)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${activeView === v.id ? 'bg-neutral-900 text-white border-neutral-900' : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-400'}`}>
              <Icon className="w-3.5 h-3.5" />{v.label}
            </button>
          );
        })}
      </div>

      {/* GENERAL */}
      {activeView === 'general' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border border-neutral-200 shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-neutral-900">General Information</CardTitle>
              <CardDescription className="text-xs">Application identity and branding settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-neutral-700">System Name</Label>
                <Input value={settings.systemName} onChange={e => setSettings({ ...settings, systemName: e.target.value })} className="h-8 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-neutral-700">Company / Tenant Name</Label>
                <Input value={settings.companyName} onChange={e => setSettings({ ...settings, companyName: e.target.value })} className="h-8 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-neutral-700">Default Warehouse</Label>
                <Select value={settings.defaultWarehouseId ? String(settings.defaultWarehouseId) : ''} onValueChange={v => setSettings({ ...settings, defaultWarehouseId: v ? parseInt(v) : null })}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {warehouses.map(w => (
                      <SelectItem key={w.id} value={String(w.id)}>{w.code} – {w.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-neutral-700">Fiscal Year Start Month</Label>
                <Select value={settings.fiscalYearStart} onValueChange={v => setSettings({ ...settings, fiscalYearStart: v })}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['January','February','March','April','May','June','July','August','September','October','November','December'].map(m => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-neutral-200 shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-neutral-900">Date, Time & Currency</CardTitle>
              <CardDescription className="text-xs">Regional formatting for the entire platform</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-neutral-700">Timezone</Label>
                <Select value={settings.timezone} onValueChange={v => setSettings({ ...settings, timezone: v })}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Asia/Kolkata">Asia/Kolkata (IST +5:30)</SelectItem>
                    <SelectItem value="UTC">UTC +0:00</SelectItem>
                    <SelectItem value="America/New_York">America/New_York (EST -5:00)</SelectItem>
                    <SelectItem value="Europe/London">Europe/London (GMT +0:00)</SelectItem>
                    <SelectItem value="Asia/Dubai">Asia/Dubai (GST +4:00)</SelectItem>
                    <SelectItem value="Asia/Singapore">Asia/Singapore (SGT +8:00)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-neutral-700">Date Format</Label>
                <Select value={settings.dateFormat} onValueChange={v => setSettings({ ...settings, dateFormat: v })}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                    <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                    <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                    <SelectItem value="DD-MM-YYYY">DD-MM-YYYY</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-neutral-700">Time Format</Label>
                <Select value={settings.timeFormat} onValueChange={v => setSettings({ ...settings, timeFormat: v })}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="24h">24-Hour (HH:MM)</SelectItem>
                    <SelectItem value="12h">12-Hour (hh:MM AM/PM)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-neutral-700">Currency</Label>
                <Select value={settings.currency} onValueChange={v => setSettings({ ...settings, currency: v })}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INR">INR – Indian Rupee (₹)</SelectItem>
                    <SelectItem value="USD">USD – US Dollar ($)</SelectItem>
                    <SelectItem value="EUR">EUR – Euro (€)</SelectItem>
                    <SelectItem value="GBP">GBP – British Pound (£)</SelectItem>
                    <SelectItem value="AED">AED – UAE Dirham (د.إ)</SelectItem>
                    <SelectItem value="SGD">SGD – Singapore Dollar (S$)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-neutral-200 shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-neutral-900">Security & Session</CardTitle>
              <CardDescription className="text-xs">Login, authentication and session management</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-neutral-700">Session Timeout (minutes)</Label>
                <Input type="number" value={settings.sessionTimeout} onChange={e => setSettings({ ...settings, sessionTimeout: e.target.value })} className="h-8 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-neutral-700">Max Login Attempts</Label>
                <Input type="number" value={settings.maxLoginAttempts} onChange={e => setSettings({ ...settings, maxLoginAttempts: e.target.value })} className="h-8 text-sm" />
              </div>
              <div className="flex items-center justify-between py-1">
                <div>
                  <p className="text-xs font-medium text-neutral-700">Auto Logout on Inactivity</p>
                  <p className="text-xs text-neutral-500">Automatically log out idle users</p>
                </div>
                <Switch checked={settings.autoLogout} onCheckedChange={v => setSettings({ ...settings, autoLogout: v })} />
              </div>
              <Separator />
              <div className="flex items-center justify-between py-1">
                <div>
                  <p className="text-xs font-medium text-neutral-700">Maintenance Mode</p>
                  <p className="text-xs text-neutral-500">Block all non-admin access</p>
                </div>
                <div className="flex items-center gap-2">
                  {settings.maintenanceMode && <Badge variant="destructive" className="text-xs">ACTIVE</Badge>}
                  <Switch checked={settings.maintenanceMode} onCheckedChange={v => setSettings({ ...settings, maintenanceMode: v })} />
                </div>
              </div>
              <div className="flex items-center justify-between py-1">
                <div>
                  <p className="text-xs font-medium text-neutral-700">Debug Mode</p>
                  <p className="text-xs text-neutral-500">Enable verbose logging (dev only)</p>
                </div>
                <Switch checked={settings.debugMode} onCheckedChange={v => setSettings({ ...settings, debugMode: v })} />
              </div>
            </CardContent>
          </Card>

          <Card className="border border-neutral-200 shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-neutral-900">Performance & Data</CardTitle>
              <CardDescription className="text-xs">API limits, retention policies and backup schedules</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-neutral-700">API Rate Limit (requests/min)</Label>
                <Input type="number" value={settings.apiRateLimit} onChange={e => setSettings({ ...settings, apiRateLimit: e.target.value })} className="h-8 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-neutral-700">Data Retention (days)</Label>
                <Input type="number" value={settings.dataRetentionDays} onChange={e => setSettings({ ...settings, dataRetentionDays: e.target.value })} className="h-8 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-neutral-700">Backup Frequency</Label>
                <Select value={settings.backupFrequency} onValueChange={v => setSettings({ ...settings, backupFrequency: v })}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Real-time">Real-time</SelectItem>
                    <SelectItem value="Hourly">Hourly</SelectItem>
                    <SelectItem value="Daily">Daily</SelectItem>
                    <SelectItem value="Weekly">Weekly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-amber-700">Changes to data retention and backup settings take effect on the next scheduled maintenance window.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* BRANDING */}
      {activeView === 'branding' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border border-neutral-200 shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Brand Identity</CardTitle>
              <CardDescription className="text-xs">Logo, name and tagline shown across the application</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Logo Upload Area */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-neutral-700">Company Logo</Label>
                <div className="border-2 border-dashed border-neutral-200 rounded-lg p-6 flex flex-col items-center justify-center gap-2 bg-neutral-50">
                  <div className="w-16 h-16 bg-neutral-900 rounded-xl flex items-center justify-center">
                    <span className="text-white text-lg font-bold">{branding.faviconText}</span>
                  </div>
                  <p className="text-xs text-neutral-500">Current logo (text-based)</p>
                  <Button variant="outline" size="sm" className="gap-2 mt-1"><Upload className="w-3.5 h-3.5" />Upload Logo (PNG/SVG)</Button>
                  <p className="text-xs text-neutral-400">Recommended: 200×60px, transparent background</p>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-neutral-700">Logo Text (fallback)</Label>
                <Input value={branding.logoText} onChange={e => setBranding({ ...branding, logoText: e.target.value })} className="h-8 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-neutral-700">Application Tagline</Label>
                <Input value={branding.tagline} onChange={e => setBranding({ ...branding, tagline: e.target.value })} className="h-8 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-neutral-700">Browser Tab / Favicon Text</Label>
                <Input value={branding.faviconText} onChange={e => setBranding({ ...branding, faviconText: e.target.value })} className="h-8 text-sm" maxLength={3} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-neutral-700">Footer Copyright Text</Label>
                <Textarea value={branding.footerText} onChange={e => setBranding({ ...branding, footerText: e.target.value })} className="text-sm resize-none" rows={2} />
              </div>
            </CardContent>
          </Card>

          <Card className="border border-neutral-200 shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Colour & Typography</CardTitle>
              <CardDescription className="text-xs">Theme colours and font settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: 'Primary', key: 'primaryColor', value: branding.primaryColor },
                  { label: 'Secondary', key: 'secondaryColor', value: branding.secondaryColor },
                  { label: 'Accent', key: 'accentColor', value: branding.accentColor },
                ].map(c => (
                  <div key={c.key} className="space-y-1.5">
                    <Label className="text-xs font-medium text-neutral-700">{c.label} Colour</Label>
                    <div className="flex items-center gap-2">
                      <input type="color" value={c.value} onChange={e => setBranding({ ...branding, [c.key]: e.target.value })}
                        className="w-8 h-8 rounded cursor-pointer border border-neutral-200" />
                      <Input value={c.value} onChange={e => setBranding({ ...branding, [c.key]: e.target.value })} className="h-8 text-xs font-mono" />
                    </div>
                  </div>
                ))}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-neutral-700">Sidebar Style</Label>
                <Select value={branding.sidebarStyle} onValueChange={v => setBranding({ ...branding, sidebarStyle: v })}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dark">Dark Sidebar</SelectItem>
                    <SelectItem value="light">Light Sidebar</SelectItem>
                    <SelectItem value="brand">Brand Coloured</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-neutral-700">Font Family</Label>
                <Select value={branding.fontFamily} onValueChange={v => setBranding({ ...branding, fontFamily: v })}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Inter">Inter (Default)</SelectItem>
                    <SelectItem value="Roboto">Roboto</SelectItem>
                    <SelectItem value="Poppins">Poppins</SelectItem>
                    <SelectItem value="DM Sans">DM Sans</SelectItem>
                    <SelectItem value="Plus Jakarta Sans">Plus Jakarta Sans</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {/* Preview Card */}
              <div className="mt-2 border border-neutral-200 rounded-lg overflow-hidden">
                <div className="px-4 py-2 text-xs font-semibold text-neutral-500 bg-neutral-50">Live Preview</div>
                <div className="p-4" style={{ fontFamily: branding.fontFamily }}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: branding.primaryColor }}>
                      {branding.faviconText}
                    </div>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: branding.primaryColor }}>{branding.logoText}</p>
                      <p className="text-xs" style={{ color: branding.secondaryColor }}>{branding.tagline}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <div className="px-3 py-1 rounded text-white text-xs" style={{ backgroundColor: branding.primaryColor }}>Primary Button</div>
                    <div className="px-3 py-1 rounded text-white text-xs" style={{ backgroundColor: branding.accentColor }}>Accent Button</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* MODULE TOGGLES */}
      {activeView === 'modules' && (
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-blue-700">Core modules cannot be disabled. Optional modules can be enabled/disabled per licence entitlement. Changes take effect on next login.</p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {moduleToggles.map(mod => (
              <Card key={mod.id} className="border border-neutral-200 shadow-none">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-start gap-3">
                      <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${mod.enabled ? 'bg-emerald-500' : 'bg-neutral-300'}`} />
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-neutral-900">{mod.label}</p>
                          {mod.core && <Badge className="text-xs bg-blue-100 text-blue-700 border-blue-200">Core</Badge>}
                        </div>
                        <p className="text-xs text-neutral-500 mt-0.5">{mod.description}</p>
                      </div>
                    </div>
                    <Switch
                      checked={mod.enabled}
                      disabled={mod.core}
                      onCheckedChange={() => toggleModule(mod.id, mod.enabled, mod.core)}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* NUMBERING SEQUENCES */}
      {activeView === 'sequences' && (
        <div className="space-y-4">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-amber-700">Modifying the next sequence number will affect document numbering immediately. Reset only if advised by support.</p>
          </div>
          <Card className="border border-neutral-200 shadow-none overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-neutral-50 border-b border-neutral-200">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-600">Module</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-600">Entity</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-600">Prefix</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-600">Suffix</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-600">Next Sequence</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-600">Pad Length</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-600">Preview</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-600">Active</th>
                  </tr>
                </thead>
                <tbody>
                  {seqData.map((seq, idx) => (
                    <tr key={seq.id} className={`border-b border-neutral-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-neutral-50/40'}`}>
                      <td className="px-4 py-2.5">
                        <Badge variant="outline" className="text-xs">{seq.module}</Badge>
                      </td>
                      <td className="px-4 py-2.5 font-medium text-neutral-800">{seq.entity}</td>
                      <td className="px-4 py-2.5">
                        <Input value={seq.prefix} onChange={e => setSeqData(prev => prev.map((s, i) => i === idx ? { ...s, prefix: e.target.value } : s))}
                          className="h-7 text-xs font-mono w-24" />
                      </td>
                      <td className="px-4 py-2.5">
                        <Input value={seq.suffix} onChange={e => setSeqData(prev => prev.map((s, i) => i === idx ? { ...s, suffix: e.target.value } : s))}
                          className="h-7 text-xs font-mono w-20" placeholder="—" />
                      </td>
                      <td className="px-4 py-2.5">
                        <Input value={String(seq.next_seq)} onChange={e => setSeqData(prev => prev.map((s, i) => i === idx ? { ...s, next_seq: parseInt(e.target.value) || 0 } : s))}
                          className="h-7 text-xs font-mono w-24" />
                      </td>
                      <td className="px-4 py-2.5">
                        <Select value={String(seq.pad_length)} onValueChange={v => setSeqData(prev => prev.map((s, i) => i === idx ? { ...s, pad_length: parseInt(v) } : s))}>
                          <SelectTrigger className="h-7 text-xs w-16"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {[3,4,5,6,7,8].map(n => <SelectItem key={n} value={String(n)} className="text-xs">{n}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-4 py-2.5">
                        <code className="text-xs bg-neutral-100 px-2 py-0.5 rounded font-mono text-neutral-700">
                          {seq.prefix}{String(seq.next_seq).padStart(seq.pad_length, '0')}{seq.suffix}
                        </code>
                      </td>
                      <td className="px-4 py-2.5">
                        <Switch checked={seq.active} onCheckedChange={v => setSeqData(prev => prev.map((s, i) => i === idx ? { ...s, active: v } : s))} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-4 border-t border-neutral-200 flex justify-end">
              <Button size="sm" className="bg-neutral-900 text-white hover:bg-neutral-800 gap-2" onClick={handleSaveSequences}>
                <Save className="w-3.5 h-3.5" />Save Sequences
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
