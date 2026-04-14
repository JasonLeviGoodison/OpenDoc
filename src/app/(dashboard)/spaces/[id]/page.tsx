'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import {
  ArrowLeft,
  Check,
  Copy,
  ExternalLink,
  FileText,
  GripVertical,
  Link2,
  Plus,
  Trash2,
} from 'lucide-react';

import { Header } from '@/components/dashboard/header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Modal } from '@/components/ui/modal';
import { apiFetchJson } from '@/lib/api-client';
import type { Document, DocumentLink, Space } from '@/lib/types';
import { formatDate } from '@/lib/utils';

type SpaceDocument = Document & {
  order_index: number;
  space_doc_id: string;
};

export default function SpaceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useUser();
  const userId = user?.id;
  const [space, setSpace] = useState<Space | null>(null);
  const [spaceDocuments, setSpaceDocuments] = useState<SpaceDocument[]>([]);
  const [allDocuments, setAllDocuments] = useState<Document[]>([]);
  const [links, setLinks] = useState<DocumentLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDocOpen, setAddDocOpen] = useState(false);
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!userId || !id) {
      return;
    }

    setLoading(true);

    try {
      const [spaceRow, spaceDocumentRows, documentRows, linkRows] = await Promise.all([
        apiFetchJson<Space>(`/api/spaces/${id}`),
        apiFetchJson<SpaceDocument[]>(`/api/spaces/${id}/documents`),
        apiFetchJson<Document[]>('/api/documents'),
        apiFetchJson<DocumentLink[]>(`/api/share-links?spaceId=${id}`),
      ]);

      setSpace(spaceRow);
      setSpaceDocuments(spaceDocumentRows);
      setAllDocuments(documentRows);
      setLinks(linkRows);
    } catch (error) {
      console.error('Error loading space details:', error);
      setSpace(null);
      setSpaceDocuments([]);
      setAllDocuments([]);
      setLinks([]);
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

  async function addDocument(documentId: string) {
    await apiFetchJson(`/api/spaces/${id}/documents`, {
      body: JSON.stringify({ document_id: documentId }),
      method: 'POST',
    });
    setAddDocOpen(false);
    await loadData();
  }

  async function removeDocument(spaceDocumentId: string) {
    await apiFetchJson<{ success: boolean }>(`/api/spaces/${id}/documents/${spaceDocumentId}`, {
      method: 'DELETE',
    });
    await loadData();
  }

  async function createSpaceLink() {
    await apiFetchJson<DocumentLink>('/api/share-links', {
      body: JSON.stringify({
        name: `${space?.name || 'Space'} Link`,
        require_email: true,
        space_id: id,
      }),
      method: 'POST',
    });
    await loadData();
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

  const availableDocuments = allDocuments.filter(
    (document) => !spaceDocuments.some((spaceDocument) => spaceDocument.id === document.id),
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
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

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
                {spaceDocuments.map((document, index) => (
                  <div key={document.space_doc_id} className="px-6 py-3 flex items-center gap-4 hover:bg-card-hover transition-colors">
                    <GripVertical size={16} className="text-muted cursor-grab" />
                    <FileText size={18} className="text-muted flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">{document.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {document.page_count} pages · {document.file_type.toUpperCase()} · {formatDate(document.created_at)}
                      </p>
                    </div>
                    <Badge>{index + 1}</Badge>
                    <Button variant="ghost" size="sm" onClick={() => removeDocument(document.space_doc_id)}>
                      <Trash2 size={14} className="text-danger" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Modal
        open={addDocOpen}
        onOpenChange={setAddDocOpen}
        title="Add Document to Space"
        description="Select a document from your library"
        size="lg"
      >
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {availableDocuments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No more documents to add. Upload new documents first.
            </p>
          ) : (
            availableDocuments.map((document) => (
              <button
                key={document.id}
                onClick={() => addDocument(document.id)}
                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-card-hover transition-colors text-left cursor-pointer"
              >
                <FileText size={18} className="text-muted flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{document.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {document.page_count} pages · {formatDate(document.created_at)}
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
