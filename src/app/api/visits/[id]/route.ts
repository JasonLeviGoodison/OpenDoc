import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { visits } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { RouteError, toErrorResponse } from '@/lib/server/auth';
import { verifySignedToken } from '@/lib/security';
import { parseVisitPatchBody } from '@/lib/validators';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const visitToken = req.headers.get('x-opendoc-visit-token');
    const tokenPayload = verifySignedToken(visitToken);

    if (!tokenPayload || tokenPayload.scope !== 'visit' || tokenPayload.visitId !== id) {
      throw new RouteError('Visit token is invalid.', 401);
    }

    const updates = parseVisitPatchBody(await req.json());

    if (Object.keys(updates).length === 0) {
      throw new RouteError('No fields to update.', 400);
    }

    const [row] = await db
      .update(visits)
      .set({
        ...(updates.completionRate !== undefined ? { completionRate: updates.completionRate ?? 0 } : {}),
        ...(updates.downloaded !== undefined ? { downloaded: updates.downloaded } : {}),
        ...(updates.duration !== undefined ? { duration: updates.duration ?? 0 } : {}),
        ...(updates.pageCountViewed !== undefined
          ? { pageCountViewed: Math.max(0, Math.round(updates.pageCountViewed ?? 0)) }
          : {}),
        lastActivityAt: new Date(),
      })
      .where(eq(visits.id, id))
      .returning();

    if (!row) {
      throw new RouteError('Not found', 404);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
