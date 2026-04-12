'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/dashboard/header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/ui/empty-state';
import { UploadModal } from '@/components/documents/upload-modal';
import {
  Plus,
  FileText,
  Search,
  MoreVertical,
  Eye,
  Link2,
  Trash2,
  Download,
  FolderPlus,
  Grid3X3,
  List,
  Clock,
} from 'lucide-react';
import Link from 'next/link';
import { useUser } from '@clerk/nextjs';
import { supabase } from '@/lib/supabase';
import { formatDate, formatFileSize, getFileExtension } from '@/lib/utils';
import type { Document } from '@/lib/types';

export default function DocumentsPage() {
  const { user } = useUser();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    if (user) loadDocuments();
  }, [user]);

  async function loadDocuments() {
    const { data } = await supabase
      .from('documents')
      .select('*')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false });
    setDocuments(data || []);
    setLoading(false);
  }

  async function handleUpload(files: File[], name: string) {
    const file = files[0];
    const fileExt = getFileExtension(file.name);
    const filePath = `${user!.id}/${Date.now()}-${file.name}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('documents')
      .getPublicUrl(filePath);

    // Create document record
    const { error: dbError } = await supabase
      .from('documents')
      .insert({
        user_id: user!.id,
        name,
        original_filename: file.name,
        file_url: publicUrl,
        file_size: file.size,
        file_type: fileExt,
        page_count: 1, // Will be updated after processing
      });

    if (dbError) throw dbError;
    loadDocuments();
  }

  async function deleteDocument(id: string) {
    await supabase.from('documents').delete().eq('id', id);
    setDocuments(documents.filter(d => d.id !== id));
  }

  const filtered = documents.filter(d =>
    d.name.toLowerCase().includes(search.toLowerCase())
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
        {/* Toolbar */}
        <div className="flex items-center justify-between mb-6">
          <div className="w-80">
            <Input
              placeholder="Search documents..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
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

        {/* Documents */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-card rounded-xl border border-border p-4 animate-pulse">
                <div className="h-32 bg-card-hover rounded-lg mb-3" />
                <div className="h-4 bg-card-hover rounded w-3/4 mb-2" />
                <div className="h-3 bg-card-hover rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<FileText size={32} />}
            title={search ? 'No documents found' : 'No documents yet'}
            description={search ? 'Try a different search term' : 'Upload your first document to start sharing and tracking'}
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
            {filtered.map((doc) => (
              <Link key={doc.id} href={`/documents/${doc.id}`}>
                <Card hover className="overflow-hidden group">
                  <div className="h-28 bg-card-hover flex items-center justify-center relative">
                    <FileText size={32} className="text-muted" />
                    <span className="absolute top-2.5 right-2.5 text-[10px] font-bold text-muted uppercase tracking-wider">
                      {doc.file_type}
                    </span>
                  </div>
                  <div className="p-4">
                    <h3 className="text-sm font-semibold text-foreground truncate group-hover:text-accent transition-colors">
                      {doc.name}
                    </h3>
                    <p className="text-xs text-muted mt-1.5">
                      {doc.page_count} pages &middot; {formatDate(doc.created_at)}
                    </p>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((doc) => (
              <Link key={doc.id} href={`/documents/${doc.id}`}>
                <Card hover className="p-4 flex items-center gap-4">
                  <FileText size={18} className="text-muted flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-foreground truncate">{doc.name}</h3>
                    <p className="text-xs text-muted-foreground">{doc.original_filename}</p>
                  </div>
                  <div className="text-xs text-muted-foreground">{doc.page_count} pages</div>
                  <div className="text-xs text-muted-foreground">{formatFileSize(doc.file_size)}</div>
                  <Badge variant="accent" className="uppercase text-[10px]">{doc.file_type}</Badge>
                  <div className="text-xs text-muted-foreground">{formatDate(doc.created_at)}</div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      <UploadModal
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        onUpload={handleUpload}
      />
    </div>
  );
}
