import { Resend } from 'resend';

const DOCUMENT_VIEWED_EMAIL_FROM = 'OpenDoc <notifications@opendoc.app>';

let resendClient: Resend | null | undefined;
let hasWarnedAboutMissingApiKey = false;

function getResendClient() {
  if (resendClient !== undefined) {
    return resendClient;
  }

  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    if (!hasWarnedAboutMissingApiKey) {
      hasWarnedAboutMissingApiKey = true;
      console.warn('RESEND_API_KEY is not configured. Skipping outbound email notifications.');
    }

    resendClient = null;
    return resendClient;
  }

  resendClient = new Resend(apiKey);
  return resendClient;
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function formatViewedAt(viewedAt: Date) {
  return `${viewedAt.toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'UTC',
  })} UTC`;
}

export interface SendDocumentViewedEmailInput {
  analyticsUrl: string;
  documentName: string;
  linkName?: string | null;
  ownerEmail: string;
  ownerName?: string | null;
  viewedAt: Date;
  viewerEmail?: string | null;
}

export function buildDocumentViewedEmailContent({
  analyticsUrl,
  documentName,
  linkName,
  ownerName,
  viewedAt,
  viewerEmail,
}: Omit<SendDocumentViewedEmailInput, 'ownerEmail'>) {
  const viewerLabel = viewerEmail?.trim() || 'Anonymous';
  const greeting = ownerName?.trim() ? `Hi ${ownerName.trim()},` : 'Hello,';
  const viewedAtLabel = formatViewedAt(viewedAt);
  const escapedDocumentName = escapeHtml(documentName);
  const escapedViewerLabel = escapeHtml(viewerLabel);
  const trimmedLinkName = linkName?.trim() || null;
  const escapedLinkName = trimmedLinkName ? escapeHtml(trimmedLinkName) : null;
  const escapedAnalyticsUrl = escapeHtml(analyticsUrl);
  const subject = `Someone viewed your document "${documentName}"`;
  const textLines = [
    greeting,
    '',
    `${viewerLabel} viewed your document "${documentName}".`,
    trimmedLinkName ? `Link: ${trimmedLinkName}` : null,
    `Viewed at: ${viewedAtLabel}`,
    `Analytics: ${analyticsUrl}`,
  ].filter(Boolean);

  const html = `
    <div style="background:#f4f4f5;padding:24px;font-family:Arial,sans-serif;color:#18181b;">
      <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e4e4e7;border-radius:16px;overflow:hidden;">
        <div style="padding:24px 24px 8px;">
          <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">${escapeHtml(greeting)}</p>
          <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;">Someone viewed your document</h1>
          <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#3f3f46;">
            <strong>${escapedViewerLabel}</strong> viewed <strong>${escapedDocumentName}</strong>.
          </p>
          <div style="margin:0 0 24px;padding:16px;border-radius:12px;background:#fafafa;border:1px solid #e4e4e7;">
            <p style="margin:0 0 8px;font-size:14px;line-height:1.5;"><strong>Document:</strong> ${escapedDocumentName}</p>
            ${escapedLinkName ? `<p style="margin:0 0 8px;font-size:14px;line-height:1.5;"><strong>Link:</strong> ${escapedLinkName}</p>` : ''}
            <p style="margin:0;font-size:14px;line-height:1.5;"><strong>Viewed at:</strong> ${escapeHtml(viewedAtLabel)}</p>
          </div>
          <a
            href="${escapedAnalyticsUrl}"
            style="display:inline-block;padding:12px 18px;border-radius:10px;background:#111827;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;"
          >
            View Document Analytics
          </a>
        </div>
        <div style="padding:16px 24px 24px;color:#71717a;font-size:12px;line-height:1.6;">
          Open analytics: <a href="${escapedAnalyticsUrl}" style="color:#111827;">${escapedAnalyticsUrl}</a>
        </div>
      </div>
    </div>
  `.trim();

  return {
    html,
    subject,
    text: textLines.join('\n'),
  };
}

export async function sendDocumentViewedEmail(input: SendDocumentViewedEmailInput) {
  const resend = getResendClient();

  if (!resend) {
    return;
  }

  const { html, subject, text } = buildDocumentViewedEmailContent(input);

  await resend.emails.send({
    from: DOCUMENT_VIEWED_EMAIL_FROM,
    html,
    subject,
    text,
    to: [input.ownerEmail],
  });
}
