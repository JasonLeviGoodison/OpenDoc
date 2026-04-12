import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { visits } from '@/db/schema';

export async function POST(req: NextRequest) {
  const body = await req.json();

  const forwarded = req.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0] : req.headers.get('x-real-ip') || 'unknown';
  const userAgent = req.headers.get('user-agent') || '';

  const isMobile = /mobile|android|iphone|ipad/i.test(userAgent);
  const browser = parseBrowser(userAgent);
  const os = parseOS(userAgent);

  const [row] = await db
    .insert(visits)
    .values({
      linkId: body.link_id,
      documentId: body.document_id,
      visitorEmail: body.visitor_email || null,
      visitorName: body.visitor_name || null,
      ipAddress: ip,
      deviceType: isMobile ? 'Mobile' : 'Desktop',
      browser,
      os,
    })
    .returning();

  return NextResponse.json(row, { status: 201 });
}

function parseBrowser(ua: string): string {
  if (/firefox/i.test(ua)) return 'Firefox';
  if (/edg/i.test(ua)) return 'Edge';
  if (/chrome/i.test(ua)) return 'Chrome';
  if (/safari/i.test(ua)) return 'Safari';
  if (/opera|opr/i.test(ua)) return 'Opera';
  return 'Other';
}

function parseOS(ua: string): string {
  if (/windows/i.test(ua)) return 'Windows';
  if (/macintosh|mac os/i.test(ua)) return 'macOS';
  if (/linux/i.test(ua)) return 'Linux';
  if (/android/i.test(ua)) return 'Android';
  if (/iphone|ipad/i.test(ua)) return 'iOS';
  return 'Other';
}
