'use client';
import { useEffect, useRef, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { getFirestoreDb } from '@/lib/firebase';
import { formatMoney } from '@/lib/region';

/**
 * Customer-facing quote / receipt.
 *
 * Design: a single paper sheet. The total is the one bold thing on the page —
 * a homeowner on their phone should see the price, who it's from, and how to
 * say yes within three seconds. Everything else is set like a ledger: quiet,
 * left-aligned text, right-aligned tabular numbers, hairline rules. The
 * business's own brand colour is the only accent. Prints to a clean PDF.
 */
interface Portal {
  kind: 'quote' | 'receipt';
  biz: { name: string; phone?: string; email?: string; address?: string; logo?: string; color?: string; website?: string; taxNumber?: string; taxLabel?: string; paymentInstructions?: string; footer?: string };
  doc: Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  currency: string; locale?: string; status?: string; acceptedAt?: string; declinedAt?: string; signedName?: string; signature?: string; signedPdfUrl?: string;
}

const METHOD: Record<string, string> = { etransfer: 'Interac e-Transfer', cash: 'Cash', credit: 'Credit card', debit: 'Debit', cheque: 'Cheque', other: 'Other' };

export function PublicDoc({ token, kind }: { token: string; kind: 'quote' | 'receipt' }) {
  const [portal, setPortal] = useState<Portal | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'missing' | 'error'>('loading');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const drawing = useRef(false);
  const hasInk = useRef(false);

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDoc(doc(getFirestoreDb(), 'public_portals', token));
        if (!snap.exists() || snap.data()?.kind !== kind) { setState('missing'); return; }
        setPortal(snap.data() as Portal); setState('ready');
        fetch('/api/docs/viewed', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) }).catch(() => {});
      } catch { setState('error'); }
    })();
  }, [token, kind]);

  // --- signature pad ---------------------------------------------------------
  const pos = (e: React.PointerEvent<HTMLCanvasElement>) => { const r = e.currentTarget.getBoundingClientRect(); return { x: (e.clientX - r.left) * (e.currentTarget.width / r.width), y: (e.clientY - r.top) * (e.currentTarget.height / r.height) }; };
  const down = (e: React.PointerEvent<HTMLCanvasElement>) => { drawing.current = true; e.currentTarget.setPointerCapture(e.pointerId); const ctx = e.currentTarget.getContext('2d')!; const p = pos(e); ctx.lineWidth = 2.6; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#1B1F2A'; ctx.beginPath(); ctx.moveTo(p.x, p.y); };
  const move = (e: React.PointerEvent<HTMLCanvasElement>) => { if (!drawing.current) return; const ctx = e.currentTarget.getContext('2d')!; const p = pos(e); ctx.lineTo(p.x, p.y); ctx.stroke(); hasInk.current = true; };
  const up = () => { drawing.current = false; };
  const clear = () => { const cv = canvasRef.current; if (!cv) return; cv.getContext('2d')!.clearRect(0, 0, cv.width, cv.height); hasInk.current = false; };

  const openForm = () => { setFormOpen(true); setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50); };

  const respond = async (action: 'accept' | 'decline') => {
    if (action === 'accept' && name.trim().length < 2) { setResult({ ok: false, text: 'Type your full name to accept.' }); return; }
    setBusy(true); setResult(null);
    try {
      const signature = action === 'accept' && hasInk.current && canvasRef.current ? canvasRef.current.toDataURL('image/png') : undefined;
      const res = await fetch('/api/docs/accept', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, action, name: name.trim(), signature }) });
      const data = await res.json();
      if (!res.ok || data.error) { setResult({ ok: false, text: data.error || 'Something went wrong. Try again.' }); return; }
      setPortal((p) => (p ? { ...p, status: data.status, signedName: name.trim(), signature, acceptedAt: new Date().toISOString(), signedPdfUrl: data.signedPdfUrl } : p));
      setResult({ ok: true, text: action === 'accept' ? 'Thank you — your acceptance is recorded.' : 'Thanks for letting us know.' });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch { setResult({ ok: false, text: 'No connection. Try again.' }); }
    finally { setBusy(false); }
  };

  if (state === 'loading') return <Page><div className="zd-note">Loading…</div></Page>;
  if (state === 'missing') return <Page><div className="zd-sheet zd-center"><h2>This link isn't valid</h2><p className="zd-muted">It may have been replaced or removed. Contact the business that sent it.</p></div></Page>;
  if (state === 'error' || !portal) return <Page><div className="zd-sheet zd-center"><h2>Couldn't load this document</h2><p className="zd-muted">Refresh the page to try again.</p></div></Page>;

  const d = portal.doc; const cur = portal.currency || 'CAD'; const locale = portal.locale || 'en-CA';
  const color = portal.biz.color || '#4F46E5';
  const money = (n: number) => formatMoney(Number(n) || 0, cur, locale);
  const dateOf = (iso?: string, opts: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' }) => (iso ? new Date(iso).toLocaleDateString(locale, opts) : '');
  const isQuote = kind === 'quote';
  const status = portal.status || d.status;
  const accepted = status === 'accepted' || status === 'approved';
  const declined = status === 'declined';
  const decided = accepted || declined;
  const expired = isQuote && d.validUntil && new Date(d.validUntil).getTime() < Date.now() && !decided;
  const paid = !isQuote && d.status === 'paid';
  const balance = d.balance ?? Math.max(0, (d.total || 0) - (d.amountPaid || 0));
  const heroAmount = isQuote ? d.total : (paid ? d.total : balance);
  const number = d.number || `${isQuote ? 'Q' : 'R'}-${d.id}`;
  const title = isQuote ? 'Quote' : (paid ? 'Receipt' : 'Invoice');
  const showPayHow = portal.biz.paymentInstructions && (!isQuote || accepted);

  return (
    <Page color={color}>
      <div className="zd-sheet">
        <header className="zd-head">
          <div className="zd-biz">
            {portal.biz.logo ? <img className="zd-logo" src={portal.biz.logo} alt="" /> : <div className="zd-logo zd-logo-fallback">{(portal.biz.name || 'B').charAt(0)}</div>}
            <div>
              <div className="zd-bizname">{portal.biz.name}</div>
              <div className="zd-bizmeta">{[portal.biz.phone, portal.biz.email, portal.biz.website].filter(Boolean).map((v, i) => <span key={i}>{v}</span>)}</div>
              {portal.biz.address && <div className="zd-bizmeta"><span>{portal.biz.address}</span></div>}
              {portal.biz.taxNumber && <div className="zd-bizmeta"><span>{portal.biz.taxLabel || 'Tax'} number {portal.biz.taxNumber}</span></div>}
            </div>
          </div>
        </header>

        <section className="zd-title">
          <h1>{title}<span className="zd-num">{number}</span></h1>
          <p className="zd-for">for <strong>{d.client}</strong>{d.address ? <>, {d.address}</> : null}</p>
          <p className="zd-dates">
            {dateOf(d.paidAt || d.created || new Date().toISOString())}
            {isQuote && d.validUntil && <> — {expired ? <span className="zd-warn">expired {dateOf(d.validUntil, { month: 'short', day: 'numeric' })}</span> : <>valid until {dateOf(d.validUntil, { month: 'long', day: 'numeric' })}</>}</>}
            {!isQuote && <> — <span className={paid ? 'zd-ok' : d.status === 'partial' ? 'zd-warn' : 'zd-due'}>{paid ? 'paid in full' : d.status === 'partial' ? 'partially paid' : 'payment due'}</span></>}
          </p>
        </section>

        <section className={`zd-hero ${accepted ? 'is-accepted' : ''} ${declined ? 'is-declined' : ''}`}>
          <div className="zd-hero-row">
            <div>
              <div className="zd-hero-label">{isQuote ? 'Total' : paid ? 'Paid' : 'Balance due'}</div>
              <div className="zd-amount">{money(heroAmount)}</div>
              {d.tax > 0 && <div className="zd-hero-sub">includes {d.taxLabel || portal.biz.taxLabel || 'tax'} {d.taxRate}%</div>}
              {!isQuote && !paid && d.amountPaid > 0 && <div className="zd-hero-sub">{money(d.amountPaid)} already paid of {money(d.total)}</div>}
            </div>
            {paid && <div className="zd-stamp">Paid</div>}
          </div>

          {isQuote && !decided && !expired && !formOpen && (
            <button className="zd-cta no-print" onClick={openForm}>Accept this quote</button>
          )}
          {isQuote && accepted && (
            <div className="zd-decided">
              <span className="zd-check" aria-hidden>✓</span>
              <div>
                <div><strong>Accepted</strong>{portal.signedName ? ` by ${portal.signedName}` : ''}{portal.acceptedAt ? ` on ${dateOf(portal.acceptedAt)}` : ''}</div>
                {portal.signature && <img className="zd-sig" src={portal.signature} alt="Signature" />}
                {portal.signedPdfUrl && <a className="zd-link no-print" href={portal.signedPdfUrl} target="_blank" rel="noreferrer" style={{ display: 'inline-block', marginTop: 8 }}>Download the signed agreement (PDF)</a>}
              </div>
            </div>
          )}
          {isQuote && declined && <div className="zd-decided"><div><strong>Declined.</strong> If you'd like to revisit this, just call us.</div></div>}
          {isQuote && expired && !decided && <div className="zd-decided"><div><strong>This quote has expired.</strong> Call {portal.biz.name}{portal.biz.phone ? ` at ${portal.biz.phone}` : ''} for an updated price.</div></div>}
        </section>

        <table className="zd-items">
          <thead><tr><th>Item</th><th className="zd-r">Qty</th><th className="zd-r">Price</th><th className="zd-r">Amount</th></tr></thead>
          <tbody>
            {(d.items || []).map((it: { id: number; name: string; qty: number; price: number }, i: number) => (
              <tr key={it.id ?? i}><td>{it.name}</td><td className="zd-r">{it.qty}</td><td className="zd-r">{money(it.price)}</td><td className="zd-r zd-strong">{money((it.qty || 0) * (it.price || 0))}</td></tr>
            ))}
          </tbody>
          <tfoot>
            <tr><td colSpan={3}>Subtotal</td><td className="zd-r">{money(d.subtotal)}</td></tr>
            {d.discount > 0 && <tr><td colSpan={3}>Discount</td><td className="zd-r">−{money(d.discount)}</td></tr>}
            {d.tax > 0 && <tr><td colSpan={3}>{d.taxLabel || portal.biz.taxLabel || 'Tax'} {d.taxRate}%</td><td className="zd-r">{money(d.tax)}</td></tr>}
            <tr className="zd-total"><td colSpan={3}>Total</td><td className="zd-r">{money(d.total)}</td></tr>
            {!isQuote && d.amountPaid > 0 && <tr><td colSpan={3}>Paid{d.paymentMethod ? ` by ${METHOD[d.paymentMethod] || d.paymentMethod}` : ''}{d.paidAt ? `, ${dateOf(d.paidAt, { month: 'short', day: 'numeric' })}` : ''}</td><td className="zd-r">−{money(d.amountPaid)}</td></tr>}
            {!isQuote && <tr className="zd-total"><td colSpan={3}>Balance due</td><td className="zd-r">{money(balance)}</td></tr>}
          </tfoot>
        </table>

        {d.notes && <section className="zd-block"><h3>Notes</h3><p>{d.notes}</p></section>}
        {showPayHow && <section className="zd-block zd-pay"><h3>How to pay</h3><p>{portal.biz.paymentInstructions}</p></section>}

        {/* Accept form */}
        {isQuote && !decided && !expired && (
          <section ref={formRef} className={`zd-form no-print ${formOpen ? 'is-open' : ''}`}>
            <h3>Accept quote {number}</h3>
            <label className="zd-field"><span>Your full name</span><input value={name} onChange={(e) => setName(e.target.value)} placeholder="As it should appear on the agreement" autoComplete="name" /></label>
            <div className="zd-field"><span>Signature <em>(optional)</em></span>
              <canvas ref={canvasRef} width={700} height={190} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} />
              <button type="button" className="zd-link" onClick={clear}>Clear signature</button>
            </div>
            <button className="zd-cta" onClick={() => respond('accept')} disabled={busy}>{busy ? 'Sending…' : `Accept — ${money(d.total)}`}</button>
            <button type="button" className="zd-link zd-decline" onClick={() => respond('decline')} disabled={busy}>Decline this quote</button>
            <p className="zd-fine">By accepting you agree to the work and price above. We record your name, the date and your IP address.</p>
            {result && <p className={result.ok ? 'zd-ok' : 'zd-warn'} role="status">{result.text}</p>}
          </section>
        )}
        {result && (decided || expired) && <p className={`zd-note ${result.ok ? 'zd-ok' : 'zd-warn'}`} role="status">{result.text}</p>}

        {portal.biz.footer && <footer className="zd-foot">{portal.biz.footer}</footer>}
      </div>

      <div className="zd-actions no-print">
        <button className="zd-btn" onClick={() => window.print()}>Save as PDF</button>
        {portal.biz.phone && <a className="zd-btn" href={`tel:${portal.biz.phone}`}>Call {portal.biz.name}</a>}
        {portal.biz.email && <a className="zd-btn" href={`mailto:${portal.biz.email}?subject=${encodeURIComponent(`${title} ${number}`)}`}>Email</a>}
      </div>
      <p className="zd-powered no-print">Sent with Zikkit</p>

      {isQuote && !decided && !expired && !formOpen && (
        <div className="zd-sticky no-print"><span className="zd-sticky-amt">{money(d.total)}</span><button className="zd-cta zd-cta-sm" onClick={openForm}>Accept</button></div>
      )}
    </Page>
  );
}

