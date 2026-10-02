import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, HelpCircle, Search, MessageSquare, BookOpen, Video,
  Phone, Mail, Clock, CheckCircle2, ChevronDown, ChevronUp,
  Zap, Shield, Database, TruckIcon, PackageOpen, BarChart3,
  ExternalLink, Star, ThumbsUp, AlertCircle, Headphones
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

const faqs = [
  {
    category: 'Getting Started',
    items: [
      { q: 'How do I create a new user account?', a: 'Navigate to Admin Configuration → Users & Roles → Click "Add User". Fill in the name, email, role, and warehouse assignment. The user will receive an email invitation to set their password.' },
      { q: 'How do I configure a new warehouse?', a: 'Go to Admin Configuration → Warehouse Config. Click "Add Warehouse" and configure zones, areas, locations, and dock doors. Ensure the numbering sequences are set up before starting operations.' },
      { q: 'What browsers does WMS Lite support?', a: 'WMS Lite supports the latest two versions of Chrome, Firefox, Edge, and Safari. Internet Explorer is not supported. We recommend Chrome for the best experience.' },
    ]
  },
  {
    category: 'Inbound Operations',
    items: [
      { q: 'How do I create a Purchase Order?', a: 'Navigate to Inbound → Purchase Orders → Click "Create PO". Enter supplier details, expected delivery date, and line items. Save as Draft to continue editing or Submit to activate.' },
      { q: 'What is ASN and how does it work?', a: 'An Advance Shipment Notice (ASN) is a pre-notification of an incoming shipment. Suppliers or your ERP sends ASN data to WMS Lite, pre-filling receipt details so receiving is faster and more accurate.' },
      { q: 'How do I process a return receipt?', a: 'Go to Inbound → Receive & Putaway → Select "Return Receipt" type. Scan or enter the original order reference and follow the guided receiving process, noting any damage or quantity discrepancies.' },
    ]
  },
  {
    category: 'Inventory',
    items: [
      { q: 'How do I initiate a cycle count?', a: 'Navigate to Inventory → Cycle Count → Click "Create Count". Select count type (Full/Partial/ABC), choose zones or locations, and assign to counters. Results are reconciled automatically.' },
      { q: 'How do I place inventory on hold?', a: 'Go to Inventory → Hold Management → Select items or locations → Apply Hold. Specify the hold reason and expected resolution date. Held inventory cannot be allocated to outbound orders.' },
      { q: 'What is kitting and how do I configure it?', a: 'Kitting combines multiple SKUs into a new sellable unit (kit). Configure kit BOMs in Master Data → Material Master. Process kitting orders under Inventory → Kitting & Assembly.' },
    ]
  },
  {
    category: 'Admin & Configuration',
    items: [
      { q: 'How do I change the system currency or date format?', a: 'Go to Admin Configuration → Localization. Select your preferred currency, date/time format, and number notation. Changes apply globally to all users in your tenant.' },
      { q: 'How do I set up ERP integration?', a: 'Navigate to Admin Configuration → Integrations. Select your ERP (SAP, Oracle, etc.), enter API credentials and endpoint URLs. Test the connection before enabling live sync.' },
      { q: 'How do I configure notification alerts?', a: 'Go to Admin Configuration → Notifications. Create notification rules by selecting triggers (e.g., low stock), recipients (users or roles), channels (email/SMS/in-app), and thresholds.' },
    ]
  },
];

const articles = [
  { title: 'Quick Start Guide: First 30 Minutes', category: 'Getting Started', views: 4823, rating: 4.9, icon: Zap, color: 'text-yellow-600', bg: 'bg-yellow-50' },
  { title: 'Setting Up Your Warehouse Structure', category: 'Configuration', views: 3210, rating: 4.8, icon: Database, color: 'text-blue-600', bg: 'bg-blue-50' },
  { title: 'Inbound Receiving Best Practices', category: 'Inbound', views: 2987, rating: 4.7, icon: TruckIcon, color: 'text-green-600', bg: 'bg-green-50' },
  { title: 'Inventory Accuracy & Cycle Counting', category: 'Inventory', views: 2645, rating: 4.8, icon: PackageOpen, color: 'text-purple-600', bg: 'bg-purple-50' },
  { title: 'WMS Lite API Integration Guide', category: 'Integrations', views: 1923, rating: 4.6, icon: Shield, color: 'text-indigo-600', bg: 'bg-indigo-50' },
  { title: 'Reports & Analytics Overview', category: 'Reporting', views: 1756, rating: 4.7, icon: BarChart3, color: 'text-rose-600', bg: 'bg-rose-50' },
];

