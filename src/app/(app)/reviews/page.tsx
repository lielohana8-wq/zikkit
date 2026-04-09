'use client';
import { useState, useMemo } from 'react';
import { Box, Typography, Button, TextField, Switch, FormControlLabel, Chip, Paper, Tabs, Tab, Rating, LinearProgress, Avatar, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import { Star, TrendingUp, Send, Settings, ThumbUp, ThumbDown } from '@mui/icons-material';
import { PageTabs } from '@/components/ui/PageTabs';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { useData } from '@/hooks/useFirestore';
import { useToast } from '@/hooks/useToast';
import { formatDate } from '@/lib/formatters';

interface Review { id: number; jobId: number; client: string; rating: number; comment: string; date: string; replied?: boolean; replyText?: string; platform?: string; shared?: boolean }

export default function ReviewsPage() {
  const { db, saveData } = useData();
  const { toast } = useToast();
  const [tab, setTab] = useState(0);
  const [autoSend, setAutoSend] = useState(true);
  const [minStarsForGoogle, setMinStarsForGoogle] = useState(4);
  const [replyText, setReplyText] = useState('');
  const [replyId, setReplyId] = useState<number | null>(null);

  const reviews: Review[] = useMemo(() => (db.reviews || []).sort((a: Review, b: Review) => new Date(b.date).getTime() - new Date(a.date).getTime()), [db.reviews]);
  const avg = reviews.length > 0 ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) : 0;
  const dist = [1,2,3,4,5].map(n => ({ stars: n, count: reviews.filter(r => r.rating === n).length, pct: reviews.length > 0 ? Math.round(reviews.filter(r => r.rating === n).length / reviews.length * 100) : 0 }));

  const handleReply = async (reviewId: number) => {
    if (!replyText.trim()) return;
    const list = (db.reviews || []).map((r: Review) => r.id === reviewId ? { ...r, replied: true, replyText } : r);
    await saveData({ ...db, reviews: list });
    setReplyId(null);
    setReplyText('');
    toast('תגובה נשמרה');
  };

  const Stat = ({ label, value, color, icon }: any) => (
    <Box sx={{ p: 2, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', flex: 1, minWidth: 120, display: 'flex', alignItems: 'center', gap: 1.5 }}>
      <Box sx={{ width: 40, height: 40, borderRadius: '50%', bgcolor: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>{icon}</Box>
      <Box><Typography variant="h5" fontWeight={900} sx={{ fontFamily: 'Syne' }}>{value}</Typography><Typography variant="caption" color="text.secondary">{label}</Typography></Box>
    </Box>
  );

  return (
    <Box className="zk-fade-up">
      <PageTabs tabs={[{ label: 'בוט AI', href: '/aibot', icon: '🤖' }, { label: 'וואטסאפ', href: '/whatsapp', icon: '💬' }, { label: 'ביקורות', href: '/reviews', icon: '⭐' }]} />
      <SectionHeader title="ביקורות ומוניטין" subtitle={`${reviews.length} ביקורות · ממוצע ${avg.toFixed(1)} ⭐`} actions={
        <FormControlLabel control={<Switch checked={autoSend} onChange={e => setAutoSend(e.target.checked)} color="success" />} label="שליחה אוטומטית" />
      } />
      <Box sx={{ display: 'flex', gap: 1.5, mb: 3, flexWrap: 'wrap' }}>
        <Stat label="ממוצע" value={avg.toFixed(1)} color="#F59E0B" icon={<Star />} />
        <Stat label="סה״כ" value={reviews.length} color="#3B82F6" icon={<TrendingUp />} />
        <Stat label="5 כוכבים" value={dist[4]?.count || 0} color="#10B981" icon={<ThumbUp />} />
        <Stat label="1-2 כוכבים" value={(dist[0]?.count || 0) + (dist[1]?.count || 0)} color="#EF4444" icon={<ThumbDown />} />
      </Box>

      {/* Rating Distribution */}
      <Paper sx={{ p: 2, mb: 3, borderRadius: 2, border: '1px solid rgba(255,255,255,0.06)' }}>
        <Typography fontWeight={700} fontSize={13} sx={{ mb: 1.5 }}>התפלגות דירוגים</Typography>
        {[5,4,3,2,1].map(n => (
          <Box key={n} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            <Typography variant="caption" sx={{ width: 20, textAlign: 'center' }}>{n}</Typography>
            <Star sx={{ fontSize: 14, color: '#F59E0B' }} />
            <LinearProgress variant="determinate" value={dist[n-1]?.pct || 0} sx={{ flex: 1, height: 8, borderRadius: 4, bgcolor: 'rgba(255,255,255,0.06)', '& .MuiLinearProgress-bar': { bgcolor: n >= 4 ? '#10B981' : n === 3 ? '#F59E0B' : '#EF4444' } }} />
            <Typography variant="caption" color="text.secondary" sx={{ width: 35, textAlign: 'left' }}>{dist[n-1]?.count || 0}</Typography>
          </Box>
        ))}
      </Paper>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2, '& .MuiTab-root': { fontSize: 12, fontWeight: 600 } }}>
        <Tab label="כל הביקורות" /><Tab label="ממתין לתגובה" /><Tab label="הגדרות" />
      </Tabs>

      {(tab === 0 || tab === 1) && (
        <Box>
          {(tab === 1 ? reviews.filter(r => !r.replied) : reviews).map(r => (
            <Paper key={r.id} sx={{ p: 2, mb: 1.5, borderRadius: 2, border: '1px solid rgba(255,255,255,0.06)', borderRight: `4px solid ${r.rating >= 4 ? '#10B981' : r.rating === 3 ? '#F59E0B' : '#EF4444'}` }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Avatar sx={{ width: 32, height: 32, bgcolor: r.rating >= 4 ? '#10B981' : '#F59E0B', fontSize: 13 }}>{r.client[0]}</Avatar>
                <Box sx={{ flex: 1 }}>
                  <Typography fontWeight={600} fontSize={13}>{r.client}</Typography>
                  <Typography variant="caption" color="text.secondary">{formatDate(r.date)} · עבודה #{r.jobId}</Typography>
                </Box>
                <Rating value={r.rating} readOnly size="small" />
                {r.rating >= minStarsForGoogle && !r.shared && <Button size="small" sx={{ fontSize: 10, color: '#4285F4' }}>שתף בגוגל</Button>}
              </Box>
              {r.comment && <Typography variant="body2" sx={{ fontSize: 12, mb: 1, bgcolor: 'rgba(255,255,255,0.02)', p: 1, borderRadius: 1 }}>{r.comment}</Typography>}
              {r.replied ? (
                <Box sx={{ bgcolor: 'rgba(59,130,246,0.05)', p: 1, borderRadius: 1, border: '1px solid rgba(59,130,246,0.15)' }}>
                  <Typography variant="caption" color="primary" fontWeight={600}>התגובה שלך:</Typography>
                  <Typography variant="body2" sx={{ fontSize: 12 }}>{r.replyText}</Typography>
                </Box>
              ) : replyId === r.id ? (
                <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                  <TextField fullWidth size="small" placeholder="כתוב תגובה..." value={replyText} onChange={e => setReplyText(e.target.value)} />
                  <Button variant="contained" size="small" onClick={() => handleReply(r.id)} sx={{ bgcolor: '#3B82F6' }}>שלח</Button>
                </Box>
              ) : <Button size="small" onClick={() => { setReplyId(r.id); setReplyText(''); }} sx={{ fontSize: 11 }}>הגב</Button>}
            </Paper>
          ))}
          {reviews.length === 0 && <Box sx={{ textAlign: 'center', py: 8 }}><Typography fontSize={40}>⭐</Typography><Typography fontWeight={700} sx={{ mt: 1 }}>אין ביקורות עדיין</Typography><Typography variant="body2" color="text.secondary">ביקורות יגיעו אוטומטית אחרי סיום עבודות</Typography></Box>}
        </Box>
      )}
      {tab === 2 && (
        <Box sx={{ maxWidth: 600, display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Box><Typography fontWeight={700} fontSize={14} sx={{ mb: 1 }}>⭐ סף לשיתוף בגוגל</Typography>
            <FormControl size="small"><Select value={minStarsForGoogle} onChange={e => setMinStarsForGoogle(Number(e.target.value))}><MenuItem value={3}>3+ כוכבים</MenuItem><MenuItem value={4}>4+ כוכבים</MenuItem><MenuItem value={5}>5 כוכבים בלבד</MenuItem></Select></FormControl>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>לקוחות שדירגו מעל הסף יקבלו לינק לגוגל</Typography>
          </Box>
          <Box><Typography fontWeight={700} fontSize={14} sx={{ mb: 1 }}>🔗 Google Business Profile</Typography><TextField fullWidth size="small" placeholder="Place ID / Review Link" /></Box>
          <Button variant="contained" onClick={() => toast('נשמר')} sx={{ alignSelf: 'flex-start', bgcolor: '#F59E0B' }}>שמור</Button>
        </Box>
      )}
    </Box>
  );
}
