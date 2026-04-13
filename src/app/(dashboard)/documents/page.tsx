'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { FileText, Grid3X3, List, Plus, Search, Trash2 } from 'lucide-react';

import { Header } from '@/components/dashboard/header';
import { UploadModal } from '@/components/documents/upload-modal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { apiFetchJson } from '@/lib/api-client';
import { supabase } from '@/lib/supabase';
import type { Document } from '@/lib/types';
import { formatDate, formatFileSize, getFileExtension } from '@/lib/utils';

interface SignedUploadPayload {
  content_type: string | null;
  file_type: string;
  path: string;
  signed_url: string;
  token: string;
}

export default function DocumentsPage() {
  const { user } = useUser();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const loadDocuments = useCallback(async () => {
    if (!user) {
      return;
    }

    setLoading(true);

    try {
      const rows = await apiFetchJson<Document[]>('/api/documents');
      setDocuments(rows);
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      return;
    }

    void loadDocuments();
  }, [loadDocuments, user]);

  async function handleUpload(files: File[], name: string) {
    const file = files[0];

    const upload = await apiFetchJson<SignedUploadPayload>('/api/upload', {
      body: JSON.stringify({
        content_type: file.type || null,
        file_name: file.name,
        file_size: file.size,
      }),
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'POST',
    });

    const { error: uploadError } = await supabase.storage
      .from('documents')
      .uploadToSignedUrl(upload.path, upload.token, file, {
        contentType: file.type || undefined,
      });

    if (uploadError) {
      throw new Error(uploadError.message);
    }

    await apiFetchJson<Document>('/api/documents', {
      body: JSON.stringify({
        file_size: file.size,
        file_type: upload.file_type || getFileExtension(file.name),
        file_url: upload.path,
        name,
        original_filename: file.name,
        page_count: 0,
      }),
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'POST',
    });

    await loadDocuments();
  }

  async function deleteDocument(id: string) {
    await apiFetchJson<{ success: boolean }>(`/api/documents/${id}`, {
      method: 'DELETE',
    });
    setDocuments((currentDocuments) => currentDocuments.filter((document) => document.id !== id));
  }

  const filteredDocuments = documents.filter((document) =>
    document.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div>
      <Header
        title="Documents"
        description={`${documents.length} document${documents.length !== 1 ? 's' : ''}`}
        actions={
          <Button onClick={() => setUploadOpen(true)} size="sm">
            <Plus size={16} />
            Upload
          </Button>
        }
      />

      <div className="p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="w-80">
            <Input
              placeholder="Search documents..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              icon={<Search size={16} />}
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
            >
              <Grid3X3 size={16} />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <List size={16} />
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...Array(8)].map((_, index) => (
              <div key={index} className="bg-card rounded-xl border border-border p-4 animate-pulse">
                <div className="h-32 bg-card-hover rounded-lg mb-3" />
                <div className="h-4 bg-card-hover rounded w-3/4 mb-2" />
                <div className="h-3 bg-card-hover rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : filteredDocuments.length === 0 ? (
          <EmptyState
            icon={<FileText size={32} />}
            title={search ? 'No documents found' : 'No documents yet'}
            description={
              search
                ? 'Try a different search term'
                : 'Upload your first document to start sharing and tracking'
            }
            action={
              !search && (
                <Button onClick={() => setUploadOpen(true)}>
                  <Plus size={16} />
                  Upload Document
                </Button>
              )
            }
          />
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredDocuments.map((document) => (
              <Link key={document.id} href={`/documents/${document.id}`}>
                <Card hover className="overflow-hidden group">
                  <div className="h-28 bg-card-hover flex items-center justify-center relative">
                    <FileText size={32} className="text-muted" />
                    <span className="absolute top-2.5 right-2.5 text-[10px] font-bold text-muted uppercase tracking-wider">
                      {document.file_type}
                    </span>
                  </div>
                  <div className="p-4">
                    <h3 className="text-sm font-semibold text-foreground truncate group-hover:text-accent transition-colors">
                      {document.name}
                    </h3>
                    <p className="text-xs text-muted mt-1.5">
                      {document.preview_status === 'pending'
                        ? 'Generating trackable preview'
                        : document.preview_status === 'failed'
                          ? 'Preview unavailable'
                          : `${document.page_count} pages`} &middot; {formatDate(document.created_at)}
                    </p>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredDocuments.map((document) => (
              <Link key={document.id} href={`/documents/${document.id}`}>
                <Card hover className="p-4 flex items-center gap-4">
                  <FileText size={18} className="text-muted flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-foreground truncate">{document.name}</h3>
                    <p className="text-xs text-muted-foreground">{document.original_filename}</p>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {document.preview_status === 'pending'
                      ? 'Generating preview'
                      : document.preview_status === 'failed'
                        ? 'Preview unavailable'
                        : `${document.page_count} pages`}
                  </div>
                  <div className="text-xs text-muted-foreground">{formatFileSize(document.file_size)}</div>
                  <Badge variant="accent" className="uppercase text-[10px]">{document.file_type}</Badge>
                  <div className="text-xs text-muted-foreground">{formatDate(document.created_at)}</div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(event) => {
                      event.preventDefault();
                      void deleteDocument(document.id);
                    }}
                  >
                    <Trash2 size={14} />
                  </Button>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      <UploadModal open={uploadOpen} onOpenChange={setUploadOpen} onUpload={handleUpload} />
    </div>
  );
}
