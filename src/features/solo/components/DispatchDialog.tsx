'use client';
import { useMemo, useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Stack, Typography, Paper, Chip, TextField, IconButton, Box, Divider, CircularProgress } from '@mui/material';
import { Sms, WhatsApp, Email, ContentCopy, ExpandMore, ExpandLess } from '@mui/icons-material';
import { zikkitColors as c } from '@/styles/theme';
import { useToast } from '@/hooks/useToast';
import { useSolo, toDateKey } from '../useSolo';
import type { Job } from '@/types';

/**
 * Send each person their run sheet for a day — by SMS, WhatsApp or email.
 * Defaults to tomorrow, because that is when it is useful: the crew wakes up
 * knowing where they are going without phoning the office.
 */
export function DispatchDialog({ onClose, date }: { onClose: () => void; date?: string }) {
  const { jobs, assignees, cfg, currency } = useSolo();
  const { toast } = useToast();
  const [day, setDay] = useState(() => date || toDateKey(new Date(Date.now() + 86400000)));
  const [edited, setEdited] = useState<Record<string, string>>({});
  const [expanded, setExpanded] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [sent, setSent] = useState<Record<string, boolean>>({});

  const dayLabel = new Date(day + 'T12:00:00').toLocaleDateString('en-CA', { weekday: 'long', month: 'long', day: 'numeric' });
  const bizName = cfg.biz_name || 'the office';

  const runs = useMemo(() => {
    const dayJobs = jobs.filter((j) => j.scheduledDate === day && j.status !== 'cancelled' && j.status !== 'completed');
    const byUid = new Map<string, Job[]>();
    for (const j of dayJobs) { const k = j.techUid || ''; if (!byUid.has(k)) byUid.set(k, []); byUid.get(k)!.push(j); }
    for (const list of byUid.values()) list.sort((a, b) => (a.scheduledTime || '').localeCompare(b.scheduledTime || ''));
    return Array.from(byUid.entries())
      .map(([uid, list]) => ({ uid, person: assignees.find((a) => a.uid === uid), jobs: list }))
      .sort((a, b) => (a.person?.name || 'zz').localeCompare(b.person?.name || 'zz'));
  }, [jobs, day, assignees]);

  const unassigned = runs.find((r) => !r.uid);
  const crews = runs.filter((r) => r.uid && r.person);

  const buildMessage = (name: string, list: Job[]) => {
    const lines = [`${name.split(' ')[0]} — ${dayLabel}`, `${list.length} job${list.length === 1 ? '' : 's'}`, ''];
    for (const j of list) {
      lines.push(`${j.scheduledTime || '—'}  ${j.client}`);
      if (j.jobType || j.desc) lines.push(`   ${j.jobType || j.desc}`);
      if (j.address) lines.push(`   ${j.address}`);
      if (j.phone) lines.push(`   ${j.phone}`);
      if (j.quoteTotal) lines.push(`   quoted ${new Intl.NumberFormat('en-CA', { style: 'currency', currency, maximumFractionDigits: 0 }).format(j.quoteTotal)}`);
      if (j.notes) lines.push(`   note: ${j.notes}`);
      lines.push('');
    }
    lines.push(`— ${bizName}`);
    return lines.join('\n');
  };

  const messageFor = (uid: string, name: string, list: Job[]) => edited[uid] ?? buildMessage(name, list);

  const send = async (uid: string, channel: 'sms' | 'email', to: string, message: string) => {
    if (!to) { toast(channel === 'sms' ? 'No phone number for this person' : 'No email for this person', '#ff4d6d'); return; }
    setBusy(uid + channel);
    try {
      const res = await fetch('/api/schedule/send', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel, to, message, subject: `Your jobs — ${dayLabel}`, bizName, replyTo: cfg.biz_email }),
      });
      const data = await res.json();
      if (!res.ok || data.error) { toast('Could not send: ' + (data.error || res.statusText), '#ff4d6d'); return; }
      setSent((p) => ({ ...p, [uid]: true }));
      toast(channel === 'sms' ? 'Schedule sent by SMS' : 'Schedule emailed');
    } catch { toast('Network error', '#ff4d6d'); }
    finally { setBusy(null); }
  };

  const sendAllSms = async () => {
    const targets = crews.filter((r) => r.person?.phone);
    if (targets.length === 0) { toast('Nobody on the list has a phone number', '#ff4d6d'); return; }
    for (const r of targets) await send(r.uid, 'sms', r.person!.phone!, messageFor(r.uid, r.person!.name, r.jobs));
  };

  const copy = async (text: string) => { try { await navigator.clipboard.writeText(text); toast('Copied'); } catch { toast('Copy failed', '#ff4d6d'); } };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ pb: 1 }}>
        Send the run sheet
        <Typography sx={{ fontSize: 12.5, color: c.text3 }}>Each person gets only their own jobs.</Typography>
      </DialogTitle>
      <DialogContent>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
          <TextField size="small" type="date" label="Day" value={day} onChange={(e) => { setDay(e.target.value); setEdited({}); setSent({}); }} InputLabelProps={{ shrink: true }} sx={{ width: 180 }} />
          <Chip size="small" label="Tomorrow" onClick={() => { setDay(toDateKey(new Date(Date.now() + 86400000))); setEdited({}); setSent({}); }} />
          <Chip size="small" label="Today" onClick={() => { setDay(toDateKey(new Date())); setEdited({}); setSent({}); }} />
        </Stack>

        {crews.length === 0 ? (
          <Typography sx={{ fontSize: 13, color: c.text3, py: 2 }}>Nothing assigned for {dayLabel}. Assign the jobs on the schedule first.</Typography>
        ) : (
          <Stack spacing={1.5}>
            {crews.map((r) => {
              const person = r.person!;
              const msg = messageFor(r.uid, person.name, r.jobs);
              const open = expanded === r.uid;
              return (
                <Paper key={r.uid} variant="outlined" sx={{ p: 1.5, borderRadius: 2.5, borderColor: sent[r.uid] ? '#059669' : c.border }}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Stack direction="row" spacing={0.75} alignItems="center">
                        <Typography sx={{ fontWeight: 800, fontSize: 14 }}>{person.name}{person.isMe ? ' (me)' : ''}</Typography>
                        <Chip size="small" label={`${r.jobs.length} job${r.jobs.length === 1 ? '' : 's'}`} sx={{ height: 19, fontSize: 10 }} />
                        {sent[r.uid] && <Chip size="small" color="success" label="sent" sx={{ height: 19, fontSize: 10 }} />}
                      </Stack>
                      <Typography sx={{ fontSize: 11.5, color: c.text3 }}>{person.phone || 'no phone'}{person.email ? ` · ${person.email}` : ''}</Typography>
                    </Box>
                    <IconButton size="small" onClick={() => setExpanded(open ? null : r.uid)}>{open ? <ExpandLess /> : <ExpandMore />}</IconButton>
                  </Stack>

                  {open && (
                    <TextField value={msg} onChange={(e) => setEdited((p) => ({ ...p, [r.uid]: e.target.value }))} multiline minRows={6} fullWidth size="small" sx={{ mt: 1.5, '& textarea': { fontFamily: 'monospace', fontSize: 12 } }} />
                  )}

                  <Stack direction="row" spacing={1} sx={{ mt: 1.25, flexWrap: 'wrap', gap: 1 }}>
                    <Button size="small" variant="contained" startIcon={busy === r.uid + 'sms' ? <CircularProgress size={14} /> : <Sms />} disabled={!person.phone || busy === r.uid + 'sms'} onClick={() => send(r.uid, 'sms', person.phone!, msg)}>SMS</Button>
                    <Button size="small" variant="outlined" startIcon={<WhatsApp />} disabled={!person.phone} component="a" target="_blank" rel="noreferrer"
                      href={`https://wa.me/${(person.phone || '').replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`} onClick={() => setSent((p) => ({ ...p, [r.uid]: true }))}>WhatsApp</Button>
                    <Button size="small" variant="outlined" startIcon={<Email />} disabled={!person.email || busy === r.uid + 'email'} onClick={() => send(r.uid, 'email', person.email!, msg)}>Email</Button>
                    <Button size="small" startIcon={<ContentCopy />} onClick={() => copy(msg)}>Copy</Button>
                  </Stack>
                </Paper>
              );
            })}

            {unassigned && (
              <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2.5, borderColor: '#D97706', bgcolor: 'rgba(217,119,6,0.06)' }}>
                <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{unassigned.jobs.length} job{unassigned.jobs.length === 1 ? '' : 's'} still unassigned</Typography>
                <Typography sx={{ fontSize: 12, color: c.text2 }}>{unassigned.jobs.map((j) => `${j.scheduledTime || '—'} ${j.client}`).join(' · ')}</Typography>
              </Paper>
            )}
          </Stack>
        )}

        <Divider sx={{ mt: 2 }} />
        <Typography sx={{ fontSize: 11.5, color: c.text3, mt: 1.5 }}>SMS needs a Twilio number in the environment. WhatsApp and Copy work without any setup.</Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Close</Button>
        <Box sx={{ flex: 1 }} />
        <Button variant="contained" startIcon={<Sms />} onClick={sendAllSms} disabled={crews.length === 0 || !!busy}>Send all by SMS</Button>
      </DialogActions>
    </Dialog>
  );
}
