// Email delivery for the notifications table (follow-up to Phase 6,
// which left delivery schema-only). Server-only — never imported into
// client code. Mirrors the AdapterResult shape used across
// lib/integrations/ so a missing/failed send is a first-class
// { ok: false }, never a thrown exception that could crash the
// automation run that triggered it.

import { Resend } from "resend";

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.NOTIFICATION_EMAIL_FROM);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Pure — separated from the network call so the content itself is
// testable without a Resend account.
export function buildNotificationEmailContent(title: string, body: string | null): { subject: string; html: string; text: string } {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const linkHtml = appUrl ? `<p><a href="${escapeHtml(appUrl)}">Open Creator Campaign OS</a></p>` : "";
  const linkText = appUrl ? `\n\n${appUrl}` : "";

  return {
    subject: title,
    html: `<p>${escapeHtml(title)}</p>${body ? `<p>${escapeHtml(body)}</p>` : ""}${linkHtml}`,
    text: `${title}${body ? `\n\n${body}` : ""}${linkText}`,
  };
}

export interface NotificationEmailInput {
  to: string;
  title: string;
  body: string | null;
}

export type SendEmailResult = { ok: true } | { ok: false; error: string };

export async function sendNotificationEmail(input: NotificationEmailInput): Promise<SendEmailResult> {
  if (!isEmailConfigured()) {
    return { ok: false, error: "Email delivery not configured (RESEND_API_KEY / NOTIFICATION_EMAIL_FROM)." };
  }

  const { subject, html, text } = buildNotificationEmailContent(input.title, input.body);

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error } = await resend.emails.send({
      from: process.env.NOTIFICATION_EMAIL_FROM!,
      to: input.to,
      subject,
      html,
      text,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown email delivery error." };
  }
}
