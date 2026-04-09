'use client';

import { useState, useEffect, useMemo } from 'react';
import { Box, Typography, Card, CardContent } from '@mui/material';
import { useRouter } from 'next/navigation';
import { getFirestoreDb, collection, getDocs } from '@/lib/firebase';

interface ClientBiz {
  id: string;
  cfg?: {
    biz_name?: string; biz_type?: string; plan?: string; planStatus?: string;
    planType?: string; trialEnds?: string; subscriptionEnds?: string;
    region?: string; currency?: string;
  };
  db?: { jobs?: unknown[]; leads?: unknown[]; quotes?: unknown[]; users?: unknown[] };
  ownerEmail?: string;
  created?: string;
}

function daysLeft(dateStr?: string): number {
  if (!dateStr) return -1;
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [clients, setClients] = useState<ClientBiz[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const db = getFirestoreDb();
        const snap = await getDocs(collection(db, 'businesses'));
        const list: ClientBiz[] = [];
        snap.forEach((d) => list.push({ id: d.id, ...d.data() } as ClientBiz));
        setClients(list);
      } catch (e) { console.error('Failed:', e); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  const stats = useMemo(() => {
    const trial = clients.filter((c) => c.cfg?.planStatus === 'trial' || (!c.cfg?.planStatus));
    const active = clients.filter((c) => c.cfg?.planStatus === 'active');
    const expired = clients.filter((c) => {
      const end = c.cfg?.trialEnds || c.cfg?.subscriptionEnds;
      return end && daysLeft(end) < 0;
    });
    const expiringSoon = clients.filter((c) => {
      const end = c.cfg?.trialEnds || c.cfg?.subscriptionEnds;
      const d = daysLeft(end);
      return d >= 0 && d <= 7;
    });

    const ilClients = clients.filter((c) => c.cfg?.region === 'IL');
    const usClients = clients.filter((c) => c.cfg?.region !== 'IL');
    const mrrIL = active.filter((c) => c.cfg?.region === 'IL').length * 499;
    const mrrUS = active.filter((c) => c.cfg?.region !== 'IL').length * 699;

    const totalJobs = clients.reduce((s, c) => s + ((c.db?.jobs as unknown[]) || []).length, 0);
    const totalLeads = clients.reduce((s, c) => s + ((c.db?.leads as unknown[]) || []).length, 0);

    return { total: clients.length, trial, active, expired, expiringSoon, ilClients, usClients, mrrIL, mrrUS, totalJobs, totalLeads };
  }, [clients]);

  const KPI = ({ label, value, color, sub }: { label: string; value: string | number; color: string; sub?: string }) => (
    <Card sx={{ position: 'relative', overflow: 'hidden', cursor: 'pointer', '&:hover': { borderColor: color } }}
      onClick={() => router.push('/admin/clients')}>
      <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, bgcolor: color }} />
      <CardContent sx={{ p: '16px !important' }}>
        <Typography sx={{ fontSize: 10, color: '#5a7080', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 700, mb: 1 }}>{label}</Typography>
        <Typography sx={{ fontSize: 28, fontWeight: 900, color, fontFamily: "'Syne', sans-serif" }}>{value}</Typography>
        {sub && <Typography sx={{ fontSize: 10, color: '#5a7080', mt: 0.5 }}>{sub}</Typography>}
      </CardContent>
    </Card>
  );

  return (
    <Box dir="rtl">
      <Box sx={{ display: 'flex', alignItems: 'center', gap: '12px', mb: 3 }}>
        <Typography sx={{ fontSize: 24, fontWeight: 900, fontFamily: "'Syne', sans-serif" }}>⚡ ZIKKIT HQ</Typography>
        <Box flex={1} />
        <Typography sx={{ fontSize: 12, color: '#5a7080', fontFamily: 'monospace' }}>
          {new Date().toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </Typography>
      </Box>

      {loading ? (
        <Typography sx={{ textAlign: 'center', color: '#5a7080', mt: 8 }}>⏳ טוען נתונים...</Typography>
      ) : (
        <>
          {/* KPI Row 1 — Clients */}
          <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#5a7080', textTransform: 'uppercase', letterSpacing: '1px', mb: 1 }}>לקוחות</Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '10px', mb: 3 }}>
            <KPI label={"סה״כ לקוחות"} value={stats.total} color="#4F46E5" />
            <KPI label={"Trial פעיל"} value={stats.trial.length} color="#f59e0b" sub={`${stats.trial.length > 0 ? stats.trial.length + ' בניסיון' : 'אין'}`} />
            <KPI label={"מנוי פעיל"} value={stats.active.length} color="#22c55e" />
            <KPI label={"פג תוקף"} value={stats.expired.length} color="#ef4444" />
            <KPI label={"פג בקרוב (7 ימים)"} value={stats.expiringSoon.length} color="#f59e0b" sub={stats.expiringSoon.length > 0 ? '⚠️ דורש תשומת לב' : '✅ הכל בסדר'} />
          </Box>

          {/* KPI Row 2 — Revenue */}
          <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#5a7080', textTransform: 'uppercase', letterSpacing: '1px', mb: 1 }}>הכנסות</Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '10px', mb: 3 }}>
            <KPI label={"MRR כולל"} value={'$' + (stats.mrrIL + stats.mrrUS).toLocaleString()} color="#4F46E5" sub={`₪${stats.mrrIL.toLocaleString()} + $${stats.mrrUS.toLocaleString()}`} />
            <KPI label={"ARR משוער"} value={'$' + ((stats.mrrIL + stats.mrrUS) * 12).toLocaleString()} color="#4f8fff" />
            <KPI label={"🇮🇱 ישראל"} value={stats.ilClients.length} color="#4f8fff" sub={`₪${stats.mrrIL.toLocaleString()}/חודש`} />
            <KPI label={"🇺🇸 ארה״ב"} value={stats.usClients.length} color="#a78bfa" sub={`$${stats.mrrUS.toLocaleString()}/mo`} />
          </Box>

          {/* KPI Row 3 — Activity */}
          <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#5a7080', textTransform: 'uppercase', letterSpacing: '1px', mb: 1 }}>פעילות כוללת</Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '10px', mb: 3 }}>
            <KPI label={"סה״כ עבודות"} value={stats.totalJobs} color="#22c55e" />
            <KPI label={"סה״כ לידים"} value={stats.totalLeads} color="#4f8fff" />
          </Box>

          {/* Expiring Soon Alert */}
          {stats.expiringSoon.length > 0 && (
            <Card sx={{ border: '1px solid rgba(245,158,11,0.3)', mb: 3 }}>
              <Box sx={{ p: '12px 16px', borderBottom: '1px solid rgba(245,158,11,0.15)', bgcolor: 'rgba(245,158,11,0.04)' }}>
                <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#f59e0b' }}>⚠️ פג תוקף בקרוב — {stats.expiringSoon.length} לקוחות</Typography>
              </Box>
              <CardContent sx={{ p: '0 !important' }}>
                {stats.expiringSoon.map((c) => {
                  const end = c.cfg?.trialEnds || c.cfg?.subscriptionEnds || '';
                  const d = daysLeft(end);
                  return (
                    <Box key={c.id} sx={{ display: 'flex', alignItems: 'center', gap: 2, p: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <Typography sx={{ fontSize: 13, fontWeight: 700, flex: 1 }}>{c.cfg?.biz_name || 'ללא שם'}</Typography>
                      <Typography sx={{ fontSize: 11, color: '#5a7080' }}>{c.ownerEmail}</Typography>
                      <Typography sx={{ fontSize: 12, fontWeight: 700, color: d <= 2 ? '#ef4444' : '#f59e0b' }}>
                        {d === 0 ? 'היום!' : d === 1 ? 'מחר' : d + ' ימים'}
                      </Typography>
                    </Box>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {/* Recent Clients */}
          <Card>
            <Box sx={{ p: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.055)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography sx={{ fontSize: 13, fontWeight: 700 }}>🕐 לקוחות אחרונים</Typography>
              <Typography onClick={() => router.push('/admin/clients')} sx={{ fontSize: 11, color: '#4f8fff', cursor: 'pointer', '&:hover': { color: '#4F46E5' } }}>הצג הכל →</Typography>
            </Box>
            <CardContent sx={{ p: '0 !important' }}>
              {clients.slice(0, 5).map((c) => (
                <Box key={c.id} sx={{ display: 'flex', alignItems: 'center', gap: 2, p: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <Typography sx={{ fontSize: 13, fontWeight: 700, flex: 1 }}>{c.cfg?.biz_name || 'ללא שם'}</Typography>
                  <Typography sx={{ fontSize: 10, color: '#5a7080', fontFamily: 'monospace' }}>{c.ownerEmail}</Typography>
                  <Box sx={{
                    px: '8px', py: '2px', borderRadius: '12px', fontSize: 10, fontWeight: 700,
                    bgcolor: c.cfg?.planStatus === 'active' ? 'rgba(34,197,94,0.1)' : 'rgba(245,158,11,0.1)',
                    color: c.cfg?.planStatus === 'active' ? '#22c55e' : '#f59e0b',
                  }}>
                    {c.cfg?.planStatus || 'trial'}
                  </Box>
                </Box>
              ))}
            </CardContent>
          </Card>
        </>
      )}
    </Box>
  );
}
