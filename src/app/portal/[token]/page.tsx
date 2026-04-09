'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';

interface PortalData {
  type: 'job' | 'quote';
  bizName: string;
  bizPhone: string;
  bizEmail: string;
  bizAddress: string;
  bizColor: string;
  currency: string;
  taxRate: number;
  quoteFooter: string;
  receiptFooter: string;
  job?: Record<string, unknown>;
  quote?: Record<string, unknown>;
  created: string;
}

function formatMoney(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat(currency === 'ILS' ? 'he-IL' : 'en-US', {
    style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(amount);
}

export default function PortalPage() {
  const params = useParams();
  const token = params.token as string;
  const [data, setData] = useState<PortalData | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [signName, setSignName] = useState('');
  const [signing, setSigning] = useState(false);
  const [signed, setSigned] = useState(false);
  const [sigData, setSigData] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);

  // Bilingual helper — Hebrew if ILS currency
  const isHe = data?.currency === 'ILS';
  const L = (en: string, he: string) => isHe ? he : en;

  useEffect(() => {
    if (!token) return;
    fetch(`/api/portal/${token}`)
      .then((r) => r.json())
      .then((res) => {
        if (res.error) setError(res.error);
        else setData(res.data as PortalData);
      })
      .catch(() => setError('Unable to load. Please try again.'))
      .finally(() => setLoading(false));
  }, [token]);

  // Check if already signed
  useEffect(() => {
    if (data?.quote) {
      const q = data.quote as Record<string, unknown>;
      if (q.signedAt || q.signature) {
        setSigned(true);
        setSigData((q.signature as string) || '');
        setSignName((q.signedName as string) || '');
      }
    }
  }, [data]);

  // Signature canvas drawing
  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    isDrawing.current = true;
    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e) ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = ('touches' in e) ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    ctx.beginPath(); ctx.moveTo(x, y);
  };
  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing.current) return;
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e) ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = ('touches' in e) ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.strokeStyle = '#e8f0f4';
    ctx.lineTo(x, y); ctx.stroke();
  };
  const endDraw = () => { isDrawing.current = false; };
  const clearCanvas = () => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleSign = async () => {
    if (!signName.trim()) return;
    const canvas = canvasRef.current;
    const sigImage = canvas ? canvas.toDataURL('image/png') : '';
    setSigning(true);
    try {
      // Get client IP
      let clientIP = 'unknown';
      try { const ipRes = await fetch('https://api.ipify.org?format=json'); const ipData = await ipRes.json(); clientIP = ipData.ip; } catch {}

      const res = await fetch('/api/portal/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, signedName: signName, signatureData: sigImage, clientIP }),
      });
      const result = await res.json();
      if (result.success) { setSigned(true); setSigData(sigImage); }
    } catch {}
    setSigning(false);
  };

  const handlePrint = () => window.print();

  if (loading) {
    return (
      <div style={styles.loadingWrap}>
        <div style={styles.spinner} />
        <p style={{ color: '#5a7080', fontSize: 13, marginTop: 16 }}>{L('Loading...','טוען...')}</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={styles.loadingWrap}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔗</div>
        <h2 style={{ color: '#e8f0f4', fontSize: 20, fontWeight: 800, marginBottom: 8 }}>{L('Link Not Found','הלינק לא נמצא')}</h2>
        <p style={{ color: '#5a7080', fontSize: 13 }}>{error || L('This portal link is invalid or has expired.','לינק זה אינו תקף או שפג תוקפו.')}</p>
      </div>
    );
  }

  const isQuote = data.type === 'quote';
  const isJob = data.type === 'job';
  const job = data.job as Record<string, unknown> | undefined;
  const quote = data.quote as Record<string, unknown> | undefined;
  const accent = data.bizColor || '#00e5b0';
  const cur = data.currency || 'USD';

  return (
    <>
      {/* Print-specific styles */}
      <style>{`
        @media print {
          body { background: #fff !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
          .portal-wrap { background: #fff !important; padding: 0 !important; }
          .portal-card { box-shadow: none !important; border: 1px solid #ddd !important; background: #fff !important; }
          .portal-card * { color: #222 !important; }
          .portal-header { background: #f8f8f8 !important; border-bottom: 2px solid ${accent} !important; }
          .portal-header * { color: #222 !important; }
          .line-item-header { background: #f0f0f0 !important; }
          .totals-box { background: #f8f8f8 !important; border: 1px solid #ddd !important; }
          .status-badge { border: 1px solid #999 !important; }
        }
        @page { margin: 0.5in; }
      `}</style>

      <div className="portal-wrap" style={styles.wrap}>
        {/* Action Bar */}
        <div className="no-print" style={styles.actionBar}>
          <button onClick={handlePrint} style={styles.printBtn}>
            {L("📄 Download PDF","📄 הורד PDF")}
          </button>
        </div>

        <div className="portal-card" style={styles.card}>
          {/* ── Header ── */}
          <div className="portal-header" style={{ ...styles.header, borderBottomColor: accent }}>
            <div>
              <h1 style={styles.bizName}>{data.bizName}</h1>
              <div style={styles.bizInfo}>
                {data.bizPhone && <span>📞 {data.bizPhone}</span>}
                {data.bizEmail && <span>✉️ {data.bizEmail}</span>}
                {data.bizAddress && <span>📍 {data.bizAddress}</span>}
              </div>
            </div>
            <div style={styles.docType}>
              <span style={{ ...styles.docLabel, background: `${accent}15`, color: accent, borderColor: `${accent}40` }}>
                {isQuote ? L('📄 QUOTE','📄 הצעת מחיר') : L('🧾 RECEIPT','🧾 קבלה')}
              </span>
              <span style={styles.docNum}>
                {isQuote ? `Q-${quote?.id}` : `${(job?.num as string) || '#' + job?.id}`}
              </span>
            </div>
          </div>

          {/* ── Client Info ── */}
          <div style={styles.section}>
            <div style={styles.sectionLabel}>
              {isQuote ? L('Prepared For','הוכן עבור') : L('Service For','שירות עבור')}
            </div>
            <h3 style={styles.clientName}>
              {isQuote ? (quote?.client as string) : (job?.client as string)}
            </h3>
            <div style={styles.clientDetails}>
              {(isQuote ? quote?.phone : job?.phone) && <span>📞 {(isQuote ? quote?.phone : job?.phone) as string}</span>}
              {(isQuote ? quote?.email : job?.email) && <span>✉️ {(isQuote ? quote?.email : job?.email) as string}</span>}
              {(isQuote ? quote?.address : job?.address) && <span>📍 {(isQuote ? quote?.address : job?.address) as string}</span>}
            </div>
          </div>

          {/* ── Date & Status ── */}
          <div style={styles.metaRow}>
            <div>
              <span style={styles.metaLabel}>{L('Date','תאריך')}</span>
              <span style={styles.metaValue}>
                {new Date((isQuote ? quote?.created : job?.created) as string || Date.now()).toLocaleDateString(isHe ? 'he-IL' : 'en-US', {
                  month: 'long', day: 'numeric', year: 'numeric',
                })}
              </span>
            </div>
            {isQuote && quote?.validUntil && (
              <div>
                <span style={styles.metaLabel}>{L('Valid Until','בתוקף עד')}</span>
                <span style={styles.metaValue}>
                  {new Date(quote.validUntil as string).toLocaleDateString(isHe ? 'he-IL' : 'en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
            )}
            <div>
              <span style={styles.metaLabel}>{L('Status','סטטוס')}</span>
              <span className="status-badge" style={{ ...styles.statusBadge, background: `${accent}15`, color: accent, borderColor: `${accent}40` }}>
                {isQuote ? (quote?.status as string || 'draft').toUpperCase() : (job?.status as string || 'completed').toUpperCase().replace('_', ' ')}
              </span>
            </div>
          </div>

          {/* ── Job Description ── */}
          {isJob && job?.desc && (
            <div style={styles.section}>
              <div style={styles.sectionLabel}>{L('Service Description','תיאור שירות')}</div>
              <p style={styles.descText}>{job.desc as string}</p>
              {job.tech && <p style={styles.techLine}>👷 {L('Technician','טכנאי')}: <strong>{job.tech as string}</strong></p>}
            </div>
          )}

          {/* ── Quote Line Items ── */}
          {isQuote && quote?.items && (
            <div style={styles.section}>
              <div style={styles.sectionLabel}>{L('Items','פריטים')}</div>
              <table style={styles.table}>
                <thead>
                  <tr className="line-item-header" style={styles.tableHeader}>
                    <th style={{ ...styles.th, textAlign: 'left' }}>{L('Item','פריט')}</th>
                    <th style={{ ...styles.th, textAlign: 'center' }}>{L('Qty','כמות')}</th>
                    <th style={{ ...styles.th, textAlign: 'right' }}>{L('Price','מחיר')}</th>
                    <th style={{ ...styles.th, textAlign: 'right' }}>{L('Total','סה\'כ')}</th>
                  </tr>
                </thead>
                <tbody>
                  {(quote.items as Array<Record<string, unknown>>).map((item, i) => (
                    <tr key={i} style={styles.tableRow}>
                      <td style={{ ...styles.td, fontWeight: 600 }}>{item.name as string}</td>
                      <td style={{ ...styles.td, textAlign: 'center' }}>{item.qty as number}</td>
                      <td style={{ ...styles.td, textAlign: 'right' }}>{formatMoney(item.price as number, cur)}</td>
                      <td style={{ ...styles.td, textAlign: 'right', fontWeight: 700 }}>{formatMoney((item.qty as number) * (item.price as number), cur)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ── Totals ── */}
          <div className="totals-box" style={styles.totalsBox}>
            {isQuote && (
              <>
                <div style={styles.totalRow}>
                  <span>{L('Subtotal','סיכום ביניים')}</span>
                  <span style={{ fontWeight: 600 }}>{formatMoney(quote?.subtotal as number || 0, cur)}</span>
                </div>
                {(quote?.tax as number || 0) > 0 && (
                  <div style={styles.totalRow}>
                    <span>{L(`Tax (${data.taxRate}%)`,`מס (${data.taxRate}%)`)}</span>
                    <span>{formatMoney(quote?.tax as number || 0, cur)}</span>
                  </div>
                )}
                <div style={styles.totalRowBig}>
                  <span>{L('Total','סה\'כ')}</span>
                  <span style={{ color: accent }}>{formatMoney(quote?.total as number || 0, cur)}</span>
                </div>
              </>
            )}
            {isJob && (
              <>
                <div style={styles.totalRow}>
                  <span>{L('Service Total','סה\'כ שירות')}</span>
                  <span style={{ fontWeight: 700, color: '#22c55e' }}>{formatMoney(job?.revenue as number || 0, cur)}</span>
                </div>
                {(job?.materials as number || 0) > 0 && (
                  <div style={styles.totalRow}>
                    <span>{L('Materials','חומרים')}</span>
                    <span>{formatMoney(job?.materials as number || 0, cur)}</span>
                  </div>
                )}
                {data.taxRate > 0 && (
                  <div style={styles.totalRow}>
                    <span>{L(`Tax (${data.taxRate}%)`,`מס (${data.taxRate}%)`)}</span>
                    <span>{formatMoney(((job?.revenue as number || 0) * data.taxRate) / 100, cur)}</span>
                  </div>
                )}
                <div style={styles.totalRowBig}>
                  <span>{L('Amount Paid','סכום ששולם')}</span>
                  <span style={{ color: accent }}>{formatMoney(job?.revenue as number || 0, cur)}</span>
                </div>
                {(job?.status as string) === 'completed' && (
                  <div style={{ textAlign: 'center', marginTop: 16, padding: '10px', background: 'rgba(34,197,94,0.08)', borderRadius: 8, fontSize: 14, fontWeight: 700, color: '#22c55e' }}>
                    {L('✅ Payment Received — Thank You!','✅ התשלום התקבל — תודה!')}
                  </div>
                )}
              </>
            )}
          </div>

          {/* ── Notes ── */}
          {((isQuote && quote?.notes) || (isJob && job?.notes)) && (
            <div style={styles.section}>
              <div style={styles.sectionLabel}>{L('Notes','הערות')}</div>
              <p style={styles.descText}>{(isQuote ? quote?.notes : job?.notes) as string}</p>
            </div>
          )}

          {/* ── Signature & Approval (Quotes Only) ── */}
          {isQuote && !signed && (
            <div style={{ padding: '24px 32px', borderBottom: '1px solid rgba(255,255,255,0.04)' }} className="no-print">
              <div style={styles.sectionLabel}>{L('Approve & Sign','אישור וחתימה')}</div>
              <p style={{ fontSize: 12, color: '#a8bcc8', marginBottom: 16, lineHeight: 1.6 }}>
                {L('By typing your name and signing below, you approve this quote and agree to the terms.','בהקלדת שמך וחתימתך למטה, אתה מאשר את ההצעה ומסכים לתנאים.')}
              </p>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 10, fontWeight: 700, color: '#5a7080', textTransform: 'uppercase' as const, letterSpacing: '0.5px', display: 'block', marginBottom: 4 }}>{L('Full Name','שם מלא')}</label>
                <input type="text" value={signName} onChange={(e) => setSignName(e.target.value)}
                  placeholder={L("Type your full name...","הקלד שם מלא...")} 
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: '#0d1117', color: '#e8f0f4', fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' as const }} />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 10, fontWeight: 700, color: '#5a7080', textTransform: 'uppercase' as const, letterSpacing: '0.5px', display: 'block', marginBottom: 4 }}>{L('Signature','חתימה')}</label>
                <canvas ref={canvasRef} width={400} height={120}
                  onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseLeave={endDraw}
                  onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={endDraw}
                  style={{ width: '100%', maxWidth: 400, height: 120, borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: '#0d1117', cursor: 'crosshair', touchAction: 'none' }} />
                <button onClick={clearCanvas} style={{ marginTop: 4, fontSize: 10, color: '#5a7080', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>{L('Clear signature','נקה חתימה')}</button>
              </div>
              <button onClick={handleSign} disabled={signing || !signName.trim()}
                style={{ width: '100%', padding: '14px', borderRadius: 12, border: 'none', background: accent, color: '#000', fontSize: 15, fontWeight: 800, cursor: signName.trim() ? 'pointer' : 'not-allowed', fontFamily: 'inherit', opacity: signName.trim() ? 1 : 0.4 }}>
                {signing ? L('Signing...','חותם...') : L('Approve & Sign Quote','אשר וחתום על ההצעה')}
              </button>
              <p style={{ fontSize: 10, color: '#5a7080', marginTop: 8, textAlign: 'center' as const }}>
                {L('Your signature is legally binding and will be recorded with timestamp and IP address.','חתימתך מחייבת משפטית ותירשם עם תאריך, שעה וכתובת IP.')}
              </p>
            </div>
          )}

          {/* ── Signed Confirmation ── */}
          {isQuote && signed && (
            <div style={{ padding: '24px 32px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <div style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 12, padding: 20, textAlign: 'center' as const }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#22c55e', marginBottom: 4 }}>{L('Quote Approved & Signed','ההצעה אושרה ונחתמה')}</div>
                {signName && <div style={{ fontSize: 13, color: '#a8bcc8' }}>{L('Signed by','נחתם על ידי')}: <strong>{signName}</strong></div>}
                {sigData && (
                  <div style={{ marginTop: 12 }}>
                    <img src={sigData} alt="Signature" style={{ maxWidth: 200, height: 60, objectFit: 'contain' }} />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Footer ── */}
          <div style={styles.footer}>
            <p>{isQuote ? data.quoteFooter : data.receiptFooter || L('Thank you for your business!','תודה על העסקה!')}</p>
            <p style={{ fontSize: 10, opacity: 0.5, marginTop: 8 }}>{data.bizName} · Powered by Zikkit</p>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Styles ──
const styles: Record<string, React.CSSProperties> = {
  wrap: {
    minHeight: '100vh', background: '#07090b', padding: '24px 16px',
    fontFamily: "'Inter', -apple-system, sans-serif",
    display: 'flex', flexDirection: 'column', alignItems: 'center',
  },
  actionBar: {
    width: '100%', maxWidth: 700, display: 'flex', justifyContent: 'flex-end', marginBottom: 12, gap: 8,
  },
  printBtn: {
    padding: '10px 20px', borderRadius: 10, border: '1px solid rgba(0,229,176,0.3)',
    background: 'rgba(0,229,176,0.08)', color: '#00e5b0', fontSize: 13, fontWeight: 700,
    cursor: 'pointer', fontFamily: 'inherit',
  },
  card: {
    width: '100%', maxWidth: 700, background: '#0f1318',
    border: '1px solid rgba(255,255,255,0.055)', borderRadius: 16,
    overflow: 'visible', boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
  },
  header: {
    padding: '28px 32px', borderBottom: '2px solid #00e5b0',
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16,
    background: 'linear-gradient(135deg, rgba(0,229,176,0.06), rgba(79,143,255,0.03))',
  },
  bizName: { fontSize: 22, fontWeight: 800, color: '#e8f0f4', margin: 0, letterSpacing: '-0.5px' },
  bizInfo: { display: 'flex', gap: 16, marginTop: 6, fontSize: 12, color: '#a8bcc8', flexWrap: 'wrap' as const },
  docType: { textAlign: 'right' as const, display: 'flex', flexDirection: 'column' as const, alignItems: 'flex-end', gap: 4 },
  docLabel: { fontSize: 10, fontWeight: 800, padding: '3px 12px', borderRadius: 20, border: '1px solid', letterSpacing: '0.5px' },
  docNum: { fontSize: 18, fontWeight: 800, color: '#e8f0f4' },
  section: { padding: '20px 32px', borderBottom: '1px solid rgba(255,255,255,0.04)' },
  sectionLabel: { fontSize: 10, fontWeight: 700, color: '#5a7080', textTransform: 'uppercase' as const, letterSpacing: '0.5px', marginBottom: 8 },
  clientName: { fontSize: 18, fontWeight: 700, color: '#e8f0f4', margin: '0 0 6px' },
  clientDetails: { display: 'flex', gap: 16, fontSize: 12, color: '#a8bcc8', flexWrap: 'wrap' as const },
  metaRow: { display: 'flex', gap: 32, padding: '16px 32px', borderBottom: '1px solid rgba(255,255,255,0.04)', flexWrap: 'wrap' as const },
  metaLabel: { display: 'block', fontSize: 10, fontWeight: 700, color: '#5a7080', textTransform: 'uppercase' as const, letterSpacing: '0.5px', marginBottom: 4 },
  metaValue: { fontSize: 13, color: '#e8f0f4', fontWeight: 600 },
  statusBadge: { display: 'inline-block', fontSize: 10, fontWeight: 800, padding: '3px 12px', borderRadius: 20, border: '1px solid', letterSpacing: '0.3px' },
  descText: { fontSize: 13, color: '#a8bcc8', lineHeight: 1.7, margin: 0 },
  techLine: { fontSize: 12, color: '#a8bcc8', marginTop: 8 },
  table: { width: '100%', borderCollapse: 'collapse' as const, marginTop: 8 },
  tableHeader: { background: 'rgba(255,255,255,0.03)' },
  th: { padding: '10px 12px', fontSize: 10, fontWeight: 700, color: '#5a7080', textTransform: 'uppercase' as const, letterSpacing: '0.5px', borderBottom: '1px solid rgba(255,255,255,0.06)' },
  tableRow: { borderBottom: '1px solid rgba(255,255,255,0.03)' },
  td: { padding: '11px 12px', fontSize: 13, color: '#e8f0f4' },
  totalsBox: { margin: '20px 32px', padding: 20, background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12 },
  totalRow: { display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: 13, color: '#a8bcc8' },
  totalRowBig: { display: 'flex', justifyContent: 'space-between', padding: '12px 0 0', fontSize: 20, fontWeight: 800, color: '#e8f0f4', borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: 8 },
  footer: { padding: '20px 32px', textAlign: 'center' as const, fontSize: 12, color: '#5a7080', lineHeight: 1.6 },
  loadingWrap: { minHeight: '100vh', background: '#07090b', display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center', fontFamily: "'Inter', sans-serif" },
  spinner: { width: 32, height: 32, border: '3px solid rgba(255,255,255,0.1)', borderTopColor: '#00e5b0', borderRadius: '50%', animation: 'spin 1s linear infinite' },
};
