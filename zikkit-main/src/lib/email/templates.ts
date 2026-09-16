import type { Quote, Job } from '@/types';

const BRAND_COLOR = '#00e5b0';
const BG_COLOR = '#0b0e12';
const SURFACE = '#141920';
const TEXT = '#e8f0f4';
const TEXT2 = '#a8bcc8';
const TEXT3 = '#5a7080';
const BORDER = 'rgba(255,255,255,0.08)';

function baseLayout(content: string, bizName: string, footer: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:${BG_COLOR};font-family:'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:${BG_COLOR};padding:30px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:${SURFACE};border:1px solid ${BORDER};border-radius:16px;overflow:hidden;">

<!-- Header -->
<tr><td style="background:linear-gradient(135deg,rgba(0,229,176,0.12),rgba(79,143,255,0.08));padding:28px 32px;border-bottom:1px solid ${BORDER};">
  <table width="100%"><tr>
    <td><span style="font-size:24px;font-weight:800;color:${TEXT};letter-spacing:-0.5px;">${bizName}</span></td>
    <td align="right"><span style="font-size:11px;font-weight:700;color:${BRAND_COLOR};background:rgba(0,229,176,0.1);padding:4px 12px;border-radius:20px;border:1px solid rgba(0,229,176,0.2);">Powered by Zikkit</span></td>
  </tr></table>
</td></tr>

<!-- Content -->
<tr><td style="padding:32px;">
${content}
</td></tr>

<!-- Footer -->
<tr><td style="padding:20px 32px;border-top:1px solid ${BORDER};background:rgba(0,0,0,0.2);">
  <p style="margin:0;font-size:12px;color:${TEXT3};line-height:1.6;">${footer || 'Thank you for your business!'}</p>
  <p style="margin:8px 0 0;font-size:10px;color:${TEXT3};opacity:0.6;">${bizName} · Sent via Zikkit Field Service Management</p>
</td></tr>

</table>
</td></tr></table>
</body></html>`;
}

function formatMoney(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat(currency === 'ILS' ? 'he-IL' : 'en-US', {
    style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(amount);
}

// ─── Quote Email ───
export function buildQuoteEmail(quote: Quote, bizName: string, bizPhone: string, bizEmail: string, currency: string, footer: string): { subject: string; html: string } {
  const itemRows = (quote.items || []).map((item) => `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid ${BORDER};font-size:13px;color:${TEXT};">${item.name}</td>
      <td style="padding:10px 12px;border-bottom:1px solid ${BORDER};font-size:13px;color:${TEXT2};text-align:center;">${item.qty}</td>
      <td style="padding:10px 12px;border-bottom:1px solid ${BORDER};font-size:13px;color:${TEXT2};text-align:right;">${formatMoney(item.price, currency)}</td>
      <td style="padding:10px 12px;border-bottom:1px solid ${BORDER};font-size:13px;color:${TEXT};font-weight:700;text-align:right;">${formatMoney(item.qty * item.price, currency)}</td>
    </tr>
  `).join('');

  const content = `
    <h2 style="margin:0 0 6px;font-size:22px;font-weight:800;color:${TEXT};">Quote #Q-${quote.id}</h2>
    <p style="margin:0 0 24px;font-size:13px;color:${TEXT3};">Date: ${new Date(quote.created || Date.now()).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>

    <!-- Client Info -->
    <table width="100%" style="margin-bottom:24px;background:rgba(0,229,176,0.05);border:1px solid rgba(0,229,176,0.15);border-radius:10px;padding:16px;">
    <tr><td>
      <p style="margin:0;font-size:11px;font-weight:700;color:${TEXT3};text-transform:uppercase;letter-spacing:0.5px;">Prepared For</p>
      <p style="margin:6px 0 0;font-size:15px;font-weight:700;color:${TEXT};">${quote.client}</p>
      ${quote.phone ? `<p style="margin:3px 0 0;font-size:12px;color:${TEXT2};">📞 ${quote.phone}</p>` : ''}
      ${quote.email ? `<p style="margin:3px 0 0;font-size:12px;color:${TEXT2};">✉️ ${quote.email}</p>` : ''}
      ${quote.address ? `<p style="margin:3px 0 0;font-size:12px;color:${TEXT2};">📍 ${quote.address}</p>` : ''}
    </td></tr></table>

    <!-- Line Items -->
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${BORDER};border-radius:10px;overflow:hidden;margin-bottom:20px;">
    <tr style="background:rgba(255,255,255,0.03);">
      <th style="padding:10px 12px;font-size:10px;font-weight:700;color:${TEXT3};text-transform:uppercase;letter-spacing:0.5px;text-align:left;border-bottom:1px solid ${BORDER};">Item</th>
      <th style="padding:10px 12px;font-size:10px;font-weight:700;color:${TEXT3};text-transform:uppercase;letter-spacing:0.5px;text-align:center;border-bottom:1px solid ${BORDER};">Qty</th>
      <th style="padding:10px 12px;font-size:10px;font-weight:700;color:${TEXT3};text-transform:uppercase;letter-spacing:0.5px;text-align:right;border-bottom:1px solid ${BORDER};">Price</th>
      <th style="padding:10px 12px;font-size:10px;font-weight:700;color:${TEXT3};text-transform:uppercase;letter-spacing:0.5px;text-align:right;border-bottom:1px solid ${BORDER};">Total</th>
    </tr>
    ${itemRows}
    </table>

    <!-- Totals -->
    <table width="100%" style="background:rgba(0,0,0,0.2);border:1px solid ${BORDER};border-radius:10px;padding:16px;">
    <tr><td>
      <table width="100%">
        <tr>
          <td style="padding:4px 0;font-size:13px;color:${TEXT2};">Subtotal</td>
          <td style="padding:4px 0;font-size:13px;color:${TEXT};text-align:right;font-weight:600;">${formatMoney(quote.subtotal, currency)}</td>
        </tr>
        ${(quote.tax || 0) > 0 ? `<tr>
          <td style="padding:4px 0;font-size:13px;color:${TEXT2};">Tax</td>
          <td style="padding:4px 0;font-size:13px;color:${TEXT2};text-align:right;">${formatMoney(quote.tax || 0, currency)}</td>
        </tr>` : ''}
        <tr>
          <td style="padding:10px 0 0;font-size:18px;font-weight:800;color:${TEXT};border-top:1px solid ${BORDER};">Total</td>
          <td style="padding:10px 0 0;font-size:18px;font-weight:800;color:${BRAND_COLOR};text-align:right;border-top:1px solid ${BORDER};">${formatMoney(quote.total, currency)}</td>
        </tr>
      </table>
    </td></tr></table>

    ${quote.notes ? `<p style="margin:20px 0 0;font-size:12px;color:${TEXT3};line-height:1.6;"><strong>Notes:</strong> ${quote.notes}</p>` : ''}

    <!-- Contact -->
    <table width="100%" style="margin-top:24px;">
    <tr><td>
      <p style="margin:0;font-size:12px;color:${TEXT3};">Questions? Contact us:</p>
      ${bizPhone ? `<p style="margin:3px 0 0;font-size:12px;color:${TEXT2};">📞 ${bizPhone}</p>` : ''}
      ${bizEmail ? `<p style="margin:3px 0 0;font-size:12px;color:${TEXT2};">✉️ ${bizEmail}</p>` : ''}
    </td></tr></table>
  `;

  return {
    subject: `Quote #Q-${quote.id} from ${bizName} — ${formatMoney(quote.total, currency)}`,
    html: baseLayout(content, bizName, footer),
  };
}

