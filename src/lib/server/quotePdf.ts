import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage, type RGB } from 'pdf-lib';

/**
 * Signed-agreement PDF for an accepted quote (US Letter). Pure JS (pdf-lib) so it
 * runs anywhere Node runs — Vercel functions included — with no font files.
 */
export interface QuotePdfInput {
  biz: { name: string; phone?: string; email?: string; address?: string; website?: string; taxNumber?: string; taxLabel?: string; color?: string; paymentInstructions?: string; footer?: string; logo?: string };
  doc: Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  currency: string;
  acceptance: { name: string; at: string; ip?: string; signature?: string };
}

const PAGE = { w: 612, h: 792, m: 48 };
const money = (n: number, cur: string) => `${cur === 'CAD' || cur === 'USD' ? '$' : cur + ' '}${(Number(n) || 0).toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const clean = (s: unknown) => String(s ?? '').replace(/[\u2013\u2014]/g, '-').replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"').replace(/\u2026/g, '...').replace(/[^\x20-\x7E\u00A0-\u00FF\n]/g, ''); // WinAnsi-safe (standard fonts)

function hexToRgb(hex?: string): RGB {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || ''); if (!m) return rgb(0.31, 0.27, 0.9);
  const n = parseInt(m[1], 16); return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

function wrap(text: string, font: PDFFont, size: number, maxW: number): string[] {
  const out: string[] = [];
  for (const para of clean(text).split(/\r?\n/)) {
    const words = para.split(/\s+/).filter(Boolean); let line = '';
    for (const w of words) {
      const t = line ? line + ' ' + w : w;
      if (font.widthOfTextAtSize(t, size) <= maxW) line = t; else { if (line) out.push(line); line = w; }
    }
    out.push(line);
  }
  return out;
}

export async function buildQuotePdf(input: QuotePdfInput): Promise<Uint8Array> {
  const { biz, doc: d, currency: cur, acceptance } = input;
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const brand = hexToRgb(biz.color); const ink = rgb(0.11, 0.12, 0.16); const muted = rgb(0.42, 0.45, 0.5); const rule = rgb(0.9, 0.91, 0.92);
  const number = clean(d.number || `Q-${d.id}`);
  const dateStr = (iso?: string) => (iso ? new Date(iso).toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' }) : '');

  let page = pdf.addPage([PAGE.w, PAGE.h]); let y = PAGE.h - PAGE.m;
  const x0 = PAGE.m, x1 = PAGE.w - PAGE.m, W = x1 - x0;
  const text = (s: string, x: number, size = 10, f: PDFFont = font, color: RGB = ink) => page.drawText(clean(s), { x, y, size, font: f, color });
  const textR = (s: string, right: number, size = 10, f: PDFFont = font, color: RGB = ink) => page.drawText(clean(s), { x: right - f.widthOfTextAtSize(clean(s), size), y, size, font: f, color });
  const line = (yy: number, color: RGB = rule, thick = 0.8) => page.drawLine({ start: { x: x0, y: yy }, end: { x: x1, y: yy }, thickness: thick, color });
  const ensure = (need: number) => { if (y - need < PAGE.m + 30) { page = pdf.addPage([PAGE.w, PAGE.h]); y = PAGE.h - PAGE.m; } };
  const para = (s: string, size = 10, f: PDFFont = font, color: RGB = ink, maxW = W, x = x0) => { for (const l of wrap(s, f, size, maxW)) { ensure(size + 4); page.drawText(l, { x, y, size, font: f, color }); y -= size + 4; } };

  // brand rail
  page.drawRectangle({ x: 0, y: 0, width: 6, height: PAGE.h, color: brand });

  // logo
  let logoW = 0;
  if (biz.logo) {
    try {
      const res = await fetch(biz.logo); const buf = new Uint8Array(await res.arrayBuffer()); const type = res.headers.get('content-type') || '';
      const img = type.includes('png') || biz.logo.startsWith('data:image/png') ? await pdf.embedPng(buf) : await pdf.embedJpg(buf);
      const s = Math.min(44 / img.width, 44 / img.height); page.drawImage(img, { x: x0, y: y - 44, width: img.width * s, height: img.height * s }); logoW = img.width * s + 12;
    } catch { logoW = 0; }
  }
  // header
  const hx = x0 + logoW; const topY = y;
  page.drawText(clean(biz.name), { x: hx, y: y - 12, size: 15, font: bold, color: ink });
  let hy = y - 26;
  for (const l of [[biz.phone, biz.email, biz.website].filter(Boolean).join('   '), biz.address, biz.taxNumber ? `${biz.taxLabel || 'Tax'} number ${biz.taxNumber}` : ''].filter(Boolean)) { page.drawText(clean(l as string), { x: hx, y: hy, size: 8.5, font, color: muted }); hy -= 11; }
  // title block (right)
  y = topY - 6; textR('QUOTE', x1, 20, bold, brand);
  y = topY - 24; textR(number, x1, 11, bold, ink);
  y = topY - 37; textR(dateStr(d.created), x1, 9, font, muted);
  if (d.validUntil) { y = topY - 49; textR(`Valid until ${dateStr(d.validUntil)}`, x1, 9, font, muted); }
  y = Math.min(hy, topY - 60) - 8; line(y); y -= 22;

  // customer
  text('Prepared for', x0, 8.5, font, muted); y -= 14;
  text(d.client || '', x0, 12, bold); y -= 15;
  const meta = [d.phone, d.email].filter(Boolean).join('   '); if (meta) { text(meta, x0, 9.5, font, muted); y -= 13; }
  if (d.address) { text(d.address, x0, 9.5, font, muted); y -= 13; }
  y -= 10;

  // items
  const cols = { qty: x1 - 210, price: x1 - 120, amt: x1 };
  text('Item', x0, 8.5, font, muted); textR('Qty', cols.qty, 8.5, font, muted); textR('Price', cols.price, 8.5, font, muted); textR('Amount', cols.amt, 8.5, font, muted);
  y -= 6; line(y, ink, 0.8); y -= 14;
  for (const it of (d.items || []) as Array<{ name: string; qty: number; price: number }>) {
    const lines = wrap(it.name || '', font, 10, cols.qty - x0 - 70);
    ensure(lines.length * 13 + 8);
    const rowTop = y;
    for (const l of lines) { page.drawText(l, { x: x0, y, size: 10, font, color: ink }); y -= 13; }
    y = rowTop; textR(String(it.qty), cols.qty, 10); textR(money(it.price, cur), cols.price, 10); textR(money((it.qty || 0) * (it.price || 0), cur), cols.amt, 10, bold);
    y = rowTop - lines.length * 13 - 2; line(y); y -= 12;
  }
  // totals
  const trow = (label: string, val: string, strong = false) => { ensure(16); textR(label, cols.price, strong ? 11 : 10, strong ? bold : font, strong ? ink : muted); textR(val, cols.amt, strong ? 11 : 10, strong ? bold : font, ink); y -= strong ? 18 : 15; };
  y -= 2; trow('Subtotal', money(d.subtotal, cur));
  if (d.discount > 0) trow('Discount', '-' + money(d.discount, cur));
  if (d.tax > 0) trow(`${d.taxLabel || biz.taxLabel || 'Tax'} ${d.taxRate}%`, money(d.tax, cur));
  line(y + 13, ink, 0.8); y -= 3; trow('Total', money(d.total, cur), true);
  y -= 8;

  if (d.notes) { ensure(40); text('Notes', x0, 8.5, font, muted); y -= 14; para(d.notes, 10); y -= 6; }
  if (biz.paymentInstructions) { ensure(40); text('How to pay', x0, 8.5, font, muted); y -= 14; para(biz.paymentInstructions, 10); y -= 6; }

  // acceptance
  ensure(150); y -= 6;
  const boxTop = y; const boxH = acceptance.signature ? 138 : 76;
  page.drawRectangle({ x: x0, y: boxTop - boxH, width: W, height: boxH, borderColor: rgb(0.08, 0.5, 0.24), borderWidth: 1.2, color: rgb(0.94, 0.99, 0.96) });
  y = boxTop - 20; text('Accepted', x0 + 14, 13, bold, rgb(0.08, 0.5, 0.24));
  y -= 17; text(`By ${acceptance.name} on ${dateStr(acceptance.at)} at ${new Date(acceptance.at).toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit' })}${acceptance.ip ? `   -   IP ${acceptance.ip}` : ''}`, x0 + 14, 9.5, font, ink);
  y -= 14; text('The customer agreed to the work and price described above.', x0 + 14, 9, font, muted);
  if (acceptance.signature) {
    try {
      const b64 = acceptance.signature.split(',')[1] || ''; const bytes = Uint8Array.from(Buffer.from(b64, 'base64'));
      const img = acceptance.signature.startsWith('data:image/png') ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes);
      const s = Math.min(220 / img.width, 56 / img.height);
      page.drawImage(img, { x: x0 + 14, y: boxTop - boxH + 14, width: img.width * s, height: img.height * s });
      page.drawLine({ start: { x: x0 + 14, y: boxTop - boxH + 12 }, end: { x: x0 + 14 + 220, y: boxTop - boxH + 12 }, thickness: 0.6, color: muted });
      page.drawText('Signature', { x: x0 + 14, y: boxTop - boxH + 3, size: 7.5, font, color: muted });
    } catch { /* skip signature */ }
  }
  y = boxTop - boxH - 18;

  if (biz.footer) { ensure(30); line(y + 6); y -= 8; para(biz.footer, 8.5, font, muted); }
  // page footer
  const pages = pdf.getPages();
  pages.forEach((p: PDFPage, i: number) => p.drawText(`${number}  -  ${clean(biz.name)}  -  page ${i + 1} of ${pages.length}`, { x: x0, y: 24, size: 7.5, font, color: muted }));
  return pdf.save();
}
