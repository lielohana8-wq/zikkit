export function quoteEmailHtml(quote: any, bizName: string, portalUrl?: string): string {
  const items = (quote.items || []).map((item: any) =>
    `<tr><td style="padding:8px 12px;border-bottom:1px solid #f0ede8">${item.name}</td>
    <td style="padding:8px 12px;border-bottom:1px solid #f0ede8;text-align:center">${item.qty || 1}</td>
    <td style="padding:8px 12px;border-bottom:1px solid #f0ede8;text-align:left">${item.price?.toLocaleString() || 0}</td></tr>`
  ).join('');
  
  const total = (quote.items || []).reduce((s: number, i: any) => s + (i.price || 0) * (i.qty || 1), 0);

  return `<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8"></head><body style="font-family:system-ui,sans-serif;background:#f5f0eb;padding:24px;color:#1C1917">
<div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.06)">
  <div style="background:#4F46E5;padding:20px 24px;color:#fff">
    <div style="font-size:20px;font-weight:800">${bizName}</div>
    <div style="font-size:13px;opacity:0.8">הצעת מחיר #${quote.num || quote.id}</div>
  </div>
  <div style="padding:24px">
    <p style="font-size:15px;margin-bottom:16px">שלום ${quote.client},</p>
    <p style="font-size:14px;color:#78716C;margin-bottom:20px">מצורפת הצעת מחיר מ-${bizName}.</p>
    <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:16px">
      <thead><tr style="background:#f5f0eb">
        <th style="padding:8px 12px;text-align:right;font-weight:600">פריט</th>
        <th style="padding:8px 12px;text-align:center;font-weight:600">כמות</th>
        <th style="padding:8px 12px;text-align:left;font-weight:600">מחיר</th>
      </tr></thead><tbody>${items}</tbody>
      <tfoot><tr style="background:#f5f0eb;font-weight:700">
        <td style="padding:10px 12px" colspan="2">סה״כ</td>
        <td style="padding:10px 12px;text-align:left">${total.toLocaleString()}</td>
      </tr></tfoot>
    </table>
    ${portalUrl ? `<a href="${portalUrl}" style="display:inline-block;background:#4F46E5;color:#fff;padding:12px 28px;border-radius:24px;text-decoration:none;font-weight:700;font-size:14px">אשר הצעת מחיר</a>` : ''}
    <p style="font-size:12px;color:#A8A29E;margin-top:20px">הצעה זו תקפה ל-30 יום.</p>
  </div>
</div></body></html>`;
}

export function receiptEmailHtml(job: any, bizName: string): string {
  return `<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8"></head><body style="font-family:system-ui,sans-serif;background:#f5f0eb;padding:24px;color:#1C1917">
<div style="max-width:500px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.06)">
  <div style="background:#059669;padding:20px 24px;color:#fff">
    <div style="font-size:20px;font-weight:800">${bizName}</div>
    <div style="font-size:13px;opacity:0.8">קבלה — עבודה #${job.num || job.id}</div>
  </div>
  <div style="padding:24px">
    <p style="font-size:15px;margin-bottom:16px">שלום ${job.client},</p>
    <p style="font-size:14px;color:#78716C;margin-bottom:16px">תודה! העבודה הושלמה בהצלחה.</p>
    <div style="background:#f5f0eb;border-radius:8px;padding:16px;font-size:13px;margin-bottom:16px">
      <div style="display:flex;justify-content:space-between;margin-bottom:4px"><span>סכום</span><strong>${(job.revenue || 0).toLocaleString()}</strong></div>
      ${job.materials ? `<div style="display:flex;justify-content:space-between;margin-bottom:4px"><span>חומרים</span><span>${(job.materials || 0).toLocaleString()}</span></div>` : ''}
      ${job.paymentMethod ? `<div style="display:flex;justify-content:space-between"><span>תשלום</span><span>${({'cash':'מזומן','credit_card':'אשראי','check':'צ׳ק','bank_transfer':'העברה','bit':'ביט','invoice':'חשבונית'}[job.paymentMethod as string]) || job.paymentMethod}</span></div>` : ''}
    </div>
    <p style="font-size:12px;color:#A8A29E">תודה שבחרת ב-${bizName}!</p>
  </div>
</div></body></html>`;
}
