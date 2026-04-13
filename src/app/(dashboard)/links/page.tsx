'use client';

import { useCallback, useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import {
  Calendar,
  Check,
  Copy,
  Download,
  ExternalLink,
  Eye,
  Link2,
  Lock,
  Mail,
  Search,
  Shield,
  ToggleLeft,
  ToggleRight,
  Trash2,
} from 'lucide-react';

import { Header } from '@/components/dashboard/header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { apiFetchJson } from '@/lib/api-client';
import type { DocumentLink } from '@/lib/types';
import { formatDate } from '@/lib/utils';

type ShareLink = DocumentLink & {
  document_name?: string;
  space_name?: string;
};

export default function LinksPage() {
  const { user } = useUser();
  const [links, setLinks] = useState<ShareLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadLinks = useCallback(async () => {
    if (!user) {
      return;
    }

    setLoading(true);

    try {
      const rows = await apiFetchJson<ShareLink[]>('/api/share-links');
      setLinks(rows);
    } catch (error) {
      console.error('Error loading links:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      return;
    }

    void loadLinks();
  }, [loadLinks, user]);

  function copyLink(linkId: string) {
    navigator.clipboard.writeText(`${window.location.origin}/view/${linkId}`);
    setCopiedId(linkId);
    setTimeout(() => setCopiedId(null), 2000);
  }

  async function toggleLink(id: string, isActive: boolean) {
    await apiFetchJson<DocumentLink>(`/api/share-links/${id}`, {
      body: JSON.stringify({ is_active: !isActive }),
      method: 'PATCH',
    });
    await loadLinks();
  }

  async function deleteLink(id: string) {
    await apiFetchJson<{ success: boolean }>(`/api/share-links/${id}`, {
      method: 'DELETE',
    });
    await loadLinks();
  }

  const filteredLinks = links.filter((link) =>
    link.name.toLowerCase().includes(search.toLowerCase()) ||
    link.document_name?.toLowerCase().includes(search.toLowerCase()) ||
    link.space_name?.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div>
      <Header title="Links" description={`${links.length} shared link${links.length !== 1 ? 's' : ''}`} />

      <div className="p-8">
        <div className="w-80 mb-6">
          <Input
            placeholder="Search links..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            icon={<Search size={16} />}
          />
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, index) => (
              <div key={index} className="bg-card rounded-xl border border-border p-5 animate-pulse">
                <div className="h-5 bg-card-hover rounded w-1/3 mb-3" />
                <div className="h-4 bg-card-hover rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : filteredLinks.length === 0 ? (
          <EmptyState
            icon={<Link2 size={32} />}
            title={search ? 'No links found' : 'No links yet'}
            description={
              search ? 'Try a different search term' : 'Create a link from a document to start sharing'
            }
          />
        ) : (
          <div className="space-y-3">
            {filteredLinks.map((link) => (
              <Card key={link.id} className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-sm font-semibold text-foreground">{link.name}</h3>
                      <Badge variant={link.is_active ? 'success' : 'danger'}>
                        {link.is_active ? 'Active' : 'Disabled'}
                      </Badge>
                      {link.expires_at && new Date(link.expires_at) < new Date() && (
                        <Badge variant="warning">Expired</Badge>
                      )}
                    </div>
                    {link.document_name && (
                      <p className="text-xs text-muted-foreground mb-2">
                        Document: {link.document_name}
                      </p>
                    )}
                    {link.space_name && (
                      <p className="text-xs text-muted-foreground mb-2">Space: {link.space_name}</p>
                    )}
                    <p className="text-xs text-muted font-mono">
                      {typeof window !== 'undefined' && `${window.location.origin}/view/${link.link_id}`}
                    </p>

                    <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1">
                        <Eye size={12} /> {link.visit_count} views
                      </span>
                      {link.require_email && (
                        <span className="flex items-center gap-1">
                          <Mail size={12} /> Email
                        </span>
                      )}
                      {link.require_password && (
                        <span className="flex items-center gap-1">
                          <Lock size={12} /> Password
                        </span>
                      )}
                      {link.enable_watermark && (
                        <span className="flex items-center gap-1">
                          <Shield size={12} /> Watermark
                        </span>
                      )}
                      {link.allow_download && (
                        <span className="flex items-center gap-1">
                          <Download size={12} /> Download
                        </span>
                      )}
                      {link.expires_at && (
                        <span className="flex items-center gap-1">
                          <Calendar size={12} /> Expires {formatDate(link.expires_at)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={() => copyLink(link.link_id)}>
                      {copiedId === link.link_id ? (
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
                      {link.is_active ? (
                        <ToggleRight size={14} className="text-success" />
                      ) : (
                        <ToggleLeft size={14} className="text-muted" />
                      )}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => deleteLink(link.id)}>
                      <Trash2 size={14} className="text-danger" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
