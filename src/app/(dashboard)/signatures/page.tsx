'use client';

import { useEffect, useEffectEvent, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { Clock, Mail, PenTool } from 'lucide-react';

import { Header } from '@/components/dashboard/header';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { apiFetchJson } from '@/lib/api-client';
import type { Signature } from '@/lib/types';
import { formatDate } from '@/lib/utils';

export default function SignaturesPage() {
  const { user } = useUser();
  const userId = user?.id;
  const [signatures, setSignatures] = useState<Signature[]>([]);
  const [loading, setLoading] = useState(true);

  const loadSignatures = useEffectEvent(async () => {
    if (!userId) {
      return;
    }

    setLoading(true);

    try {
      const rows = await apiFetchJson<Signature[]>('/api/signatures');
      setSignatures(rows);
    } catch (error) {
      console.error('Error loading signatures:', error);
    } finally {
      setLoading(false);
    }
  });

  useEffect(() => {
    if (!userId) {
      return;
    }

    void loadSignatures();
  }, [userId]);

  return (
    <div>
      <Header title="Signatures" description="NDA and agreement signatures from viewers" />

      <div className="p-8">
        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, index) => (
              <div key={index} className="bg-card rounded-xl border border-border p-5 animate-pulse">
                <div className="h-5 bg-card-hover rounded w-1/3 mb-3" />
                <div className="h-4 bg-card-hover rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : signatures.length === 0 ? (
          <EmptyState
            icon={<PenTool size={32} />}
            title="No signatures yet"
            description="When viewers sign NDAs on your shared links, their signatures will appear here"
          />
        ) : (
          <div className="space-y-3">
            {signatures.map((signature) => (
              <Card key={signature.id} className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
                        <PenTool size={18} className="text-success" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-foreground">{signature.signer_name}</h3>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Mail size={12} />
                          {signature.signer_email}
                        </p>
                      </div>
                    </div>
                    <div className="ml-[52px]">
                      <p className="text-xs text-muted-foreground line-clamp-2 max-w-lg">
                        {signature.nda_text}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="success">Signed</Badge>
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1 justify-end">
                      <Clock size={12} />
                      {formatDate(signature.signed_at)}
                    </p>
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
