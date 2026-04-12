'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Shield,
  Lock,
  Mail,
  FileText,
  AlertTriangle,
  Check,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface LinkData {
  id: string;
  link_id: string;
  name: string;
  is_active: boolean;
  require_email: boolean;
  require_password: boolean;
  require_nda: boolean;
  nda_text: string | null;
  allow_download: boolean;
  enable_watermark: boolean;
  watermark_text: string | null;
  expires_at: string | null;
  allowed_emails: string[];
  blocked_emails: string[];
  allowed_domains: string[];
  blocked_domains: string[];
  document: {
    id: string;
    name: string;
    file_url: string;
    page_count: number;
    file_type: string;
  } | null;
  brand?: {
    logo_url: string | null;
    accent_color: string;
    company_name: string | null;
  };
}

type GateType = 'loading' | 'expired' | 'disabled' | 'email' | 'password' | 'nda' | 'blocked' | 'viewer';

export default function ViewerPage() {
  const { linkId } = useParams<{ linkId: string }>();
  const [linkData, setLinkData] = useState<LinkData | null>(null);
  const [gate, setGate] = useState<GateType>('loading');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [visitId, setVisitId] = useState<string | null>(null);
  const [pageStartTime, setPageStartTime] = useState(Date.now());
  const [ndaAccepted, setNdaAccepted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadLink();
  }, [linkId]);

  async function loadLink() {
    try {
      const res = await fetch(`/api/links/${linkId}`);
      if (!res.ok) {
        setGate('disabled');
        return;
      }
      const data = await res.json();
      setLinkData(data);

      if (!data.is_active) {
        setGate('disabled');
        return;
      }

      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        setGate('expired');
        return;
      }

      if (data.document) {
        setTotalPages(data.document.page_count || 1);
      }

      // Determine which gate to show
      if (data.require_email) {
        setGate('email');
      } else if (data.require_password) {
        setGate('password');
      } else if (data.require_nda) {
        setGate('nda');
      } else {
        startViewing(data);
      }
    } catch {
      setGate('disabled');
    }
  }

  async function startViewing(data?: LinkData) {
    const link = data || linkData;
    if (!link) return;

    // Create visit
    try {
      const res = await fetch('/api/visits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          link_id: link.id,
          document_id: link.document?.id,
          visitor_email: email || null,
        }),
      });
      const visit = await res.json();
      setVisitId(visit.id);
    } catch (e) {
      console.error('Failed to create visit:', e);
    }

    setPageStartTime(Date.now());
    setGate('viewer');
  }

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!email) {
      setError('Please enter your email address');
      return;
    }

    // Check allowed/blocked emails
    if (linkData?.allowed_emails && linkData.allowed_emails.length > 0) {
      const domain = email.split('@')[1];
      const isAllowed = linkData.allowed_emails.includes(email) ||
        linkData.allowed_domains?.includes(domain);
      if (!isAllowed) {
        setError('Your email is not authorized to view this document');
        return;
      }
    }

    if (linkData?.blocked_emails?.includes(email)) {
      setError('Your email is not authorized to view this document');
      return;
    }

    if (linkData?.require_password) {
      setGate('password');
    } else if (linkData?.require_nda) {
      setGate('nda');
    } else {
      startViewing();
    }
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    try {
      const res = await fetch(`/api/links/${linkId}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (!res.ok) {
        setError('Incorrect password');
        return;
      }

      if (linkData?.require_nda) {
        setGate('nda');
      } else {
        startViewing();
      }
    } catch {
      setError('Verification failed');
    }
  }

  async function handleNdaAccept() {
    setNdaAccepted(true);
    startViewing();
  }

  // Track page views
  useEffect(() => {
    if (gate !== 'viewer' || !visitId) return;

    const trackPageView = async () => {
      const duration = (Date.now() - pageStartTime) / 1000;
      try {
        await fetch('/api/visits/page-view', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            visit_id: visitId,
            document_id: linkData?.document?.id,
            page_number: currentPage,
            duration,
          }),
        });
      } catch (e) {
        // Silent fail for analytics
      }
    };

    return () => {
      trackPageView();
    };
  }, [currentPage, gate]);

  // Update page start time when changing pages
  useEffect(() => {
    setPageStartTime(Date.now());
  }, [currentPage]);

  // Track total visit duration on unmount
  useEffect(() => {
    if (!visitId) return;

    const interval = setInterval(async () => {
      try {
        await fetch(`/api/visits/${visitId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            page_count_viewed: currentPage,
            completion_rate: (currentPage / totalPages) * 100,
          }),
        });
      } catch (e) {
        // Silent fail
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [visitId, currentPage, totalPages]);

  // Keyboard navigation
  useEffect(() => {
    if (gate !== 'viewer') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        setCurrentPage(p => Math.min(p + 1, totalPages));
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        setCurrentPage(p => Math.max(p - 1, 1));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gate, totalPages]);

  // Render gates
  if (gate === 'loading') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
      </div>
    );
  }

  if (gate === 'disabled') {
    return (
      <GateScreen
        icon={<X size={32} className="text-danger" />}
        title="Link Disabled"
        description="This link has been disabled by the document owner."
      />
    );
  }

  if (gate === 'expired') {
    return (
      <GateScreen
        icon={<AlertTriangle size={32} className="text-warning" />}
        title="Link Expired"
        description="This link has expired and is no longer accessible."
      />
    );
  }

  if (gate === 'blocked') {
    return (
      <GateScreen
        icon={<Shield size={32} className="text-danger" />}
        title="Access Denied"
        description="You are not authorized to view this document."
      />
    );
  }

  if (gate === 'email') {
    return (
      <GateScreen
        icon={<Mail size={32} className="text-accent" />}
        title={linkData?.document?.name || 'Document'}
        description="Please enter your email to continue"
        brandName={linkData?.brand?.company_name}
      >
        <form onSubmit={handleEmailSubmit} className="w-full max-w-sm space-y-4">
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            error={error}
            autoFocus
          />
          <Button type="submit" className="w-full">
            Continue
          </Button>
        </form>
      </GateScreen>
    );
  }

  if (gate === 'password') {
    return (
      <GateScreen
        icon={<Lock size={32} className="text-accent" />}
        title="Password Required"
        description="This document is password protected"
      >
        <form onSubmit={handlePasswordSubmit} className="w-full max-w-sm space-y-4">
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
            error={error}
            autoFocus
          />
          <Button type="submit" className="w-full">
            <Lock size={16} />
            Unlock
          </Button>
        </form>
      </GateScreen>
    );
  }

  if (gate === 'nda') {
    return (
      <GateScreen
        icon={<Shield size={32} className="text-accent" />}
        title="NDA Required"
        description="Please review and accept the agreement before viewing"
      >
        <div className="w-full max-w-lg space-y-4">
          <div className="bg-card border border-border rounded-lg p-4 max-h-48 overflow-y-auto text-sm text-muted-foreground leading-relaxed">
            {linkData?.nda_text || 'Non-Disclosure Agreement text will appear here.'}
          </div>
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="nda-accept"
              checked={ndaAccepted}
              onChange={(e) => setNdaAccepted(e.target.checked)}
              className="w-4 h-4 rounded accent-accent"
            />
            <label htmlFor="nda-accept" className="text-sm text-muted-foreground">
              I have read and agree to the terms above
            </label>
          </div>
          <Button onClick={handleNdaAccept} disabled={!ndaAccepted} className="w-full">
            <Check size={16} />
            Accept & Continue
          </Button>
        </div>
      </GateScreen>
    );
  }

  // Document Viewer
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col">
      {/* Viewer Header */}
      <div className="h-14 bg-card border-b border-border flex items-center justify-between px-4 sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-sm font-semibold text-foreground">{linkData?.document?.name}</h1>
            {linkData?.brand?.company_name && (
              <p className="text-xs text-muted">Shared by {linkData.brand.company_name}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Page navigation */}
          <div className="flex items-center gap-1 bg-background rounded-lg border border-border px-2 py-1">
            <button
              onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
              disabled={currentPage <= 1}
              className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30 cursor-pointer"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm text-foreground px-2 min-w-[80px] text-center">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
              disabled={currentPage >= totalPages}
              className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30 cursor-pointer"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Zoom */}
          <div className="flex items-center gap-1 bg-background rounded-lg border border-border px-2 py-1">
            <button
              onClick={() => setZoom(z => Math.max(z - 0.25, 0.5))}
              className="p-1 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <ZoomOut size={16} />
            </button>
            <span className="text-xs text-muted-foreground w-12 text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom(z => Math.min(z + 0.25, 3))}
              className="p-1 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <ZoomIn size={16} />
            </button>
          </div>

          {linkData?.allow_download && (
            <a href={linkData.document?.file_url} download>
              <Button variant="ghost" size="sm">
                <Download size={16} />
              </Button>
            </a>
          )}
        </div>
      </div>

      {/* Document Content */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto flex items-start justify-center p-8"
      >
        <div
          className="relative bg-white rounded-lg shadow-2xl"
          style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}
        >
          {/* PDF will be rendered here - using iframe for now */}
          {linkData?.document?.file_url && (
            <iframe
              src={`${linkData.document.file_url}#page=${currentPage}&toolbar=0&navpanes=0`}
              className="w-[800px] h-[1035px] rounded-lg"
              style={{ border: 'none' }}
            />
          )}

          {/* Watermark overlay */}
          {linkData?.enable_watermark && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden rounded-lg">
              <div className="rotate-[-30deg] opacity-[0.08] text-center">
                {[...Array(5)].map((_, i) => (
                  <p key={i} className="text-2xl font-bold text-black whitespace-nowrap mb-24">
                    {email || 'CONFIDENTIAL'} &nbsp;&middot;&nbsp; {new Date().toLocaleDateString()} &nbsp;&middot;&nbsp; {email || 'CONFIDENTIAL'} &nbsp;&middot;&nbsp; {new Date().toLocaleDateString()}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Page thumbnails bar */}
      <div className="h-20 bg-card/90 backdrop-blur-sm border-t border-border flex items-center px-4 gap-2 overflow-x-auto">
        {[...Array(totalPages)].map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrentPage(i + 1)}
            className={cn(
              'flex-shrink-0 w-12 h-14 rounded-md border-2 flex items-center justify-center text-xs font-medium transition-all cursor-pointer',
              currentPage === i + 1
                ? 'border-accent bg-accent-muted text-accent'
                : 'border-border bg-card-hover text-muted-foreground hover:border-border-hover'
            )}
          >
            {i + 1}
          </button>
        ))}
      </div>
    </div>
  );
}

// Gate Screen Component
function GateScreen({
  icon,
  title,
  description,
  children,
  brandName,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  children?: React.ReactNode;
  brandName?: string | null;
}) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-full max-w-sm px-6">
        <div className="mb-8 text-center">
          <div className="text-muted mb-4 flex justify-center">{icon}</div>
          <h1 className="text-xl font-bold text-foreground mb-1">{title}</h1>
          <p className="text-sm text-muted">{description}</p>
        </div>
        <div className="flex flex-col items-center">
          {children}
        </div>
        <div className="mt-10 text-center">
          {brandName && (
            <p className="text-xs text-muted mb-2">Shared via {brandName}</p>
          )}
          <p className="text-xs text-muted">Secured by DocVault</p>
        </div>
      </div>
    </div>
  );
}
