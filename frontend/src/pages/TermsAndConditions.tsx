import { Link } from 'react-router-dom';
import { FileText, ChevronRight, ArrowLeft, AlertTriangle, CheckCircle2, Scale, Users, CreditCard, RefreshCw, Ban, Mail } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';

const tocSections = [
  { id: 'acceptance', title: '1. Acceptance of Terms' },
  { id: 'license', title: '2. License & Permitted Use' },
  { id: 'account', title: '3. Account Responsibilities' },
  { id: 'subscription', title: '4. Subscription & Billing' },
  { id: 'prohibited', title: '5. Prohibited Activities' },
  { id: 'ip', title: '6. Intellectual Property' },
  { id: 'warranties', title: '7. Warranties & Disclaimers' },
  { id: 'liability', title: '8. Limitation of Liability' },
  { id: 'termination', title: '9. Termination' },
  { id: 'governing', title: '10. Governing Law' },
];

export default function TermsAndConditions() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/20 to-white">
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
          <div className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-100 rounded-full px-4 py-1.5 mb-4">
            <Scale className="w-4 h-4 text-indigo-600" />
            <span className="text-xs font-semibold text-indigo-600">Legal Agreement</span>
          </div>
          <h1 className="text-4xl font-bold text-neutral-900 mb-3">Terms & Conditions</h1>
          <p className="text-neutral-500 max-w-2xl mx-auto text-sm leading-relaxed">
            Please read these Terms and Conditions carefully before using the WMS Lite platform.
            By accessing or using the service, you agree to be bound by these terms.
          </p>
          <div className="flex items-center justify-center gap-4 mt-4">
            <Badge variant="secondary" className="text-xs">Effective: 14 July 2026</Badge>
            <Badge variant="secondary" className="text-xs">Version 3.1</Badge>
          </div>
        </div>

        {/* Important notice */}
        <Alert className="mb-8 border-amber-200 bg-amber-50 max-w-6xl mx-auto">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-700 text-sm">
            <strong>Important:</strong> These terms constitute a legally binding agreement between you (the "User") and Delaplex Inc. ("Company"). 
            Continued use of WMS Lite constitutes acceptance of all terms below.
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sticky ToC */}
          <aside className="lg:col-span-1">
            <div className="sticky top-20">
              <Card className="border-neutral-200 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold text-neutral-700 flex items-center gap-2">
                    <FileText className="w-4 h-4" /> Sections
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-0.5">
                  {tocSections.map((s) => (
                    <a
                      key={s.id}
                      href={`#${s.id}`}
                      className="flex items-center gap-2 text-xs text-neutral-500 hover:text-indigo-600 py-1.5 px-2 rounded-md hover:bg-indigo-50 transition-colors group"
                    >
                      <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform flex-shrink-0" />
                      <span className="truncate">{s.title}</span>
                    </a>
                  ))}
                </CardContent>
              </Card>

              <Card className="border-neutral-200 shadow-sm mt-4 bg-indigo-50 border-indigo-100">
                <CardContent className="p-4 space-y-2">
                  <p className="text-xs font-bold text-indigo-800">Questions?</p>
                  <p className="text-xs text-indigo-600">Contact our legal team for any clarification on these terms.</p>
                  <a href="mailto:legal@delaplex.com" className="flex items-center gap-1.5 text-xs text-indigo-700 font-semibold hover:underline">
                    <Mail className="w-3 h-3" /> legal@delaplex.com
                  </a>
                </CardContent>
              </Card>
            </div>
          </aside>

          {/* Content */}
          <main className="lg:col-span-3 space-y-6">

            {/* 1. Acceptance */}
            <section id="acceptance">
              <Card className="border-neutral-200 shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5 text-indigo-600" />
                    </div>
                    <CardTitle className="text-base font-bold text-neutral-800">1. Acceptance of Terms</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="text-sm text-neutral-600 leading-relaxed space-y-3">
                  <p>By creating an account, accessing, or using the WMS Lite platform ("Service"), you confirm that you have read, understood, and agree to be bound by these Terms and Conditions and our Privacy Policy.</p>
                  <p>If you are using the Service on behalf of an organization, you represent and warrant that you have the authority to bind that organization to these terms, and references to "you" include both you individually and the organization.</p>
                  <p>If you do not agree to these terms, you must immediately cease using the Service and contact your system administrator to deactivate your account.</p>
                </CardContent>
              </Card>
            </section>

            {/* 2. License */}
            <section id="license">
              <Card className="border-neutral-200 shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-blue-600" />
                    </div>
                    <CardTitle className="text-base font-bold text-neutral-800">2. License & Permitted Use</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="text-sm text-neutral-600 leading-relaxed space-y-4">
                  <p>Subject to your compliance with these terms and payment of applicable fees, Delaplex grants you a limited, non-exclusive, non-transferable, revocable license to access and use the WMS Lite platform solely for your internal business operations.</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3">
                      <p className="font-semibold text-emerald-800 text-xs mb-2 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Permitted</p>
                      <ul className="space-y-1 text-xs text-emerald-700">
                        <li>• Warehouse operations management</li>
                        <li>• Integration with authorized ERP/TMS</li>
                        <li>• Exporting operational reports</li>
                        <li>• Training and educational use</li>
                      </ul>
                    </div>
                    <div className="bg-red-50 border border-red-100 rounded-lg p-3">
                      <p className="font-semibold text-red-800 text-xs mb-2 flex items-center gap-1"><Ban className="w-3.5 h-3.5" /> Not Permitted</p>
                      <ul className="space-y-1 text-xs text-red-700">
                        <li>• Reverse engineering the software</li>
                        <li>• Reselling or sublicensing access</li>
                        <li>• Automated scraping or harvesting</li>
                        <li>• Using for competing products</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* 3. Account */}
            <section id="account">
              <Card className="border-neutral-200 shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center">
                      <Users className="w-5 h-5 text-purple-600" />
                    </div>
                    <CardTitle className="text-base font-bold text-neutral-800">3. Account Responsibilities</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="text-sm text-neutral-600 leading-relaxed space-y-3">
                  <p>You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.</p>
                  <div className="space-y-2">
                    {[
                      'Keep your password secure and do not share login credentials with others.',
                      'Notify Delaplex immediately at security@delaplex.com if you suspect unauthorized access.',
                      'Ensure all information provided during registration is accurate and kept up to date.',
                      'Each user must have their own individual account; shared accounts are prohibited.',
                      'You are responsible for all data entered, modified, or deleted by users under your tenant.',
                    ].map((item, i) => (
                      <div key={i} className="flex gap-2.5 p-2.5 bg-purple-50/50 rounded-lg border border-purple-100/60">
                        <div className="w-5 h-5 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">{i + 1}</div>
                        <p className="text-xs text-neutral-600">{item}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* 4. Subscription */}
            <section id="subscription">
              <Card className="border-neutral-200 shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
                      <CreditCard className="w-5 h-5 text-emerald-600" />
                    </div>
                    <CardTitle className="text-base font-bold text-neutral-800">4. Subscription & Billing</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="text-sm text-neutral-600 leading-relaxed space-y-3">
                  <p>WMS Lite is offered under a SaaS subscription model. Your subscription plan, billing cycle, and pricing are defined in your Order Form or Service Agreement.</p>
                  <table className="w-full text-xs border border-neutral-200 rounded-lg overflow-hidden">
                    <thead>
                      <tr className="bg-neutral-50">
                        <th className="text-left p-3 font-semibold text-neutral-700">Term</th>
                        <th className="text-left p-3 font-semibold text-neutral-700">Policy</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {[
                        { term: 'Payment', policy: 'Due within 30 days of invoice. Late payments accrue 1.5% monthly interest.' },
                        { term: 'Auto-Renewal', policy: 'Subscriptions auto-renew unless cancelled 30 days before the renewal date.' },
                        { term: 'Price Changes', policy: 'Delaplex may adjust pricing with 60 days written notice before renewal.' },
                        { term: 'Refunds', policy: 'No refunds for partial subscription periods unless otherwise agreed in writing.' },
                        { term: 'Taxes', policy: 'All fees exclude applicable taxes, which are the customer\'s responsibility.' },
                      ].map((row) => (
                        <tr key={row.term} className="hover:bg-neutral-50">
                          <td className="p-3 font-semibold text-neutral-700 w-28">{row.term}</td>
                          <td className="p-3 text-neutral-500">{row.policy}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </section>

            {/* 5. Prohibited */}
            <section id="prohibited">
              <Card className="border-neutral-200 shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center">
                      <Ban className="w-5 h-5 text-red-600" />
                    </div>
                    <CardTitle className="text-base font-bold text-neutral-800">5. Prohibited Activities</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="text-sm text-neutral-600 leading-relaxed space-y-3">
                  <p>You must not use WMS Lite to engage in any of the following prohibited activities:</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {[
                      'Transmit malware, viruses, or malicious code',
                      'Attempt to gain unauthorized access to systems',
                      'Perform load testing or stress testing without consent',
                      'Harvest or collect user data without authorization',
                      'Circumvent security or authentication measures',
                      'Use the service to violate any applicable law',
                      'Post or transmit fraudulent or misleading content',
                      'Interfere with other users\' access to the service',
                    ].map((item, i) => (
                      <div key={i} className="flex items-start gap-2 p-2.5 bg-red-50 border border-red-100 rounded-lg">
                        <Ban className="w-3.5 h-3.5 text-red-500 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-red-700">{item}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* 6–10 condensed */}
            {[
              {
                id: 'ip', icon: <FileText className="w-5 h-5 text-amber-600" />, bg: 'bg-amber-50',
                title: '6. Intellectual Property',
                body: 'The WMS Lite platform, including its software, design, documentation, and content, is owned by Delaplex Inc. and protected by intellectual property laws. Your use of the service does not grant you ownership of any intellectual property rights. All feedback you provide may be used by Delaplex without restriction or compensation.'
              },
              {
                id: 'warranties', icon: <AlertTriangle className="w-5 h-5 text-orange-600" />, bg: 'bg-orange-50',
                title: '7. Warranties & Disclaimers',
                body: 'THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED. DELAPLEX DOES NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR COMPLETELY SECURE. WHILE WE STRIVE FOR 99.9% UPTIME (AS DEFINED IN OUR SLA), TEMPORARY OUTAGES MAY OCCUR FOR MAINTENANCE OR UNFORESEEN CIRCUMSTANCES.'
              },
              {
                id: 'liability', icon: <Scale className="w-5 h-5 text-neutral-600" />, bg: 'bg-neutral-100',
                title: '8. Limitation of Liability',
                body: 'TO THE MAXIMUM EXTENT PERMITTED BY LAW, DELAPLEX SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, OR CONSEQUENTIAL DAMAGES ARISING FROM YOUR USE OF THE SERVICE. OUR TOTAL LIABILITY FOR ANY CLAIMS RELATED TO THE SERVICE SHALL NOT EXCEED THE AMOUNT YOU PAID FOR THE SERVICE IN THE 12 MONTHS PRECEDING THE CLAIM.'
              },
              {
                id: 'termination', icon: <RefreshCw className="w-5 h-5 text-rose-600" />, bg: 'bg-rose-50',
                title: '9. Termination',
                body: 'Either party may terminate this agreement with 30 days written notice. Delaplex may immediately suspend or terminate your access for material breach of these terms, non-payment, or activities that pose a security risk. Upon termination, your right to use the Service ceases and Delaplex will provide a 30-day data export window.'
              },
              {
                id: 'governing', icon: <Scale className="w-5 h-5 text-blue-600" />, bg: 'bg-blue-50',
                title: '10. Governing Law',
                body: 'These Terms shall be governed by and construed in accordance with the laws of the State of California, United States, without regard to its conflict of law provisions. Any disputes shall be resolved through binding arbitration in San Jose, California, except that either party may seek injunctive relief in any court of competent jurisdiction.'
              },
            ].map((s) => (
              <section key={s.id} id={s.id}>
                <Card className="border-neutral-200 shadow-sm">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-lg ${s.bg} flex items-center justify-center`}>{s.icon}</div>
                      <CardTitle className="text-base font-bold text-neutral-800">{s.title}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="text-sm text-neutral-600 leading-relaxed">
                    <p>{s.body}</p>
                  </CardContent>
                </Card>
              </section>
            ))}

          </main>
        </div>

        {/* Footer links */}
        <div className="mt-10 border-t border-neutral-200 pt-6 flex flex-wrap items-center justify-center gap-4 text-xs text-neutral-400">
          <Link to="/privacy-policy" className="hover:text-indigo-600 transition-colors">Privacy Policy</Link>
          <span>·</span>
          <Link to="/support" className="hover:text-indigo-600 transition-colors">Support</Link>
          <span>·</span>
          <Link to="/report-issue" className="hover:text-indigo-600 transition-colors">Report Issue</Link>
          <span>·</span>
          <Link to="/wms-lite-dashboard" className="hover:text-indigo-600 transition-colors">Back to Dashboard</Link>
        </div>
      </div>
    </div>
  );
}