// ─── Receipt Email ───
export function buildReceiptEmail(
  job: Job,
  bizName: string,
  bizPhone: string,
  bizEmail: string,
  currency: string,
  taxRate: number,
  footer: string
): { subject: string; html: string } {
  const revenue = job.revenue || 0;
  const materials = job.materials || 0;
  const tax = (revenue * taxRate) / 100;
  const total = revenue;

  const content = `
    <h2 style="margin:0 0 6px;font-size:22px;font-weight:800;color:${TEXT};">Service Receipt</h2>
    <p style="margin:0 0 4px;font-size:13px;color:${TEXT3};">Job ${job.num || '#' + job.id} — Completed</p>
    <p style="margin:0 0 24px;font-size:13px;color:${TEXT3};">Date: ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>

    <!-- Client Info -->
    <table width="100%" style="margin-bottom:24px;background:rgba(34,197,94,0.06);border:1px solid rgba(34,197,94,0.15);border-radius:10px;padding:16px;">
    <tr><td>
      <p style="margin:0;font-size:11px;font-weight:700;color:${TEXT3};text-transform:uppercase;letter-spacing:0.5px;">Client</p>
      <p style="margin:6px 0 0;font-size:15px;font-weight:700;color:${TEXT};">${job.client}</p>
      ${job.phone ? `<p style="margin:3px 0 0;font-size:12px;color:${TEXT2};">📞 ${job.phone}</p>` : ''}
      ${job.address ? `<p style="margin:3px 0 0;font-size:12px;color:${TEXT2};">📍 ${job.address}</p>` : ''}
    </td></tr></table>

    <!-- Service Details -->
    ${job.desc ? `
    <table width="100%" style="margin-bottom:20px;">
    <tr><td>
      <p style="margin:0;font-size:11px;font-weight:700;color:${TEXT3};text-transform:uppercase;letter-spacing:0.5px;">Service Description</p>
      <p style="margin:6px 0 0;font-size:13px;color:${TEXT2};line-height:1.6;">${job.desc}</p>
    </td></tr></table>
    ` : ''}

    ${job.tech ? `<p style="margin:0 0 20px;font-size:12px;color:${TEXT2};">👷 Technician: <strong style="color:${TEXT};">${job.tech}</strong></p>` : ''}

    <!-- Totals -->
    <table width="100%" style="background:rgba(0,0,0,0.2);border:1px solid ${BORDER};border-radius:10px;padding:16px;">
    <tr><td>
      <table width="100%">
        <tr>
          <td style="padding:4px 0;font-size:13px;color:${TEXT2};">Service Total</td>
          <td style="padding:4px 0;font-size:13px;color:#22c55e;text-align:right;font-weight:700;">${formatMoney(revenue, currency)}</td>
        </tr>
        ${materials > 0 ? `<tr>
          <td style="padding:4px 0;font-size:13px;color:${TEXT2};">Materials</td>
          <td style="padding:4px 0;font-size:13px;color:${TEXT2};text-align:right;">${formatMoney(materials, currency)}</td>
        </tr>` : ''}
        ${taxRate > 0 ? `<tr>
          <td style="padding:4px 0;font-size:13px;color:${TEXT2};">Tax (${taxRate}%)</td>
          <td style="padding:4px 0;font-size:13px;color:${TEXT2};text-align:right;">${formatMoney(tax, currency)}</td>
        </tr>` : ''}
        <tr>
          <td style="padding:10px 0 0;font-size:18px;font-weight:800;color:${TEXT};border-top:1px solid ${BORDER};">Amount Paid</td>
          <td style="padding:10px 0 0;font-size:18px;font-weight:800;color:${BRAND_COLOR};text-align:right;border-top:1px solid ${BORDER};">${formatMoney(total, currency)}</td>
        </tr>
      </table>
    </td></tr></table>

    <table width="100%" style="margin-top:24px;background:rgba(34,197,94,0.06);border:1px solid rgba(34,197,94,0.15);border-radius:10px;padding:14px;">
    <tr><td align="center">
      <p style="margin:0;font-size:14px;font-weight:700;color:#22c55e;">✅ Payment Received — Thank You!</p>
    </td></tr></table>

    <!-- Contact -->
    <table width="100%" style="margin-top:20px;">
    <tr><td>
      <p style="margin:0;font-size:12px;color:${TEXT3};">Questions? Contact us:</p>
      ${bizPhone ? `<p style="margin:3px 0 0;font-size:12px;color:${TEXT2};">📞 ${bizPhone}</p>` : ''}
      ${bizEmail ? `<p style="margin:3px 0 0;font-size:12px;color:${TEXT2};">✉️ ${bizEmail}</p>` : ''}
    </td></tr></table>
  `;

  return {
    subject: `Receipt from ${bizName} — Job ${job.num || '#' + job.id} — ${formatMoney(total, currency)}`,
    html: baseLayout(content, bizName, footer),
  };
}

