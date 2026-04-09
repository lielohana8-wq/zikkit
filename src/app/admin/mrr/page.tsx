'use client';
import { useState, useEffect, useMemo } from 'react';
import { Box, Typography } from '@mui/material';
import { zikkitColors as c } from '@/styles/theme';
import { getFirestoreDb, collection, getDocs } from '@/lib/firebase';

interface ClientInfo { id: string; name: string; plan: string; status: string; started: string; email: string; }

export default function MrrPage() {
  const [clients, setClients] = useState<ClientInfo[]>([]);
  useEffect(() => {
    (async () => {
      try {
        const db = getFirestoreDb();
        const snap = await getDocs(collection(db, 'businesses'));
        const list: ClientInfo[] = [];
        snap.forEach((d) => {
          const cfg = d.data().cfg || {};
          list.push({ id: d.id, name: cfg.biz_name || 'Unknown', plan: cfg.plan || 'trial', status: cfg.plan_status || 'trial', started: cfg.plan_started_at || d.data().created || '', email: d.data().ownerEmail || cfg.biz_email || '' });
        });
        setClients(list);
      } catch {}
    })();
  }, []);

  const stats = useMemo(() => {
    const paying = clients.filter(c => c.status === 'active');
    const trial = clients.filter(c => c.status === 'trial');
    const canceled = clients.filter(c => c.status === 'canceled');
    const mrr = paying.reduce((s, c) => s + (c.plan === 'unlimited' ? 1099 : 699), 0);
    return { total: clients.length, paying: paying.length, trial: trial.length, canceled: canceled.length, mrr, arr: mrr * 12 };
  }, [clients]);

  return (
    <Box sx={{ p: '24px 28px' }}>
      <Typography sx={{ fontSize: 22, fontWeight: 900, fontFamily: 'Syne', mb: 3 }}>Revenue Dashboard</Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 2, mb: 4 }}>
        {[
          { v: '$' + stats.mrr.toLocaleString(), l: 'MRR', cl: c.accent },
          { v: '$' + stats.arr.toLocaleString(), l: 'ARR', cl: c.green },
          { v: String(stats.paying), l: 'Paying', cl: c.green },
          { v: String(stats.trial), l: 'Trial', cl: c.blue },
          { v: String(stats.canceled), l: 'Canceled', cl: c.hot },
          { v: String(stats.total), l: 'Total', cl: c.accent },
        ].map((s) => (
          <Box key={s.l} sx={{ p: 2.5, borderRadius: '14px', bgcolor: c.glass, border: '1px solid ' + c.border, textAlign: 'center' }}>
            <Typography sx={{ fontSize: 26, fontWeight: 900, color: s.cl, fontFamily: 'Syne' }}>{s.v}</Typography>
            <Typography sx={{ fontSize: 12, color: c.text3, mt: 0.5 }}>{s.l}</Typography>
          </Box>
        ))}
      </Box>
      <Typography sx={{ fontSize: 16, fontWeight: 700, mb: 2 }}>All Clients</Typography>
      {clients.map((cl) => (
        <Box key={cl.id} sx={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1.5fr', gap: 1, p: '10px 12px', fontSize: 12, color: c.text2, borderBottom: '1px solid ' + c.border }}>
          <span style={{ fontWeight: 600, color: c.text }}>{cl.name}</span>
          <span>{cl.plan}</span>
          <span style={{ color: cl.status === 'active' ? c.green : cl.status === 'trial' ? c.blue : c.hot }}>{cl.status}</span>
          <span style={{ color: c.text3 }}>{cl.email}</span>
        </Box>
      ))}
    </Box>
  );
}
