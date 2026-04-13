'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { FolderOpen, Plus, Search } from 'lucide-react';

import { Header } from '@/components/dashboard/header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { apiFetchJson } from '@/lib/api-client';
import type { Space } from '@/lib/types';
import { formatDate } from '@/lib/utils';

export default function SpacesPage() {
  const { user } = useUser();
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [headline, setHeadline] = useState('');
  const [creating, setCreating] = useState(false);

  const loadSpaces = useCallback(async () => {
    if (!user) {
      return;
    }

    setLoading(true);

    try {
      const rows = await apiFetchJson<Space[]>('/api/spaces');
      setSpaces(rows);
    } catch (error) {
      console.error('Error loading spaces:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      return;
    }

    void loadSpaces();
  }, [loadSpaces, user]);

  async function createSpace() {
    setCreating(true);

    try {
      await apiFetchJson<Space>('/api/spaces', {
        body: JSON.stringify({
          description: description || null,
          headline: headline || null,
          name,
        }),
        method: 'POST',
      });

      setCreateOpen(false);
      setName('');
      setDescription('');
      setHeadline('');
      await loadSpaces();
    } catch (error) {
      console.error('Error creating space:', error);
    } finally {
      setCreating(false);
    }
  }

  const filteredSpaces = spaces.filter((space) =>
    space.name.toLowerCase().includes(search.toLowerCase()),
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
            onChange={(event) => setSearch(event.target.value)}
            icon={<Search size={16} />}
          />
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, index) => (
              <div key={index} className="bg-card rounded-xl border border-border p-6 animate-pulse">
                <div className="h-8 bg-card-hover rounded w-3/4 mb-3" />
                <div className="h-4 bg-card-hover rounded w-full mb-2" />
                <div className="h-4 bg-card-hover rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : filteredSpaces.length === 0 ? (
          <EmptyState
            icon={<FolderOpen size={32} />}
            title={search ? 'No spaces found' : 'No spaces yet'}
            description={
              search
                ? 'Try a different search term'
                : 'Create a data room to share multiple documents with one link'
            }
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
            {filteredSpaces.map((space) => (
              <Link key={space.id} href={`/spaces/${space.id}`}>
                <Card hover className="p-6 group">
                  <div className="h-16 -mx-6 -mt-6 mb-4 rounded-t-xl bg-card-hover flex items-center justify-center">
                    <FolderOpen size={20} className="text-muted" />
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
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g., Series A Due Diligence"
          />
          <div>
            <label className="text-sm font-medium text-muted-foreground">Description</label>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="mt-1.5 w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted resize-none h-20 focus:outline-none focus:ring-2 focus:ring-accent"
              placeholder="Describe what this space contains..."
            />
          </div>
          <Input
            label="Headline (shown to visitors)"
            value={headline}
            onChange={(event) => setHeadline(event.target.value)}
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
