'use client';

import { useParams } from 'next/navigation';
import { useCallback, useEffect, useEffectEvent, useRef, useState } from 'react';
import {
  AlertTriangle,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  Lock,
  Mail,
  Shield,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiFetchJson } from '@/lib/api-client';
import { cn } from '@/lib/utils';

interface SharedDocumentSummary {
  file_type: string;
  id: string;
  name: string;
  page_count: number;
}

interface SharedSpace {
  description: string | null;
  documents: SharedDocumentSummary[];
  headline: string | null;
  id: string;
  name: string;
}

interface LinkData {
  allow_download: boolean;
  allowed_domains: string[];
  allowed_emails: string[];
  blocked_domains: string[];
  blocked_emails: string[];
  brand?: {
    accent_color: string | null;
    company_name: string | null;
    logo_url: string | null;
  } | null;
  document: SharedDocumentSummary | null;
  enable_watermark: boolean;
  expires_at: string | null;
  is_active: boolean;
  link_id: string;
  link_state: 'available' | 'disabled' | 'expired';
  name: string;
  nda_text: string | null;
  require_email: boolean;
  require_nda: boolean;
  require_password: boolean;
  space: SharedSpace | null;
  watermark_text: string | null;
}

type GateType = 'loading' | 'expired' | 'disabled' | 'email' | 'password' | 'nda' | 'viewer';

interface VisitSession {
  id: string;
  ip_address: string | null;
  visit_token: string;
}

function getViewerDocuments(linkData: LinkData | null) {
  if (!linkData) {
    return [];
  }

  if (linkData.space) {
    return linkData.space.documents;
  }

  return linkData.document ? [linkData.document] : [];
}

