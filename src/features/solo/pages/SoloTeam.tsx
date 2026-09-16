'use client';
import { useMemo, useState } from 'react';
import { Box, Typography, Button, Paper, Dialog, DialogTitle, DialogContent, DialogActions, Stack, TextField, Chip, IconButton, Divider } from '@mui/material';
import { Add, ContentCopy, WhatsApp, Delete, Link as LinkIcon, Email } from '@mui/icons-material';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { getFirestoreDb } from '@/lib/firebase';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { zikkitColors as c } from '@/styles/theme';
import { getBaseUrl, normalizePhone } from '@/lib/region';
import { useToast } from '@/hooks/useToast';
import { newId } from '@/lib/data/collections';
import { useSolo, randomToken } from '../useSolo';
import { SelectField } from '../components/SoloUI';
import { ROLE_LABELS, ROLE_DESCRIPTIONS, emailKey, MEMBER_PALETTE, colorForUid } from '../roles';
import type { User, SoloRole, Invite } from '@/types';

/**
 * Team — owner only. Each member gets a personal invite link (/join/<token>);
 * they sign up with the invited email and land straight in this business.
 */
export default function SoloTeam() {
  const { team, bizId, cfg, db, saveMember, deleteItem } = useSolo();
  const { toast } = useToast();
  const [draft, setDraft] = useState<{ id?: number; name: string; email: string; phone: string; role: SoloRole; color?: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [showLink, setShowLink] = useState<User | null>(null);
  const [sending, setSending] = useState(false);

  const members = useMemo(() => ((db.members || []) as Array<{ uid: string; email?: string; role?: string; joined?: string }>), [db.members]);
  const joinedByEmail = useMemo(() => new Map(members.map((m) => [String(m.email || '').toLowerCase(), m])), [members]);

  const inviteUrl = (u: User) => `${getBaseUrl()}/join/${u.inviteToken}`;
  const inviteText = (u: User) => `Hi ${u.name}, you've been added to ${cfg.biz_name || 'our team'} on Zikkit as ${ROLE_LABELS[(u.role as SoloRole) || 'technician']}. Sign up with ${u.email} here: ${inviteUrl(u)}`;

  const save = async () => {
    if (!draft || !bizId) return;
    const email = draft.email.trim().toLowerCase();
    if (!draft.name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { toast('Name and a valid email are required', '#ff4d6d'); return; }
    if (team.some((u) => u.email?.toLowerCase() === email && u.id !== draft.id)) { toast('This email is already on the team', '#ff4d6d'); return; }
    setSaving(true);
    try {
      const existing = draft.id != null ? team.find((u) => u.id === draft.id) : undefined;
      const token = existing?.inviteToken || randomToken(24);
      const member: User = {
        ...(existing || {}), id: existing?.id ?? newId(), name: draft.name.trim(), email, phone: normalizePhone(draft.phone), role: draft.role, color: draft.color || existing?.color,
        active: true, inviteToken: token, invitedAt: existing?.invitedAt || new Date().toISOString(),
      } as User;
      const firestore = getFirestoreDb();
      // 1. lookup so their login routes here (and rules validate their role)
      await setDoc(doc(firestore, 'tech_lookup', emailKey(email)), { bizId, email, name: member.name, role: draft.role, active: true, inviteToken: token, created: new Date().toISOString() }, { merge: true });
      // 2. public invite doc for the /join page
      const invite: Invite = { token, bizId, bizName: cfg.biz_name || 'Business', email, name: member.name, role: draft.role, created: new Date().toISOString(), status: 'pending' };
      await setDoc(doc(firestore, 'invites', token), invite, { merge: true });
      // 3. team record
      await saveMember(member);
      setDraft(null); setShowLink(member);
      toast(existing ? 'Member updated' : 'Invite created');
    } catch (e) { toast('Could not save: ' + ((e as Error)?.message || ''), '#ff4d6d'); }
    finally { setSaving(false); }
  };

  const remove = async (u: User) => {
    if (!confirm(`Remove ${u.name} from the team? Their jobs and closings stay.`)) return;
    try {
      const firestore = getFirestoreDb();
      await setDoc(doc(firestore, 'tech_lookup', emailKey(u.email)), { active: false, bizId }, { merge: true });
      const m = joinedByEmail.get(u.email.toLowerCase());
      if (m?.uid && bizId) { try { await deleteDoc(doc(firestore, 'businesses', bizId, 'members', m.uid)); } catch {} }
      if (u.inviteToken) { try { await setDoc(doc(firestore, 'invites', u.inviteToken), { status: 'revoked', bizId }, { merge: true }); } catch {} }
      await deleteItem('users', u.id);
      toast('Access removed');
    } catch (e) { toast('Could not remove: ' + ((e as Error)?.message || ''), '#ff4d6d'); }
  };

  const emailInvite = async (u: User) => {
    setSending(true);
    try {
      const res = await fetch('/api/team/invite', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ to: u.email, name: u.name, bizName: cfg.biz_name || 'our team', role: ROLE_LABELS[(u.role as SoloRole) || 'technician'], url: inviteUrl(u), replyTo: cfg.biz_email }) });
      const data = await res.json();
      if (!res.ok || data.error) toast('Email failed: ' + (data.error || res.statusText), '#ff4d6d'); else toast(`Invite emailed to ${u.email}`);
    } catch { toast('Network error', '#ff4d6d'); }
    finally { setSending(false); }
  };

  const copy = async (text: string) => { try { await navigator.clipboard.writeText(text); toast('Copied'); } catch { toast('Copy failed', '#ff4d6d'); } };

  return (
    <Box className="zk-fade-up">
      <SectionHeader title="Team" subtitle={`${team.length} member${team.length === 1 ? '' : 's'}`} actions={<Button variant="contained" startIcon={<Add />} onClick={() => setDraft({ name: '', email: '', phone: '', role: 'technician' })}>Invite member</Button>} />

      {team.length === 0 ? (
        <EmptyState icon="👷" title="Just you for now" subtitle="Invite a technician, a partner or a dispatcher. Each gets a personal link and signs up with the email you enter." actionLabel="Invite member" onAction={() => setDraft({ name: '', email: '', phone: '', role: 'technician' })} />
      ) : (
        <Stack spacing={1}>
          {team.map((u) => {
            const joined = joinedByEmail.get((u.email || '').toLowerCase());
            return (
              <Paper key={u.id} sx={{ p: 1.75, borderRadius: 3, border: `1px solid ${c.border}` }}>
                <Stack direction="row" alignItems="center" spacing={1.5}>
                  <Box sx={{ width: 40, height: 40, borderRadius: '50%', bgcolor: colorForUid(joined?.uid || u.email, u.color), color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900 }}>{(u.name || '?').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()}</Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Stack direction="row" spacing={1} alignItems="center"><Typography sx={{ fontWeight: 800, fontSize: 14 }}>{u.name}</Typography><Chip size="small" label={ROLE_LABELS[(u.role as SoloRole)] || u.role} sx={{ height: 20, fontSize: 10 }} />{joined ? <Chip size="small" color="success" label="Joined" sx={{ height: 20, fontSize: 10 }} /> : <Chip size="small" color="warning" label="Invited — not signed up yet" sx={{ height: 20, fontSize: 10 }} />}</Stack>
                    <Typography sx={{ fontSize: 12, color: c.text3 }}>{u.email}{u.phone ? ` · ${u.phone}` : ''}</Typography>
                  </Box>
                  <IconButton size="small" onClick={() => setShowLink(u)} title="Invite link"><LinkIcon fontSize="small" /></IconButton>
                  <IconButton size="small" onClick={() => setDraft({ id: u.id as number, name: u.name, email: u.email, phone: u.phone || '', role: (u.role as SoloRole) || 'technician', color: u.color })} title="Edit">✏️</IconButton>
                  <IconButton size="small" color="error" onClick={() => remove(u)}><Delete fontSize="small" /></IconButton>
                </Stack>
              </Paper>
            );
          })}
        </Stack>
      )}

      {/* Invite / edit */}
      <Dialog open={!!draft} onClose={() => setDraft(null)} fullWidth maxWidth="xs">
        <DialogTitle>{draft?.id ? 'Edit member' : 'Invite a team member'}</DialogTitle>
        <DialogContent>
          {draft && (
            <Stack spacing={1.5} sx={{ mt: 1 }}>
              <TextField label="Full name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} fullWidth autoFocus />
              <TextField label="Email (they sign up with this)" type="email" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} fullWidth disabled={!!draft.id} />
              <TextField label="Phone" value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} fullWidth />
              <SelectField label="Role" value={draft.role} onChange={(v) => setDraft({ ...draft, role: v })} options={(['technician', 'dispatcher', 'partner'] as SoloRole[]).map((r) => ({ value: r, label: ROLE_LABELS[r] }))} size="medium" />
              <Typography sx={{ fontSize: 12, color: c.text3 }}>{ROLE_DESCRIPTIONS[draft.role]}</Typography>
              <Box>
                <Typography sx={{ fontSize: 12, color: c.text3, mb: 0.5 }}>Calendar colour</Typography>
                <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                  {MEMBER_PALETTE.map((col) => <Box key={col} onClick={() => setDraft({ ...draft, color: col })} sx={{ width: 26, height: 26, borderRadius: '50%', bgcolor: col, cursor: 'pointer', outline: draft.color === col ? `3px solid ${c.text}` : '3px solid transparent', outlineOffset: 2 }} />)}
                </Stack>
              </Box>
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDraft(null)}>Cancel</Button>
          <Button variant="contained" onClick={save} disabled={saving}>{saving ? 'Saving…' : draft?.id ? 'Save' : 'Create invite'}</Button>
        </DialogActions>
      </Dialog>

      {/* Invite link */}
      <Dialog open={!!showLink} onClose={() => setShowLink(null)} fullWidth maxWidth="xs">
        {showLink && (
          <>
            <DialogTitle>Invite {showLink.name}</DialogTitle>
            <DialogContent>
              <Typography sx={{ fontSize: 13, color: c.text2, mb: 1.5 }}>Send this link. They must sign up with <b>{showLink.email}</b> — the link only works for that email.</Typography>
              <TextField value={inviteUrl(showLink)} fullWidth size="small" InputProps={{ readOnly: true, endAdornment: <IconButton size="small" onClick={() => copy(inviteUrl(showLink))}><ContentCopy fontSize="small" /></IconButton> }} />
              <Divider sx={{ my: 2 }} />
              <Stack direction="row" spacing={1}>
                <Button fullWidth variant="contained" startIcon={<Email />} onClick={() => emailInvite(showLink)} disabled={sending}>{sending ? 'Sending…' : 'Email invite'}</Button>
                <Button fullWidth variant="outlined" startIcon={<WhatsApp />} href={`https://wa.me/${(showLink.phone || '').replace(/\D/g, '')}?text=${encodeURIComponent(inviteText(showLink))}`} target="_blank" rel="noreferrer" disabled={!showLink.phone}>WhatsApp</Button>
              </Stack>
              <Button fullWidth size="small" onClick={() => copy(inviteText(showLink))} sx={{ mt: 1 }}>Copy message</Button>
            </DialogContent>
            <DialogActions><Button onClick={() => setShowLink(null)}>Done</Button></DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
}
