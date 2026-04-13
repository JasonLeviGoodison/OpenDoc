import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { pageViews } from '@/db/schema';
import { RouteError, toErrorResponse } from '@/lib/server/auth';
import { verifySignedToken } from '@/lib/security';
import { parsePageViewBody } from '@/lib/validators';

export async function POST(req: NextRequest) {
  try {
    const visitToken = req.headers.get('x-opendoc-visit-token');
    const tokenPayload = verifySignedToken(visitToken);
    const body = parsePageViewBody(await req.json());

    if (!tokenPayload || tokenPayload.scope !== 'visit' || tokenPayload.visitId !== body.visitId) {
      throw new RouteError('Visit token is invalid.', 401);
    }

    await db.insert(pageViews).values({
      documentId: body.documentId,
      duration: body.duration,
      pageNumber: Math.round(body.pageNumber),
      visitId: body.visitId,
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
