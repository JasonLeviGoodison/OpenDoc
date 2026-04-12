'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/dashboard/header';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Toggle } from '@/components/ui/toggle';
import { Badge } from '@/components/ui/badge';
import {
  Globe,
  Building2,
  Save,
  Check,
  Image,
} from 'lucide-react';
import { useUser } from '@clerk/nextjs';
import { supabase } from '@/lib/supabase';

export default function SettingsPage() {
  const { user } = useUser();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Brand settings
  const [companyName, setCompanyName] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [accentColor, setAccentColor] = useState('#6366f1');
  const [logoUrl, setLogoUrl] = useState('');

  // Notification settings
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [instantNotifs, setInstantNotifs] = useState(true);
  const [digestNotifs, setDigestNotifs] = useState(false);

  useEffect(() => {
    if (user) loadSettings();
  }, [user]);

  async function loadSettings() {
    const { data } = await supabase
      .from('brand_settings')
      .select('*')
      .eq('user_id', user!.id)
      .single();

    if (data) {
      setCompanyName(data.company_name || '');
      setWebsiteUrl(data.website_url || '');
      setAccentColor(data.accent_color || '#6366f1');
      setLogoUrl(data.logo_url || '');
    }
  }

  async function saveSettings() {
    setSaving(true);
    const { error } = await supabase
      .from('brand_settings')
      .upsert({
        user_id: user!.id,
        company_name: companyName || null,
        website_url: websiteUrl || null,
        accent_color: accentColor,
        logo_url: logoUrl || null,
      }, { onConflict: 'user_id' });

    setSaving(false);
    if (!error) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  }

  return (
    <div>
      <Header
        title="Settings"
        description="Configure your account and branding"
      />

      <div className="p-8 max-w-3xl space-y-6">
        {/* Account */}
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

        {/* Branding */}
        <Card>
          <CardHeader>
            <h2 className="text-sm font-bold text-foreground uppercase tracking-wide">Branding</h2>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="Company Name"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Your Company"
              icon={<Building2 size={16} />}
            />
            <Input
              label="Website URL"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              placeholder="https://yourcompany.com"
              icon={<Globe size={16} />}
            />
            <Input
              label="Logo URL"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://yourcompany.com/logo.png"
              icon={<Image size={16} />}
            />
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">Accent Color</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="w-10 h-10 rounded-lg border border-border cursor-pointer"
                />
                <Input
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="w-32"
                />
                <div
                  className="h-10 flex-1 rounded-lg"
                  style={{ backgroundColor: accentColor }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <h2 className="text-sm font-bold text-foreground uppercase tracking-wide">Notifications</h2>
          </CardHeader>
          <CardContent className="space-y-4">
            <Toggle
              checked={emailNotifs}
              onCheckedChange={setEmailNotifs}
              label="Email Notifications"
              description="Receive email notifications when someone views your documents"
            />
            <Toggle
              checked={instantNotifs}
              onCheckedChange={setInstantNotifs}
              label="Instant Notifications"
              description="Get notified immediately when a document is opened"
            />
            <Toggle
              checked={digestNotifs}
              onCheckedChange={setDigestNotifs}
              label="Daily Digest"
              description="Receive a daily summary of all document activity"
            />
          </CardContent>
        </Card>

        {/* Security */}
        <Card>
          <CardHeader>
            <h2 className="text-sm font-bold text-foreground uppercase tracking-wide">Default Security</h2>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Default settings applied to all new links. Can be overridden per link.
            </p>
            <div className="space-y-4">
              <Toggle
                checked={true}
                onCheckedChange={() => {}}
                label="Require Email by Default"
                description="New links will require email verification"
              />
              <Toggle
                checked={false}
                onCheckedChange={() => {}}
                label="Enable Watermark by Default"
                description="New links will have watermarking enabled"
              />
              <Toggle
                checked={false}
                onCheckedChange={() => {}}
                label="Disable Downloads by Default"
                description="New links will not allow document downloads"
              />
            </div>
          </CardContent>
        </Card>

        {/* Save */}
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
