'use client';
import { useState, useEffect, useMemo } from 'react';
import { Box, Typography, Card, CardContent, TextField, InputAdornment, Button, Menu, MenuItem } from '@mui/material';
import { getFirestoreDb, collection, getDocs, doc, setDoc } from '@/lib/firebase';

interface ClientBiz {
  id: string;
  cfg?: {
    biz_name?: string; biz_type?: string; biz_phone?: string; biz_email?: string;
    region?: string; plan?: string; planStatus?: string; planType?: string;
    trialEnds?: string; subscriptionEnds?: string;
  };
  db?: { jobs?: unknown[]; leads?: unknown[]; quotes?: unknown[]; users?: unknown[] };
  ownerEmail?: string;
  created?: string;
}

function daysLeft(dateStr?: string): number {
  if (!dateStr) return -1;
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
}

function formatDate(iso?: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('he-IL', { day: 'numeric', month: 'short', year: 'numeric' });
}

const BIZ_TYPES: Record<string, string> = {
  hvac: '❄️ מיזוג', plumbing: '🔧 אינסטלציה', electrical: '⚡ חשמל', locksmith: '🔑 מנעולנות',
  cleaning: '🧹 ניקיון', pest: '🐛 הדברה', garage: '🚗 מוסך', general: '🏢 כללי',
};

