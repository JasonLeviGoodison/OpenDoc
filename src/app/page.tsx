'use client';

import { useState } from 'react';
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
  X,
  Check,
  Minus,
  Plus,
} from 'lucide-react';

function GithubIcon({ size = 16, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
    </svg>
  );
}

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


// DocSend pricing (annual billing):
// - Standard: $45/user/mo
// - Advanced: $150/mo for 3 users, $90/mo per additional user
// - Advanced Data Rooms: $180/mo for 3 users, $90/mo per additional user
const DOCSEND_PLANS = [
  {
    name: 'Standard',
    calc: (seats: number) => seats * 45 * 12,
    desc: '$45/user/mo',
  },
  {
    name: 'Advanced',
    calc: (seats: number) => (150 + Math.max(0, seats - 3) * 90) * 12,
    desc: '$150/mo base (3 users) + $90/mo per extra',
  },
  {
    name: 'Data Rooms',
    calc: (seats: number) => (180 + Math.max(0, seats - 3) * 90) * 12,
    desc: '$180/mo base (3 users) + $90/mo per extra',
  },
];

function CostCalculator() {
  const [seats, setSeats] = useState(2);
  const [years, setYears] = useState(1);
  const [planIndex, setPlanIndex] = useState(2); // default to Data Rooms

  const plan = DOCSEND_PLANS[planIndex];
  const docsendAnnual = plan.calc(seats);
  const docsendTotal = docsendAnnual * years;
  const opendocTotal = 250;
  const saved = docsendTotal - opendocTotal;

  return (
    <section className="py-24 px-6 border-t border-border">
      <div className="max-w-6xl mx-auto">
        <p className="text-sm font-semibold text-accent mb-3 tracking-wide uppercase">Made for startups</p>
        <h2 className="text-3xl font-extrabold tracking-tight mb-4">
          See how much you&apos;d save
        </h2>
        <p className="text-muted-foreground text-base max-w-lg mb-12">
          OpenDoc supports teams of up to 5 — perfect for early-stage startups. Adjust your team size and see the real cost of DocSend vs a single OpenDoc payment.
        </p>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Controls */}
          <div className="space-y-8">
            {/* Plan selector */}
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-3 block">DocSend plan</label>
              <div className="flex gap-2">
                {DOCSEND_PLANS.map((p, i) => (
                  <button
                    key={p.name}
                    onClick={() => setPlanIndex(i)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                      planIndex === i
                        ? 'bg-accent text-background'
                        : 'bg-card border border-border text-muted-foreground hover:text-foreground hover:border-border-hover'
                    }`}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted mt-2">{plan.desc}</p>
            </div>

            {/* Seats */}
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-3 block">Team size</label>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setSeats(Math.max(1, seats - 1))}
                  className="w-10 h-10 rounded-lg bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-border-hover transition-colors cursor-pointer"
                >
                  <Minus size={16} />
                </button>
                <div className="flex-1">
                  <input
                    type="range"
                    min={1}
                    max={5}
                    value={seats}
                    onChange={(e) => setSeats(Number(e.target.value))}
                    className="w-full accent-accent cursor-pointer"
                  />
                </div>
                <button
                  onClick={() => setSeats(Math.min(5, seats + 1))}
                  className="w-10 h-10 rounded-lg bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-border-hover transition-colors cursor-pointer"
                >
                  <Plus size={16} />
                </button>
                <span className="w-16 text-right text-2xl font-extrabold text-foreground tabular-nums">{seats}</span>
              </div>
            </div>

            {/* Years */}
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-3 block">Time period</label>
              <div className="flex gap-2">
                {[1, 2, 3, 5].map((y) => (
                  <button
                    key={y}
                    onClick={() => setYears(y)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                      years === y
                        ? 'bg-accent text-background'
                        : 'bg-card border border-border text-muted-foreground hover:text-foreground hover:border-border-hover'
                    }`}
                  >
                    {y} {y === 1 ? 'year' : 'years'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Results */}
          <div className="rounded-xl border border-border bg-card p-8">
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-6 border-b border-border">
                <div>
                  <p className="text-sm text-muted-foreground">DocSend {plan.name}</p>
                  <p className="text-xs text-muted">{seats} users &times; {years} {years === 1 ? 'year' : 'years'}</p>
                </div>
                <p className="text-2xl font-extrabold text-foreground tabular-nums">
                  ${docsendTotal.toLocaleString()}
                </p>
              </div>

              <div className="flex items-center justify-between pb-6 border-b border-border">
                <div>
                  <p className="text-sm text-muted-foreground">OpenDoc</p>
                  <p className="text-xs text-muted">Lifetime &middot; up to 5 users</p>
                </div>
                <p className="text-2xl font-extrabold text-accent tabular-nums">$250</p>
              </div>

              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-foreground">You save</p>
                <p className="text-3xl font-extrabold text-success tabular-nums">
                  ${saved.toLocaleString()}
                </p>
              </div>

              <div className="pt-4">
                <div className="h-3 rounded-full bg-card-hover overflow-hidden">
                  <div
                    className="h-full bg-accent rounded-full transition-all duration-500"
                    style={{ width: `${Math.min((opendocTotal / docsendTotal) * 100, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between mt-2 text-xs text-muted">
                  <span>OpenDoc: ${opendocTotal}</span>
                  <span>DocSend: ${docsendTotal.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <Link href="/sign-up" className="block mt-8">
              <Button size="lg" className="w-full">
                Save ${saved.toLocaleString()} — get OpenDoc
                <ArrowRight size={16} />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="text-accent font-extrabold text-xl">O</span>
            <span className="font-bold text-foreground tracking-tight">OpenDoc</span>
          </Link>
          <div className="flex items-center gap-3">
            <a
              href="https://github.com/jasongoodison/opendoc"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="ghost" size="sm">
                <GithubIcon size={16} />
                GitHub
              </Button>
            </a>
            <Link href="/sign-in">
              <Button variant="ghost" size="sm">Sign in</Button>
            </Link>
            <Link href="/sign-up">
              <Button size="sm">Get started</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-28 pb-20 px-6">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-[1fr,1fr] gap-16 items-center">
          <div className="animate-fade-in">
            <p className="text-sm font-semibold text-accent mb-4 tracking-wide uppercase">
              Built for startups raising capital
            </p>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.08] mb-6">
              Share documents.<br />
              <span className="text-muted-foreground">Know everything.</span>
            </h1>

            <p className="text-lg text-muted-foreground max-w-lg mb-8 leading-relaxed">
              The DocSend alternative built for startup teams of up to 5. Send decks, manage data rooms, track investor engagement — with download blocking, watermarking, and page-level analytics. Pay once, own it forever.
            </p>

            <div className="flex items-center gap-3 flex-wrap">
              <Link href="/sign-up">
                <Button size="lg">
                  Get lifetime access — $250
                  <ArrowRight size={16} />
                </Button>
              </Link>
              <a
                href="https://github.com/jasongoodison/opendoc"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="outline" size="lg">
                  <GithubIcon size={16} />
                  Star on GitHub
                </Button>
              </a>
            </div>

            <div className="flex items-center gap-8 mt-10 text-sm text-muted">
              <span>One-time $250</span>
              <span>Up to 5 users</span>
              <span>Open source</span>
            </div>
          </div>

          {/* Product preview */}
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

      {/* Built for startups */}
      <section className="py-24 px-6 border-t border-border">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-16">
          <div>
            <p className="text-sm font-semibold text-accent mb-3 tracking-wide uppercase">Who it&apos;s for</p>
            <h2 className="text-3xl font-extrabold tracking-tight mb-6">
              Purpose-built for early-stage startups
            </h2>
            <p className="text-muted-foreground text-base leading-relaxed mb-6">
              OpenDoc is designed for startup teams of up to 5 people who need to share pitch decks with investors, run due diligence data rooms, and track engagement on every document they send out.
            </p>
            <p className="text-muted-foreground text-base leading-relaxed">
              We block document downloads using browser-level protections against common screenshot and save tools. Watermarking makes every leak traceable. You know exactly who read what, for how long, and where they dropped off.
            </p>
          </div>
          <div className="space-y-6">
            {[
              {
                title: 'Fundraising',
                desc: 'Send your pitch deck to 50 investors and see who actually read it. Know who spent 12 minutes vs who bounced after the first page.',
              },
              {
                title: 'Data rooms',
                desc: 'Set up a secure data room in minutes. Per-folder permissions, NDA gates, audit trails. Everything a lead investor needs for diligence.',
              },
              {
                title: 'Download blocking',
                desc: 'Browser-level protections prevent casual downloading, screenshots, and save-as. Dynamic watermarking makes every leak traceable to the viewer.',
              },
              {
                title: 'Need enterprise scale?',
                desc: 'OpenDoc is open source. Self-host it on your own infrastructure with no user limits, no feature restrictions, and full control. The $250 hosted plan is for startup teams of up to 5.',
              },
            ].map((item) => (
              <div key={item.title} className="border-b border-border pb-6 last:border-0 last:pb-0">
                <h3 className="text-sm font-bold text-foreground mb-1.5">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why OpenDoc > DocSend — side-by-side cards */}
      <section className="py-24 px-6 border-t border-border bg-card">
        <div className="max-w-6xl mx-auto">
          <p className="text-sm font-semibold text-accent mb-3 tracking-wide uppercase">Why switch</p>
          <h2 className="text-3xl font-extrabold tracking-tight mb-4">
            Everything DocSend does. None of what it charges.
          </h2>
          <p className="text-muted-foreground text-base max-w-2xl mb-16">
            DocSend costs $45–$150/month per user and locks advanced features behind expensive tiers. OpenDoc gives you everything for a single $250 lifetime payment.
          </p>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* OpenDoc — highlighted */}
            <div className="rounded-xl border border-accent/30 bg-accent-muted p-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2.5">
                  <span className="text-accent font-extrabold text-lg">O</span>
                  <span className="font-bold text-foreground">OpenDoc</span>
                </div>
                <span className="text-sm font-bold text-accent tabular-nums">$250 once</span>
              </div>
              <ul className="space-y-3">
                {[
                  'Page-by-page analytics',
                  'Email capture & password protection',
                  'Dynamic watermarking',
                  'One-click NDA & e-signatures',
                  'Virtual data rooms',
                  'Allow/block lists',
                  'Custom branding',
                  'Link expiration & download control',
                  'Visitor location tracking',
                  'Open source & self-hostable',
                  'Unlimited users — no per-seat pricing',
                  'All future updates included',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm">
                    <Check size={16} className="text-accent flex-shrink-0" />
                    <span className="text-foreground">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* DocSend — muted */}
            <div className="rounded-xl border border-border bg-background p-8">
              <div className="flex items-center justify-between mb-6">
                <span className="font-bold text-muted-foreground">DocSend</span>
                <span className="text-sm text-muted tabular-nums">$45–$150/mo per user</span>
              </div>
              <ul className="space-y-3">
                {[
                  { text: 'Page-by-page analytics', ok: true },
                  { text: 'Email capture & password protection', ok: true },
                  { text: 'Dynamic watermarking', note: 'Advanced plan — $150/mo' },
                  { text: 'One-click NDA', note: 'Advanced plan — $150/mo' },
                  { text: 'Virtual data rooms', note: 'Full VDR plan — $180/mo' },
                  { text: 'Allow/block lists', note: 'Advanced plan — $150/mo' },
                  { text: 'Custom branding', note: 'Standard plan — $45/mo' },
                  { text: 'Link expiration & download control', ok: true },
                  { text: 'Visitor location tracking', ok: true },
                  { text: 'Open source & self-hostable', no: true },
                  { text: 'Per-seat pricing adds up fast', no: true },
                  { text: 'Pay forever to keep access', no: true },
                ].map((item) => (
                  <li key={item.text} className="flex items-start gap-3 text-sm">
                    {item.ok ? (
                      <Check size={16} className="text-muted flex-shrink-0 mt-0.5" />
                    ) : item.no ? (
                      <X size={16} className="text-muted flex-shrink-0 mt-0.5" />
                    ) : (
                      <span className="text-warning flex-shrink-0 mt-0.5">$</span>
                    )}
                    <span className="text-muted-foreground">
                      {item.text}
                      {item.note && <span className="text-warning text-xs ml-1.5">{item.note}</span>}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
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

      {/* How it works */}
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

      {/* Cost calculator */}
      <CostCalculator />

      {/* Pricing — Ultracode-style split layout */}
      <section className="py-24 px-6 border-t border-border">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 rounded-2xl overflow-hidden border border-border">
            {/* Left — dark side */}
            <div className="bg-background p-10 lg:p-14 flex flex-col justify-between">
              <div>
                <p className="text-xs font-bold text-accent uppercase tracking-widest mb-6">Limited Offer</p>
                <h2 className="text-4xl lg:text-5xl font-extrabold tracking-tight mb-6 leading-[1.1]">
                  Lifetime<br />Access
                </h2>
                <p className="text-muted-foreground text-base leading-relaxed mb-10 max-w-md">
                  While you&apos;re paying DocSend $150/month, your competitors are switching to OpenDoc. One payment. Every feature. Forever.
                </p>

                <ul className="space-y-4 mb-12">
                  {[
                    'Up to 5 team members',
                    'Page-by-page analytics and watermarking',
                    'Virtual data rooms and e-signatures',
                    'Custom branding on all shared links',
                    'Every future update included',
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3 text-sm text-muted-foreground">
                      <Check size={16} className="text-accent flex-shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

            </div>

            {/* Right — elevated purchase card */}
            <div className="bg-card-hover p-10 lg:p-14 flex flex-col justify-center">
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-5xl font-extrabold text-foreground tabular-nums">$250</span>
                <span className="text-lg text-muted-foreground font-medium">USD</span>
              </div>
              <p className="text-sm text-muted mb-8">One-time payment &middot; Lifetime access &middot; Up to 5 users</p>

              <div className="space-y-4 mb-8 pb-8 border-b border-border">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">OpenDoc Lifetime Access</span>
                  <span className="text-foreground font-medium tabular-nums">$250.00</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">vs DocSend Advanced (annual)</span>
                  <span className="text-danger line-through tabular-nums">$1,800.00</span>
                </div>
              </div>

              <div className="flex items-center justify-between mb-10">
                <span className="text-muted-foreground font-medium">Due today</span>
                <span className="text-2xl font-extrabold text-foreground tabular-nums">$250.00</span>
              </div>

              <Link href="/sign-up" className="block">
                <Button size="lg" className="w-full text-base">
                  Get lifetime access
                  <ArrowRight size={16} />
                </Button>
              </Link>
              <p className="text-xs text-muted text-center mt-4">30-day money-back guarantee &middot; Instant access</p>
            </div>
          </div>
        </div>
      </section>

      {/* Open source CTA */}
      <section className="py-24 px-6 border-t border-border bg-card">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-extrabold tracking-tight mb-4">
            Open source. Self-hostable. Yours.
          </h2>
          <p className="text-muted-foreground text-base mb-8 leading-relaxed">
            OpenDoc is fully open source. Inspect the code, self-host it, or use our managed version. No vendor lock-in, no black boxes, no surprises.
          </p>
          <div className="flex items-center gap-3 flex-wrap">
            <a
              href="https://github.com/jasongoodison/opendoc"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline" size="lg">
                <GithubIcon size={16} />
                View on GitHub
              </Button>
            </a>
            <Link href="/sign-up">
              <Button size="lg">
                Get started
                <ArrowRight size={16} />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2.5">
              <span className="text-accent font-extrabold text-lg">O</span>
              <span className="font-bold text-foreground text-sm tracking-tight">OpenDoc</span>
            </div>
            <a
              href="https://github.com/jasongoodison/opendoc"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted hover:text-foreground transition-colors"
            >
              <GithubIcon size={16} />
            </a>
          </div>
          <p className="text-xs text-muted">
            &copy; {new Date().getFullYear()} OpenDoc. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
