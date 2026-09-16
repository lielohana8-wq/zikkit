// Auto Invoice Generator
export function generateInvoiceHTML(data: {
  bizName: string; bizPhone: string; bizAddress: string; bizLogo?: string;
  client: string; phone: string; email: string; address: string;
  invoiceNum: string; date: string;
  items: { desc: string; qty: number; price: number }[];
  taxRate: number; currency: string;
  notes?: string;
}): string {
  const cur = data.currency === 'ILS' ? '₪' : '$';
  const subtotal = data.items.reduce((s, i) => s + i.qty * i.price, 0);
  const tax = subtotal * (data.taxRate / 100);
  const total = subtotal + tax;

  const rows = data.items.map(i => `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #eee;text-align:right">${i.desc}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #eee;text-align:center">${i.qty}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #eee;text-align:left">${cur}${i.price.toLocaleString()}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #eee;text-align:left;font-weight:700">${cur}${(i.qty * i.price).toLocaleString()}</td>
    </tr>`).join('');

  return `<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8">
<style>
  body{font-family:Rubik,Heebo,Arial,sans-serif;margin:0;padding:40px;color:#1a1a2e;background:#fff}
  .header{display:flex;justify-content:space-between;align-items:center;margin-bottom:40px;padding-bottom:20px;border-bottom:3px solid #00E5FF}
  .biz-name{font-size:24px;font-weight:900;color:#00E5FF}
  .invoice-title{font-size:32px;font-weight:900;color:#1a1a2e;letter-spacing:-1px}
  table{width:100%;border-collapse:collapse;margin:20px 0}
  th{background:#f8f9fc;padding:12px;text-align:right;font-size:12px;text-transform:uppercase;color:#64748b;letter-spacing:0.5px}
  .totals{margin-top:20px;text-align:left}
  .totals td{padding:6px 12px;font-size:14px}
  .grand-total{font-size:24px;font-weight:900;color:#00E5FF}
  .footer{margin-top:40px;padding-top:20px;border-top:1px solid #eee;font-size:11px;color:#94a3b8;text-align:center}
</style></head><body>
  <div class="header">
    <div>
      <div class="biz-name">${data.bizName}</div>
      <div style="font-size:12px;color:#64748b;margin-top:4px">${data.bizPhone} · ${data.bizAddress}</div>
    </div>
    <div style="text-align:left">
      <div class="invoice-title">חשבונית</div>
      <div style="font-size:13px;color:#64748b">#${data.invoiceNum} · ${data.date}</div>
    </div>
  </div>
  <div style="background:#f8f9fc;border-radius:12px;padding:16px;margin-bottom:20px">
    <div style="font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px">עבור</div>
    <div style="font-size:16px;font-weight:700">${data.client}</div>
    <div style="font-size:12px;color:#64748b">${data.phone} · ${data.email}</div>
    <div style="font-size:12px;color:#64748b">${data.address}</div>
  </div>
  <table>
    <tr><th style="text-align:right">פריט</th><th style="text-align:center">כמות</th><th style="text-align:left">מחיר</th><th style="text-align:left">סה״כ</th></tr>
    ${rows}
  </table>
  <table class="totals" style="width:250px;margin-right:0;margin-left:auto">
    <tr><td style="color:#64748b">סכום ביניים</td><td style="font-weight:600">${cur}${subtotal.toLocaleString()}</td></tr>
    ${data.taxRate > 0 ? `<tr><td style="color:#64748b">מע״מ (${data.taxRate}%)</td><td style="font-weight:600">${cur}${tax.toLocaleString()}</td></tr>` : ''}
    <tr><td style="font-weight:700;font-size:16px">סה״כ לתשלום</td><td class="grand-total">${cur}${total.toLocaleString()}</td></tr>
  </table>
  ${data.notes ? `<div style="margin-top:20px;padding:12px;background:#f0fdf4;border-radius:8px;font-size:12px;color:#166534">${data.notes}</div>` : ''}
  <div class="footer">מסמך זה הופק אוטומטית ע״י Zikkit · ${data.bizName}</div>
</body></html>`;
}

export function printInvoice(html: string) {
  const w = window.open('', '_blank');
  if (w) { w.document.write(html); w.document.close(); w.print(); }
}
