import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, AlertTriangle, Bug, Zap, Shield, Upload, CheckCircle2,
  Monitor, Server, Database, Globe, Clock, User, Tag, ChevronDown,
  Paperclip, Send, RefreshCw, Eye
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';

const severityOptions = [
  { value: 'critical', label: 'P1 – Critical (System Down)', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
  { value: 'high', label: 'P2 – High (Major Feature Broken)', color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' },
  { value: 'medium', label: 'P3 – Medium (Feature Degraded)', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
  { value: 'low', label: 'P4 – Low (Minor Issue)', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
];

const moduleOptions = [
  'Dashboard', 'Inbound', 'Inventory', 'Outbound', 'Labor Management',
  '3PL Billing', 'Yard Management', 'Dynamic Slotting', 'Cross Docking',
  'Master Data', 'Admin Configuration', 'Login / Authentication', 'Reports & Analytics', 'Other',
];

const recentIssues = [
  { id: 'INC-0342', title: 'Cycle count report not generating PDF', module: 'Inventory', severity: 'medium', status: 'In Progress', date: '2026-07-12', statusColor: 'bg-amber-100 text-amber-700' },
  { id: 'INC-0338', title: 'ASN import fails for files over 5MB', module: 'Inbound', severity: 'high', status: 'Resolved', date: '2026-07-10', statusColor: 'bg-emerald-100 text-emerald-700' },
  { id: 'INC-0315', title: 'Dashboard KPI cards show incorrect totals', module: 'Dashboard', severity: 'medium', status: 'Resolved', date: '2026-07-05', statusColor: 'bg-emerald-100 text-emerald-700' },
];

export default function ReportIssue() {
  const [submitted, setSubmitted] = useState(false);
  const [severity, setSeverity] = useState('');
  const [module, setModule] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [steps, setSteps] = useState('');
  const [expected, setExpected] = useState('');
  const [actual, setActual] = useState('');
  const [ticketId] = useState(`INC-${String(Math.floor(1000 + Math.random() * 9000))}`);

  const selectedSeverity = severityOptions.find(s => s.value === severity);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (severity && module && title && description) {
      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/20 to-white flex flex-col">
        {/* Top Bar */}
        <div className="border-b border-neutral-200 bg-white/80 backdrop-blur-sm">
          <div className="max-w-4xl mx-auto px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#003A78' }}>
                <span className="text-white font-bold text-sm">W</span>
              </div>
              <span className="font-bold text-sm" style={{ color: '#003A78' }}>WMS Lite</span>
            </div>
            <Link to="/wms-lite-dashboard">
              <Button variant="ghost" size="sm" className="gap-2 text-xs">
                <ArrowLeft className="w-3.5 h-3.5" /> Dashboard
              </Button>
            </Link>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center p-8">
          <div className="max-w-lg w-full text-center">
            <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-bold text-neutral-900 mb-2">Issue Reported Successfully</h2>
            <p className="text-neutral-500 text-sm mb-6">
              Your issue has been submitted to the Delaplex support team. We will investigate and respond within the SLA timeframe.
            </p>
            <Card className="border-emerald-200 bg-emerald-50 mb-6">
              <CardContent className="p-5 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-600 font-medium">Ticket ID</span>
                  <span className="font-bold text-emerald-700 font-mono">{ticketId}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-600 font-medium">Module</span>
                  <span className="font-semibold text-neutral-800">{module}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-600 font-medium">Severity</span>
                  <Badge className={`text-xs ${selectedSeverity?.color} ${selectedSeverity?.bg} border ${selectedSeverity?.border}`}>
                    {selectedSeverity?.label.split('–')[0].trim()}
                  </Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-600 font-medium">Status</span>
                  <Badge className="text-xs bg-blue-100 text-blue-700 border-blue-200">Open</Badge>
                </div>
                <Separator />
                <p className="text-xs text-neutral-500 text-left">
                  A confirmation email has been sent to your registered address. Save your ticket ID to track this issue.
                </p>
              </CardContent>
            </Card>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={() => setSubmitted(false)} variant="outline" className="gap-2 text-sm">
                <RefreshCw className="w-4 h-4" /> Report Another Issue
              </Button>
              <Link to="/support">
                <Button variant="outline" className="gap-2 text-sm">
                  <Eye className="w-4 h-4" /> View Support Center
                </Button>
              </Link>
              <Link to="/wms-lite-dashboard">
                <Button className="gap-2 text-sm text-white" style={{ background: '#003A78' }}>
                  Back to Dashboard
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-rose-50/10 to-white">
      {/* Top Bar */}
      <div className="border-b border-neutral-200 bg-white/80 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#003A78' }}>
              <span className="text-white font-bold text-sm">W</span>
            </div>
            <span className="font-bold text-sm" style={{ color: '#003A78' }}>WMS Lite</span>
            <span className="text-neutral-300">·</span>
            <span className="text-xs text-neutral-500">by Delaplex</span>
          </div>
          <Link to="/wms-lite-dashboard">
            <Button variant="ghost" size="sm" className="gap-2 text-xs">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
            </Button>
          </Link>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-10">
        {/* Hero */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-rose-50 border border-rose-100 rounded-full px-4 py-1.5 mb-4">
            <Bug className="w-4 h-4 text-rose-600" />
            <span className="text-xs font-semibold text-rose-600">Issue Reporting</span>
          </div>
          <h1 className="text-4xl font-bold text-neutral-900 mb-3">Report an Issue</h1>
          <p className="text-neutral-500 text-sm max-w-xl mx-auto">
            Found a bug or experiencing a problem? Submit a detailed report and our team will resolve it promptly.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Form */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="space-y-6">

              {/* Severity + Module row */}
              <Card className="border-neutral-200 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold text-neutral-700 flex items-center gap-2">
                    <Tag className="w-4 h-4" /> Issue Classification
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-neutral-600">Severity Level *</Label>
                    <Select onValueChange={setSeverity} required>
                      <SelectTrigger className="text-sm">
                        <SelectValue placeholder="Select severity..." />
                      </SelectTrigger>
                      <SelectContent>
                        {severityOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            <span className={`text-xs font-medium ${opt.color}`}>{opt.label}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedSeverity && (
                      <p className={`text-xs p-2 rounded-lg ${selectedSeverity.bg} ${selectedSeverity.color} border ${selectedSeverity.border}`}>
                        {selectedSeverity.value === 'critical' && '⚡ Immediate response. System is down or data loss occurring.'}
                        {selectedSeverity.value === 'high' && '🔴 Response within 4 hours. Critical feature non-functional.'}
                        {selectedSeverity.value === 'medium' && '🟡 Response within 1 business day. Feature partially impaired.'}
                        {selectedSeverity.value === 'low' && '🔵 Response within 3 business days. Minor inconvenience.'}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-neutral-600">Affected Module *</Label>
                    <Select onValueChange={setModule} required>
                      <SelectTrigger className="text-sm">
                        <SelectValue placeholder="Select module..." />
                      </SelectTrigger>
                      <SelectContent>
                        {moduleOptions.map((m) => (
                          <SelectItem key={m} value={m}>{m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Issue Details */}
              <Card className="border-neutral-200 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold text-neutral-700 flex items-center gap-2">
                    <Bug className="w-4 h-4" /> Issue Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-neutral-600">Issue Title / Summary *</Label>
                    <Input
                      placeholder="Brief, descriptive title (e.g. 'PDF export fails on Inbound Report')"
                      className="text-sm"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      required
                    />
                    <p className="text-xs text-neutral-400">{title.length}/100 characters</p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-neutral-600">Description *</Label>
                    <Textarea
                      placeholder="Describe the issue in detail. Include what you were doing when it occurred, any error messages shown, and how often it happens..."
                      className="text-sm min-h-[100px] resize-none"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-neutral-600">Steps to Reproduce</Label>
                      <Textarea
                        placeholder="1. Navigate to...\n2. Click on...\n3. Observe..."
                        className="text-sm min-h-[100px] resize-none"
                        value={steps}
                        onChange={(e) => setSteps(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-neutral-600">Expected Behaviour</Label>
                        <Textarea
                          placeholder="What should happen when following the steps above?"
                          className="text-sm min-h-[44px] resize-none"
                          value={expected}
                          onChange={(e) => setExpected(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-neutral-600">Actual Behaviour</Label>
                        <Textarea
                          placeholder="What actually happens instead?"
                          className="text-sm min-h-[44px] resize-none"
                          value={actual}
                          onChange={(e) => setActual(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Environment */}
              <Card className="border-neutral-200 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold text-neutral-700 flex items-center gap-2">
                    <Monitor className="w-4 h-4" /> Environment (Auto-Detected)
                  </CardTitle>
                  <CardDescription className="text-xs">Collected automatically to help diagnose the issue.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {[
                    { icon: Monitor, label: 'Browser', value: 'Chrome 126' },
                    { icon: Server, label: 'OS', value: 'Windows 11' },
                    { icon: Globe, label: 'Resolution', value: '1920×1080' },
                    { icon: Database, label: 'Tenant', value: 'DELAPLEX-WH01' },
                    { icon: User, label: 'User', value: 'James Hartwell' },
                    { icon: Clock, label: 'Timestamp', value: new Date().toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' }) },
                  ].map((env) => (
                    <div key={env.label} className="bg-neutral-50 rounded-lg p-3 border border-neutral-100">
                      <div className="flex items-center gap-1.5 mb-1">
                        <env.icon className="w-3 h-3 text-neutral-400" />
                        <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">{env.label}</span>
                      </div>
                      <p className="text-xs font-semibold text-neutral-700">{env.value}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Attachments */}
              <Card className="border-neutral-200 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold text-neutral-700 flex items-center gap-2">
                    <Paperclip className="w-4 h-4" /> Attachments
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="border-2 border-dashed border-neutral-200 rounded-xl p-8 text-center hover:border-blue-300 hover:bg-blue-50/30 transition-colors cursor-pointer">
                    <Upload className="w-8 h-8 text-neutral-300 mx-auto mb-3" />
                    <p className="text-sm font-medium text-neutral-500">Drop screenshots or logs here</p>
                    <p className="text-xs text-neutral-400 mt-1">PNG, JPG, PDF, TXT, CSV — max 10 MB per file</p>
                    <Button type="button" variant="outline" size="sm" className="mt-3 text-xs">Browse Files</Button>
                  </div>
                </CardContent>
              </Card>

              {/* Submit */}
              <div className="flex items-center gap-3">
                <Button
                  type="submit"
                  className="flex-1 gap-2 text-sm font-semibold text-white h-11"
                  style={{ background: '#003A78' }}
                  disabled={!severity || !module || !title || !description}
                >
                  <Send className="w-4 h-4" /> Submit Issue Report
                </Button>
                <Button type="button" variant="outline" className="text-sm h-11">
                  Save Draft
                </Button>
              </div>
            </form>
          </div>

          {/* Sidebar */}
          <aside className="space-y-5">
            {/* Tips */}
            <Card className="border-amber-200 bg-amber-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold text-amber-800 flex items-center gap-2">
                  <Zap className="w-4 h-4" /> Tips for Faster Resolution
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {[
                  'Include exact error messages displayed on screen',
                  'Attach a screenshot or screen recording',
                  'Note the exact time the issue occurred',
                  'Mention if the issue is reproducible every time',
                  'Reference any related ticket or order numbers',
                ].map((tip, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-amber-700">
                    <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-amber-500" />
                    {tip}
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* SLA */}
            <Card className="border-neutral-200 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold text-neutral-700 flex items-center gap-2">
                  <Clock className="w-4 h-4" /> Response SLA
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {severityOptions.map((s) => (
                  <div key={s.value} className={`flex items-center justify-between p-2 rounded-lg ${s.bg} border ${s.border}`}>
                    <span className={`text-xs font-semibold ${s.color}`}>{s.label.split('–')[0].trim()}</span>
                    <span className="text-xs text-neutral-600 font-medium">
                      {s.value === 'critical' ? '< 1 hr' : s.value === 'high' ? '< 4 hrs' : s.value === 'medium' ? '< 1 day' : '< 3 days'}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Recent Issues */}
            <Card className="border-neutral-200 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold text-neutral-700 flex items-center gap-2">
                  <Shield className="w-4 h-4" /> Your Recent Issues
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {recentIssues.map((issue) => (
                  <div key={issue.id} className="p-3 bg-neutral-50 rounded-lg border border-neutral-100">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-mono text-blue-600 font-bold">{issue.id}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${issue.statusColor}`}>{issue.status}</span>
                    </div>
                    <p className="text-xs font-medium text-neutral-700 leading-snug">{issue.title}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <Badge variant="secondary" className="text-[10px]">{issue.module}</Badge>
                      <span className="text-[10px] text-neutral-400">{issue.date}</span>
                    </div>
                  </div>
                ))}
                <Link to="/support">
                  <Button variant="ghost" size="sm" className="w-full text-xs text-blue-600">View All Tickets →</Button>
                </Link>
              </CardContent>
            </Card>
          </aside>
        </div>

        {/* Footer links */}
        <div className="mt-10 border-t border-neutral-200 pt-6 flex flex-wrap items-center justify-center gap-4 text-xs text-neutral-400">
          <Link to="/privacy-policy" className="hover:text-rose-600 transition-colors">Privacy Policy</Link>
          <span>·</span>
          <Link to="/terms-and-conditions" className="hover:text-rose-600 transition-colors">Terms & Conditions</Link>
          <span>·</span>
          <Link to="/support" className="hover:text-rose-600 transition-colors">Support Center</Link>
          <span>·</span>
          <Link to="/wms-lite-dashboard" className="hover:text-rose-600 transition-colors">Back to Dashboard</Link>
        </div>
      </div>
    </div>
  );
}