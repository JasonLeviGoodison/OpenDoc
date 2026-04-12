'use client';

import { Header } from '@/components/dashboard/header';
import { StatsCard } from '@/components/ui/stats-card';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Eye,
  Users,
  Clock,
  BarChart3,
  FileText,
  ArrowUpRight,
  Plus,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useUser } from '@clerk/nextjs';
import { formatDate, formatDuration } from '@/lib/utils';
import type { Document, Visit } from '@/lib/types';

export default function DashboardPage() {
  const { user } = useUser();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  async function loadData() {
    try {
      const [docsRes, visitsRes] = await Promise.all([
        supabase
          .from('documents')
          .select('*')
          .eq('user_id', user!.id)
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('visits')
          .select('*, document_links!inner(user_id)')
          .eq('document_links.user_id', user!.id)
          .order('created_at', { ascending: false })
          .limit(10),
      ]);

      setDocuments(docsRes.data || []);
      setVisits(visitsRes.data || []);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }

  const totalViews = visits.length;
  const uniqueVisitors = new Set(visits.map(v => v.visitor_email)).size;
  const avgDuration = visits.length > 0
    ? visits.reduce((acc, v) => acc + (v.duration || 0), 0) / visits.length
    : 0;
  const avgCompletion = visits.length > 0
    ? Math.round(visits.reduce((acc, v) => acc + (v.completion_rate || 0), 0) / visits.length)
    : 0;

  return (
    <div>
      <Header
        title="Dashboard"
        description="Overview of your document activity"
        actions={
          <Link href="/documents">
            <Button size="sm">
              <Plus size={16} />
              Upload
            </Button>
          </Link>
        }
      />

      <div className="p-8 space-y-8">
        {/* Stats — clean horizontal row, no icon boxes */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-border rounded-xl overflow-hidden border border-border">
          <div className="bg-card px-5 py-4">
            <StatsCard label="Total Views" value={totalViews} change="+12% from last week" changeType="positive" />
          </div>
          <div className="bg-card px-5 py-4">
            <StatsCard label="Unique Visitors" value={uniqueVisitors} change="+8% from last week" changeType="positive" />
          </div>
          <div className="bg-card px-5 py-4">
            <StatsCard label="Avg. Time Spent" value={formatDuration(avgDuration)} change="Across all documents" />
          </div>
          <div className="bg-card px-5 py-4">
            <StatsCard label="Completion Rate" value={`${avgCompletion}%`} change="Avg. across all docs" />
          </div>
        </div>

        <div className="grid lg:grid-cols-[2fr,1fr] gap-6">
          {/* Recent Activity */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-foreground uppercase tracking-wide">Recent Activity</h2>
              <Link href="/analytics">
                <Button variant="ghost" size="sm">
                  View all
                  <ArrowUpRight size={14} />
                </Button>
              </Link>
            </div>
            {visits.length === 0 ? (
              <div className="py-16 text-center text-muted text-sm border border-border rounded-xl bg-card">
                No activity yet. Share a document to start tracking.
              </div>
            ) : (
              <div className="border border-border rounded-xl overflow-hidden bg-card divide-y divide-border">
                {visits.slice(0, 8).map((visit) => (
                  <div key={visit.id} className="px-5 py-3 flex items-center justify-between hover:bg-card-hover transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-7 h-7 rounded-full bg-accent-muted text-accent text-xs font-bold flex items-center justify-center flex-shrink-0">
                        {(visit.visitor_email?.[0] || '?').toUpperCase()}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {visit.visitor_email || 'Anonymous'}
                        </p>
                        <p className="text-xs text-muted truncate">
                          {visit.city && `${visit.city}, `}{visit.country || 'Unknown'} &middot; {visit.device_type || 'Unknown'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-4">
                      <p className="text-xs text-muted tabular-nums">{formatDate(visit.created_at)}</p>
                      <p className="text-xs text-muted tabular-nums">{formatDuration(visit.duration || 0)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Documents */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-foreground uppercase tracking-wide">Documents</h2>
              <Link href="/documents">
                <Button variant="ghost" size="sm">
                  View all
                  <ArrowUpRight size={14} />
                </Button>
              </Link>
            </div>
            {documents.length === 0 ? (
              <div className="py-16 text-center text-muted text-sm border border-border rounded-xl bg-card">
                No documents yet.
              </div>
            ) : (
              <div className="border border-border rounded-xl overflow-hidden bg-card divide-y divide-border">
                {documents.map((doc) => (
                  <Link
                    key={doc.id}
                    href={`/documents/${doc.id}`}
                    className="px-5 py-3 flex items-center gap-3 hover:bg-card-hover transition-colors block"
                  >
                    <FileText size={16} className="text-muted flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{doc.name}</p>
                      <p className="text-xs text-muted">
                        {doc.page_count} pg &middot; {formatDate(doc.created_at)}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
