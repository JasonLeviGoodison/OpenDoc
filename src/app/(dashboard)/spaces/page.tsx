'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/dashboard/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Plus,
  FolderOpen,
  Search,
  FileText,
  Eye,
  Link2,
  Settings,
  Trash2,
  Copy,
  Check,
  ExternalLink,
  Image,
} from 'lucide-react';
import Link from 'next/link';
import { useUser } from '@clerk/nextjs';
import { supabase } from '@/lib/supabase';
import { formatDate, generateLinkId } from '@/lib/utils';
import type { Space } from '@/lib/types';

export default function SpacesPage() {
  const { user } = useUser();
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [search, setSearch] = useState('');

  // Create form
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [headline, setHeadline] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (user) loadSpaces();
  }, [user]);

  async function loadSpaces() {
    const { data } = await supabase
      .from('spaces')
      .select('*')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false });
    setSpaces(data || []);
    setLoading(false);
  }

  async function createSpace() {
    setCreating(true);
    const { error } = await supabase.from('spaces').insert({
      user_id: user!.id,
      name,
      description: description || null,
      headline: headline || null,
    });

    if (!error) {
      setCreateOpen(false);
      setName('');
      setDescription('');
      setHeadline('');
      loadSpaces();
    }
    setCreating(false);
  }

  async function deleteSpace(id: string) {
    await supabase.from('spaces').delete().eq('id', id);
    setSpaces(spaces.filter(s => s.id !== id));
  }

  const filtered = spaces.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <Header
        title="Spaces"
        description="Virtual data rooms for sharing multiple documents"
        actions={
          <Button onClick={() => setCreateOpen(true)} size="sm">
            <Plus size={16} />
            Create Space
          </Button>
        }
      />

      <div className="p-8">
        <div className="w-80 mb-6">
          <Input
            placeholder="Search spaces..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={<Search size={16} />}
          />
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-card rounded-xl border border-border p-6 animate-pulse">
                <div className="h-8 bg-card-hover rounded w-3/4 mb-3" />
                <div className="h-4 bg-card-hover rounded w-full mb-2" />
                <div className="h-4 bg-card-hover rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<FolderOpen size={32} />}
            title={search ? 'No spaces found' : 'No spaces yet'}
            description={search ? 'Try a different search term' : 'Create a data room to share multiple documents with one link'}
            action={
              !search && (
                <Button onClick={() => setCreateOpen(true)}>
                  <Plus size={16} />
                  Create Space
                </Button>
              )
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((space) => (
              <Link key={space.id} href={`/spaces/${space.id}`}>
                <Card hover className="p-6 group">
                  {/* Banner placeholder */}
                  <div className="h-16 -mx-6 -mt-6 mb-4 rounded-t-xl bg-card-hover flex items-center justify-center">
                    {space.logo_url ? (
                      <img src={space.logo_url} alt="" className="h-8 object-contain" />
                    ) : (
                      <FolderOpen size={20} className="text-muted" />
                    )}
                  </div>

                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-base font-semibold text-foreground group-hover:text-accent transition-colors">
                        {space.name}
                      </h3>
                      {space.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {space.description}
                        </p>
                      )}
                    </div>
                    <Badge variant={space.is_active ? 'success' : 'danger'}>
                      {space.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
                    <span>Created {formatDate(space.created_at)}</span>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      <Modal
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Create Space"
        description="Set up a virtual data room for sharing multiple documents"
        size="lg"
      >
        <div className="space-y-4">
          <Input
            label="Space Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Series A Due Diligence"
          />
          <div>
            <label className="text-sm font-medium text-muted-foreground">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1.5 w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted resize-none h-20 focus:outline-none focus:ring-2 focus:ring-accent"
              placeholder="Describe what this space contains..."
            />
          </div>
          <Input
            label="Headline (shown to visitors)"
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            placeholder="e.g., Welcome to our data room"
          />

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={createSpace} loading={creating} disabled={!name}>
              <Plus size={16} />
              Create Space
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
