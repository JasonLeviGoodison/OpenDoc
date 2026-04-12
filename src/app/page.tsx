'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  BarChart3,
  Lock,
  Eye,
  FileText,
  Zap,
  ArrowRight,
  Shield,
  Mail,
  Clock,
  Download,
} from 'lucide-react';

const features = [
  {
    icon: Eye,
    title: 'Page-by-page analytics',
    description: 'See exactly how long each viewer spends on every page. Identify drop-off points, most-read sections, and engagement patterns across your entire document.',
  },
  {
    icon: Lock,
    title: 'Granular access control',
    description: 'Email verification, password protection, link expiration, domain allow/block lists, and one-click NDA requirements. Control every aspect of who sees what.',
  },
  {
    icon: Shield,
    title: 'Dynamic watermarking',
    description: 'Every page is automatically watermarked with the viewer\'s email, IP address, and timestamp. Leaks become traceable instantly.',
  },
  {
    icon: Mail,
    title: 'Real-time notifications',
    description: 'The moment someone opens your document, you know. See who viewed it, when, from where, on what device, and for how long.',
  },
  {
    icon: FileText,
    title: 'Virtual data rooms',
    description: 'Bundle multiple documents into branded spaces with folder organization, per-folder permissions, and aggregated analytics across the entire room.',
  },
  {
    icon: Zap,
    title: 'One-click e-signatures',
    description: 'Gate access behind NDAs. Collect legally-binding signatures before the first page loads. Full audit trail with IP, timestamp, and signed document.',
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="text-accent font-extrabold text-xl">V</span>
            <span className="font-bold text-foreground tracking-tight">DocVault</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/sign-in">
              <Button variant="ghost" size="sm">Sign in</Button>
            </Link>
            <Link href="/sign-up">
              <Button size="sm">Get started</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero — left-aligned, asymmetric */}
      <section className="pt-28 pb-20 px-6">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-[1fr,1fr] gap-16 items-center">
          <div className="animate-fade-in">
            <p className="text-sm font-semibold text-accent mb-4 tracking-wide uppercase">
              Document intelligence
            </p>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.08] mb-6">
              Share documents.<br />
              <span className="text-muted-foreground">Know everything.</span>
            </h1>

            <p className="text-lg text-muted-foreground max-w-lg mb-8 leading-relaxed">
              Secure link sharing with page-level analytics, access controls, virtual data rooms, and e-signatures. See who reads what, when, and for how long.
            </p>

            <div className="flex items-center gap-3">
              <Link href="/sign-up">
                <Button size="lg">
                  Start free
                  <ArrowRight size={16} />
                </Button>
              </Link>
              <Link href="/sign-in">
                <Button variant="outline" size="lg">Live demo</Button>
              </Link>
            </div>

            <div className="flex items-center gap-8 mt-10 text-sm text-muted">
              <span>No credit card</span>
              <span>5 docs free</span>
              <span>Setup in 2 min</span>
            </div>
          </div>

          {/* Product preview — not a fake dashboard, just a clean document card */}
          <div className="hidden lg:block animate-fade-in">
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">Series A Pitch Deck</p>
                  <p className="text-xs text-muted mt-0.5">24 pages &middot; PDF &middot; Shared 3 days ago</p>
                </div>
                <span className="text-xs font-medium text-success">Active</span>
              </div>
              <div className="px-5 py-4 space-y-3">
                {[
                  { name: 'sarah@sequoia.com', pages: '24/24', time: '12m 34s', pct: '100%' },
                  { name: 'mike@a16z.com', pages: '18/24', time: '8m 12s', pct: '75%' },
                  { name: 'jen@greylock.com', pages: '24/24', time: '15m 02s', pct: '100%' },
                  { name: 'david@accel.com', pages: '6/24', time: '2m 45s', pct: '25%' },
                ].map((v) => (
                  <div key={v.name} className="flex items-center justify-between text-sm">
                    <span className="text-foreground font-medium">{v.name}</span>
                    <div className="flex items-center gap-6 text-xs text-muted tabular-nums">
                      <span>{v.pages} pages</span>
                      <span>{v.time}</span>
                      <span className={v.pct === '100%' ? 'text-success' : 'text-muted-foreground'}>{v.pct}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="px-5 py-3 border-t border-border flex items-center justify-between text-xs text-muted">
                <span>4 unique visitors</span>
                <span>Avg. 9m 38s</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features — two-column, alternating emphasis */}
      <section className="py-24 px-6 border-t border-border">
        <div className="max-w-6xl mx-auto">
          <p className="text-sm font-semibold text-accent mb-3 tracking-wide uppercase">Capabilities</p>
          <h2 className="text-3xl font-extrabold tracking-tight mb-4">
            Enterprise security, startup speed
          </h2>
          <p className="text-muted-foreground text-base max-w-lg mb-16">
            Every feature DocSend offers, rebuilt from scratch with a modern stack. No compromises on analytics, security, or control.
          </p>

          <div className="grid md:grid-cols-2 gap-x-16 gap-y-12">
            {features.map((feature) => (
              <div key={feature.title} className="group">
                <div className="flex items-center gap-3 mb-3">
                  <feature.icon size={18} className="text-accent" strokeWidth={2.5} />
                  <h3 className="text-base font-bold text-foreground">{feature.title}</h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed pl-[30px]">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works — simple, not a card grid */}
      <section className="py-24 px-6 border-t border-border bg-card">
        <div className="max-w-6xl mx-auto">
          <p className="text-sm font-semibold text-accent mb-3 tracking-wide uppercase">How it works</p>
          <h2 className="text-3xl font-extrabold tracking-tight mb-16">Three steps. Full visibility.</h2>

          <div className="grid md:grid-cols-3 gap-12">
            {[
              { step: '01', title: 'Upload', desc: 'Drop a PDF, deck, or doc. We process it for page-by-page viewing in seconds.' },
              { step: '02', title: 'Configure & share', desc: 'Set email capture, password, NDA, watermarking, and expiration. Generate a unique link.' },
              { step: '03', title: 'Track everything', desc: 'See who opened it, which pages they read, how long they spent, and where they dropped off.' },
            ].map((item) => (
              <div key={item.step}>
                <p className="text-xs font-bold text-accent tabular-nums mb-3">{item.step}</p>
                <h3 className="text-lg font-bold text-foreground mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 border-t border-border">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-extrabold tracking-tight mb-4">
            Stop guessing who read your deck.
          </h2>
          <p className="text-muted-foreground text-base mb-8">
            Join thousands of founders and deal teams who use DocVault to share documents with confidence.
          </p>
          <div className="flex items-center gap-3">
            <Link href="/sign-up">
              <Button size="lg">
                Get started free
                <ArrowRight size={16} />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-accent font-extrabold text-lg">V</span>
            <span className="font-bold text-foreground text-sm tracking-tight">DocVault</span>
          </div>
          <p className="text-xs text-muted">
            &copy; {new Date().getFullYear()} DocVault. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
