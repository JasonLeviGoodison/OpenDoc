'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Header } from '@/components/dashboard/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Plus,
  FileText,
  ArrowLeft,
  Link2,
  Copy,
  Check,
  ExternalLink,
  Trash2,
  GripVertical,
  FolderOpen,
  Settings,
} from 'lucide-react';
import Link from 'next/link';
import { useUser } from '@clerk/nextjs';
import { supabase } from '@/lib/supabase';
import { formatDate, generateLinkId } from '@/lib/utils';
import type { Space, Document, DocumentLink } from '@/lib/types';

export default function SpaceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useUser();
  const [space, setSpace] = useState<Space | null>(null);
  const [spaceDocuments, setSpaceDocuments] = useState<(Document & { space_doc_id: string; order_index: number })[]>([]);
  const [allDocuments, setAllDocuments] = useState<Document[]>([]);
  const [links, setLinks] = useState<DocumentLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDocOpen, setAddDocOpen] = useState(false);
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);

  useEffect(() => {
    if (user && id) loadData();
  }, [user, id]);

  async function loadData() {
    const [spaceRes, spaceDocsRes, allDocsRes, linksRes] = await Promise.all([
      supabase.from('spaces').select('*').eq('id', id).single(),
      supabase
        .from('space_documents')
        .select('*, documents(*)')
        .eq('space_id', id)
        .order('order_index', { ascending: true }),
      supabase.from('documents').select('*').eq('user_id', user!.id),
      supabase.from('document_links').select('*').eq('space_id', id).order('created_at', { ascending: false }),
    ]);

    setSpace(spaceRes.data);
    setSpaceDocuments(
      (spaceDocsRes.data || []).map((sd: any) => ({
        ...sd.documents,
        space_doc_id: sd.id,
        order_index: sd.order_index,
      }))
    );
    setAllDocuments(allDocsRes.data || []);
    setLinks(linksRes.data || []);
    setLoading(false);
  }

  async function addDocument(docId: string) {
    const maxOrder = spaceDocuments.length > 0
      ? Math.max(...spaceDocuments.map(d => d.order_index))
      : -1;

    await supabase.from('space_documents').insert({
      space_id: id,
      document_id: docId,
      order_index: maxOrder + 1,
    });

    loadData();
    setAddDocOpen(false);
  }

  async function removeDocument(spaceDocId: string) {
    await supabase.from('space_documents').delete().eq('id', spaceDocId);
    loadData();
  }

  async function createSpaceLink() {
    const newLinkId = generateLinkId();
    await supabase.from('document_links').insert({
      space_id: id,
      user_id: user!.id,
      link_id: newLinkId,
      name: `${space?.name || 'Space'} Link`,
      require_email: true,
    });
    loadData();
  }

  function copyLink(linkId: string) {
    navigator.clipboard.writeText(`${window.location.origin}/view/${linkId}`);
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

  if (!space) {
    return <div className="p-8 text-center text-muted-foreground">Space not found.</div>;
  }

  const availableDocs = allDocuments.filter(
    d => !spaceDocuments.some(sd => sd.id === d.id)
  );

  return (
    <div>
      <Header
        title={space.name}
        description={space.description || 'Virtual data room'}
        actions={
          <div className="flex items-center gap-2">
            <Link href="/spaces">
              <Button variant="ghost" size="sm">
                <ArrowLeft size={16} />
                Back
              </Button>
            </Link>
            <Button variant="secondary" size="sm" onClick={() => setAddDocOpen(true)}>
              <Plus size={16} />
              Add Document
            </Button>
            <Button size="sm" onClick={createSpaceLink}>
              <Link2 size={16} />
              Create Link
            </Button>
          </div>
        }
      />

      <div className="p-8 space-y-6">
        {/* Space Links */}
        {links.length > 0 && (
          <Card>
            <CardHeader>
              <h2 className="font-semibold text-foreground flex items-center gap-2">
                <Link2 size={18} />
                Shared Links
              </h2>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {links.map((link) => (
                  <div key={link.id} className="px-6 py-3 flex items-center justify-between hover:bg-card-hover transition-colors">
                    <div>
                      <p className="text-sm font-medium text-foreground">{link.name}</p>
                      <p className="text-xs text-muted font-mono mt-0.5">
                        {typeof window !== 'undefined' && `${window.location.origin}/view/${link.link_id}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={link.is_active ? 'success' : 'danger'}>
                        {link.is_active ? 'Active' : 'Disabled'}
                      </Badge>
                      <Button variant="ghost" size="sm" onClick={() => copyLink(link.link_id)}>
                        {copiedLinkId === link.link_id ? <Check size={14} className="text-success" /> : <Copy size={14} />}
                      </Button>
                      <a href={`/view/${link.link_id}`} target="_blank" rel="noopener noreferrer">
                        <Button variant="ghost" size="sm"><ExternalLink size={14} /></Button>
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Documents in Space */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-foreground flex items-center gap-2">
                <FileText size={18} />
                Documents ({spaceDocuments.length})
              </h2>
              <Button variant="ghost" size="sm" onClick={() => setAddDocOpen(true)}>
                <Plus size={14} />
                Add
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {spaceDocuments.length === 0 ? (
              <EmptyState
                icon={<FileText size={32} />}
                title="No documents in this space"
                description="Add documents to this data room to share them with a single link"
                action={
                  <Button size="sm" onClick={() => setAddDocOpen(true)}>
                    <Plus size={16} />
                    Add Document
                  </Button>
                }
              />
            ) : (
              <div className="divide-y divide-border">
                {spaceDocuments.map((doc, i) => (
                  <div key={doc.space_doc_id} className="px-6 py-3 flex items-center gap-4 hover:bg-card-hover transition-colors">
                    <GripVertical size={16} className="text-muted cursor-grab" />
                    <FileText size={18} className="text-muted flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">{doc.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {doc.page_count} pages · {doc.file_type.toUpperCase()} · {formatDate(doc.created_at)}
                      </p>
                    </div>
                    <Badge>{i + 1}</Badge>
                    <Button variant="ghost" size="sm" onClick={() => removeDocument(doc.space_doc_id)}>
                      <Trash2 size={14} className="text-danger" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add Document Modal */}
      <Modal
        open={addDocOpen}
        onOpenChange={setAddDocOpen}
        title="Add Document to Space"
        description="Select a document from your library"
        size="lg"
      >
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {availableDocs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No more documents to add. Upload new documents first.
            </p>
          ) : (
            availableDocs.map((doc) => (
              <button
                key={doc.id}
                onClick={() => addDocument(doc.id)}
                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-card-hover transition-colors text-left cursor-pointer"
              >
                <FileText size={18} className="text-muted flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{doc.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {doc.page_count} pages · {formatDate(doc.created_at)}
                  </p>
                </div>
                <Plus size={16} className="text-muted-foreground" />
              </button>
            ))
          )}
        </div>
      </Modal>
    </div>
  );
}