const videos = [
  { title: 'WMS Lite Platform Overview (8 min)', duration: '8:24', category: 'Overview' },
  { title: 'Creating & Managing Inbound Orders', duration: '12:07', category: 'Inbound' },
  { title: 'Outbound Picking & Shipping Workflow', duration: '15:33', category: 'Outbound' },
  { title: 'Inventory Management Deep Dive', duration: '18:45', category: 'Inventory' },
  { title: 'Admin Configuration Walkthrough', duration: '22:10', category: 'Admin' },
  { title: 'Reporting & KPI Dashboard Tutorial', duration: '9:52', category: 'Analytics' },
];

export default function SupportPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [openFaq, setOpenFaq] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-sky-50/20 to-white">
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
          <div className="inline-flex items-center gap-2 bg-sky-50 border border-sky-100 rounded-full px-4 py-1.5 mb-4">
            <Headphones className="w-4 h-4 text-sky-600" />
            <span className="text-xs font-semibold text-sky-600">Help & Support Center</span>
          </div>
          <h1 className="text-4xl font-bold text-neutral-900 mb-3">How can we help you?</h1>
          <p className="text-neutral-500 text-sm mb-6">Search our knowledge base, browse FAQs, or contact our support team.</p>
          <div className="relative max-w-xl mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <Input
              placeholder="Search articles, guides, FAQs..."
              className="pl-10 pr-4 py-3 text-sm rounded-xl border-neutral-200 shadow-sm h-12"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Contact Options */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          {[
            {
              icon: MessageSquare, title: 'Live Chat', sub: 'Chat with a support agent', status: 'Online', statusColor: 'bg-emerald-400',
              detail: 'Avg. response: < 3 min', action: 'Start Chat', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100'
            },
            {
              icon: Mail, title: 'Email Support', sub: 'support@delaplex.com', status: 'Always On', statusColor: 'bg-blue-400',
              detail: 'Response within 4 business hours', action: 'Send Email', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100'
            },
            {
              icon: Phone, title: 'Phone Support', sub: '+1 (800) 335-2739', status: 'Mon–Fri 8am–6pm PST', statusColor: 'bg-amber-400',
              detail: 'Enterprise plan priority line', action: 'View Hours', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100'
            },
          ].map((c) => (
            <Card key={c.title} className={`border ${c.border} shadow-sm hover:shadow-md transition-shadow`}>
              <CardContent className="p-5">
                <div className="flex items-start gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-xl ${c.bg} flex items-center justify-center flex-shrink-0`}>
                    <c.icon className={`w-5 h-5 ${c.color}`} />
                  </div>
                  <div>
                    <p className="font-bold text-neutral-800 text-sm">{c.title}</p>
                    <p className="text-neutral-500 text-xs">{c.sub}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 mb-3">
                  <div className={`w-1.5 h-1.5 rounded-full ${c.statusColor}`} />
                  <span className="text-xs text-neutral-600">{c.status}</span>
                </div>
                <p className="text-xs text-neutral-400 mb-3">{c.detail}</p>
                <Button size="sm" variant="outline" className={`w-full text-xs ${c.color} border-current`}>{c.action}</Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* SLA Info */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
          {[
            { label: 'P1 Critical', sla: '< 1 hour', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-100' },
            { label: 'P2 High', sla: '< 4 hours', color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-100' },
            { label: 'P3 Medium', sla: '< 1 business day', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' },
            { label: 'P4 Low', sla: '< 3 business days', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
          ].map((s) => (
            <div key={s.label} className={`${s.bg} border ${s.border} rounded-xl p-4 text-center`}>
              <Badge variant="outline" className={`text-[10px] mb-1 ${s.color} border-current`}>{s.label}</Badge>
              <p className={`font-bold text-sm ${s.color}`}>{s.sla}</p>
              <p className="text-xs text-neutral-400 mt-0.5">Response SLA</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="faq">
          <TabsList className="mb-6 bg-neutral-100 p-1 rounded-xl">
            <TabsTrigger value="faq" className="rounded-lg text-xs gap-1.5 data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <HelpCircle className="w-3.5 h-3.5" /> FAQs
            </TabsTrigger>
            <TabsTrigger value="articles" className="rounded-lg text-xs gap-1.5 data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <BookOpen className="w-3.5 h-3.5" /> Knowledge Base
            </TabsTrigger>
            <TabsTrigger value="videos" className="rounded-lg text-xs gap-1.5 data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <Video className="w-3.5 h-3.5" /> Video Tutorials
            </TabsTrigger>
          </TabsList>

          {/* FAQ Tab */}
          <TabsContent value="faq">
            <div className="space-y-6">
              {faqs.map((group) => (
                <div key={group.category}>
                  <h3 className="text-sm font-bold text-neutral-700 mb-3 flex items-center gap-2">
                    <span className="w-1.5 h-4 rounded-full" style={{ background: '#009FE3' }} />
                    {group.category}
                  </h3>
                  <div className="space-y-2">
                    {group.items.map((item, i) => {
                      const key = `${group.category}-${i}`;
                      const isOpen = openFaq === key;
                      return (
                        <Card key={key} className={`border transition-all ${isOpen ? 'border-sky-200 shadow-sm' : 'border-neutral-200'}`}>
                          <button
                            className="w-full flex items-center justify-between p-4 text-left"
                            onClick={() => setOpenFaq(isOpen ? null : key)}
                          >
                            <span className="text-sm font-medium text-neutral-800">{item.q}</span>
                            {isOpen ? <ChevronUp className="w-4 h-4 text-neutral-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-neutral-400 flex-shrink-0" />}
                          </button>
                          {isOpen && (
                            <div className="px-4 pb-4">
                              <Separator className="mb-3" />
                              <p className="text-sm text-neutral-600 leading-relaxed">{item.a}</p>
                              <div className="flex items-center gap-3 mt-3">
                                <span className="text-xs text-neutral-400">Was this helpful?</span>
                                <button className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700">
                                  <ThumbsUp className="w-3.5 h-3.5" /> Yes
                                </button>
                              </div>
                            </div>
                          )}
                        </Card>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* Articles Tab */}
          <TabsContent value="articles">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {articles.map((a) => (
                <Card key={a.title} className="border-neutral-200 shadow-sm hover:shadow-md transition-all cursor-pointer group">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-xl ${a.bg} flex items-center justify-center flex-shrink-0`}>
                        <a.icon className={`w-5 h-5 ${a.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-neutral-800 text-sm group-hover:text-blue-600 transition-colors leading-snug">{a.title}</p>
                        <div className="flex items-center gap-3 mt-2">
                          <Badge variant="secondary" className="text-[10px]">{a.category}</Badge>
                          <span className="text-xs text-neutral-400">{a.views.toLocaleString()} views</span>
                          <div className="flex items-center gap-1 text-xs text-amber-500">
                            <Star className="w-3 h-3 fill-amber-400" /> {a.rating}
                          </div>
                        </div>
                      </div>
                      <ExternalLink className="w-4 h-4 text-neutral-300 group-hover:text-blue-500 transition-colors flex-shrink-0" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Videos Tab */}
          <TabsContent value="videos">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {videos.map((v, i) => (
                <Card key={v.title} className="border-neutral-200 shadow-sm hover:shadow-md transition-all cursor-pointer group overflow-hidden">
                  <div className="relative h-32 bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Video className="w-5 h-5 text-white" />
                    </div>
                    <Badge className="absolute top-2 right-2 text-[10px] bg-black/50 text-white border-0">{v.duration}</Badge>
                    <Badge className="absolute bottom-2 left-2 text-[10px]" variant="secondary">{v.category}</Badge>
                  </div>
                  <CardContent className="p-4">
                    <p className="font-semibold text-neutral-800 text-sm group-hover:text-blue-600 transition-colors">{v.title}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {/* System Status */}
        <Card className="mt-10 border-emerald-200 bg-emerald-50">
          <CardContent className="p-5 flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
              <div>
                <p className="font-bold text-emerald-800 text-sm">All Systems Operational</p>
                <p className="text-emerald-600 text-xs">Last checked: 2 minutes ago · 99.97% uptime (last 30 days)</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {['API', 'Database', 'File Storage', 'Integrations'].map((svc) => (
                <div key={svc} className="flex items-center gap-1.5 text-xs text-emerald-700">
                  <CheckCircle2 className="w-3.5 h-3.5" /> {svc}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Footer links */}
        <div className="mt-10 border-t border-neutral-200 pt-6 flex flex-wrap items-center justify-center gap-4 text-xs text-neutral-400">
          <Link to="/privacy-policy" className="hover:text-sky-600 transition-colors">Privacy Policy</Link>
          <span>·</span>
          <Link to="/terms-and-conditions" className="hover:text-sky-600 transition-colors">Terms & Conditions</Link>
          <span>·</span>
          <Link to="/report-issue" className="hover:text-sky-600 transition-colors">Report Issue</Link>
          <span>·</span>
          <Link to="/wms-lite-dashboard" className="hover:text-sky-600 transition-colors">Back to Dashboard</Link>
        </div>
      </div>
    </div>
  );
}