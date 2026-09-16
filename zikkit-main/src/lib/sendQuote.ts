import { quoteEmailHtml } from './emailTemplates';

export async function sendQuoteEmail(quote: any, bizName: string, portalUrl?: string) {
  if (!quote.email) return { success: false, error: 'No email' };
  const html = quoteEmailHtml(quote, bizName, portalUrl);
  try {
    const res = await fetch('/api/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: quote.email, subject: `הצעת מחיר מ-${bizName}`, html }),
    });
    return await res.json();
  } catch (e) { return { success: false, error: (e as Error).message }; }
}

export async function sendReceiptEmail(job: any, bizName: string) {
  if (!job.email) return { success: false, error: 'No email' };
  const { receiptEmailHtml } = await import('./emailTemplates');
  const html = receiptEmailHtml(job, bizName);
  try {
    const res = await fetch('/api/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: job.email, subject: `קבלה מ-${bizName}`, html }),
    });
    return await res.json();
  } catch (e) { return { success: false, error: (e as Error).message }; }
}

export async function sendSms(to: string, message: string) {
  try {
    const res = await fetch('/api/sms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, message }),
    });
    return await res.json();
  } catch (e) { return { success: false, error: (e as Error).message }; }
}
