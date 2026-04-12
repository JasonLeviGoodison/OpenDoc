'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/dashboard/header';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Link2,
  Search,
  Copy,
  Check,
  ExternalLink,
  Eye,
  Mail,
  Lock,
  Shield,
  Download,
  Calendar,
  Trash2,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import { useUser } from '@clerk/nextjs';
import { supabase } from '@/lib/supabase';
import { formatDate } from '@/lib/utils';
import type { DocumentLink } from '@/lib/types';

export default function LinksPage() {
  const { user } = useUser();
  const [links, setLinks] = useState<(DocumentLink & { document_name?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (user) loadLinks();
  }, [user]);

  async function loadLinks() {
    const { data } = await supabase
      .from('document_links')
      .select('*, documents(name)')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false });

    setLinks(
      (data || []).map((l: any) => ({
        ...l,
        document_name: l.documents?.name,
      }))
    );
    setLoading(false);
  }

  function copyLink(linkId: string) {
    navigator.clipboard.writeText(`${window.location.origin}/view/${linkId}`);
    setCopiedId(linkId);
    setTimeout(() => setCopiedId(null), 2000);
  }

  async function toggleLink(id: string, isActive: boolean) {
    await supabase.from('document_links').update({ is_active: !isActive }).eq('id', id);
    loadLinks();
  }

  async function deleteLink(id: string) {
    await supabase.from('document_links').delete().eq('id', id);
    loadLinks();
  }

  const filtered = links.filter(l =>
    l.name.toLowerCase().includes(search.toLowerCase()) ||
    l.document_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <Header
        title="Links"
        description={`${links.length} shared link${links.length !== 1 ? 's' : ''}`}
      />

      <div className="p-8">
        <div className="w-80 mb-6">
          <Input
            placeholder="Search links..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={<Search size={16} />}
          />
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-card rounded-xl border border-border p-5 animate-pulse">
                <div className="h-5 bg-card-hover rounded w-1/3 mb-3" />
                <div className="h-4 bg-card-hover rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Link2 size={32} />}
            title={search ? 'No links found' : 'No links yet'}
            description={search ? 'Try a different search term' : 'Create a link from a document to start sharing'}
          />
        ) : (
          <div className="space-y-3">
            {filtered.map((link) => (
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
                    <p className="text-xs text-muted font-mono">
                      {typeof window !== 'undefined' && `${window.location.origin}/view/${link.link_id}`}
                    </p>

                    {/* Feature badges */}
                    <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
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
