'use client';
import { useEffect, useRef, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { getFirestoreDb } from '@/lib/firebase';
import { formatMoney } from '@/lib/region';

/**
 * Public, print-friendly quote / receipt page.
 * Data comes from public_portals/{token} (world-readable snapshot).
 * No MUI on purpose: loads fast on a customer's phone and prints cleanly to PDF.
 */
interface Portal {
  kind: 'quote' | 'receipt';
  biz: { name: string; phone?: string; email?: string; address?: string; logo?: string; color?: string; website?: string; taxNumber?: string; taxLabel?: string; paymentInstructions?: string; footer?: string };
  doc: Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  currency: string; locale?: string; status?: string; acceptedAt?: string; declinedAt?: string; signedName?: string; signature?: string;
}

export function PublicDoc({ token, kind }: { token: string; kind: 'quote' | 'receipt' }) {
  const [portal, setPortal] = useState<Portal | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'missing' | 'error'>('loading');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
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

  // --- signature pad -----------------------------------------------------------
  const pos = (e: React.PointerEvent<HTMLCanvasElement>) => { const r = e.currentTarget.getBoundingClientRect(); return { x: (e.clientX - r.left) * (e.currentTarget.width / r.width), y: (e.clientY - r.top) * (e.currentTarget.height / r.height) }; };
  const down = (e: React.PointerEvent<HTMLCanvasElement>) => { drawing.current = true; const ctx = e.currentTarget.getContext('2d')!; const p = pos(e); ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.strokeStyle = '#111'; ctx.beginPath(); ctx.moveTo(p.x, p.y); };
  const move = (e: React.PointerEvent<HTMLCanvasElement>) => { if (!drawing.current) return; const ctx = e.currentTarget.getContext('2d')!; const p = pos(e); ctx.lineTo(p.x, p.y); ctx.stroke(); hasInk.current = true; };
  const up = () => { drawing.current = false; };
  const clear = () => { const cv = canvasRef.current; if (!cv) return; cv.getContext('2d')!.clearRect(0, 0, cv.width, cv.height); hasInk.current = false; };

  const respond = async (action: 'accept' | 'decline') => {
    if (action === 'accept' && name.trim().length < 2) { setResult('Please type your full name to accept.'); return; }
    setBusy(true); setResult(null);
    try {
      const signature = action === 'accept' && hasInk.current && canvasRef.current ? canvasRef.current.toDataURL('image/png') : undefined;
      const res = await fetch('/api/docs/accept', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, action, name: name.trim(), signature }) });
      const data = await res.json();
      if (!res.ok || data.error) { setResult(data.error || 'Something went wrong. Please try again.'); return; }
      setPortal((p) => (p ? { ...p, status: data.status, signedName: name.trim(), acceptedAt: new Date().toISOString() } : p));
      setResult(action === 'accept' ? 'Thank you! Your acceptance has been recorded.' : 'Thanks for letting us know.');
    } catch { setResult('Network error. Please try again.'); }
    finally { setBusy(false); }
  };

  if (state === 'loading') return <Shell><p style={{ color: '#666' }}>Loading…</p></Shell>;
  if (state === 'missing') return <Shell><h2>Link not found</h2><p style={{ color: '#666' }}>This {kind} link is invalid or has been removed. Please contact the business that sent it.</p></Shell>;
  if (state === 'error' || !portal) return <Shell><h2>Something went wrong</h2><p style={{ color: '#666' }}>Please refresh the page.</p></Shell>;

  const d = portal.doc; const cur = portal.currency || 'CAD'; const color = portal.biz.color || '#4F46E5';
  const money = (n: number) => formatMoney(Number(n) || 0, cur, portal.locale || 'en-CA');
  const isQuote = kind === 'quote';
  const status = portal.status || d.status;
  const decided = status === 'accepted' || status === 'approved' || status === 'declined';
  const expired = isQuote && d.validUntil && new Date(d.validUntil).getTime() < Date.now() && !decided;
  const title = isQuote ? 'QUOTE' : (d.status === 'paid' ? 'RECEIPT' : 'INVOICE / RECEIPT');

  return (
    <Shell>
      <style>{`@media print { .no-print { display: none !important } body { background: #fff } .sheet { box-shadow: none !important; margin: 0 !important } }`}</style>
      <div className="sheet" style={{ background: '#fff', borderRadius: 14, boxShadow: '0 8px 30px rgba(0,0,0,0.08)', padding: '28px 26px', maxWidth: 720, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            {portal.biz.logo ? <img src={portal.biz.logo} alt="" style={{ width: 56, height: 56, borderRadius: 12, objectFit: 'cover' }} /> : <div style={{ width: 56, height: 56, borderRadius: 12, background: color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 24 }}>{(portal.biz.name || 'B').charAt(0)}</div>}
            <div>
              <div style={{ fontWeight: 900, fontSize: 18 }}>{portal.biz.name}</div>
              <div style={{ fontSize: 12, color: '#666' }}>{[portal.biz.phone, portal.biz.email, portal.biz.website].filter(Boolean).join(' · ')}</div>
              {portal.biz.address && <div style={{ fontSize: 12, color: '#666' }}>{portal.biz.address}</div>}
              {portal.biz.taxNumber && <div style={{ fontSize: 12, color: '#666' }}>{portal.biz.taxLabel || 'Tax'} #: {portal.biz.taxNumber}</div>}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontWeight: 900, fontSize: 22, letterSpacing: 1, color }}>{title}</div>
            <div style={{ fontWeight: 700 }}>{d.number || `${isQuote ? 'Q' : 'R'}-${d.id}`}</div>
            <div style={{ fontSize: 12, color: '#666' }}>{new Date(d.paidAt || d.created || Date.now()).toLocaleDateString(portal.locale || 'en-CA', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
            {isQuote && d.validUntil && <div style={{ fontSize: 12, color: expired ? '#DC2626' : '#666' }}>Valid until {new Date(d.validUntil).toLocaleDateString(portal.locale || 'en-CA', { year: 'numeric', month: 'short', day: 'numeric' })}</div>}
            {!isQuote && <div style={{ display: 'inline-block', marginTop: 6, padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 800, background: d.status === 'paid' ? 'rgba(16,185,129,0.15)' : 'rgba(217,119,6,0.15)', color: d.status === 'paid' ? '#059669' : '#B45309' }}>{d.status === 'paid' ? 'PAID' : d.status === 'partial' ? 'PARTIALLY PAID' : 'UNPAID'}</div>}
          </div>
        </div>

        <div style={{ marginTop: 22, padding: '12px 14px', background: '#FAF8F4', borderRadius: 10 }}>
          <div style={{ fontSize: 11, color: '#888', fontWeight: 700, letterSpacing: 0.5 }}>{isQuote ? 'PREPARED FOR' : 'BILLED TO'}</div>
          <div style={{ fontWeight: 800, fontSize: 15 }}>{d.client}</div>
          <div style={{ fontSize: 12, color: '#666' }}>{[d.phone, d.email].filter(Boolean).join(' · ')}</div>
          {d.address && <div style={{ fontSize: 12, color: '#666' }}>{d.address}</div>}
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 22, fontSize: 14 }}>
          <thead><tr style={{ borderBottom: '2px solid #eee', textAlign: 'left', fontSize: 11, color: '#888' }}><th style={{ padding: '6px 0' }}>DESCRIPTION</th><th style={{ textAlign: 'right' }}>QTY</th><th style={{ textAlign: 'right' }}>PRICE</th><th style={{ textAlign: 'right' }}>AMOUNT</th></tr></thead>
          <tbody>
            {(d.items || []).map((it: { id: number; name: string; qty: number; price: number }, i: number) => (
              <tr key={it.id ?? i} style={{ borderBottom: '1px solid #f0f0f0' }}><td style={{ padding: '9px 0' }}>{it.name}</td><td style={{ textAlign: 'right' }}>{it.qty}</td><td style={{ textAlign: 'right' }}>{money(it.price)}</td><td style={{ textAlign: 'right', fontWeight: 600 }}>{money((it.qty || 0) * (it.price || 0))}</td></tr>
            ))}
          </tbody>
        </table>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
          <div style={{ minWidth: 260, fontSize: 14 }}>
            <Row l="Subtotal" r={money(d.subtotal)} />
            {d.discount > 0 && <Row l="Discount" r={'-' + money(d.discount)} />}
            {d.tax > 0 && <Row l={`${d.taxLabel || portal.biz.taxLabel || 'Tax'} (${d.taxRate}%)`} r={money(d.tax)} />}
            <Row l="Total" r={money(d.total)} bold />
            {!isQuote && d.amountPaid > 0 && <Row l="Paid" r={'-' + money(d.amountPaid)} />}
            {!isQuote && <Row l="Balance due" r={money(d.balance ?? Math.max(0, (d.total || 0) - (d.amountPaid || 0)))} bold />}
          </div>
        </div>

        {d.notes && <div style={{ marginTop: 18, fontSize: 13, whiteSpace: 'pre-wrap', color: '#333' }}><b>Notes</b><br />{d.notes}</div>}
        {portal.biz.paymentInstructions && (!isQuote || status === 'accepted' || status === 'approved') && <div style={{ marginTop: 14, fontSize: 13, whiteSpace: 'pre-wrap', color: '#333', background: '#F5F1EB', padding: 12, borderRadius: 10 }}><b>How to pay</b><br />{portal.biz.paymentInstructions}</div>}
        {!isQuote && d.paymentMethod && <div style={{ marginTop: 10, fontSize: 12, color: '#666' }}>Payment method: {({ etransfer: 'e-Transfer', cash: 'Cash', credit: 'Credit card', debit: 'Debit', cheque: 'Cheque', other: 'Other' } as Record<string, string>)[d.paymentMethod] || d.paymentMethod}</div>}
        {portal.biz.footer && <div style={{ marginTop: 18, fontSize: 12, color: '#777', whiteSpace: 'pre-wrap', borderTop: '1px solid #eee', paddingTop: 12 }}>{portal.biz.footer}</div>}

        {/* Quote actions */}
        {isQuote && (
          <div style={{ marginTop: 26, borderTop: '2px solid #eee', paddingTop: 18 }}>
            {decided ? (
              <div style={{ padding: 14, borderRadius: 10, background: status === 'declined' ? 'rgba(239,68,68,0.08)' : 'rgba(16,185,129,0.10)', fontWeight: 700 }}>
                {status === 'declined' ? 'This quote was declined.' : `Accepted${portal.signedName ? ` by ${portal.signedName}` : ''}${portal.acceptedAt ? ` on ${new Date(portal.acceptedAt).toLocaleDateString(portal.locale || 'en-CA')}` : ''}.`}
                {portal.signature && <div><img src={portal.signature} alt="Signature" style={{ maxWidth: 260, marginTop: 8, borderBottom: '1px solid #ccc' }} /></div>}
              </div>
            ) : expired ? (
              <div style={{ padding: 14, borderRadius: 10, background: 'rgba(217,119,6,0.10)', fontWeight: 700 }}>This quote has expired. Please contact {portal.biz.name}{portal.biz.phone ? ` at ${portal.biz.phone}` : ''} for an updated price.</div>
            ) : (
              <div className="no-print">
                <div style={{ fontWeight: 800, marginBottom: 8 }}>Accept this quote</div>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Type your full name" style={{ width: '100%', padding: '11px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 15, boxSizing: 'border-box' }} />
                <div style={{ fontSize: 12, color: '#777', margin: '10px 0 4px' }}>Sign below (optional)</div>
                <canvas ref={canvasRef} width={600} height={160} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerLeave={up} style={{ width: '100%', height: 130, border: '1px dashed #bbb', borderRadius: 8, touchAction: 'none', background: '#fff' }} />
                <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                  <button onClick={() => respond('accept')} disabled={busy} style={{ flex: 1, minWidth: 160, padding: '13px 18px', border: 0, borderRadius: 10, background: color, color: '#fff', fontWeight: 800, fontSize: 15, cursor: 'pointer' }}>{busy ? 'Sending…' : `Accept ${money(d.total)}`}</button>
                  <button onClick={clear} type="button" style={{ padding: '13px 14px', border: '1px solid #ddd', borderRadius: 10, background: '#fff', cursor: 'pointer' }}>Clear signature</button>
                  <button onClick={() => respond('decline')} disabled={busy} type="button" style={{ padding: '13px 14px', border: '1px solid #ddd', borderRadius: 10, background: '#fff', color: '#DC2626', cursor: 'pointer' }}>Decline</button>
                </div>
                <div style={{ fontSize: 11, color: '#888', marginTop: 8 }}>By accepting you agree to the scope and price above. Your name, the date and your IP address are recorded.</div>
              </div>
            )}
            {result && <div style={{ marginTop: 10, fontWeight: 600, color: result.startsWith('Thank') ? '#059669' : '#DC2626' }}>{result}</div>}
          </div>
        )}
      </div>
      <div className="no-print" style={{ textAlign: 'center', marginTop: 14 }}>
        <button onClick={() => window.print()} style={{ padding: '10px 16px', border: '1px solid #ddd', borderRadius: 10, background: '#fff', cursor: 'pointer', fontWeight: 600 }}>Download PDF / Print</button>
        {portal.biz.phone && <a href={`tel:${portal.biz.phone}`} style={{ marginLeft: 10, padding: '10px 16px', border: '1px solid #ddd', borderRadius: 10, background: '#fff', textDecoration: 'none', color: '#111', fontWeight: 600, display: 'inline-block' }}>Call {portal.biz.name}</a>}
      </div>
      <div style={{ textAlign: 'center', fontSize: 11, color: '#aaa', marginTop: 16 }}>Powered by Zikkit</div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div style={{ minHeight: '100vh', background: '#FCFBF9', padding: '18px 12px 40px', fontFamily: 'Rubik, Arial, sans-serif', color: '#111' }}>{children}</div>;
}
function Row({ l, r, bold }: { l: string; r: string; bold?: boolean }) {
  return <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderTop: bold ? '2px solid #eee' : undefined, fontWeight: bold ? 900 : 500, fontSize: bold ? 16 : 14 }}><span>{l}</span><span>{r}</span></div>;
}
