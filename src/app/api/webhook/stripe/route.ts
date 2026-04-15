import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

import { db } from '@/db';
import { stripeCustomers, subscriptions } from '@/db/schema';
import { RouteError, toErrorResponse } from '@/lib/server/auth';
import {
  getPlanForPriceId,
  getStripe,
  linkStripeCustomerToUser,
  setUserPlanMetadata,
  syncSubscriptionToDb,
} from '@/lib/server/stripe';
import { eq } from 'drizzle-orm';

export const runtime = 'nodejs';

function getStripeObjectId(value: unknown) {
  if (typeof value === 'string') {
    return value;
  }

  if (value && typeof value === 'object' && 'id' in value && typeof value.id === 'string') {
    return value.id;
  }

  return null;
}

function getWebhookSecret() {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();

  if (!webhookSecret) {
    throw new RouteError('STRIPE_WEBHOOK_SECRET is not configured.', 500);
  }

  return webhookSecret;
}

async function resolveUserIdForCheckoutSession(session: Stripe.Checkout.Session) {
  const metadataUserId = session.metadata?.userId?.trim() || null;

  if (metadataUserId) {
    return metadataUserId;
  }

  const stripeCustomerId = getStripeObjectId(session.customer);

  if (!stripeCustomerId) {
    return null;
  }

  const [row] = await db
    .select({ userId: stripeCustomers.userId })
    .from(stripeCustomers)
    .where(eq(stripeCustomers.stripeCustomerId, stripeCustomerId))
    .limit(1);

  return row?.userId ?? null;
}

async function syncCompletedCheckoutSession(session: Stripe.Checkout.Session) {
  const userId = await resolveUserIdForCheckoutSession(session);

  if (!userId) {
    throw new RouteError('Unable to resolve the user for this Stripe checkout session.', 404);
  }

  const stripeCustomerId = getStripeObjectId(session.customer);

  if (!stripeCustomerId) {
    throw new RouteError('Stripe checkout session is missing a customer.', 400);
  }

  await linkStripeCustomerToUser(userId, stripeCustomerId);

  if (session.mode === 'subscription') {
    const stripeSubscriptionId = getStripeObjectId(session.subscription);

    if (!stripeSubscriptionId) {
      throw new RouteError('Stripe checkout session is missing a subscription.', 400);
    }

    const subscription = await getStripe().subscriptions.retrieve(stripeSubscriptionId);
    await syncSubscriptionToDb(subscription);
    return;
  }

  const priceId = session.metadata?.priceId?.trim() || null;
  const plan = getPlanForPriceId(priceId);

  if (plan !== 'lifetime' || !priceId) {
    throw new RouteError('Stripe checkout session price is not configured for lifetime access.', 400);
  }

  const subscriptionValues = {
    cancelAtPeriodEnd: false,
    canceledAt: null,
    currentPeriodEnd: null,
    currentPeriodStart: new Date(session.created * 1000),
    priceId,
    status: 'active',
    stripeCustomerId,
    stripeSubscriptionId: null,
    updatedAt: new Date(),
    userId,
  };

  await db
    .insert(subscriptions)
    .values({
      ...subscriptionValues,
      createdAt: new Date(),
    })
    .onConflictDoUpdate({
      target: subscriptions.userId,
      set: subscriptionValues,
    });

  await setUserPlanMetadata(userId, 'lifetime');
}

async function syncInvoiceSubscription(invoice: Stripe.Invoice, forcedStatus?: string) {
  const stripeSubscriptionId = getStripeObjectId(invoice.parent?.subscription_details?.subscription);

  if (!stripeSubscriptionId) {
    return;
  }

  const subscription = await getStripe().subscriptions.retrieve(stripeSubscriptionId);
  const { userId } = await syncSubscriptionToDb(subscription);

  if (forcedStatus && subscription.status !== forcedStatus) {
    await db
      .update(subscriptions)
      .set({
        status: forcedStatus,
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.userId, userId));

    if (forcedStatus === 'past_due') {
      await setUserPlanMetadata(userId, null);
    }
  }
}

export async function POST(req: NextRequest) {
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing Stripe signature.' }, { status: 400 });
  }

  const body = await req.text();

  let event: Stripe.Event;

  try {
    event = getStripe().webhooks.constructEvent(body, signature, getWebhookSecret());
  } catch (error) {
    console.error('Failed to verify Stripe webhook signature', error);
    return NextResponse.json({ error: 'Invalid Stripe webhook signature.' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await syncCompletedCheckoutSession(event.data.object);
        break;
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await syncSubscriptionToDb(event.data.object);
        break;
      case 'invoice.payment_succeeded':
        await syncInvoiceSubscription(event.data.object);
        break;
      case 'invoice.payment_failed':
        await syncInvoiceSubscription(event.data.object, 'past_due');
        break;
      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
