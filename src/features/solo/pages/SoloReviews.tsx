'use client';
import { useMemo, useState } from 'react';
import { Box, Typography, Button, Paper, Stack, Chip, Alert, Dialog, DialogTitle, DialogContent, DialogActions, TextField, IconButton } from '@mui/material';
import { Sms, Email, ContentCopy, WhatsApp, Star } from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { zikkitColors as c } from '@/styles/theme';
import { formatDateLocal } from '@/lib/region';
import { useToast } from '@/hooks/useToast';
import { newId } from '@/lib/data/collections';
import { useSolo } from '../useSolo';
import { Stat } from '../components/SoloUI';
import type { Closing, ReviewRequest } from '@/types';

/**
 * Reviews — ask a happy customer for a Google review while the job is fresh.
 * The link comes from Settings; the message is one tap on the phone.
 */
export default function SoloReviews() {
  const { closings, reviews, cfg, saveReview, saveClosing, customerById } = useSolo();
  const { toast } = useToast();
  const router = useRouter();
  const [target, setTarget] = useState<Closing | null>(null);
  const [message, setMessage] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState<'sms' | 'email' | null>(null);

  const link = cfg.google_review_url || '';
  const bizName = cfg.biz_name || 'us';
  const requestedFor = useMemo(() => new Set(reviews.map((r) => r.closingId).filter(Boolean)), [reviews]);

  /** Jobs finished in the last 30 days that nobody has asked about yet. */
  const candidates = useMemo(() => {
    const cutoff = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    return closings.filter((x) => x.date >= cutoff && !requestedFor.has(x.id) && !x.reviewRequestedAt);
  }, [closings, requestedFor]);

  const openFor = (x: Closing) => {
    const cust = customerById(x.customerId);
    setTarget(x);
    setPhone(x.phone || cust?.phone || '');
    setEmail(cust?.email || '');
    setMessage((cfg.review_message || `Hi {name}, thanks for choosing {business}! If we did a good job, a quick Google review really helps: {link}`)
      .replace(/\{name\}/g, (x.client || '').split(' ')[0] || 'there').replace(/\{business\}/g, bizName).replace(/\{link\}/g, link));
  };

  const record = async (x: Closing, channel: 'sms' | 'email', status: ReviewRequest['status'], error?: string) => {
    const r: ReviewRequest = {
      id: newId(), customerId: x.customerId, client: x.client, phone, email, closingId: x.id, jobId: x.jobId,
      channel, status, error, sentAt: new Date().toISOString(), created: new Date().toISOString(),
    };
    await saveReview(r);
    if (status === 'sent') await saveClosing({ ...x, reviewRequestedAt: r.sentAt });
  };

  const send = async (channel: 'sms' | 'email') => {
    if (!target) return;
    if (!link) { toast('Add your Google review link in Settings first', '#ff4d6d'); return; }
    setBusy(channel);
    try {
      const res = await fetch('/api/reviews/request', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel, to: channel === 'sms' ? phone : email, customerName: target.client, bizName, url: link, message, replyTo: cfg.biz_email }),
      });
      const data = await res.json();
      if (!res.ok || data.error) { await record(target, channel, 'failed', data.error); toast('Could not send: ' + (data.error || res.statusText), '#ff4d6d'); return; }
      await record(target, channel, 'sent');
      toast(channel === 'sms' ? 'Review request sent by SMS' : 'Review request emailed');
      setTarget(null);
    } catch { toast('Network error', '#ff4d6d'); }
    finally { setBusy(null); }
  };

  const copy = async () => { try { await navigator.clipboard.writeText(message); toast('Message copied'); } catch { toast('Copy failed', '#ff4d6d'); } };

  const sent = reviews.filter((r) => r.status === 'sent');
  const last30 = sent.filter((r) => r.sentAt >= new Date(Date.now() - 30 * 86400000).toISOString()).length;

  return (
    <Box className="zk-fade-up">
      <SectionHeader title="Reviews" subtitle="Ask while the job is still fresh — that's when people actually write one" />

      {!link && (
        <Alert severity="warning" sx={{ mb: 2 }} action={<Button size="small" onClick={() => router.push('/settings')}>Open settings</Button>}>
          Add your Google review link in Settings before sending requests.
        </Alert>
      )}

      <Stack direction="row" sx={{ mb: 2.5, flexWrap: 'wrap', gap: 1.5 }}>
        <Stat label="Requests sent" value={String(sent.length)} sub={`${last30} in the last 30 days`} color={c.accent} />
        <Stat label="Waiting to be asked" value={String(candidates.length)} sub="jobs closed in the last 30 days" color={candidates.length > 0 ? '#D97706' : undefined} />
      </Stack>

      <Paper sx={{ p: 2, borderRadius: 3, border: `1px solid ${c.border}`, mb: 2 }}>
        <Typography sx={{ fontWeight: 800, fontSize: 13, mb: 1 }}>Ask these customers</Typography>
        {candidates.length === 0 ? (
          <Typography sx={{ fontSize: 13, color: c.text3 }}>Everyone from the last 30 days has been asked. Close another job and they show up here.</Typography>
        ) : candidates.map((x) => (
          <Stack key={x.id} direction="row" alignItems="center" spacing={1} sx={{ py: 0.8, borderBottom: `1px solid ${c.border}`, '&:last-child': { borderBottom: 0 } }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontSize: 13.5, fontWeight: 700 }}>{x.client}</Typography>
              <Typography sx={{ fontSize: 12, color: c.text3 }}>{x.jobType} · {formatDateLocal(x.date)}</Typography>
            </Box>
            <Button size="small" variant="contained" startIcon={<Star />} onClick={() => openFor(x)}>Ask</Button>
          </Stack>
        ))}
      </Paper>

      {reviews.length === 0 ? (
        <EmptyState icon="⭐" title="No requests sent yet" subtitle="Pick a finished job above and send the customer your Google review link by SMS, WhatsApp or email." />
      ) : (
        <Paper sx={{ p: 2, borderRadius: 3, border: `1px solid ${c.border}` }}>
          <Typography sx={{ fontWeight: 800, fontSize: 13, mb: 1 }}>History</Typography>
          {reviews.slice(0, 40).map((r) => (
            <Stack key={r.id} direction="row" alignItems="center" spacing={1} sx={{ py: 0.7, borderBottom: `1px solid ${c.border}`, '&:last-child': { borderBottom: 0 } }}>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{r.client}</Typography>
                <Typography sx={{ fontSize: 11.5, color: c.text3 }}>{r.channel === 'sms' ? 'SMS' : 'Email'} · {formatDateLocal(r.sentAt)}{r.error ? ` · ${r.error}` : ''}</Typography>
              </Box>
              <Chip size="small" label={r.status === 'sent' ? 'Sent' : r.status === 'failed' ? 'Failed' : 'Clicked'} color={r.status === 'sent' ? 'success' : r.status === 'failed' ? 'error' : 'default'} sx={{ height: 20, fontSize: 10 }} />
            </Stack>
          ))}
        </Paper>
      )}

      <Dialog open={!!target} onClose={() => setTarget(null)} fullWidth maxWidth="xs">
        <DialogTitle>Ask {target?.client} for a review</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ mt: 1 }}>
            <TextField label="Message" value={message} onChange={(e) => setMessage(e.target.value)} multiline minRows={3} fullWidth
              InputProps={{ endAdornment: <IconButton size="small" onClick={copy}><ContentCopy fontSize="small" /></IconButton> }} />
            <Stack direction="row" spacing={1}>
              <TextField size="small" label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} fullWidth />
              <Button variant="contained" startIcon={<Sms />} onClick={() => send('sms')} disabled={!phone || busy === 'sms'}>SMS</Button>
            </Stack>
            <Stack direction="row" spacing={1}>
              <TextField size="small" label="Email" value={email} onChange={(e) => setEmail(e.target.value)} fullWidth />
              <Button variant="contained" startIcon={<Email />} onClick={() => send('email')} disabled={!email || busy === 'email'}>Email</Button>
            </Stack>
            <Button variant="outlined" startIcon={<WhatsApp />} href={`https://wa.me/${(phone || '').replace(/\D/g, '')}?text=${encodeURIComponent(message)}`} target="_blank" rel="noreferrer" disabled={!phone}
              onClick={() => { if (target) record(target, 'sms', 'sent'); }}>Send on WhatsApp</Button>
          </Stack>
        </DialogContent>
        <DialogActions><Button onClick={() => setTarget(null)}>Close</Button></DialogActions>
      </Dialog>
    </Box>
  );
}
