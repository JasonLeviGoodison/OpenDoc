import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';

import { db } from '@/db';
import { users } from '@/db/schema';
import { ensureCurrentUserRecord, requireUserId, RouteError, toErrorResponse } from '@/lib/server/auth';
import { getOrCreateStripeCustomer, getPlanForPriceId, getStripe } from '@/lib/server/stripe';
import { parseCheckoutBody } from '@/lib/validators';

export const runtime = 'nodejs';

function getAppUrl(req: NextRequest) {
  return process.env.NEXT_PUBLIC_APP_URL?.trim() || req.nextUrl.origin;
}

export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId();
    await ensureCurrentUserRecord(userId);

    const body = parseCheckoutBody(await req.json());
    const plan = getPlanForPriceId(body.priceId);

    if (!plan) {
      throw new RouteError('priceId is not configured for checkout.', 400);
    }

    const [user] = await db
      .select({
        email: users.email,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    const email = user?.email?.trim();

    if (!email) {
      throw new RouteError('Authenticated user is missing an email address.', 400);
    }

    const stripeCustomerId = await getOrCreateStripeCustomer(userId, email);
    const appUrl = getAppUrl(req);
    const session = await getStripe().checkout.sessions.create({
      cancel_url: `${appUrl}/settings?checkout=canceled`,
      client_reference_id: userId,
      customer: stripeCustomerId,
      line_items: [
        {
          price: body.priceId,
          quantity: 1,
        },
      ],
      metadata: {
        priceId: body.priceId,
        userId,
      },
      mode: plan === 'lifetime' ? 'payment' : 'subscription',
      payment_intent_data:
        plan === 'lifetime'
          ? {
              metadata: {
                priceId: body.priceId,
                userId,
              },
            }
          : undefined,
      subscription_data:
        plan === 'pro'
          ? {
              metadata: {
                priceId: body.priceId,
                userId,
              },
            }
          : undefined,
      success_url: `${appUrl}/settings?checkout=success`,
    });

    if (!session.url) {
      throw new RouteError('Stripe checkout session could not be created.', 500);
    }

    return NextResponse.json({
      url: session.url,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
