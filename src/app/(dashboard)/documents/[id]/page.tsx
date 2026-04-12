'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Header } from '@/components/dashboard/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Toggle } from '@/components/ui/toggle';
import { Modal } from '@/components/ui/modal';
import { StatsCard } from '@/components/ui/stats-card';
import {
  Eye,
  Users,
  Clock,
  BarChart3,
  Link2,
  Plus,
  Copy,
  Check,
  ExternalLink,
  Settings,
  Trash2,
  Mail,
  Lock,
  Calendar,
  Download,
  FileText,
  ArrowLeft,
} from 'lucide-react';
import Link from 'next/link';
import { useUser } from '@clerk/nextjs';
import { supabase } from '@/lib/supabase';
import { formatDate, formatDuration, generateLinkId } from '@/lib/utils';
import type { Document, DocumentLink, Visit } from '@/lib/types';

export default function DocumentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useUser();
  const router = useRouter();
  const [document, setDocument] = useState<Document | null>(null);
  const [links, setLinks] = useState<DocumentLink[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [createLinkOpen, setCreateLinkOpen] = useState(false);
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);

  // New link form state
  const [linkName, setLinkName] = useState('');
  const [requireEmail, setRequireEmail] = useState(true);
  const [requirePassword, setRequirePassword] = useState(false);
  const [password, setPassword] = useState('');
  const [allowDownload, setAllowDownload] = useState(false);
  const [enableWatermark, setEnableWatermark] = useState(false);
  const [requireNda, setRequireNda] = useState(false);
  const [ndaText, setNdaText] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [allowedEmails, setAllowedEmails] = useState('');
  const [blockedEmails, setBlockedEmails] = useState('');
  const [creatingLink, setCreatingLink] = useState(false);

  useEffect(() => {
    if (user && id) loadData();
  }, [user, id]);

  async function loadData() {
    const [docRes, linksRes, visitsRes] = await Promise.all([
      supabase.from('documents').select('*').eq('id', id).single(),
      supabase.from('document_links').select('*').eq('document_id', id).order('created_at', { ascending: false }),
      supabase.from('visits').select('*').eq('document_id', id).order('created_at', { ascending: false }),
    ]);

    setDocument(docRes.data);
    setLinks(linksRes.data || []);
    setVisits(visitsRes.data || []);
    setLoading(false);
  }

  async function createLink() {
    setCreatingLink(true);
    const newLinkId = generateLinkId();
    const { error } = await supabase.from('document_links').insert({
      document_id: id,
      user_id: user!.id,
      link_id: newLinkId,
      name: linkName || 'Default Link',
      require_email: requireEmail,
      require_password: requirePassword,
      password_hash: requirePassword ? password : null,
      allow_download: allowDownload,
      enable_watermark: enableWatermark,
      require_nda: requireNda,
      nda_text: requireNda ? ndaText : null,
      expires_at: expiresAt || null,
      allowed_emails: allowedEmails ? allowedEmails.split(',').map(e => e.trim()) : [],
      blocked_emails: blockedEmails ? blockedEmails.split(',').map(e => e.trim()) : [],
    });

    if (!error) {
      setCreateLinkOpen(false);
      resetLinkForm();
      loadData();
    }
    setCreatingLink(false);
  }

  function resetLinkForm() {
    setLinkName('');
    setRequireEmail(true);
    setRequirePassword(false);
    setPassword('');
    setAllowDownload(false);
    setEnableWatermark(false);
    setRequireNda(false);
    setNdaText('');
    setExpiresAt('');
    setAllowedEmails('');
    setBlockedEmails('');
  }

  async function toggleLink(linkId: string, isActive: boolean) {
    await supabase.from('document_links').update({ is_active: !isActive }).eq('id', linkId);
    loadData();
  }

  async function deleteLink(linkId: string) {
    await supabase.from('document_links').delete().eq('id', linkId);
    loadData();
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
    return (
      <div className="p-8 text-center text-muted-foreground">Document not found.</div>
    );
  }

  const totalViews = visits.length;
  const uniqueVisitors = new Set(visits.map(v => v.visitor_email).filter(Boolean)).size;
  const avgDuration = visits.length > 0
    ? visits.reduce((acc, v) => acc + (v.duration || 0), 0) / visits.length
    : 0;
  const avgCompletion = visits.length > 0
    ? Math.round(visits.reduce((acc, v) => acc + (v.completion_rate || 0), 0) / visits.length)
    : 0;

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
            <Button onClick={() => setCreateLinkOpen(true)} size="sm">
              <Plus size={16} />
              Create Link
            </Button>
          </div>
        }
      />

      <div className="p-8 space-y-8">
        {/* Stats */}
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
          {/* Links */}
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
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyLink(link.link_id)}
                          >
                            {copiedLinkId === link.link_id ? (
                              <Check size={14} className="text-success" />
                            ) : (
                              <Copy size={14} />
                            )}
                          </Button>
                          <a
                            href={`/view/${link.link_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
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
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteLink(link.id)}
                          >
                            <Trash2 size={14} className="text-danger" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
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

          {/* Recent Visitors */}
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
                            {formatDuration(visit.duration || 0)} · {visit.page_count_viewed} pages · {Math.round(visit.completion_rate || 0)}%
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
      </div>

      {/* Create Link Modal */}
      <Modal
        open={createLinkOpen}
        onOpenChange={setCreateLinkOpen}
        title="Create Shareable Link"
        description="Configure how people access this document"
        size="lg"
      >
        <div className="space-y-5 max-h-[60vh] overflow-y-auto pr-2">
          <Input
            label="Link Name"
            value={linkName}
            onChange={(e) => setLinkName(e.target.value)}
            placeholder="e.g., Investor Deck - Series A"
          />

          <div className="space-y-4 border-t border-border pt-4">
            <h3 className="text-sm font-semibold text-foreground">Access Controls</h3>
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
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter a password"
              />
            )}
            <Toggle
              checked={requireNda}
              onCheckedChange={setRequireNda}
              label="Require NDA"
              description="Viewers must sign an NDA before accessing"
            />
            {requireNda && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">NDA Text</label>
                <textarea
                  value={ndaText}
                  onChange={(e) => setNdaText(e.target.value)}
                  className="mt-1.5 w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted resize-none h-24 focus:outline-none focus:ring-2 focus:ring-accent"
                  placeholder="Enter NDA agreement text..."
                />
              </div>
            )}
          </div>

          <div className="space-y-4 border-t border-border pt-4">
            <h3 className="text-sm font-semibold text-foreground">Security</h3>
            <Toggle
              checked={enableWatermark}
              onCheckedChange={setEnableWatermark}
              label="Dynamic Watermark"
              description="Overlay viewer's email and timestamp on each page"
            />
            <Toggle
              checked={allowDownload}
              onCheckedChange={setAllowDownload}
              label="Allow Download"
              description="Let viewers download the original file"
            />
          </div>

          <div className="space-y-4 border-t border-border pt-4">
            <h3 className="text-sm font-semibold text-foreground">Restrictions</h3>
            <Input
              label="Expiration Date"
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
            />
            <Input
              label="Allowed Emails (comma-separated)"
              value={allowedEmails}
              onChange={(e) => setAllowedEmails(e.target.value)}
              placeholder="user@company.com, team@org.com"
            />
            <Input
              label="Blocked Emails (comma-separated)"
              value={blockedEmails}
              onChange={(e) => setBlockedEmails(e.target.value)}
              placeholder="block@competitor.com"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button variant="secondary" onClick={() => setCreateLinkOpen(false)}>
              Cancel
            </Button>
            <Button onClick={createLink} loading={creatingLink}>
              <Link2 size={16} />
              Create Link
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
