'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  Check,
  ChevronDown,
  Copy,
  Download,
  ExternalLink,
  Eye,
  Lock,
  Mail,
  Plus,
  Settings,
  Trash2,
} from 'lucide-react';

import { Header } from '@/components/dashboard/header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { StatsCard } from '@/components/ui/stats-card';
import { Toggle } from '@/components/ui/toggle';
import { apiFetchJson } from '@/lib/api-client';
import type { Document, DocumentLink, DocumentPageAnalytics, Visit } from '@/lib/types';
import { formatDate, formatDateTime, formatDuration } from '@/lib/utils';

export default function DocumentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useUser();
  const userId = user?.id;
  const [document, setDocument] = useState<Document | null>(null);
  const [links, setLinks] = useState<DocumentLink[]>([]);
  const [pageAnalytics, setPageAnalytics] = useState<DocumentPageAnalytics | null>(null);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [createLinkOpen, setCreateLinkOpen] = useState(false);
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);
  const [linkName, setLinkName] = useState('');
  const [requireEmail, setRequireEmail] = useState(true);
  const [requirePassword, setRequirePassword] = useState(false);
  const [password, setPassword] = useState('');
  const [allowDownload, setAllowDownload] = useState(false);
  const [enableWatermark, setEnableWatermark] = useState(false);
  const [expiresAt, setExpiresAt] = useState('');
  const [allowedEmails, setAllowedEmails] = useState('');
  const [blockedEmails, setBlockedEmails] = useState('');
  const [allowedDomains, setAllowedDomains] = useState('');
  const [blockedDomains, setBlockedDomains] = useState('');
  const [creatingLink, setCreatingLink] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const router = useRouter();

  const loadData = useCallback(async () => {
    if (!userId || !id) {
      return;
    }

    setLoading(true);

    try {
      const [documentRow, linkRows, visitRows, pageAnalyticsRow] = await Promise.all([
        apiFetchJson<Document>(`/api/documents/${id}`),
        apiFetchJson<DocumentLink[]>(`/api/share-links?documentId=${id}`),
        apiFetchJson<Visit[]>(`/api/visits?documentId=${id}`),
        apiFetchJson<DocumentPageAnalytics>(`/api/documents/${id}/page-analytics`),
      ]);

      setDocument(documentRow);
      setLinks(linkRows);
      setPageAnalytics(pageAnalyticsRow);
      setVisits(visitRows);
    } catch (error) {
      console.error('Error loading document details:', error);
      setDocument(null);
      setLinks([]);
      setPageAnalytics(null);
      setVisits([]);
    } finally {
      setLoading(false);
    }
  }, [id, userId]);

  useEffect(() => {
    if (!userId || !id) {
      return;
    }

    void loadData();
  }, [id, loadData, userId]);

  async function createLink() {
    setCreatingLink(true);

    try {
      await apiFetchJson<DocumentLink>('/api/share-links', {
        body: JSON.stringify({
          allow_download: allowDownload,
          allowed_domains: allowedDomains
            .split(',')
            .map((value) => value.trim())
            .filter(Boolean),
          allowed_emails: allowedEmails
            .split(',')
            .map((value) => value.trim())
            .filter(Boolean),
          blocked_domains: blockedDomains
            .split(',')
            .map((value) => value.trim())
            .filter(Boolean),
          blocked_emails: blockedEmails
            .split(',')
            .map((value) => value.trim())
            .filter(Boolean),
          document_id: id,
          enable_watermark: enableWatermark,
          expires_at: expiresAt || null,
          name: linkName || 'Default Link',
          password: requirePassword ? password : null,
          require_email: requireEmail,
          require_password: requirePassword,
        }),
        method: 'POST',
      });

      setCreateLinkOpen(false);
      resetLinkForm();
      await loadData();
    } catch (error) {
      console.error('Error creating link:', error);
    } finally {
      setCreatingLink(false);
    }
  }

  function resetLinkForm() {
    setLinkName('');
    setRequireEmail(true);
    setRequirePassword(false);
    setPassword('');
    setAllowDownload(false);
    setEnableWatermark(false);
    setExpiresAt('');
    setAllowedEmails('');
    setBlockedEmails('');
    setAllowedDomains('');
    setBlockedDomains('');
    setAdvancedOpen(false);
  }

  async function toggleLink(linkId: string, isActive: boolean) {
    await apiFetchJson<DocumentLink>(`/api/share-links/${linkId}`, {
      body: JSON.stringify({ is_active: !isActive }),
      method: 'PATCH',
    });
    await loadData();
  }

  async function deleteLink(linkId: string) {
    await apiFetchJson<{ success: boolean }>(`/api/share-links/${linkId}`, {
      method: 'DELETE',
    });
    await loadData();
  }

  async function deleteDocument() {
    setDeleting(true);
    setDeleteError('');
    try {
      await apiFetchJson<{ success: boolean }>(`/api/documents/${id}`, { method: 'DELETE' });
      router.push('/documents');
    } catch {
      setDeleteError('Failed to delete document. Please try again.');
      setDeleting(false);
    }
  }

  function copyLink(linkId: string) {
    const url = `${window.location.origin}/view/${linkId}`;
    navigator.clipboard.writeText(url);
    setCopiedLinkId(linkId);
    setTimeout(() => setCopiedLinkId(null), 2000);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
      </div>
    );
  }

  if (!document) {
    return <div className="p-8 text-center text-muted-foreground">Document not found.</div>;
  }

  const totalViews = visits.length;
  const uniqueVisitors = new Set(visits.map((visit) => visit.visitor_email).filter(Boolean)).size;
  const avgDuration = visits.length > 0
    ? visits.reduce((acc, visit) => acc + (visit.duration || 0), 0) / visits.length
    : 0;
  const avgCompletion = visits.length > 0
    ? Math.round(
        visits.reduce((acc, visit) => acc + (visit.completion_rate || 0), 0) / visits.length,
      )
    : 0;
  const pageAnalyticsByNumber = new Map(
    (pageAnalytics?.page_analytics ?? []).map((entry) => [entry.page_number, entry]),
  );
  const pageRows = Array.from({ length: pageAnalytics?.page_count ?? document.page_count }, (_, index) => {
    const pageNumber = index + 1;
    const entry = pageAnalyticsByNumber.get(pageNumber);

    return {
      last_viewed_at: entry?.last_viewed_at ?? null,
      page_number: pageNumber,
      total_duration: entry?.total_duration ?? 0,
      total_views: entry?.total_views ?? 0,
      unique_visits: entry?.unique_visits ?? 0,
    };
  });
  const sessionRows = pageAnalytics?.session_analytics ?? [];
  const maxPageDuration = Math.max(...pageRows.map((page) => page.total_duration), 1);

  return (
    <div>
      <Header
        title={document.name}
        description={`${document.page_count} pages · ${document.file_type.toUpperCase()}`}
        actions={
          <div className="flex items-center gap-2">
            <Link href="/documents">
              <Button variant="ghost" size="sm">
                <ArrowLeft size={16} />
                Back
              </Button>
            </Link>
            <Button variant="ghost" size="sm" onClick={() => setDeleteOpen(true)}>
              <Trash2 size={16} className="text-danger" />
            </Button>
            <Button onClick={() => setCreateLinkOpen(true)} size="sm">
              <Plus size={16} />
              Create Link
            </Button>
          </div>
        }
      />

      <div className="p-8 space-y-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-border rounded-xl overflow-hidden border border-border">
          <div className="bg-card px-5 py-4">
            <StatsCard label="Total Views" value={totalViews} />
          </div>
          <div className="bg-card px-5 py-4">
            <StatsCard label="Unique Visitors" value={uniqueVisitors} />
          </div>
          <div className="bg-card px-5 py-4">
            <StatsCard label="Avg. Time Spent" value={formatDuration(avgDuration)} />
          </div>
          <div className="bg-card px-5 py-4">
            <StatsCard label="Completion Rate" value={`${avgCompletion}%`} />
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-foreground uppercase tracking-wide">
                  Shared Links
                </h2>
                <Badge>{links.length} link{links.length !== 1 ? 's' : ''}</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {links.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-muted-foreground text-sm mb-4">No links yet. Create one to start sharing.</p>
                  <Button size="sm" onClick={() => setCreateLinkOpen(true)}>
                    <Plus size={16} />
                    Create Link
                  </Button>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {links.map((link) => (
                    <div key={link.id} className="px-6 py-4 hover:bg-card-hover transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <h3 className="text-sm font-medium text-foreground">{link.name}</h3>
                          <Badge variant={link.is_active ? 'success' : 'danger'}>
                            {link.is_active ? 'Active' : 'Disabled'}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" onClick={() => copyLink(link.link_id)}>
                            {copiedLinkId === link.link_id ? (
                              <Check size={14} className="text-success" />
                            ) : (
                              <Copy size={14} />
                            )}
                          </Button>
                          <a href={`/view/${link.link_id}`} target="_blank" rel="noopener noreferrer">
                            <Button variant="ghost" size="sm">
                              <ExternalLink size={14} />
                            </Button>
                          </a>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleLink(link.id, link.is_active)}
                          >
                            <Settings size={14} />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => deleteLink(link.id)}>
                            <Trash2 size={14} className="text-danger" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1">
                          <Eye size={12} /> {link.visit_count} views
                        </span>
                        {link.require_email && (
                          <span className="flex items-center gap-1">
                            <Mail size={12} /> Email required
                          </span>
                        )}
                        {link.require_password && (
                          <span className="flex items-center gap-1">
                            <Lock size={12} /> Password protected
                          </span>
                        )}
                        {link.enable_watermark && (
                          <span className="flex items-center gap-1">
                            <Lock size={12} /> Watermarked
                          </span>
                        )}
                        {link.allow_download && (
                          <span className="flex items-center gap-1">
                            <Download size={12} /> Download enabled
                          </span>
                        )}
                        {link.allowed_domains.length > 0 && (
                          <span>{link.allowed_domains.length} allowed domain{link.allowed_domains.length !== 1 ? 's' : ''}</span>
                        )}
                        {link.expires_at && (
                          <span className="flex items-center gap-1">
                            <Calendar size={12} /> Expires {formatDate(link.expires_at)}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted mt-1 font-mono">
                        {typeof window !== 'undefined' && `${window.location.origin}/view/${link.link_id}`}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-sm font-bold text-foreground uppercase tracking-wide">
                Recent Visitors
              </h2>
            </CardHeader>
            <CardContent className="p-0">
              {visits.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground text-sm">
                  No visitors yet.
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {visits.slice(0, 10).map((visit) => (
                    <div key={visit.id} className="px-6 py-3 hover:bg-card-hover transition-colors">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {visit.visitor_email || 'Anonymous'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDuration(visit.duration || 0)} · {visit.page_count_viewed} pages ·{' '}
                            {Math.round(visit.completion_rate || 0)}%
                          </p>
                        </div>
                        <p className="text-xs text-muted-foreground">{formatDate(visit.created_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* DocSend-style page analytics */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-foreground uppercase tracking-wide">
                  Page Analytics
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">Time spent per page across all sessions</p>
              </div>
              <Badge>{pageRows.length} page{pageRows.length !== 1 ? 's' : ''}</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {document.file_type !== 'pdf' && document.preview_status !== 'ready' ? (
              <div className="border-b border-border bg-card-hover px-6 py-3 text-xs text-muted-foreground">
                {document.preview_status === 'pending'
                  ? 'Trackable preview is still generating — page analytics will appear once ready.'
                  : 'Preview generation failed, so page-level analytics are unavailable for this file.'}
              </div>
            ) : null}

            {pageRows.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                No page analytics yet.
              </div>
            ) : (
              <div className="px-6 py-4 space-y-2">
                {pageRows.map((page) => {
                  const pct = maxPageDuration > 0
                    ? (page.total_duration / maxPageDuration) * 100
                    : 0;
                  const hasViews = page.total_duration > 0;
                  return (
                    <div key={page.page_number} className="flex items-center gap-3 group">
                      <span className="w-8 shrink-0 text-right text-xs font-mono font-medium text-muted-foreground">
                        {String(page.page_number).padStart(2, '0')}
                      </span>
                      <div className="flex-1 h-6 bg-card-hover rounded overflow-hidden">
                        <div
                          className="h-full rounded transition-all duration-300"
                          style={{
                            width: hasViews ? `${Math.max(pct, 3)}%` : '0%',
                            backgroundColor: hasViews ? 'var(--color-accent)' : undefined,
                            opacity: hasViews ? (40 + pct * 0.6) / 100 : undefined,
                          }}
                        />
                      </div>
                      <div className="w-28 shrink-0 flex items-center justify-end gap-2">
                        <span className="text-xs font-medium text-foreground tabular-nums">
                          {hasViews ? formatDuration(page.total_duration) : '—'}
                        </span>
                        <span className="text-[10px] text-muted-foreground tabular-nums">
                          {page.unique_visits}v
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* DocSend-style session heatmap */}
        {sessionRows.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-foreground uppercase tracking-wide">
                    Session Breakdown
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Per-session page heatmap — darker = more time</p>
                </div>
                <Badge>{sessionRows.length} session{sessionRows.length !== 1 ? 's' : ''}</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {sessionRows.map((session) => {
                  const sessionMax = Math.max(
                    ...session.page_analytics.map((p) => p.total_duration),
                    1,
                  );
                  const pageMap = new Map(
                    session.page_analytics.map((p) => [p.page_number, p]),
                  );
                  return (
                    <div key={session.visit_id} className="px-6 py-4">
                      <div className="flex items-center justify-between gap-4 mb-3">
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {session.visitor_email || session.visitor_name || 'Anonymous'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {session.created_at ? formatDateTime(session.created_at) : 'Unknown time'}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-semibold text-foreground tabular-nums">
                            {formatDuration(session.tracked_duration)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {Math.round(session.completion_rate)}% read
                          </p>
                        </div>
                      </div>

                      {/* page strip */}
                      <div className="flex gap-0.5 flex-wrap">
                        {pageRows.map((page) => {
                          const entry = pageMap.get(page.page_number);
                          const intensity = entry
                            ? Math.round(30 + (entry.total_duration / sessionMax) * 70)
                            : 0;
                          return (
                            <div
                              key={page.page_number}
                              title={`Page ${page.page_number}: ${entry ? formatDuration(entry.total_duration) : 'not viewed'}`}
                              className="h-5 rounded-sm flex-1 min-w-[10px] max-w-[28px] transition-opacity"
                              style={{
                                backgroundColor: intensity > 0 ? 'var(--color-accent)' : 'var(--color-card-hover)',
                                opacity: intensity > 0 ? intensity / 100 : undefined,
                              }}
                            />
                          );
                        })}
                      </div>
                      <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
                        <span>p1</span>
                        <span>p{pageRows.length}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Modal
        open={deleteOpen}
        onOpenChange={(open) => { setDeleteOpen(open); if (!open) setDeleteError(''); }}
        title="Delete document?"
        description={`"${document.name}" will be permanently deleted. This cannot be undone.`}
      >
        <div className="flex items-start gap-3 rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger mb-5">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" />
          <span>Any active share links pointing to this document will stop working.</span>
        </div>
        {deleteError && <p className="text-sm text-danger mb-4">{deleteError}</p>}
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => { setDeleteOpen(false); setDeleteError(''); }}>
            Cancel
          </Button>
          <Button variant="danger" onClick={deleteDocument} loading={deleting}>
            <Trash2 size={15} />
            Delete
          </Button>
        </div>
      </Modal>

      <Modal
        open={createLinkOpen}
        onOpenChange={(open) => { setCreateLinkOpen(open); if (!open) resetLinkForm(); }}
        title="Create Shareable Link"
        description="Configure how people access this document"
        dismissible={false}
        size="lg"
      >
        <div className="space-y-5 max-h-[60vh] overflow-y-auto pr-2">
          <Input
            label="Link Name"
            value={linkName}
            onChange={(event) => setLinkName(event.target.value)}
            placeholder="e.g., Investor Deck - Series A"
          />

          <div className="space-y-4 border-t border-border pt-4">
            <Toggle
              checked={requireEmail}
              onCheckedChange={setRequireEmail}
              label="Require Email"
              description="Viewers must enter their email before viewing"
            />
            <Toggle
              checked={requirePassword}
              onCheckedChange={setRequirePassword}
              label="Password Protection"
              description="Require a password to access the document"
            />
            {requirePassword && (
              <Input
                label="Password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter a password"
              />
            )}
          </div>

          {/* Advanced options accordion */}
          <div className="border-t border-border pt-4">
            <button
              type="button"
              onClick={() => setAdvancedOpen((prev) => !prev)}
              className="flex w-full items-center justify-between text-sm font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <span>Advanced options</span>
              <ChevronDown
                size={15}
                className={`transition-transform duration-200 ${advancedOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {advancedOpen && (
              <div className="mt-4 space-y-4">
                <Toggle
                  checked={enableWatermark}
                  onCheckedChange={setEnableWatermark}
                  label="Dynamic Watermark"
                  description="Overlay viewer email, IP address, and timestamp on each page"
                />
                <Toggle
                  checked={allowDownload}
                  onCheckedChange={setAllowDownload}
                  label="Allow Download"
                  description="Let viewers download the document"
                />
                <Input
                  label="Expiration Date"
                  type="datetime-local"
                  value={expiresAt}
                  onChange={(event) => setExpiresAt(event.target.value)}
                />
                <Input
                  label="Allowed Emails (comma-separated)"
                  value={allowedEmails}
                  onChange={(event) => setAllowedEmails(event.target.value)}
                  placeholder="user@company.com, team@org.com"
                />
                <Input
                  label="Blocked Emails (comma-separated)"
                  value={blockedEmails}
                  onChange={(event) => setBlockedEmails(event.target.value)}
                  placeholder="block@competitor.com"
                />
                <Input
                  label="Allowed Domains (comma-separated)"
                  value={allowedDomains}
                  onChange={(event) => setAllowedDomains(event.target.value)}
                  placeholder="vcfirm.com, diligence.io"
                />
                <Input
                  label="Blocked Domains (comma-separated)"
                  value={blockedDomains}
                  onChange={(event) => setBlockedDomains(event.target.value)}
                  placeholder="competitor.com"
                />
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button variant="secondary" onClick={() => { setCreateLinkOpen(false); resetLinkForm(); }}>
              Cancel
            </Button>
            <Button onClick={createLink} loading={creatingLink}>
              <Plus size={16} />
              Create Link
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
