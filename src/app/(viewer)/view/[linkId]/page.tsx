'use client';

import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useEffectEvent, useRef, useState } from 'react';
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Download,
  Lock,
  Mail,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiFetchJson } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import {
  buildViewerDocumentPath,
  getInlineViewerFileType,
  isInlinePreviewFailed,
  isInlinePreviewPending,
  isPdfViewerFile,
} from '@/lib/viewer';

function ViewerPaneLoading() {
  return (
    <div className="flex h-full items-center justify-center p-8">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
    </div>
  );
}

const PdfDocumentViewer = dynamic(
  () =>
    import('@/components/viewer/pdf-document-viewer').then((module) => ({
      default: module.PdfDocumentViewer,
    })),
  {
    loading: ViewerPaneLoading,
    ssr: false,
  },
);

interface SharedDocumentSummary {
  file_type: string;
  id: string;
  name: string;
  page_count: number;
  preview_error: string | null;
  preview_file_type: string | null;
  preview_page_count: number;
  preview_status: string;
  preview_updated_at: string | null;
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
  require_email: boolean;
  require_password: boolean;
  space: SharedSpace | null;
  watermark_text: string | null;
}

type GateType = 'loading' | 'expired' | 'disabled' | 'email' | 'password' | 'viewer';

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
  const [resolvedPageCount, setResolvedPageCount] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [visitId, setVisitId] = useState<string | null>(null);
  const [visitToken, setVisitToken] = useState<string | null>(null);
  const [pendingDocumentId, setPendingDocumentId] = useState<string | null>(null);
  const [viewerIp, setViewerIp] = useState<string | null>(null);
  const [viewerToken, setViewerToken] = useState<string | null>(null);
  const [viewerVisible, setViewerVisible] = useState(true);
  const pageStartTimeRef = useRef<number | null>(null);
  const visitStartTimeRef = useRef<number | null>(null);
  const trackedVisitDurationRef = useRef(0);
  const visitDocumentIdRef = useRef<string | null>(null);
  const viewedPagesRef = useRef(new Set<number>());

  const currentDocuments = getViewerDocuments(linkData);
  const currentDocument =
    currentDocuments.find((document) => document.id === currentDocumentId) ?? currentDocuments[0] ?? null;
  const totalPages = resolvedPageCount;
  const inlineViewerFileType = currentDocument
    ? getInlineViewerFileType({
        fileType: currentDocument.file_type,
        previewFileType: currentDocument.preview_file_type,
        previewStatus: currentDocument.preview_status,
        previewUpdatedAt: currentDocument.preview_updated_at,
      })
    : null;
  const isPdfDocument = isPdfViewerFile(inlineViewerFileType);
  const previewPending = currentDocument
    ? isInlinePreviewPending({
        fileType: currentDocument.file_type,
        previewStatus: currentDocument.preview_status,
        previewUpdatedAt: currentDocument.preview_updated_at,
      })
    : false;
  const previewFailed = currentDocument
    ? isInlinePreviewFailed({
        fileType: currentDocument.file_type,
        previewStatus: currentDocument.preview_status,
        previewUpdatedAt: currentDocument.preview_updated_at,
      })
    : false;
  const supportsZoom = isPdfDocument;

  const resetTrackedVisitState = useCallback(() => {
    pageStartTimeRef.current = null;
    trackedVisitDurationRef.current = 0;
    visitStartTimeRef.current = null;
    viewedPagesRef.current = new Set();
  }, []);

  useEffect(() => {
    setResolvedPageCount(
      currentDocument?.preview_page_count || currentDocument?.page_count || 1,
    );
  }, [currentDocument?.id, currentDocument?.page_count, currentDocument?.preview_page_count]);

  const startViewing = useCallback(
    async (
      sessionToken: string,
      resolvedLinkData?: LinkData,
      requestedDocumentId?: string | null,
    ) => {
      const activeLink = resolvedLinkData ?? linkData;

      if (!activeLink) {
        return;
      }

      const firstDocument = getViewerDocuments(activeLink)[0] ?? null;
      const activeDocumentId = requestedDocumentId ?? currentDocumentId ?? firstDocument?.id ?? null;

      try {
        setViewerToken(sessionToken);
        resetTrackedVisitState();

        const visit = await apiFetchJson<VisitSession>('/api/visits', {
          body: JSON.stringify({
            document_id: activeDocumentId,
            visitor_email: email || null,
          }),
          headers: {
            'x-opendoc-viewer-token': sessionToken,
          },
          method: 'POST',
        });

        visitDocumentIdRef.current = activeDocumentId;
        setCurrentDocumentId(activeDocumentId);
        setCurrentPage(1);
        setVisitId(visit.id);
        setVisitToken(visit.visit_token);
        setViewerIp(visit.ip_address);
        setGate('viewer');
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : 'Failed to start viewer.');
      }
    },
    [currentDocumentId, email, linkData, resetTrackedVisitState],
  );

  const authorizeViewer = useCallback(
    async (resolvedLinkData?: LinkData) => {
      try {
        const response = await apiFetchJson<{ viewer_token: string }>(`/api/links/${linkId}/access`, {
          body: JSON.stringify({
            email,
            password,
          }),
          method: 'POST',
        });

        const firstDocument = getViewerDocuments(resolvedLinkData ?? linkData)[0] ?? null;
        await startViewing(response.viewer_token, resolvedLinkData, firstDocument?.id ?? null);
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : 'Verification failed.');
      }
    },
    [email, linkData, linkId, password, startViewing],
  );

  const loadLink = useEffectEvent(async () => {
    try {
      setViewerToken(null);
      setVisitId(null);
      setVisitToken(null);
      setViewerIp(null);
      visitDocumentIdRef.current = null;
      resetTrackedVisitState();

      const data = await apiFetchJson<LinkData>(`/api/links/${linkId}`);
      const documents = getViewerDocuments(data);
      const firstDocument = documents[0] ?? null;

      setLinkData(data);
      setCurrentDocumentId((currentId) =>
        currentId && documents.some((document) => document.id === currentId) ? currentId : firstDocument?.id ?? null,
      );
      setCurrentPage(1);

      document.documentElement.style.setProperty(
        '--accent',
        data.brand?.accent_color ?? '#34d399',
      );

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

      await authorizeViewer(data);
    } catch (requestError) {
      console.error('Failed to load link', requestError);
      setGate('disabled');
    }
  });

  const refreshLinkPreview = useEffectEvent(async () => {
    try {
      const data = await apiFetchJson<LinkData>(`/api/links/${linkId}`);
      const documents = getViewerDocuments(data);
      const firstDocument = documents[0] ?? null;

      setLinkData(data);
      setCurrentDocumentId((currentId) =>
        currentId && documents.some((document) => document.id === currentId) ? currentId : firstDocument?.id ?? null,
      );
    } catch (requestError) {
      console.error('Failed to refresh document preview state', requestError);
    }
  });

  useEffect(() => {
    const updateVisibility = () => {
      setViewerVisible(document.visibilityState === 'visible');
    };

    updateVisibility();
    document.addEventListener('visibilitychange', updateVisibility);

    return () => document.removeEventListener('visibilitychange', updateVisibility);
  }, []);

  useEffect(() => {
    void loadLink();
  }, [linkId]);

  useEffect(() => {
    if (gate !== 'viewer' || !currentDocument || !previewPending) {
      return;
    }

    const interval = window.setInterval(() => {
      void refreshLinkPreview();
    }, 5000);

    return () => window.clearInterval(interval);
  }, [currentDocument, gate, previewPending]);

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

    await authorizeViewer();
  }

  async function handlePasswordSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError('');

    if (!password) {
      setError('Please enter the password');
      return;
    }

    await authorizeViewer();
  }

  const flushPageView = useCallback((keepalive = false) => {
    if (!visitId || !visitToken || !currentDocumentId || !isPdfDocument || pageStartTimeRef.current === null) {
      return;
    }

    const startedAt = pageStartTimeRef.current;
    pageStartTimeRef.current = null;
    const duration = Math.max(0, (Date.now() - startedAt) / 1000);

    if (duration < 0.25) {
      return;
    }

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
      keepalive,
      method: 'POST',
    });
  }, [currentDocumentId, currentPage, isPdfDocument, visitId, visitToken]);

  const syncVisitSnapshot = useCallback((keepalive = false) => {
    if (!visitId || !visitToken || !visitDocumentIdRef.current) {
      return;
    }

    const inFlightDuration =
      visitStartTimeRef.current === null ? 0 : Math.max(0, (Date.now() - visitStartTimeRef.current) / 1000);

    const payload: Record<string, number> = {
      duration: trackedVisitDurationRef.current + inFlightDuration,
    };

    if (isPdfDocument && currentDocumentId === visitDocumentIdRef.current) {
      const pageCountViewed = viewedPagesRef.current.size;
      payload.completion_rate = (pageCountViewed / Math.max(totalPages, 1)) * 100;
      payload.page_count_viewed = pageCountViewed;
    }

    void fetch(`/api/visits/${visitId}`, {
      body: JSON.stringify(payload),
      headers: {
        'Content-Type': 'application/json',
        'x-opendoc-visit-token': visitToken,
      },
      keepalive,
      method: 'PATCH',
    });
  }, [currentDocumentId, isPdfDocument, totalPages, visitId, visitToken]);

  const finalizeVisitTracking = useCallback((keepalive = false) => {
    if (visitStartTimeRef.current !== null) {
      trackedVisitDurationRef.current += Math.max(0, (Date.now() - visitStartTimeRef.current) / 1000);
      visitStartTimeRef.current = null;
    }

    flushPageView(keepalive);
    syncVisitSnapshot(keepalive);
  }, [flushPageView, syncVisitSnapshot]);

  const handleDocumentSelect = useCallback(
    async (documentId: string) => {
      if (documentId === currentDocumentId) {
        return;
      }

      setError('');
      setPendingDocumentId(documentId);

      try {
        finalizeVisitTracking(false);

        if (!viewerToken) {
          setCurrentDocumentId(documentId);
          setCurrentPage(1);
          return;
        }

        await startViewing(viewerToken, linkData ?? undefined, documentId);
      } finally {
        setPendingDocumentId(null);
      }
    },
    [currentDocumentId, finalizeVisitTracking, linkData, startViewing, viewerToken],
  );

  useEffect(() => {
    if (gate !== 'viewer' || !viewerVisible || !visitId || !visitToken) {
      return;
    }

    visitStartTimeRef.current = Date.now();

    return () => {
      if (visitStartTimeRef.current !== null) {
        trackedVisitDurationRef.current += Math.max(0, (Date.now() - visitStartTimeRef.current) / 1000);
        visitStartTimeRef.current = null;
      }
    };
  }, [gate, viewerVisible, visitId, visitToken]);

  useEffect(() => {
    if (gate !== 'viewer' || !viewerVisible || !visitId || !visitToken || !currentDocumentId || !isPdfDocument) {
      return;
    }

    viewedPagesRef.current.add(currentPage);
    pageStartTimeRef.current = Date.now();

    return () => flushPageView(false);
  }, [currentDocumentId, currentPage, flushPageView, gate, isPdfDocument, viewerVisible, visitId, visitToken]);

  useEffect(() => {
    if (!visitId || !visitToken) {
      return;
    }

    const interval = window.setInterval(() => {
      syncVisitSnapshot(false);
    }, 10000);

    return () => window.clearInterval(interval);
  }, [syncVisitSnapshot, visitId, visitToken]);

  useEffect(() => {
    if (gate !== 'viewer' || !isPdfDocument) {
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
  }, [gate, isPdfDocument, totalPages]);

  useEffect(() => {
    if (gate !== 'viewer') {
      return;
    }

    const handlePageHide = () => {
      finalizeVisitTracking(true);
    };

    window.addEventListener('pagehide', handlePageHide);

    return () => {
      window.removeEventListener('pagehide', handlePageHide);
      finalizeVisitTracking(false);
    };
  }, [finalizeVisitTracking, gate]);

  const documentSource =
    gate === 'viewer' && currentDocument && isPdfDocument
      ? buildViewerDocumentPath({
          documentId: currentDocument.id,
          linkId,
        })
      : null;

  const downloadSource =
    gate === 'viewer' && currentDocument
      ? buildViewerDocumentPath({
          documentId: currentDocument.id,
          download: true,
          linkId,
        })
      : null;

  const watermarkLabel = [email || 'CONFIDENTIAL', viewerIp || 'IP HIDDEN', new Date().toLocaleString()].join(
    ' · ',
  );
  const previewStatusLabel = isPdfDocument
    ? currentDocument?.file_type === 'pdf'
      ? 'Secure PDF preview'
      : `Trackable PDF preview for ${currentDocument?.file_type.toUpperCase()}`
    : previewPending
      ? `Generating trackable preview for ${currentDocument?.file_type.toUpperCase()}`
      : previewFailed
        ? `Trackable preview failed for ${currentDocument?.file_type.toUpperCase()}`
        : 'Secure preview unavailable';

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
        logoUrl={linkData?.brand?.logo_url}
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
        brandName={linkData?.brand?.company_name}
        logoUrl={linkData?.brand?.logo_url}
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
          {isPdfDocument ? (
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
          ) : (
            <div className="flex items-center gap-2 bg-background rounded-lg border border-border px-3 py-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                {previewStatusLabel}
              </span>
            </div>
          )}

          {supportsZoom ? (
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
          ) : null}

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
                  disabled={pendingDocumentId === document.id}
                  onClick={() => {
                    void handleDocumentSelect(document.id);
                  }}
                  className={cn(
                    'w-full text-left rounded-lg px-3 py-2 transition-colors disabled:opacity-60',
                    currentDocumentId === document.id
                      ? 'bg-accent-muted text-accent'
                      : 'text-muted-foreground hover:text-foreground hover:bg-card-hover',
                  )}
                >
                  <p className="text-sm font-medium">{document.name}</p>
                  <p className="text-xs">
                    {document.preview_status === 'pending'
                      ? 'generating preview...'
                      : document.preview_status === 'failed'
                        ? 'preview unavailable'
                        : `${document.preview_page_count || document.page_count || 0} pages`}
                    {pendingDocumentId === document.id ? ' · opening...' : ''}
                  </p>
                </button>
              ))}
            </div>
          </aside>
        ) : null}

        <div className="relative flex-1 overflow-hidden bg-[#0f1013]">
          {documentSource && isPdfDocument ? (
            <PdfDocumentViewer
              currentPage={currentPage}
              fileUrl={documentSource}
              onPageChange={setCurrentPage}
              onPageCountChange={setResolvedPageCount}
              zoom={zoom}
              key={`${currentDocument.id}:${currentDocument.preview_status}:${currentDocument.preview_page_count}`}
            />
          ) : previewPending ? (
            <div className="flex h-full items-center justify-center p-8">
              <div className="flex min-h-[420px] w-[min(780px,85vw)] items-center justify-center rounded-lg border border-border bg-card px-8 py-12 text-center">
                <div className="max-w-md space-y-3">
                  <p className="text-base font-semibold text-foreground">Generating trackable preview</p>
                  <p className="text-sm text-muted-foreground">
                    Converting this {currentDocument.file_type.toUpperCase()} file into a secure PDF preview so OpenDoc can measure time spent on every slide or page accurately.
                  </p>
                </div>
              </div>
            </div>
          ) : previewFailed ? (
            <div className="flex h-full items-center justify-center p-8">
              <div className="flex min-h-[420px] w-[min(780px,85vw)] items-center justify-center rounded-lg border border-border bg-card px-8 py-12 text-center">
                <div className="max-w-md space-y-3">
                  <p className="text-base font-semibold text-foreground">Trackable preview unavailable</p>
                  <p className="text-sm text-muted-foreground">
                    {currentDocument.preview_error || 'This document could not be converted into a trackable PDF preview.'}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center p-8">
              <div className="flex min-h-[420px] w-[min(780px,85vw)] items-center justify-center rounded-lg border border-border bg-card px-8 py-12 text-center">
                <div className="max-w-md space-y-3">
                  <p className="text-base font-semibold text-foreground">
                    {currentDocument.file_type === 'pdf' ? 'Preparing secure preview' : 'Preview unavailable'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {currentDocument.file_type === 'pdf'
                      ? 'Loading the secure PDF viewer.'
                      : 'This file type cannot be rendered inline without a generated trackable preview.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {linkData?.enable_watermark && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden">
              <div className="rotate-[-30deg] opacity-[0.08] text-center">
                {[...Array(5)].map((_, index) => (
                  <p key={index} className="text-2xl font-bold text-white whitespace-nowrap mb-24">
                    {watermarkLabel} &nbsp;&middot;&nbsp; {watermarkLabel}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {isPdfDocument && totalPages > 1 ? (
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
      ) : null}
    </div>
  );
}

function GateScreen({
  icon,
  title,
  description,
  children,
  brandName,
  logoUrl,
}: {
  brandName?: string | null;
  children?: React.ReactNode;
  description: string;
  icon: React.ReactNode;
  logoUrl?: string | null;
  title: string;
}) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-full max-w-sm px-6">
        <div className="mb-8 text-center">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={brandName ?? 'Logo'}
              className="h-8 max-w-[160px] object-contain mx-auto mb-6"
            />
          ) : null}
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