export default function ViewerPage() {
  const { linkId } = useParams<{ linkId: string }>();
  const [linkData, setLinkData] = useState<LinkData | null>(null);
  const [gate, setGate] = useState<GateType>('loading');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [currentDocumentId, setCurrentDocumentId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [visitId, setVisitId] = useState<string | null>(null);
  const [visitToken, setVisitToken] = useState<string | null>(null);
  const [ndaAccepted, setNdaAccepted] = useState(false);
  const [viewerIp, setViewerIp] = useState<string | null>(null);
  const pageStartTimeRef = useRef(0);

  const currentDocuments = getViewerDocuments(linkData);
  const currentDocument =
    currentDocuments.find((document) => document.id === currentDocumentId) ?? currentDocuments[0] ?? null;
  const totalPages = currentDocument?.page_count ?? 1;

  const startViewing = useCallback(
    async (sessionToken: string, acceptedNda: boolean, resolvedLinkData?: LinkData) => {
      const activeLink = resolvedLinkData ?? linkData;

      if (!activeLink) {
        return;
      }

      const firstDocument = getViewerDocuments(activeLink)[0] ?? null;
      const activeDocumentId = currentDocumentId ?? firstDocument?.id ?? null;

      try {
        const visit = await apiFetchJson<VisitSession>('/api/visits', {
          body: JSON.stringify({
            document_id: activeDocumentId,
            nda_accepted: acceptedNda,
            visitor_email: email || null,
          }),
          headers: {
            'x-opendoc-viewer-token': sessionToken,
          },
          method: 'POST',
        });

        setVisitId(visit.id);
        setVisitToken(visit.visit_token);
        setViewerIp(visit.ip_address);
        pageStartTimeRef.current = Date.now();
        setGate('viewer');
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : 'Failed to start viewer.');
      }
    },
    [currentDocumentId, email, linkData],
  );

  const authorizeViewer = useCallback(
    async (acceptedNda: boolean, resolvedLinkData?: LinkData) => {
      try {
        const response = await apiFetchJson<{ viewer_token: string }>(`/api/links/${linkId}/access`, {
          body: JSON.stringify({
            email,
            nda_accepted: acceptedNda,
            password,
          }),
          method: 'POST',
        });

        await startViewing(response.viewer_token, acceptedNda, resolvedLinkData);
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : 'Verification failed.');
      }
    },
    [email, linkId, password, startViewing],
  );

  const loadLink = useEffectEvent(async () => {
    try {
      const data = await apiFetchJson<LinkData>(`/api/links/${linkId}`);
      const documents = getViewerDocuments(data);
      const firstDocument = documents[0] ?? null;

      setLinkData(data);
      setCurrentDocumentId(firstDocument?.id ?? null);
      setCurrentPage(1);

      if (data.link_state === 'disabled' || !data.is_active) {
        setGate('disabled');
        return;
      }

      if (data.link_state === 'expired') {
        setGate('expired');
        return;
      }

      if (data.require_email) {
        setGate('email');
        return;
      }

      if (data.require_password) {
        setGate('password');
        return;
      }

      if (data.require_nda) {
        setGate('nda');
        return;
      }

      await authorizeViewer(false, data);
    } catch (requestError) {
      console.error('Failed to load link', requestError);
      setGate('disabled');
    }
  });

  useEffect(() => {
    void loadLink();
  }, [linkId]);

  async function handleEmailSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError('');

    if (!email) {
      setError('Please enter your email address');
      return;
    }

    if (linkData?.require_password) {
      setGate('password');
      return;
    }

    if (linkData?.require_nda) {
      setGate('nda');
      return;
    }

    await authorizeViewer(false);
  }

  async function handlePasswordSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError('');

    if (!password) {
      setError('Please enter the password');
      return;
    }

    if (linkData?.require_nda) {
      setGate('nda');
      return;
    }

    await authorizeViewer(false);
  }

  async function handleNdaAccept() {
    setError('');
    await authorizeViewer(true);
  }

  useEffect(() => {
    if (gate !== 'viewer' || !visitId || !visitToken || !currentDocumentId || pageStartTimeRef.current === 0) {
      return;
    }

    return () => {
      const duration = Math.max(0, (Date.now() - pageStartTimeRef.current) / 1000);

      void fetch('/api/visits/page-view', {
        body: JSON.stringify({
          document_id: currentDocumentId,
          duration,
          page_number: currentPage,
          visit_id: visitId,
        }),
        headers: {
          'Content-Type': 'application/json',
          'x-opendoc-visit-token': visitToken,
        },
        method: 'POST',
      });
    };
  }, [currentDocumentId, currentPage, gate, visitId, visitToken]);

  useEffect(() => {
    if (gate !== 'viewer') {
      return;
    }

    pageStartTimeRef.current = Date.now();
  }, [currentDocumentId, currentPage, gate]);

  useEffect(() => {
    if (!visitId || !visitToken) {
      return;
    }

    const interval = setInterval(() => {
      void fetch(`/api/visits/${visitId}`, {
        body: JSON.stringify({
          completion_rate: (currentPage / Math.max(totalPages, 1)) * 100,
          page_count_viewed: currentPage,
        }),
        headers: {
          'Content-Type': 'application/json',
          'x-opendoc-visit-token': visitToken,
        },
        method: 'PATCH',
      });
    }, 10000);

    return () => clearInterval(interval);
  }, [currentPage, totalPages, visitId, visitToken]);

  useEffect(() => {
    if (gate !== 'viewer') {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
        event.preventDefault();
        setCurrentPage((page) => Math.min(page + 1, totalPages));
      } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
        event.preventDefault();
        setCurrentPage((page) => Math.max(page - 1, 1));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gate, totalPages]);

  const documentSource =
    gate === 'viewer' && currentDocument
      ? `/api/links/${linkId}/document?documentId=${encodeURIComponent(currentDocument.id)}#page=${currentPage}&toolbar=0&navpanes=0`
      : null;

  const downloadSource =
    gate === 'viewer' && currentDocument
      ? `/api/links/${linkId}/document?documentId=${encodeURIComponent(currentDocument.id)}&download=1`
      : null;

  const watermarkLabel = [email || 'CONFIDENTIAL', viewerIp || 'IP HIDDEN', new Date().toLocaleString()].join(
    ' · ',
  );

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

  if (gate === 'email') {
    return (
      <GateScreen
        icon={<Mail size={32} className="text-accent" />}
        title={linkData?.space?.name || linkData?.document?.name || 'Document'}
        description="Please enter your email to continue"
        brandName={linkData?.brand?.company_name}
      >
        <form onSubmit={handleEmailSubmit} className="w-full max-w-sm space-y-4">
          <Input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
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
            onChange={(event) => setPassword(event.target.value)}
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
              onChange={(event) => setNdaAccepted(event.target.checked)}
              className="w-4 h-4 rounded accent-accent"
            />
            <label htmlFor="nda-accept" className="text-sm text-muted-foreground">
              I have read and agree to the terms above
            </label>
          </div>
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <Button onClick={handleNdaAccept} disabled={!ndaAccepted} className="w-full">
            <Check size={16} />
            Accept & Continue
          </Button>
        </div>
      </GateScreen>
    );
  }

  if (!currentDocument) {
    return (
      <GateScreen
        icon={<AlertTriangle size={32} className="text-warning" />}
        title="No Documents Available"
        description="This link does not currently have any documents attached."
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col">
      <div className="h-14 bg-card border-b border-border flex items-center justify-between px-4 sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-sm font-semibold text-foreground">{currentDocument.name}</h1>
            <p className="text-xs text-muted">
              {linkData?.space ? `${linkData.space.name} · ` : ''}
              {linkData?.brand?.company_name ? `Shared by ${linkData.brand.company_name}` : 'Secured by OpenDoc'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-background rounded-lg border border-border px-2 py-1">
            <button
              onClick={() => setCurrentPage((page) => Math.max(page - 1, 1))}
              disabled={currentPage <= 1}
              className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30 cursor-pointer"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm text-foreground px-2 min-w-[80px] text-center">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((page) => Math.min(page + 1, totalPages))}
              disabled={currentPage >= totalPages}
              className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30 cursor-pointer"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="flex items-center gap-1 bg-background rounded-lg border border-border px-2 py-1">
            <button
              onClick={() => setZoom((value) => Math.max(value - 0.25, 0.5))}
              className="p-1 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <ZoomOut size={16} />
            </button>
            <span className="text-xs text-muted-foreground w-12 text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom((value) => Math.min(value + 0.25, 3))}
              className="p-1 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <ZoomIn size={16} />
            </button>
          </div>

          {linkData?.allow_download && downloadSource && (
            <a
              href={downloadSource}
              onClick={() => {
                if (visitId && visitToken) {
                  void fetch(`/api/visits/${visitId}`, {
                    body: JSON.stringify({ downloaded: true }),
                    headers: {
                      'Content-Type': 'application/json',
                      'x-opendoc-visit-token': visitToken,
                    },
                    method: 'PATCH',
                  });
                }
              }}
            >
              <Button variant="ghost" size="sm">
                <Download size={16} />
              </Button>
            </a>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex">
        {linkData?.space && currentDocuments.length > 1 ? (
          <aside className="w-64 border-r border-border bg-card/70 backdrop-blur-sm p-3 overflow-y-auto">
            <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">
              Data Room
            </p>
            <div className="space-y-1">
              {currentDocuments.map((document) => (
                <button
                  key={document.id}
                  onClick={() => {
                    setCurrentDocumentId(document.id);
                    setCurrentPage(1);
                    pageStartTimeRef.current = Date.now();
                  }}
                  className={cn(
                    'w-full text-left rounded-lg px-3 py-2 transition-colors',
                    currentDocumentId === document.id
                      ? 'bg-accent-muted text-accent'
                      : 'text-muted-foreground hover:text-foreground hover:bg-card-hover',
                  )}
                >
                  <p className="text-sm font-medium">{document.name}</p>
                  <p className="text-xs">{document.page_count} pages</p>
                </button>
              ))}
            </div>
          </aside>
        ) : null}

        <div className="flex-1 overflow-auto flex items-start justify-center p-8">
          <div
            className="relative bg-white rounded-lg shadow-2xl"
            style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}
          >
            {documentSource && (
              <iframe
                src={documentSource}
                className="w-[800px] h-[1035px] rounded-lg"
                style={{ border: 'none' }}
                title={currentDocument.name}
              />
            )}

            {linkData?.enable_watermark && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden rounded-lg">
                <div className="rotate-[-30deg] opacity-[0.08] text-center">
                  {[...Array(5)].map((_, index) => (
                    <p key={index} className="text-2xl font-bold text-black whitespace-nowrap mb-24">
                      {watermarkLabel} &nbsp;&middot;&nbsp; {watermarkLabel}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="h-20 bg-card/90 backdrop-blur-sm border-t border-border flex items-center px-4 gap-2 overflow-x-auto">
        {[...Array(totalPages)].map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentPage(index + 1)}
            className={cn(
              'flex-shrink-0 w-12 h-14 rounded-md border-2 flex items-center justify-center text-xs font-medium transition-all cursor-pointer',
              currentPage === index + 1
                ? 'border-accent bg-accent-muted text-accent'
                : 'border-border bg-card-hover text-muted-foreground hover:border-border-hover',
            )}
          >
            {index + 1}
          </button>
        ))}
      </div>
    </div>
  );
}

function GateScreen({
  icon,
  title,
  description,
  children,
  brandName,
}: {
  brandName?: string | null;
  children?: React.ReactNode;
  description: string;
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-full max-w-sm px-6">
        <div className="mb-8 text-center">
          <div className="text-muted mb-4 flex justify-center">{icon}</div>
          <h1 className="text-xl font-bold text-foreground mb-1">{title}</h1>
          <p className="text-sm text-muted">{description}</p>
        </div>
        <div className="flex flex-col items-center">{children}</div>
        <div className="mt-10 text-center">
          {brandName && <p className="text-xs text-muted mb-2">Shared via {brandName}</p>}
          <p className="text-xs text-muted">Secured by OpenDoc</p>
        </div>
      </div>
    </div>
  );
}
