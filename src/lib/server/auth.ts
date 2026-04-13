import { auth, currentUser } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

import { db } from '@/db';
import { users } from '@/db/schema';

export class RouteError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export function toErrorResponse(error: unknown) {
  if (error instanceof RouteError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  if (error instanceof Error && 'status' in error && typeof error.status === 'number') {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  console.error(error);
  return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
}

export async function requireUserId() {
  const { userId } = await auth();

  if (!userId) {
    throw new RouteError('Unauthorized', 401);
  }

  return userId;
}

export async function ensureCurrentUserRecord(userId: string) {
  const user = await currentUser();

  if (!user) {
    throw new RouteError('Unauthorized', 401);
  }

  const email = user.emailAddresses[0]?.emailAddress;

  if (!email) {
    throw new RouteError('Authenticated user is missing an email address.', 400);
  }

  await db
    .insert(users)
    .values({
      avatarUrl: user.imageUrl ?? null,
      email,
      fullName: user.fullName ?? null,
      id: userId,
    })
    .onConflictDoUpdate({
      target: users.id,
      set: {
        avatarUrl: user.imageUrl ?? null,
        email,
        fullName: user.fullName ?? null,
        updatedAt: new Date(),
      },
    });
}
