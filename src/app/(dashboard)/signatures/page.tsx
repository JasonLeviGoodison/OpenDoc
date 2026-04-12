'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/dashboard/header';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { PenTool, FileText, Clock, User, Mail } from 'lucide-react';
import { useUser } from '@clerk/nextjs';
import { supabase } from '@/lib/supabase';
import { formatDate } from '@/lib/utils';
import type { Signature } from '@/lib/types';

export default function SignaturesPage() {
  const { user } = useUser();
  const [signatures, setSignatures] = useState<Signature[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) loadSignatures();
  }, [user]);

  async function loadSignatures() {
    const { data } = await supabase
      .from('signatures')
      .select('*, document_links!inner(user_id, name)')
      .eq('document_links.user_id', user!.id)
      .order('signed_at', { ascending: false });
    setSignatures(data || []);
    setLoading(false);
  }

  return (
    <div>
      <Header
        title="Signatures"
        description="NDA and agreement signatures from viewers"
      />

      <div className="p-8">
        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-card rounded-xl border border-border p-5 animate-pulse">
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
            {signatures.map((sig) => (
              <Card key={sig.id} className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
                        <PenTool size={18} className="text-success" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-foreground">{sig.signer_name}</h3>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Mail size={12} />
                          {sig.signer_email}
                        </p>
                      </div>
                    </div>
                    <div className="ml-[52px]">
                      <p className="text-xs text-muted-foreground line-clamp-2 max-w-lg">
                        {sig.nda_text}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="success">Signed</Badge>
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1 justify-end">
                      <Clock size={12} />
                      {formatDate(sig.signed_at)}
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