// ─── Portal Link Email ───
export function buildPortalEmail(
  docType: string,
  clientName: string,
  portalUrl: string,
  docLabel: string,
  bizName: string,
  bizPhone: string,
  bizEmail: string,
): { subject: string; html: string } {
  const isQuote = docType === 'quote';
  const docWord = isQuote ? 'Quote' : 'Service Receipt';
  const emoji = isQuote ? '📄' : '🧾';

  const content = `
    <div style="text-align:center;padding:20px 0 10px;">
      <span style="font-size:48px;">${emoji}</span>
    </div>

    <h2 style="margin:0 0 8px;font-size:22px;font-weight:800;color:${TEXT};text-align:center;">
      ${isQuote ? 'You have a new quote!' : 'Your service receipt is ready'}
    </h2>
    <p style="margin:0 0 24px;font-size:13px;color:${TEXT3};text-align:center;line-height:1.6;">
      Hi ${clientName}, ${isQuote
        ? `${bizName} has prepared a quote for you (${docLabel}).`
        : `Here is your receipt for the completed service (${docLabel}).`}
      <br>Click the button below to view the details${isQuote ? ', approve, or download as PDF' : ' and download as PDF'}.
    </p>

    <!-- CTA Button -->
    <table width="100%" style="margin:0 0 28px;">
    <tr><td align="center">
      <a href="${portalUrl}" style="
        display:inline-block;
        padding:14px 36px;
        background:linear-gradient(135deg, ${BRAND_COLOR}, #00a882);
        color:#000;
        font-size:14px;
        font-weight:800;
        text-decoration:none;
        border-radius:12px;
        letter-spacing:0.2px;
      ">
        ${isQuote ? '📄 View Quote' : '🧾 View Receipt'} →
      </a>
    </td></tr></table>

    <!-- Fallback link -->
    <p style="margin:0 0 24px;font-size:11px;color:${TEXT3};text-align:center;word-break:break-all;">
      Or copy this link: <a href="${portalUrl}" style="color:${BRAND_COLOR};text-decoration:none;">${portalUrl}</a>
    </p>

    <!-- Info box -->
    <table width="100%" style="background:rgba(255,255,255,0.03);border:1px solid ${BORDER};border-radius:10px;padding:16px;">
    <tr><td>
      <p style="margin:0;font-size:12px;color:${TEXT2};line-height:1.7;">
        ${isQuote ? '💡 You can view the full quote details, download as PDF, and share with your team.' : '💡 You can view the full receipt, download as PDF for your records.'}
      </p>
    </td></tr></table>

    <!-- Contact -->
    <table width="100%" style="margin-top:24px;">
    <tr><td align="center">
      <p style="margin:0;font-size:12px;color:${TEXT3};">Questions? Contact us:</p>
      <p style="margin:4px 0 0;font-size:12px;color:${TEXT2};">
        ${bizPhone ? `📞 ${bizPhone}` : ''} ${bizPhone && bizEmail ? ' · ' : ''} ${bizEmail ? `✉️ ${bizEmail}` : ''}
      </p>
    </td></tr></table>
  `;

  return {
    subject: `${bizName} — Your ${docWord} ${docLabel} is ready`,
    html: baseLayout(content, bizName, 'Thank you for your business!'),
  };
}
