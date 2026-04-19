export interface LinkAccessControls {
  allowedDomains?: string[] | null;
  allowedEmails?: string[] | null;
  blockedDomains?: string[] | null;
  blockedEmails?: string[] | null;
  expiresAt?: Date | string | null;
  isActive?: boolean | null;
  requireEmail?: boolean | null;
  requirePassword?: boolean | null;
}

export type LinkAvailability = 'available' | 'disabled' | 'expired';

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function normalizeList(values: string[] | null | undefined) {
  return (values ?? []).map((value) => value.trim().toLowerCase()).filter(Boolean);
}

export function splitList(input: string) {
  return input
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

export function getEmailDomain(email: string) {
  const [, domain = ''] = normalizeEmail(email).split('@');
  return domain;
}

export function getLinkAvailability(link: LinkAccessControls): LinkAvailability {
  if (link.isActive === false) {
    return 'disabled';
  }

  if (!link.expiresAt) {
    return 'available';
  }

  const expiresAt = new Date(link.expiresAt);

  if (Number.isNaN(expiresAt.getTime())) {
    return 'available';
  }

  return expiresAt <= new Date() ? 'expired' : 'available';
}

export function isEmailAuthorized(link: LinkAccessControls, rawEmail: string) {
  const email = normalizeEmail(rawEmail);
  const domain = getEmailDomain(email);

  if (!email || !domain) {
    return false;
  }

  const blockedEmails = normalizeList(link.blockedEmails);
  const blockedDomains = normalizeList(link.blockedDomains);

  if (blockedEmails.includes(email) || blockedDomains.includes(domain)) {
    return false;
  }

  const allowedEmails = normalizeList(link.allowedEmails);
  const allowedDomains = normalizeList(link.allowedDomains);

  if (allowedEmails.length === 0 && allowedDomains.length === 0) {
    return true;
  }

  return allowedEmails.includes(email) || allowedDomains.includes(domain);
}
