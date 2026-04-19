'use client';

import { useEffect, useEffectEvent, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { Building2, Check, Globe, Image as ImageIcon, Save } from 'lucide-react';

import { Header } from '@/components/dashboard/header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { apiFetchJson } from '@/lib/api-client';
import type { BrandSettings } from '@/lib/types';

export default function SettingsPage() {
  const { user } = useUser();
  const userId = user?.id;
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [accentColor, setAccentColor] = useState('#6366f1');
  const [logoUrl, setLogoUrl] = useState('');

  const loadSettings = useEffectEvent(async () => {
    if (!userId) {
      return;
    }

    try {
      const data = await apiFetchJson<BrandSettings | null>('/api/brand-settings');

      if (data) {
        setCompanyName(data.company_name || '');
        setWebsiteUrl(data.website_url || '');
        setAccentColor(data.accent_color || '#6366f1');
        setLogoUrl(data.logo_url || '');
      }
    } catch (error) {
      console.error('Error loading brand settings:', error);
    }
  });

  useEffect(() => {
    if (!userId) {
      return;
    }

    void loadSettings();
  }, [userId]);

  async function saveSettings() {
    setSaving(true);

    try {
      await apiFetchJson<BrandSettings>('/api/brand-settings', {
        body: JSON.stringify({
          accent_color: accentColor,
          company_name: companyName || null,
          logo_url: logoUrl || null,
          website_url: websiteUrl || null,
        }),
        method: 'PUT',
      });

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error('Error saving settings:', error);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <Header title="Settings" description="Configure your account and branding" />

      <div className="p-8 max-w-3xl space-y-6">
        <Card>
          <CardHeader>
            <h2 className="text-sm font-bold text-foreground uppercase tracking-wide">Account</h2>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <span className="w-14 h-14 rounded-full bg-card-hover border border-border flex items-center justify-center text-xl font-bold text-foreground">
                {user?.firstName?.[0] || user?.emailAddresses[0]?.emailAddress[0]?.toUpperCase() || '?'}
              </span>
              <div>
                <p className="text-base font-semibold text-foreground">
                  {user?.fullName || user?.emailAddresses[0]?.emailAddress}
                </p>
                <p className="text-sm text-muted-foreground">
                  {user?.emailAddresses[0]?.emailAddress}
                </p>
                <Badge variant="accent" className="mt-1">Pro Plan</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-sm font-bold text-foreground uppercase tracking-wide">Branding</h2>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="Company Name"
              value={companyName}
              onChange={(event) => setCompanyName(event.target.value)}
              placeholder="Your Company"
              icon={<Building2 size={16} />}
            />
            <Input
              label="Website URL"
              value={websiteUrl}
              onChange={(event) => setWebsiteUrl(event.target.value)}
              placeholder="https://yourcompany.com"
              icon={<Globe size={16} />}
            />
            <Input
              label="Logo URL"
              value={logoUrl}
              onChange={(event) => setLogoUrl(event.target.value)}
              placeholder="https://yourcompany.com/logo.png"
              icon={<ImageIcon size={16} />}
            />
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">Accent Color</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={accentColor}
                  onChange={(event) => setAccentColor(event.target.value)}
                  className="w-10 h-10 rounded-lg border border-border cursor-pointer"
                />
                <Input
                  value={accentColor}
                  onChange={(event) => setAccentColor(event.target.value)}
                  className="w-32"
                />
                <div className="h-10 flex-1 rounded-lg" style={{ backgroundColor: accentColor }} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-sm font-bold text-foreground uppercase tracking-wide">Security</h2>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Access controls, watermarking, and expiration are configured per link so each
              document or space can be shared with the right risk profile.
            </p>
            <p className="text-sm text-muted-foreground">
              Viewer access is enforced through the server route layer now, rather than direct
              browser-side database writes.
            </p>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button onClick={saveSettings} loading={saving}>
            {saved ? (
              <>
                <Check size={16} />
                Saved!
              </>
            ) : (
              <>
                <Save size={16} />
                Save Settings
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
