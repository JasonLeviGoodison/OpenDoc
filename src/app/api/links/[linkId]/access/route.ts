import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';

import { db } from '@/db';
import { documentLinks } from '@/db/schema';
import { getViewerCookiePath, VIEWER_COOKIE_NAME } from '@/lib/http';
import { getLinkAvailability, isEmailAuthorized } from '@/lib/link-access';
import { RouteError, toErrorResponse } from '@/lib/server/auth';
import {
  createSignedToken,
  DEFAULT_SIGNED_TOKEN_TTL_MS,
  verifyPasswordRecord,
} from '@/lib/security';

export async function POST(req: NextRequest, { params }: { params: Promise<{ linkId: string }> }) {
  try {
    const { linkId } = await params;
    const body = await req.json();
    const email = typeof body.email === 'string' ? body.email : '';
    const password = typeof body.password === 'string' ? body.password : '';

    const [link] = await db.select().from(documentLinks).where(eq(documentLinks.linkId, linkId));

    if (!link) {
      throw new RouteError('Link not found.', 404);
    }

    const availability = getLinkAvailability(link);

    if (availability === 'disabled') {
      throw new RouteError('This link has been disabled.', 403);
    }

    if (availability === 'expired') {
      throw new RouteError('This link has expired.', 403);
    }

    if (link.requireEmail && (!email || !isEmailAuthorized(link, email))) {
      throw new RouteError('Your email is not authorized to view this document.', 403);
    }

    if (link.requirePassword) {
      const passwordCheck = verifyPasswordRecord(password, link.passwordHash);

      if (!passwordCheck.isValid) {
        throw new RouteError('Incorrect password.', 401);
      }

      if (passwordCheck.needsRehash && passwordCheck.upgradedHash) {
        await db
          .update(documentLinks)
          .set({
            passwordHash: passwordCheck.upgradedHash,
            updatedAt: new Date(),
          })
          .where(eq(documentLinks.id, link.id));
      }
    }

    const viewerToken = createSignedToken({
      linkId,
      scope: 'viewer',
    });

    const response = NextResponse.json({
      viewer_token: viewerToken,
    });

    response.cookies.set({
      httpOnly: true,
      maxAge: Math.floor(DEFAULT_SIGNED_TOKEN_TTL_MS / 1000),
      name: VIEWER_COOKIE_NAME,
      path: getViewerCookiePath(linkId),
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      value: viewerToken,
    });

    return response;
  } catch (error) {
    return toErrorResponse(error);
  }
}
