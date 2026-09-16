import nodemailer from 'nodemailer';

/**
 * Outbound email — two providers, zero ceremony:
 *   1. Gmail (free): GMAIL_USER + GMAIL_APP_PASSWORD (a Google "App password"). Sends from the owner's own Gmail.
 *   2. Resend: RESEND_API_KEY + RESEND_FROM_EMAIL (needs a verified domain).
 * Gmail wins when both are set.
 */
export interface Mail { to: string; subject: string; html: string; replyTo?: string; fromName?: string }

export function mailConfigured(): 'gmail' | 'resend' | null {
  if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) return 'gmail';
  if (process.env.RESEND_API_KEY) return 'resend';
  return null;
}

export async function sendMail(m: Mail): Promise<{ ok: true; id?: string } | { ok: false; error: string }> {
  const provider = mailConfigured();
  if (!provider) return { ok: false, error: 'Email is not configured. Add GMAIL_USER + GMAIL_APP_PASSWORD (free) or RESEND_API_KEY.' };

  if (provider === 'gmail') {
    const user = String(process.env.GMAIL_USER).trim();
    const pass = String(process.env.GMAIL_APP_PASSWORD).replace(/\s+/g, '');
    const transport = nodemailer.createTransport({ host: 'smtp.gmail.com', port: 465, secure: true, auth: { user, pass } });
    try {
      const info = await transport.sendMail({ from: m.fromName ? `"${m.fromName.replace(/"/g, '')}" <${user}>` : user, to: m.to, subject: m.subject, html: m.html, replyTo: m.replyTo || undefined });
      return { ok: true, id: info.messageId };
    } catch (e) {
      const msg = (e as Error).message || String(e);
      const hint = /535|Username and Password not accepted|BadCredentials/i.test(msg) ? ' — Gmail rejected the login: use an App password (myaccount.google.com/apppasswords), not your normal password, and make sure 2-Step Verification is on.' : '';
      return { ok: false, error: msg + hint };
    }
  }

  const key = process.env.RESEND_API_KEY as string;
  const from = process.env.RESEND_FROM_EMAIL || 'Zikkit <noreply@zikkit.com>';
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: m.to, subject: m.subject, html: m.html, ...(m.replyTo ? { reply_to: m.replyTo } : {}) }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, error: (data.message || data.error || 'Resend error') + (String(data.message || '').includes('domain') ? ' — RESEND_FROM_EMAIL must use a domain verified in Resend.' : '') };
  return { ok: true, id: data.id };
}