function Page({ children, color = '#4F46E5' }: { children: React.ReactNode; color?: string }) {
  return (
    <div className="zd-page" style={{ ['--brand' as string]: color }}>
      <style>{CSS}</style>
      {children}
    </div>
  );
}

const CSS = `
.zd-page{--ink:#1B1F2A;--muted:#6B7280;--rule:#E5E7EB;--paper:#FFFFFF;--bg:#EEF0F3;--ok:#15803D;--warn:#B45309;--due:#B91C1C;
  min-height:100vh;background:var(--bg);color:var(--ink);font-family:Rubik,"Segoe UI",Arial,sans-serif;font-size:15px;line-height:1.5;
  -webkit-font-smoothing:antialiased;padding:20px 12px 110px}
.zd-page *{box-sizing:border-box}
.zd-sheet{background:var(--paper);max-width:680px;margin:0 auto;padding:30px 28px 26px;border-radius:6px;position:relative;
  box-shadow:0 1px 2px rgba(27,31,42,.06),0 18px 40px -24px rgba(27,31,42,.25)}
.zd-sheet::before{content:"";position:absolute;left:0;top:0;bottom:0;width:6px;background:var(--brand);border-radius:6px 0 0 6px}
.zd-center{text-align:center;padding:48px 28px}
.zd-center h2{font-size:20px;margin:0 0 8px}
.zd-muted{color:var(--muted)}
.zd-note{max-width:680px;margin:14px auto;text-align:center;color:var(--muted)}

.zd-head{display:flex;justify-content:space-between;gap:16px;padding-bottom:22px;border-bottom:1px solid var(--rule)}
.zd-biz{display:flex;gap:14px;align-items:flex-start}
.zd-logo{width:52px;height:52px;border-radius:10px;object-fit:cover;flex:none}
.zd-logo-fallback{display:flex;align-items:center;justify-content:center;background:var(--brand);color:#fff;font-weight:700;font-size:22px}
.zd-bizname{font-weight:700;font-size:17px;letter-spacing:-.01em}
.zd-bizmeta{font-size:13px;color:var(--muted);display:flex;flex-wrap:wrap;gap:0 14px}

.zd-title{padding:24px 0 6px}
.zd-title h1{font-size:34px;font-weight:700;letter-spacing:-.02em;margin:0;line-height:1.1;display:flex;align-items:baseline;gap:12px;flex-wrap:wrap}
.zd-num{font-size:15px;font-weight:500;color:var(--muted);letter-spacing:0}
.zd-for{margin:8px 0 0;font-size:16px}
.zd-dates{margin:2px 0 0;font-size:14px;color:var(--muted)}
.zd-ok{color:var(--ok);font-weight:600}.zd-warn{color:var(--warn);font-weight:600}.zd-due{color:var(--due);font-weight:600}

.zd-hero{margin:22px 0 26px;padding:22px 22px 20px;border:1.5px solid var(--brand);border-radius:12px;background:color-mix(in srgb,var(--brand) 6%,#fff)}
.zd-hero.is-accepted{border-color:var(--ok);background:#F0FDF4}
.zd-hero.is-declined{border-color:var(--rule);background:#F9FAFB}
.zd-hero-row{display:flex;justify-content:space-between;align-items:flex-start;gap:16px}
.zd-hero-label{font-size:14px;color:var(--muted)}
.zd-amount{font-size:44px;font-weight:700;letter-spacing:-.03em;line-height:1.05;font-variant-numeric:tabular-nums;margin-top:2px}
.zd-hero-sub{font-size:13px;color:var(--muted);margin-top:6px}
.zd-stamp{align-self:center;border:2.5px solid var(--ok);color:var(--ok);border-radius:8px;padding:6px 14px;font-weight:700;font-size:18px;letter-spacing:.06em;text-transform:uppercase;transform:rotate(-8deg);opacity:.9}
.zd-cta{display:block;width:100%;margin-top:18px;padding:15px 20px;border:0;border-radius:10px;background:var(--brand);color:#fff;font:inherit;font-weight:700;font-size:16px;cursor:pointer;transition:transform .08s ease,filter .15s}
.zd-cta:hover{filter:brightness(1.06)}.zd-cta:active{transform:scale(.99)}.zd-cta:disabled{opacity:.6;cursor:default}
.zd-cta:focus-visible,.zd-btn:focus-visible,.zd-link:focus-visible,.zd-field input:focus-visible{outline:3px solid color-mix(in srgb,var(--brand) 45%,#fff);outline-offset:2px}
.zd-decided{display:flex;gap:12px;align-items:flex-start;margin-top:14px;font-size:15px}
.zd-check{flex:none;width:28px;height:28px;border-radius:50%;background:var(--ok);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;animation:zd-pop .35s cubic-bezier(.2,1.4,.4,1) both}
@keyframes zd-pop{from{transform:scale(.4);opacity:0}to{transform:scale(1);opacity:1}}
.zd-sig{display:block;max-width:240px;margin-top:8px;border-bottom:1px solid var(--rule)}

.zd-items{width:100%;border-collapse:collapse;font-size:15px}
.zd-items th{font-weight:500;color:var(--muted);text-align:left;font-size:13px;padding:0 0 8px;border-bottom:1px solid var(--ink)}
.zd-items td{padding:11px 0;border-bottom:1px solid var(--rule);vertical-align:top}
.zd-items tbody td:first-child{padding-right:12px}
.zd-items tfoot td{border-bottom:0;padding:6px 0;color:var(--muted)}
.zd-items tfoot tr:first-child td{padding-top:14px}
.zd-items tfoot .zd-total td{color:var(--ink);font-weight:700;font-size:16px;padding-top:10px;border-top:1px solid var(--ink)}
.zd-r{text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums;padding-left:14px!important}
.zd-strong{font-weight:600}

.zd-block{margin-top:26px;font-size:14px}
.zd-block h3{font-size:13px;font-weight:600;color:var(--muted);margin:0 0 4px}
.zd-block p{margin:0;white-space:pre-wrap}
.zd-pay{padding:14px 16px;border-radius:10px;background:#F9FAFB;border:1px solid var(--rule)}

.zd-form{margin-top:28px;padding-top:22px;border-top:1px solid var(--rule);display:none}
.zd-form.is-open{display:block;animation:zd-in .25s ease-out}
@keyframes zd-in{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
.zd-form h3{font-size:18px;font-weight:700;margin:0 0 14px;letter-spacing:-.01em}
.zd-field{display:block;margin-bottom:14px;font-size:13px;color:var(--muted)}
.zd-field span{display:block;margin-bottom:6px}.zd-field em{font-style:normal;color:#9CA3AF}
.zd-field input{width:100%;padding:13px 14px;border:1px solid #D1D5DB;border-radius:10px;font:inherit;font-size:16px;color:var(--ink);background:#fff}
.zd-field canvas{display:block;width:100%;height:140px;border:1px dashed #C4C8D0;border-radius:10px;background:#fff;touch-action:none}
.zd-link{background:none;border:0;padding:6px 0;color:var(--muted);font:inherit;font-size:13px;cursor:pointer;text-decoration:underline;text-underline-offset:3px}
.zd-decline{display:block;margin:10px auto 0;color:var(--due)}
.zd-fine{font-size:12px;color:#9CA3AF;margin:14px 0 0}
.zd-foot{margin-top:28px;padding-top:14px;border-top:1px solid var(--rule);font-size:12.5px;color:var(--muted);white-space:pre-wrap}

.zd-actions{max-width:680px;margin:14px auto 0;display:flex;gap:8px;flex-wrap:wrap;justify-content:center}
.zd-btn{padding:10px 16px;border:1px solid #D1D5DB;border-radius:10px;background:#fff;color:var(--ink);font:inherit;font-size:14px;font-weight:600;text-decoration:none;cursor:pointer}
.zd-powered{text-align:center;font-size:11px;color:#9CA3AF;margin:16px 0 0}

.zd-sticky{position:fixed;left:0;right:0;bottom:0;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 16px calc(12px + env(safe-area-inset-bottom));
  background:rgba(255,255,255,.92);backdrop-filter:blur(10px);border-top:1px solid var(--rule)}
.zd-sticky-amt{font-weight:700;font-size:18px;font-variant-numeric:tabular-nums}
.zd-cta-sm{width:auto;margin:0;padding:12px 22px;font-size:15px}
@media (min-width:700px){.zd-sticky{display:none}.zd-page{padding-bottom:40px}}
@media (max-width:480px){.zd-sheet{padding:24px 18px 22px}.zd-amount{font-size:38px}.zd-title h1{font-size:30px}.zd-items th:nth-child(3),.zd-items td:nth-child(3){display:none}}
@media (prefers-reduced-motion:reduce){.zd-check,.zd-form.is-open{animation:none}.zd-cta{transition:none}}
@media print{.no-print{display:none!important}.zd-page{background:#fff;padding:0}.zd-sheet{box-shadow:none;max-width:none;border-radius:0;padding:0 0 0 14px}.zd-sheet::before{width:4px;border-radius:0}.zd-hero{break-inside:avoid}}
`;
