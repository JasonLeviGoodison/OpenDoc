'use client';

import { useEffect, useEffectEvent, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { Monitor, Smartphone } from 'lucide-react';

import { Header } from '@/components/dashboard/header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { StatsCard } from '@/components/ui/stats-card';
import { apiFetchJson } from '@/lib/api-client';
import type { Visit } from '@/lib/types';
import { formatDate, formatDuration } from '@/lib/utils';

export default function AnalyticsPage() {
  const { user } = useUser();
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

  const loadData = useEffectEvent(async () => {
    if (!user) {
      return;
    }

    const daysAgo = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    setLoading(true);

    try {
      const visitRows = await apiFetchJson<Visit[]>(`/api/visits?rangeDays=${daysAgo}`);
      setVisits(visitRows);
    } catch (error) {
      console.error('Error loading analytics data:', error);
    } finally {
      setLoading(false);
    }
  });

  useEffect(() => {
    if (!user) {
      return;
    }

    void loadData();
  }, [user, timeRange]);

  const totalViews = visits.length;
  const uniqueVisitors = new Set(visits.map((visit) => visit.visitor_email).filter(Boolean)).size;
  const avgDuration = visits.length > 0
    ? visits.reduce((acc, visit) => acc + (visit.duration || 0), 0) / visits.length
    : 0;
  const avgCompletion = visits.length > 0
    ? Math.round(
        visits.reduce((acc, visit) => acc + (visit.completion_rate || 0), 0) / visits.length,
      )
    : 0;
  const downloads = visits.filter((visit) => visit.downloaded).length;

  const deviceCounts: Record<string, number> = {};
  for (const visit of visits) {
    const device = visit.device_type || 'Unknown';
    deviceCounts[device] = (deviceCounts[device] || 0) + 1;
  }

  const countryCounts: Record<string, number> = {};
  for (const visit of visits) {
    const country = visit.country || 'Unknown';
    countryCounts[country] = (countryCounts[country] || 0) + 1;
  }

  const topCountries = Object.entries(countryCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  const viewsByDay: Record<string, number> = {};
  for (const visit of visits) {
    const day = new Date(visit.created_at).toISOString().split('T')[0];
    viewsByDay[day] = (viewsByDay[day] || 0) + 1;
  }

  return (
    <div>
      <Header
        title="Analytics"
        description="Track how people engage with your documents"
        actions={
          <div className="flex items-center gap-1 bg-card border border-border rounded-lg p-1">
            {(['7d', '30d', '90d'] as const).map((range) => (
              <Button
                key={range}
                variant={timeRange === range ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setTimeRange(range)}
              >
                {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : '90 Days'}
              </Button>
            ))}
          </div>
        }
      />

      <div className="p-8 space-y-8">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-px bg-border rounded-xl overflow-hidden border border-border">
          <div className="bg-card px-5 py-4"><StatsCard label="Total Views" value={totalViews} /></div>
          <div className="bg-card px-5 py-4"><StatsCard label="Unique Visitors" value={uniqueVisitors} /></div>
          <div className="bg-card px-5 py-4"><StatsCard label="Avg. Time Spent" value={formatDuration(avgDuration)} /></div>
          <div className="bg-card px-5 py-4"><StatsCard label="Completion Rate" value={`${avgCompletion}%`} /></div>
          <div className="bg-card px-5 py-4"><StatsCard label="Downloads" value={downloads} /></div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <h2 className="font-semibold text-foreground">Views Over Time</h2>
            </CardHeader>
            <CardContent>
              <div className="h-48 flex items-end gap-1">
                {Object.entries(viewsByDay)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .slice(-20)
                  .map(([day, count]) => {
                    const maxCount = Math.max(...Object.values(viewsByDay), 1);
                    const height = (count / maxCount) * 100;
                    return (
                      <div key={day} className="flex-1 group relative">
                        <div
                          className="bg-accent/30 hover:bg-accent/50 rounded-t transition-colors"
                          style={{ height: `${Math.max(height, 4)}%` }}
                        />
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-card border border-border rounded-lg px-2 py-1 text-xs text-foreground whitespace-nowrap z-10">
                          {day}: {count} view{count !== 1 ? 's' : ''}
                        </div>
                      </div>
                    );
                  })}
                {Object.keys(viewsByDay).length === 0 && (
                  <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
                    {loading ? 'Loading analytics...' : 'No data for this period'}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="font-semibold text-foreground">Devices</h2>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(deviceCounts).map(([device, count]) => (
                  <div key={device} className="flex items-center gap-3">
                    <div className="text-muted-foreground">
                      {device.toLowerCase() === 'mobile' ? <Smartphone size={16} /> : <Monitor size={16} />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-medium text-foreground">{device}</p>
                        <p className="text-sm text-muted-foreground">{count}</p>
                      </div>
                      <div className="h-1.5 bg-card-hover rounded-full overflow-hidden">
                        <div
                          className="h-full bg-accent rounded-full"
                          style={{ width: `${(count / Math.max(totalViews, 1)) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
                {Object.keys(deviceCounts).length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    {loading ? 'Loading analytics...' : 'No data yet'}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <h2 className="text-sm font-bold text-foreground uppercase tracking-wide">
                Top Locations
              </h2>
            </CardHeader>
            <CardContent className="p-0">
              {topCountries.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground text-sm">
                  {loading ? 'Loading locations...' : 'No data yet'}
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {topCountries.map(([country, count]) => (
                    <div key={country} className="px-6 py-3 flex items-center justify-between">
                      <span className="text-sm text-foreground">{country}</span>
                      <Badge>{count}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <h2 className="text-sm font-bold text-foreground uppercase tracking-wide">
                Recent Visitors
              </h2>
            </CardHeader>
            <CardContent className="p-0">
              {visits.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground text-sm">
                  {loading ? 'Loading visitors...' : 'No visitors yet'}
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {visits.slice(0, 15).map((visit) => (
                    <div key={visit.id} className="px-6 py-3 flex items-center justify-between hover:bg-card-hover transition-colors">
                      <div className="flex items-center gap-3">
                        <span className="w-7 h-7 rounded-full bg-accent-muted text-accent text-xs font-bold flex items-center justify-center flex-shrink-0">
                          {(visit.visitor_email?.[0] || '?').toUpperCase()}
                        </span>
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {visit.visitor_email || 'Anonymous'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {visit.city && `${visit.city}, `}
                            {visit.country || ''} &middot; {visit.device_type || 'Unknown'} &middot; {visit.browser || ''}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">{formatDate(visit.created_at)}</p>
                        <div className="flex items-center gap-2 justify-end mt-0.5">
                          <Badge variant={visit.completion_rate >= 80 ? 'success' : visit.completion_rate >= 40 ? 'warning' : 'danger'}>
                            {Math.round(visit.completion_rate || 0)}%
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatDuration(visit.duration || 0)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
