import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const PASSWORD_VERSION = 's1';
const TOKEN_VERSION = 't1';
export const DEFAULT_SIGNED_TOKEN_TTL_MS = 4 * 60 * 60 * 1000;

type TokenScope = 'viewer' | 'visit';

interface SignedTokenPayload {
  exp: number;
  linkId: string;
  scope: TokenScope;
  v: typeof TOKEN_VERSION;
  visitId?: string;
}

export interface PasswordVerificationResult {
  isValid: boolean;
  needsRehash: boolean;
  upgradedHash: string | null;
}

export class MissingTokenSecretError extends Error {
  constructor() {
    super('OPENDOC_TOKEN_SECRET or CLERK_SECRET_KEY must be set.');
  }
}

function safeCompare(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

function getTokenSecret() {
  const tokenSecret = process.env.OPENDOC_TOKEN_SECRET ?? process.env.CLERK_SECRET_KEY;

  if (!tokenSecret) {
    throw new MissingTokenSecretError();
  }

  return tokenSecret;
}

function signTokenBody(encodedBody: string) {
  return createHmac('sha256', getTokenSecret()).update(encodedBody).digest('base64url');
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${PASSWORD_VERSION}:${salt}:${hash}`;
}

export function verifyPasswordRecord(
  password: string,
  storedPassword: string | null | undefined,
): PasswordVerificationResult {
  if (!storedPassword) {
    return {
      isValid: false,
      needsRehash: false,
      upgradedHash: null,
    };
  }

  if (!storedPassword.startsWith(`${PASSWORD_VERSION}:`)) {
    const isValid = safeCompare(password, storedPassword);
    return {
      isValid,
      needsRehash: isValid,
      upgradedHash: isValid ? hashPassword(password) : null,
    };
  }

  const [, salt, storedHash] = storedPassword.split(':');

  if (!salt || !storedHash) {
    return {
      isValid: false,
      needsRehash: false,
      upgradedHash: null,
    };
  }

  const computedHash = scryptSync(password, salt, 64).toString('hex');
  return {
    isValid: safeCompare(computedHash, storedHash),
    needsRehash: false,
    upgradedHash: null,
  };
}

export function verifyPassword(password: string, storedPassword: string | null | undefined) {
  return verifyPasswordRecord(password, storedPassword).isValid;
}

export function createSignedToken(
  payload: Omit<SignedTokenPayload, 'exp' | 'v'>,
  ttlMs = DEFAULT_SIGNED_TOKEN_TTL_MS,
) {
  const signedPayload: SignedTokenPayload = {
    ...payload,
    exp: Date.now() + ttlMs,
    v: TOKEN_VERSION,
  };

  const encodedBody = Buffer.from(JSON.stringify(signedPayload)).toString('base64url');
  const signature = signTokenBody(encodedBody);
  return `${encodedBody}.${signature}`;
}

export function verifySignedToken(token: string | null | undefined) {
  if (!token) {
    return null;
  }

  const [encodedBody, signature] = token.split('.');

  if (!encodedBody || !signature) {
    return null;
  }

  const expectedSignature = signTokenBody(encodedBody);

  if (!safeCompare(signature, expectedSignature)) {
    return null;
  }

  let payload: SignedTokenPayload;

  try {
    payload = JSON.parse(Buffer.from(encodedBody, 'base64url').toString('utf8')) as SignedTokenPayload;
  } catch {
    return null;
  }

  if (payload.v !== TOKEN_VERSION || payload.exp <= Date.now()) {
    return null;
  }

  return payload;
}
