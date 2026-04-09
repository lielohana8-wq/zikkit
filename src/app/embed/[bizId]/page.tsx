'use client';
import { useState } from 'react';
import { useParams } from 'next/navigation';

export default function EmbedLeadForm() {
  const { bizId } = useParams();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!name.trim() || !phone.trim()) { setError('Please fill name and phone'); return; }
    setSending(true); setError('');
    try {
      const res = await fetch('/api/widget', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bizId, name, phone, email, message, source: 'website_embed' }),
      });
      const data = await res.json();
      if (data.success) { setSent(true); }
      else { setError(data.error || 'Something went wrong'); }
    } catch { setError('Connection error'); }
    setSending(false);
  };

  if (sent) {
    return (
      <div style={styles.box}>
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 8 }}>Thank you!</div>
          <div style={{ fontSize: 13, color: '#888' }}>We received your request and will contact you shortly.</div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.box}>
      <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 4 }}>Request Service</div>
      <div style={{ fontSize: 12, color: '#888', marginBottom: 16 }}>Fill out the form and we will get back to you ASAP.</div>
      {error && <div style={{ padding: '8px 12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, fontSize: 12, color: '#ef4444', marginBottom: 12 }}>{error}</div>}
      <input style={styles.input} placeholder="Full Name *" value={name} onChange={e => setName(e.target.value)} />
      <input style={styles.input} placeholder="Phone *" value={phone} onChange={e => setPhone(e.target.value)} />
      <input style={styles.input} placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
      <textarea style={{ ...styles.input, height: 60, resize: 'none' as const }} placeholder="How can we help?" value={message} onChange={e => setMessage(e.target.value)} />
      <button onClick={handleSubmit} disabled={sending} style={styles.btn}>
        {sending ? 'Sending...' : 'Submit Request'}
      </button>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  box: { fontFamily: "'Inter',sans-serif", background: '#0d1117', borderRadius: 14, padding: '20px', maxWidth: 380, margin: '0 auto', border: '1px solid rgba(255,255,255,0.06)' },
  input: { width: '100%', padding: '10px 14px', marginBottom: 10, background: '#161b22', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: '#fff', fontSize: 13, outline: 'none', boxSizing: 'border-box' as const },
  btn: { width: '100%', padding: '12px', background: '#00e5b0', color: '#000', fontWeight: 700, fontSize: 14, border: 'none', borderRadius: 10, cursor: 'pointer' },
};
