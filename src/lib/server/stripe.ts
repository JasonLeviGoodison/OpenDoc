import 'server-only';

import { clerkClient } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';
import Stripe from 'stripe';

import { db } from '@/db';
import { stripeCustomers, subscriptions } from '@/db/schema';
import { RouteError } from '@/lib/server/auth';

export type UserPlan = 'lifetime' | 'pro';

const ACTIVE_SUBSCRIPTION_STATUSES = new Set(['active', 'trialing']);

let stripeClient: Stripe | null = null;

function getStripeSecretKey() {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();

  if (!secretKey) {
    throw new RouteError('STRIPE_SECRET_KEY is not configured.', 500);
  }

  return secretKey;
}

export function getStripe() {
  if (!stripeClient) {
    stripeClient = new Stripe(getStripeSecretKey());
  }

  return stripeClient;
}

function getStripeObjectId(value: unknown) {
  if (typeof value === 'string') {
    return value;
  }

  if (value && typeof value === 'object' && 'id' in value && typeof value.id === 'string') {
    return value.id;
  }

  return null;
}

function unixTimestampToDate(value: number | null | undefined) {
  if (typeof value !== 'number') {
    return null;
  }

  return new Date(value * 1000);
}

function getStripePriceIds() {
  return {
    lifetime: process.env.STRIPE_PRICE_ID_LIFETIME?.trim() || null,
    monthly: process.env.STRIPE_PRICE_ID_MONTHLY?.trim() || null,
  };
}

export function getPlanForPriceId(priceId: string | null | undefined): UserPlan | null {
  if (!priceId) {
    return null;
  }

  const { lifetime, monthly } = getStripePriceIds();

  if (priceId === lifetime) {
    return 'lifetime';
  }

  if (priceId === monthly) {
    return 'pro';
  }

  return null;
}

function getSubscriptionPriceId(subscription: Stripe.Subscription) {
  return subscription.items.data[0]?.price?.id ?? null;
}

function getSubscriptionPeriodBounds(subscription: Stripe.Subscription) {
  const periodStarts = subscription.items.data
    .map((item) => item.current_period_start)
    .filter((value): value is number => typeof value === 'number');
  const periodEnds = subscription.items.data
    .map((item) => item.current_period_end)
    .filter((value): value is number => typeof value === 'number');

  return {
    currentPeriodEnd: periodEnds.length > 0 ? unixTimestampToDate(Math.max(...periodEnds)) : null,
    currentPeriodStart: periodStarts.length > 0 ? unixTimestampToDate(Math.min(...periodStarts)) : null,
  };
}

function getPlanForSubscription(subscription: Stripe.Subscription) {
  const priceId = getSubscriptionPriceId(subscription);
  const plan = getPlanForPriceId(priceId);

  if (plan === 'lifetime') {
    return plan;
  }

  if (plan === 'pro' && ACTIVE_SUBSCRIPTION_STATUSES.has(subscription.status)) {
    return plan;
  }

  return null;
}

export async function linkStripeCustomerToUser(userId: string, stripeCustomerId: string) {
  await db
    .insert(stripeCustomers)
    .values({
      stripeCustomerId,
      userId,
    })
    .onConflictDoUpdate({
      target: stripeCustomers.userId,
      set: {
        stripeCustomerId,
      },
    });
}

async function resolveUserIdForStripeCustomer(stripeCustomerId: string, fallbackUserId?: string | null) {
  if (fallbackUserId) {
    await linkStripeCustomerToUser(fallbackUserId, stripeCustomerId);
    return fallbackUserId;
  }

  const [row] = await db
    .select({ userId: stripeCustomers.userId })
    .from(stripeCustomers)
    .where(eq(stripeCustomers.stripeCustomerId, stripeCustomerId))
    .limit(1);

  return row?.userId ?? null;
}

export async function setUserPlanMetadata(userId: string, plan: UserPlan | null) {
  const clerk = await clerkClient();
  const user = await clerk.users.getUser(userId);
  const nextPublicMetadata = { ...((user.publicMetadata ?? {}) as Record<string, unknown>) };

  if (plan) {
    nextPublicMetadata.plan = plan;
  } else {
    delete nextPublicMetadata.plan;
  }

  await clerk.users.updateUserMetadata(userId, {
    publicMetadata: nextPublicMetadata,
  });
}

export async function getOrCreateStripeCustomer(userId: string, email: string) {
  const [existingCustomer] = await db
    .select({ stripeCustomerId: stripeCustomers.stripeCustomerId })
    .from(stripeCustomers)
    .where(eq(stripeCustomers.userId, userId))
    .limit(1);

  if (existingCustomer?.stripeCustomerId) {
    return existingCustomer.stripeCustomerId;
  }

  const customer = await getStripe().customers.create({
    email,
    metadata: {
      userId,
    },
  });

  await linkStripeCustomerToUser(userId, customer.id);

  return customer.id;
}

export async function syncSubscriptionToDb(subscription: Stripe.Subscription) {
  const stripeCustomerId = getStripeObjectId(subscription.customer);

  if (!stripeCustomerId) {
    throw new RouteError('Stripe subscription is missing a customer.', 400);
  }

  const fallbackUserId = subscription.metadata.userId?.trim() || null;
  const userId = await resolveUserIdForStripeCustomer(stripeCustomerId, fallbackUserId);

  if (!userId) {
    throw new RouteError('Unable to resolve the user for this Stripe subscription.', 404);
  }

  const priceId = getSubscriptionPriceId(subscription);

  if (!priceId) {
    throw new RouteError('Stripe subscription is missing a price.', 400);
  }

  const billingPeriod = getSubscriptionPeriodBounds(subscription);
  const subscriptionValues = {
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    canceledAt: unixTimestampToDate(subscription.canceled_at),
    currentPeriodEnd: billingPeriod.currentPeriodEnd,
    currentPeriodStart: billingPeriod.currentPeriodStart,
    priceId,
    status: subscription.status,
    stripeCustomerId,
    stripeSubscriptionId: subscription.id,
    updatedAt: new Date(),
    userId,
  };

  await linkStripeCustomerToUser(userId, stripeCustomerId);

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

  await setUserPlanMetadata(userId, getPlanForSubscription(subscription));

  return {
    priceId,
    stripeCustomerId,
    userId,
  };
}