export default function AdminClientsPage() {
  const [clients, setClients] = useState<ClientBiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [menuClient, setMenuClient] = useState<ClientBiz | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const db = getFirestoreDb();
        const snap = await getDocs(collection(db, 'businesses'));
        const list: ClientBiz[] = [];
        snap.forEach((d) => list.push({ id: d.id, ...d.data() } as ClientBiz));
        setClients(list.sort((a, b) => new Date(b.created || 0).getTime() - new Date(a.created || 0).getTime()));
      } catch (e) { console.error('Failed:', e); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  const filtered = useMemo(() => {
    let list = [...clients];
    if (statusFilter !== 'all') {
      if (statusFilter === 'expired') {
        list = list.filter((c) => { const end = c.cfg?.trialEnds || c.cfg?.subscriptionEnds; return end && daysLeft(end) < 0; });
      } else if (statusFilter === 'expiring') {
        list = list.filter((c) => { const end = c.cfg?.trialEnds || c.cfg?.subscriptionEnds; const d = daysLeft(end); return d >= 0 && d <= 7; });
      } else {
        list = list.filter((c) => (c.cfg?.planStatus || 'trial') === statusFilter);
      }
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((c) => (c.cfg?.biz_name || '').toLowerCase().includes(q) || (c.ownerEmail || '').toLowerCase().includes(q) || (c.cfg?.biz_phone || '').includes(q));
    }
    return list;
  }, [clients, search, statusFilter]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: clients.length, trial: 0, active: 0, expired: 0, expiring: 0 };
    clients.forEach((cl) => {
      const status = cl.cfg?.planStatus || 'trial';
      c[status] = (c[status] || 0) + 1;
      const end = cl.cfg?.trialEnds || cl.cfg?.subscriptionEnds;
      const d = daysLeft(end);
      if (d < 0) c.expired++;
      else if (d <= 7) c.expiring++;
    });
    return c;
  }, [clients]);

  const handleExtend = async (client: ClientBiz, days: number) => {
    const db = getFirestoreDb();
    const end = client.cfg?.trialEnds || client.cfg?.subscriptionEnds || new Date().toISOString();
    const newEnd = new Date(Math.max(new Date(end).getTime(), Date.now()) + days * 86400000).toISOString();
    const field = client.cfg?.planStatus === 'trial' ? 'trialEnds' : 'subscriptionEnds';
    await setDoc(doc(db, 'businesses', client.id), {
      cfg: { ...client.cfg, [field]: newEnd },
    }, { merge: true });
    setClients((prev) => prev.map((c) => c.id === client.id ? { ...c, cfg: { ...c.cfg, [field]: newEnd } } : c));
    setMenuAnchor(null); setMenuClient(null);
  };

  const handleChangeStatus = async (client: ClientBiz, status: string) => {
    const db = getFirestoreDb();
    await setDoc(doc(db, 'businesses', client.id), {
      cfg: { ...client.cfg, planStatus: status },
    }, { merge: true });
    setClients((prev) => prev.map((c) => c.id === client.id ? { ...c, cfg: { ...c.cfg, planStatus: status } } : c));
    setMenuAnchor(null); setMenuClient(null);
  };

  return (
    <Box dir="rtl">
      <Typography sx={{ fontSize: 22, fontWeight: 800, mb: 0.5 }}>🏪 לקוחות</Typography>
      <Typography sx={{ fontSize: 12, color: '#5a7080', mb: 2 }}>{clients.length} לקוחות רשומים</Typography>

      {/* Filters */}
      <Box sx={{ display: 'flex', gap: '8px', mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField size="small" placeholder={"חיפוש..."} value={search} onChange={(e) => setSearch(e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start">🔍</InputAdornment> }}
          sx={{ width: 220, '& .MuiOutlinedInput-root': { bgcolor: '#0d1117', borderRadius: '10px', fontSize: 12 } }} />
        {[
          { key: 'all', label: `הכל (${counts.all})`, color: '#a8bcc8' },
          { key: 'trial', label: `Trial (${counts.trial || 0})`, color: '#f59e0b' },
          { key: 'active', label: `פעיל (${counts.active || 0})`, color: '#22c55e' },
          { key: 'expiring', label: `פג בקרוב (${counts.expiring})`, color: '#f59e0b' },
          { key: 'expired', label: `פג תוקף (${counts.expired})`, color: '#ef4444' },
        ].map((f) => (
          <Button key={f.key} size="small" onClick={() => setStatusFilter(f.key)} sx={{
            px: '10px', py: '4px', fontSize: 10, fontWeight: 700, borderRadius: '8px', minWidth: 'auto',
            bgcolor: statusFilter === f.key ? 'rgba(0,229,176,0.08)' : 'rgba(255,255,255,0.05)',
            color: statusFilter === f.key ? f.color : '#5a7080',
            border: '1px solid ' + (statusFilter === f.key ? f.color + '55' : 'rgba(255,255,255,0.09)'),
          }}>
            {f.label}
          </Button>
        ))}
      </Box>

      {loading ? (
        <Typography sx={{ textAlign: 'center', color: '#5a7080', mt: 8 }}>⏳ טוען...</Typography>
      ) : filtered.length === 0 ? (
        <Card sx={{ p: 4, textAlign: 'center' }}>
          <Typography sx={{ fontSize: 14, color: '#5a7080' }}>אין לקוחות בפילטר הזה</Typography>
        </Card>
      ) : (
        <Card>
          <CardContent sx={{ p: 0 }}>
            <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse' }}>
              <Box component="thead">
                <Box component="tr">
                  {['עסק', 'מייל', 'סוג', 'תוכנית', 'תוקף', 'נשאר', 'עבודות', 'פעולות'].map((h) => (
                    <Box key={h} component="th" sx={{ p: '10px 14px', textAlign: 'right', fontSize: 10, fontWeight: 700, color: '#5a7080', textTransform: 'uppercase', borderBottom: '1px solid #21262d', bgcolor: '#0d1117' }}>{h}</Box>
                  ))}
                </Box>
              </Box>
              <Box component="tbody">
                {filtered.map((c) => {
                  const endDate = c.cfg?.trialEnds || c.cfg?.subscriptionEnds;
                  const days = daysLeft(endDate);
                  const status = c.cfg?.planStatus || 'trial';
                  return (
                    <Box component="tr" key={c.id} sx={{ '&:hover td': { bgcolor: 'rgba(0,229,176,0.02)' } }}>
                      <Box component="td" sx={{ p: '11px 14px', fontSize: 13, fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        {c.cfg?.biz_name || 'ללא שם'}
                        <Typography sx={{ fontSize: 9, color: '#5a7080' }}>{formatDate(c.created)}</Typography>
                      </Box>
                      <Box component="td" sx={{ p: '11px 14px', fontSize: 11, borderBottom: '1px solid rgba(255,255,255,0.04)', color: '#5a7080', fontFamily: 'monospace' }}>
                        {c.ownerEmail || '—'}
                      </Box>
                      <Box component="td" sx={{ p: '11px 14px', fontSize: 11, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        {BIZ_TYPES[c.cfg?.biz_type || ''] || c.cfg?.biz_type || '—'}
                      </Box>
                      <Box component="td" sx={{ p: '11px 14px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <Box component="span" sx={{
                          px: '8px', py: '2px', borderRadius: '12px', fontSize: 10, fontWeight: 700,
                          bgcolor: status === 'active' ? 'rgba(34,197,94,0.1)' : status === 'cancelled' ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)',
                          color: status === 'active' ? '#22c55e' : status === 'cancelled' ? '#ef4444' : '#f59e0b',
                        }}>
                          {status === 'active' ? '✅ פעיל' : status === 'trial' ? '🆓 Trial' : status === 'cancelled' ? '❌ בוטל' : status}
                        </Box>
                      </Box>
                      <Box component="td" sx={{ p: '11px 14px', fontSize: 11, borderBottom: '1px solid rgba(255,255,255,0.04)', color: '#5a7080' }}>
                        {formatDate(endDate)}
                      </Box>
                      <Box component="td" sx={{ p: '11px 14px', fontSize: 12, fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.04)',
                        color: days < 0 ? '#ef4444' : days <= 3 ? '#f59e0b' : days <= 7 ? '#4f8fff' : '#22c55e',
                      }}>
                        {days < 0 ? `פג לפני ${Math.abs(days)} ימים` : days === 0 ? 'היום!' : `${days} ימים`}
                      </Box>
                      <Box component="td" sx={{ p: '11px 14px', fontSize: 12, fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.04)', color: '#22c55e' }}>
                        {((c.db?.jobs as unknown[]) || []).length}
                      </Box>
                      <Box component="td" sx={{ p: '11px 14px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <Button size="small" onClick={(e) => { e.stopPropagation(); setMenuAnchor(e.currentTarget); setMenuClient(c); }}
                          sx={{ fontSize: 10, minWidth: 'auto', p: '2px 8px', bgcolor: 'rgba(255,255,255,0.05)', color: '#a8bcc8', border: '1px solid rgba(255,255,255,0.09)', borderRadius: '6px' }}>
                          ⋮
                        </Button>
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Actions Menu */}
      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => { setMenuAnchor(null); setMenuClient(null); }}
        PaperProps={{ sx: { bgcolor: '#0f1318', border: '1px solid rgba(255,255,255,0.09)', borderRadius: '10px', minWidth: 200 } }}>
        <Box sx={{ px: 2, py: 1, fontSize: 10, fontWeight: 700, color: '#5a7080' }}>הארך תוקף</Box>
        {[7, 14, 30, 90, 365].map((d) => (
          <MenuItem key={d} onClick={() => { if (menuClient) handleExtend(menuClient, d); }}
            sx={{ fontSize: 12, color: '#a8bcc8' }}>
            +{d} ימים {d === 365 ? '(שנה)' : d === 30 ? '(חודש)' : ''}
          </MenuItem>
        ))}
        <Box sx={{ height: 1, bgcolor: 'rgba(255,255,255,0.05)', my: '4px' }} />
        <MenuItem onClick={() => { if (menuClient) handleChangeStatus(menuClient, 'active'); }}
          sx={{ fontSize: 12, color: '#22c55e' }}>✅ סמן כפעיל</MenuItem>
        <MenuItem onClick={() => { if (menuClient) handleChangeStatus(menuClient, 'cancelled'); }}
          sx={{ fontSize: 12, color: '#ef4444' }}>❌ בטל מנוי</MenuItem>
      </Menu>
    </Box>
  );
}
