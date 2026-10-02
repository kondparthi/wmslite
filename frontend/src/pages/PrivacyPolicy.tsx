import { Link } from 'react-router-dom';
import { Shield, Lock, Eye, Database, Globe, Bell, ChevronRight, ArrowLeft, FileText, Mail, Phone, MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

const sections = [
  { id: 'information-collection', icon: Database, title: 'Information We Collect', color: 'text-blue-600', bg: 'bg-blue-50' },
  { id: 'data-usage', icon: Eye, title: 'How We Use Your Data', color: 'text-purple-600', bg: 'bg-purple-50' },
  { id: 'data-sharing', icon: Globe, title: 'Data Sharing & Disclosure', color: 'text-emerald-600', bg: 'bg-emerald-50' },
  { id: 'data-security', icon: Lock, title: 'Data Security', color: 'text-red-600', bg: 'bg-red-50' },
  { id: 'cookies', icon: Shield, title: 'Cookies & Tracking', color: 'text-amber-600', bg: 'bg-amber-50' },
  { id: 'notifications', icon: Bell, title: 'Communications & Notifications', color: 'text-indigo-600', bg: 'bg-indigo-50' },
];

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-white">
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
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-full px-4 py-1.5 mb-4">
            <Shield className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-semibold text-blue-600">Privacy & Data Protection</span>
          </div>
          <h1 className="text-4xl font-bold text-neutral-900 mb-3">Privacy Policy</h1>
          <p className="text-neutral-500 max-w-2xl mx-auto text-sm leading-relaxed">
            At Delaplex, we are committed to protecting your personal information and your right to privacy.
            This policy explains how we collect, use, and safeguard your data within the WMS Lite platform.
          </p>
          <div className="flex items-center justify-center gap-4 mt-4">
            <Badge variant="secondary" className="text-xs">Last Updated: 14 July 2026</Badge>
            <Badge variant="secondary" className="text-xs">Version 2.4</Badge>
            <Badge className="text-xs bg-emerald-100 text-emerald-700 border-emerald-200">GDPR Compliant</Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sticky Table of Contents */}
          <aside className="lg:col-span-1">
            <div className="sticky top-20">
              <Card className="border-neutral-200 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold text-neutral-700 flex items-center gap-2">
                    <FileText className="w-4 h-4" /> Contents
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-1">
                  {sections.map((s) => (
                    <a
                      key={s.id}
                      href={`#${s.id}`}
                      className="flex items-center gap-2 text-xs text-neutral-500 hover:text-blue-600 py-1.5 px-2 rounded-md hover:bg-blue-50 transition-colors group"
                    >
                      <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                      {s.title}
                    </a>
                  ))}
                  <Separator className="my-2" />
                  <a href="#contact" className="flex items-center gap-2 text-xs text-neutral-500 hover:text-blue-600 py-1.5 px-2 rounded-md hover:bg-blue-50 transition-colors group">
                    <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" /> Contact Us
                  </a>
                  <a href="#your-rights" className="flex items-center gap-2 text-xs text-neutral-500 hover:text-blue-600 py-1.5 px-2 rounded-md hover:bg-blue-50 transition-colors group">
                    <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" /> Your Rights
                  </a>
                </CardContent>
              </Card>
            </div>
          </aside>

          {/* Main Content */}
          <main className="lg:col-span-3 space-y-8">

            {/* Section 1 */}
            <section id="information-collection">
              <Card className="border-neutral-200 shadow-sm">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                      <Database className="w-5 h-5 text-blue-600" />
                    </div>
                    <CardTitle className="text-lg font-bold text-neutral-800">1. Information We Collect</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 text-sm text-neutral-600 leading-relaxed">
                  <p>We collect information that you provide directly to us and information automatically collected when you use WMS Lite:</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                      <h4 className="font-semibold text-blue-800 mb-2 text-xs uppercase tracking-wider">Account Information</h4>
                      <ul className="space-y-1 text-xs text-blue-700">
                        <li>• Full name and email address</li>
                        <li>• Username and password (encrypted)</li>
                        <li>• Job title and department</li>
                        <li>• Profile photo (optional)</li>
                      </ul>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-4 border border-purple-100">
                      <h4 className="font-semibold text-purple-800 mb-2 text-xs uppercase tracking-wider">Usage Data</h4>
                      <ul className="space-y-1 text-xs text-purple-700">
                        <li>• Login timestamps and session duration</li>
                        <li>• Pages visited and features used</li>
                        <li>• Actions performed (audit trail)</li>
                        <li>• Device & browser information</li>
                      </ul>
                    </div>
                    <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-100">
                      <h4 className="font-semibold text-emerald-800 mb-2 text-xs uppercase tracking-wider">Operational Data</h4>
                      <ul className="space-y-1 text-xs text-emerald-700">
                        <li>• Warehouse transactions and orders</li>
                        <li>• Inventory movements and adjustments</li>
                        <li>• Labor tracking records</li>
                        <li>• Shipping and receiving manifests</li>
                      </ul>
                    </div>
                    <div className="bg-amber-50 rounded-lg p-4 border border-amber-100">
                      <h4 className="font-semibold text-amber-800 mb-2 text-xs uppercase tracking-wider">Technical Data</h4>
                      <ul className="space-y-1 text-xs text-amber-700">
                        <li>• IP address and geolocation</li>
                        <li>• API access logs</li>
                        <li>• Error reports and diagnostics</li>
                        <li>• Integration sync history</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* Section 2 */}
            <section id="data-usage">
              <Card className="border-neutral-200 shadow-sm">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center">
                      <Eye className="w-5 h-5 text-purple-600" />
                    </div>
                    <CardTitle className="text-lg font-bold text-neutral-800">2. How We Use Your Data</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-neutral-600 leading-relaxed">
                  <p>Your data is used exclusively to deliver, maintain, and improve the WMS Lite platform:</p>
                  <div className="space-y-3">
                    {[
                      { title: 'Service Delivery', desc: 'To operate core WMS functionality including inbound, outbound, inventory, and billing operations.' },
                      { title: 'Authentication & Security', desc: 'To verify identity, enforce access controls, and protect against unauthorized access.' },
                      { title: 'Analytics & Improvement', desc: 'To understand usage patterns, identify bugs, and continuously improve system performance.' },
                      { title: 'Compliance & Auditing', desc: 'To maintain immutable audit logs for regulatory compliance and internal governance.' },
                      { title: 'Communications', desc: 'To send system notifications, alerts, and updates relevant to your warehouse operations.' },
                    ].map((item) => (
                      <div key={item.title} className="flex gap-3 p-3 bg-neutral-50 rounded-lg border border-neutral-100">
                        <div className="w-2 h-2 rounded-full bg-purple-400 mt-1.5 flex-shrink-0" />
                        <div>
                          <span className="font-semibold text-neutral-800">{item.title}: </span>
                          <span>{item.desc}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* Section 3 */}
            <section id="data-sharing">
              <Card className="border-neutral-200 shadow-sm">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
                      <Globe className="w-5 h-5 text-emerald-600" />
                    </div>
                    <CardTitle className="text-lg font-bold text-neutral-800">3. Data Sharing & Disclosure</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 text-sm text-neutral-600 leading-relaxed">
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                    <p className="font-semibold text-emerald-800 mb-1">We do not sell your data.</p>
                    <p className="text-emerald-700 text-xs">Delaplex does not sell, trade, or rent your personal information to third parties for marketing purposes.</p>
                  </div>
                  <p>We may share data only in the following limited circumstances:</p>
                  <div className="space-y-2">
                    {[
                      { scenario: 'Service Providers', detail: 'Vetted third-party vendors (cloud hosting, payment processing) under strict data processing agreements.' },
                      { scenario: 'ERP / TMS Integration', detail: 'Data exchanged with connected enterprise systems as configured by your administrator.' },
                      { scenario: 'Legal Requirements', detail: 'When required by law, court order, or regulatory authority, with notice to you where permitted.' },
                      { scenario: 'Business Transfer', detail: 'In the event of a merger or acquisition, with equivalent privacy protections maintained.' },
                    ].map((item) => (
                      <div key={item.scenario} className="flex gap-3 p-3 border border-neutral-200 rounded-lg">
                        <Badge variant="outline" className="text-xs h-fit whitespace-nowrap">{item.scenario}</Badge>
                        <p className="text-xs text-neutral-500">{item.detail}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* Section 4 */}
            <section id="data-security">
              <Card className="border-neutral-200 shadow-sm">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center">
                      <Lock className="w-5 h-5 text-red-600" />
                    </div>
                    <CardTitle className="text-lg font-bold text-neutral-800">4. Data Security</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 text-sm text-neutral-600 leading-relaxed">
                  <p>We implement industry-standard security measures to protect your information:</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {[
                      { label: 'AES-256 Encryption', sub: 'Data at rest' },
                      { label: 'TLS 1.3', sub: 'Data in transit' },
                      { label: 'JWT + SSO', sub: 'Authentication' },
                      { label: 'MFA / 2FA', sub: 'Access control' },
                      { label: 'IP Whitelisting', sub: 'Network security' },
                      { label: 'SOC 2 Type II', sub: 'Certification' },
                    ].map((item) => (
                      <div key={item.label} className="bg-red-50 border border-red-100 rounded-lg p-3 text-center">
                        <p className="font-bold text-red-700 text-xs">{item.label}</p>
                        <p className="text-red-500 text-[11px] mt-0.5">{item.sub}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* Section 5 */}
            <section id="cookies">
              <Card className="border-neutral-200 shadow-sm">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center">
                      <Shield className="w-5 h-5 text-amber-600" />
                    </div>
                    <CardTitle className="text-lg font-bold text-neutral-800">5. Cookies & Tracking</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-neutral-600 leading-relaxed">
                  <p>WMS Lite uses only functional and security cookies. We do not use advertising or tracking cookies.</p>
                  <table className="w-full text-xs border border-neutral-200 rounded-lg overflow-hidden">
                    <thead>
                      <tr className="bg-neutral-50">
                        <th className="text-left p-3 font-semibold text-neutral-700">Cookie</th>
                        <th className="text-left p-3 font-semibold text-neutral-700">Purpose</th>
                        <th className="text-left p-3 font-semibold text-neutral-700">Duration</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {[
                        { name: 'wms_session', purpose: 'User authentication session', duration: '8 hours' },
                        { name: 'csrf_token', purpose: 'Cross-site request forgery protection', duration: 'Session' },
                        { name: 'ui_preferences', purpose: 'Theme, language, layout settings', duration: '1 year' },
                        { name: 'analytics_id', purpose: 'Anonymous usage analytics (no PII)', duration: '90 days' },
                      ].map((c) => (
                        <tr key={c.name} className="hover:bg-neutral-50">
                          <td className="p-3 font-mono text-blue-700">{c.name}</td>
                          <td className="p-3 text-neutral-600">{c.purpose}</td>
                          <td className="p-3"><Badge variant="secondary" className="text-[10px]">{c.duration}</Badge></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </section>

            {/* Section 6: Your Rights */}
            <section id="your-rights">
              <Card className="border-neutral-200 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg font-bold text-neutral-800">6. Your Rights (GDPR & CCPA)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-neutral-600">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {[
                      { right: 'Right to Access', desc: 'Request a copy of all personal data we hold about you.' },
                      { right: 'Right to Rectification', desc: 'Correct inaccurate or incomplete personal data.' },
                      { right: 'Right to Erasure', desc: 'Request deletion of personal data ("right to be forgotten").' },
                      { right: 'Right to Portability', desc: 'Receive your data in a structured, machine-readable format.' },
                      { right: 'Right to Restrict', desc: 'Restrict processing of your personal data in certain circumstances.' },
                      { right: 'Right to Object', desc: 'Object to processing based on legitimate interests.' },
                    ].map((r) => (
                      <div key={r.right} className="p-3 bg-indigo-50 border border-indigo-100 rounded-lg">
                        <p className="font-semibold text-indigo-800 text-xs">{r.right}</p>
                        <p className="text-indigo-600 text-xs mt-0.5">{r.desc}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* Contact */}
            <section id="contact">
              <Card className="border-blue-200 shadow-sm bg-gradient-to-br from-blue-50 to-indigo-50">
                <CardHeader>
                  <CardTitle className="text-lg font-bold text-neutral-800">Contact Our Privacy Team</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="flex items-start gap-3">
                    <Mail className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div>
                      <p className="font-semibold text-neutral-700">Email</p>
                      <p className="text-blue-600 text-xs">privacy@delaplex.com</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Phone className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div>
                      <p className="font-semibold text-neutral-700">Phone</p>
                      <p className="text-blue-600 text-xs">+1 (800) 335-2739</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div>
                      <p className="font-semibold text-neutral-700">Address</p>
                      <p className="text-neutral-600 text-xs">Delaplex Inc., 500 Tech Park Dr, San Jose, CA 95110</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>

          </main>
        </div>

        {/* Footer links */}
        <div className="mt-10 border-t border-neutral-200 pt-6 flex flex-wrap items-center justify-center gap-4 text-xs text-neutral-400">
          <Link to="/terms-and-conditions" className="hover:text-blue-600 transition-colors">Terms & Conditions</Link>
          <span>·</span>
          <Link to="/support" className="hover:text-blue-600 transition-colors">Support</Link>
          <span>·</span>
          <Link to="/report-issue" className="hover:text-blue-600 transition-colors">Report Issue</Link>
          <span>·</span>
          <Link to="/wms-lite-dashboard" className="hover:text-blue-600 transition-colors">Back to Dashboard</Link>
        </div>
      </div>
    </div>
  );
}