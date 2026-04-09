'use client';

import { useL } from '@/hooks/useL';
import { useLanguage } from '@/hooks/useLanguage';

import { useState, useMemo } from 'react';
import { Box, Button, TextField, Typography, InputAdornment, Menu, MenuItem, Switch } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { PageTabs } from '@/components/ui/PageTabs';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { DataTable } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { ModalBase } from '@/components/modals/ModalBase';
import { useData } from '@/hooks/useFirestore';
import { useToast } from '@/hooks/useToast';
import { useAuth } from '@/features/auth/AuthProvider';
import { getFirestoreDb, doc as fbDoc, setDoc as fbSetDoc } from '@/lib/firebase';
import { getRoleLabel } from '@/lib/permissions';
import { ROLE_PERMS, type User, type UserRole, type RolePermissions } from '@/types';

const ROLE_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  owner: { label: 'Owner', he: '\u05D1\u05E2\u05DC\u05D9\u05DD', color: 'accent', icon: '\u{1F451}' },
  manager: { label: 'Manager', he: '\u05DE\u05E0\u05D4\u05DC', color: 'blue', icon: '\u{1F4CB}' },
  dispatcher: { label: 'Dispatcher', he: '\u05DE\u05D5\u05E7\u05D3', color: 'purple', icon: '\u{1F4DE}' },
  technician: { label: 'Technician', he: '\u05D8\u05DB\u05E0\u05D0\u05D9', color: 'warm', icon: '\u{1F477}' },
  tech: { label: 'Technician', he: '\u05D8\u05DB\u05E0\u05D0\u05D9', color: 'warm', icon: '\u{1F477}' },
  custom: { label: 'מותאם', he: '\u05DE\u05D5\u05EA\u05D0\u05DD', color: 'teal', icon: '\u2699\uFE0F' },
};

const PERM_CONFIG: { key: keyof RolePermissions; label: string; he: string; icon: string; desc: string; descHe: string }[] = [
  { key: 'canEditJobs', label: 'עריכת עבודות', he: '\u05E2\u05E8\u05D9\u05DB\u05EA \u05E2\u05D1\u05D5\u05D3\u05D5\u05EA', icon: '\u{1F527}', desc: 'יצירה, עריכה, סגירה, מחיקה', descHe: '\u05D9\u05E6\u05D9\u05E8\u05D4, \u05E2\u05E8\u05D9\u05DB\u05D4, \u05E1\u05D2\u05D9\u05E8\u05D4, \u05DE\u05D7\u05D9\u05E7\u05D4' },
  { key: 'canEditLeads', label: 'עריכת לידs', he: '\u05E2\u05E8\u05D9\u05DB\u05EA \u05DC\u05D9\u05D3\u05D9\u05DD', icon: '\u{1F4DE}', desc: 'יצירה, עריכה, המרת לידים', descHe: '\u05D9\u05E6\u05D9\u05E8\u05D4, \u05E2\u05E8\u05D9\u05DB\u05D4, \u05D4\u05DE\u05E8\u05D4' },
  { key: 'canEditQuotes', label: 'עריכת הצעות', he: '\u05E2\u05E8\u05D9\u05DB\u05EA \u05D4\u05E6\u05E2\u05D5\u05EA', icon: '\u{1F4C4}', desc: 'יצירה, עריכה, שליחה', descHe: '\u05D9\u05E6\u05D9\u05E8\u05D4, \u05E2\u05E8\u05D9\u05DB\u05D4, \u05E9\u05DC\u05D9\u05D7\u05D4' },
  { key: 'canEditPrices', label: 'עריכת מחירים', he: '\u05E2\u05E8\u05D9\u05DB\u05EA \u05DE\u05D7\u05D9\u05E8\u05D9\u05DD', icon: '\u{1F4B2}', desc: 'עריכת מחירון', descHe: '\u05E2\u05E8\u05D9\u05DB\u05EA \u05DE\u05D7\u05D9\u05E8\u05D5\u05DF' },
  { key: 'canViewReports', label: 'צפייה בדוחות', he: '\u05E6\u05E4\u05D9\u05D9\u05D4 \u05D1\u05D3\u05D5\u05D7\u05D5\u05EA', icon: '\u{1F4C8}', desc: 'גישה לדוחות', descHe: '\u05D2\u05D9\u05E9\u05D4 \u05DC\u05D3\u05D5\u05D7\u05D5\u05EA' },
  { key: 'canViewPayroll', label: 'צפייה בשכר', he: '\u05E6\u05E4\u05D9\u05D9\u05D4 \u05D1\u05E9\u05DB\u05E8', icon: '\u{1F4B0}', desc: 'גישה לשכר', descHe: '\u05D2\u05D9\u05E9\u05D4 \u05DC\u05E9\u05DB\u05E8' },
  { key: 'canManageUsers', label: 'ניהול משתמשים', he: '\u05E0\u05D9\u05D4\u05D5\u05DC \u05DE\u05E9\u05EA\u05DE\u05E9\u05D9\u05DD', icon: '\u{1F465}', desc: 'הוספה, עריכה, מחיקה', descHe: '\u05D4\u05D5\u05E1\u05E4\u05D4, \u05E2\u05E8\u05D9\u05DB\u05D4, \u05DE\u05D7\u05D9\u05E7\u05D4' },
  { key: 'canEditSettings', label: 'עריכת הגדרות', he: '\u05E2\u05E8\u05D9\u05DB\u05EA \u05D4\u05D2\u05D3\u05E8\u05D5\u05EA', icon: '\u2699\uFE0F', desc: 'שינוי הגדרות', descHe: '\u05E9\u05D9\u05E0\u05D5\u05D9 \u05D4\u05D2\u05D3\u05E8\u05D5\u05EA' },
  { key: 'canUseGPS', label: 'מעקב GPS', he: '\u05DE\u05E2\u05E7\u05D1 GPS', icon: '\u{1F4CD}', desc: 'צפייה במיקומים', descHe: '\u05E6\u05E4\u05D9\u05D9\u05D4 \u05D1\u05DE\u05D9\u05E7\u05D5\u05DE\u05D9\u05DD' },
  { key: 'canUseBot', label: 'הגדרת בוט', he: '\u05D4\u05D2\u05D3\u05E8\u05EA \u05D1\u05D5\u05D8', icon: '\u{1F916}', desc: 'הגדרת בוט AI', descHe: '\u05D4\u05D2\u05D3\u05E8\u05EA \u05D1\u05D5\u05D8 AI' },
];

export default function UsersPage() {
  const { db, saveData } = useData();
  const L = useL();
  const { lang } = useLanguage();
  const { toast } = useToast();
  const { sendPasswordReset, bizId } = useAuth();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState<Partial<User>>({});
  const [editPerms, setEditPerms] = useState<RolePermissions>({ ...ROLE_PERMS.technician });
  const [useCustomPerms, setUseCustomPerms] = useState(false);

  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [menuUser, setMenuUser] = useState<User | null>(null);

  const users = useMemo(() => {
    let filtered = [...(db.users || [])];
    if (roleFilter !== 'all') filtered = filtered.filter((u) => u.role === roleFilter || (roleFilter === 'technician' && u.role === 'tech'));
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter((u) =>
        u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) || u.phone?.includes(q)
        || u.customRoleName?.toLowerCase().includes(q)
      );
    }
    return filtered;
  }, [db.users, search, roleFilter]);

  const roleCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    (db.users || []).forEach((u) => {
      const r = u.role === 'tech' ? 'technician' : u.role;
      counts[r] = (counts[r] || 0) + 1;
    });
    return counts;
  }, [db.users]);

  const openNew = () => {
    const defaultPerms = { ...ROLE_PERMS.technician };
    setEditUser({ name: '', email: '', phone: '', role: 'technician', commission: 0 });
    setEditPerms(defaultPerms);
    setUseCustomPerms(false);
    setShowModal(true);
  };

  const openEdit = (user: User) => {
    setEditUser({ ...user });
    const hasCustom = !!user.customPermissions;
    setUseCustomPerms(hasCustom || user.role === 'custom');
    setEditPerms(user.customPermissions || ROLE_PERMS[user.role] || { ...ROLE_PERMS.technician });
    setShowModal(true);
  };

  const handleRoleSelect = (role: UserRole) => {
    setEditUser({ ...editUser, role });
    if (role !== 'custom') {
      setEditPerms({ ...ROLE_PERMS[role] });
      setUseCustomPerms(false);
    } else {
      setUseCustomPerms(true);
    }
  };

  const togglePerm = (key: keyof RolePermissions) => {
    setEditPerms({ ...editPerms, [key]: !editPerms[key] });
  };

  const handleSave = async () => {
    if (!editUser.name?.trim()) { toast('הכנס שם', '#ff4d6d'); return; }
    if (!editUser.email?.trim()) { toast('הכנס אימייל', '#ff4d6d'); return; }
    if (editUser.role === 'custom' && !editUser.customRoleName?.trim()) { toast('הכנס שם תפקיד', '#ff4d6d'); return; }

    const usersList = [...(db.users || [])];
    const userData: Partial<User> = {
      ...editUser,
      customPermissions: useCustomPerms ? editPerms : undefined,
      customRoleName: editUser.role === 'custom' ? editUser.customRoleName : undefined,
    };

    if (editUser.id) {
      const idx = usersList.findIndex((u) => u.id === editUser.id);
      if (idx >= 0) usersList[idx] = { ...usersList[idx], ...userData } as User;
    } else {
      const maxId = usersList.reduce((m, u) => Math.max(m, typeof u.id === 'number' ? u.id : 0), 0);
      usersList.push({ ...userData, id: maxId + 1, mustChangePassword: true } as User);

      // Create Firebase Auth account + tech_lookup for non-owner roles
      if (editUser.role !== 'owner' && editUser.email && bizId) {
        try {
          // Create Firebase Auth account via API
          const res = await fetch('/api/users/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: editUser.email,
              password: 'Tech1234!',
              bizId,
              userName: editUser.name,
              role: editUser.role || 'technician',
            }),
          });
          const data = await res.json();
          if (!data.success && data.error && data.error !== 'EMAIL_EXISTS') {
            toast('אימות: ' + data.error, '#f59e0b');
          }

          // Create tech_lookup from CLIENT (authenticated as owner)
          try {
            const firestore = getFirestoreDb();
            const lookupKey = editUser.email.toLowerCase().replace(/[@.]/g, '_');
            await fbSetDoc(fbDoc(firestore, 'tech_lookup', lookupKey), {
              bizId,
              email: editUser.email.toLowerCase(),
              name: editUser.name || '',
              role: editUser.role || 'technician',
              created: new Date().toISOString(),
            });
          } catch (e2) {
            console.error('[Users] tech_lookup write failed:', e2);
          }
        } catch (e) {
          console.warn('[Users] Tech setup partial:', e);
        }
      }
    }
    await saveData({ ...db, users: usersList });
    setShowModal(false);
    toast(editUser.id ? '✅ User updated!' : '✅ User created!');
  };

  const handleDelete = async (user: User) => {
    if (user.role === 'owner') { toast('לא ניתן למחוק את הבעלים', '#ff4d6d'); return; }
    if (!confirm(L('Delete ','מחק ') + user.name + '?')) return;
    await saveData({ ...db, users: (db.users || []).filter((u) => u.id !== user.id) });
    toast('משתמש נמחק');
    handleCloseMenu();
  };

  const handleOpenMenu = (event: React.MouseEvent<HTMLElement>, user: User) => {
    event.stopPropagation();
    setMenuAnchor(event.currentTarget);
    setMenuUser(user);
  };

  const handleCloseMenu = () => { setMenuAnchor(null); setMenuUser(null); };

  const handleResetPassword = async (user: User) => {
    if (!user.email) { toast('אין אימייל', '#ff4d6d'); return; }
    try {
      await sendPasswordReset(user.email);
      const usersList = [...(db.users || [])];
      const idx = usersList.findIndex((u) => u.id === user.id);
      if (idx >= 0) { usersList[idx] = { ...usersList[idx], mustChangePassword: true }; await saveData({ ...db, users: usersList }); }
      toast('✅ Password reset sent to ' + user.email);
    } catch (e) { toast((e as Error).message, '#ff4d6d'); }
    handleCloseMenu();
  };

  const Label = ({ text }: { text: string }) => (
    <Box component="label" sx={{ fontSize: 10, fontWeight: 700, color: '#78716C', mb: '7px', letterSpacing: '0.5px', textTransform: 'uppercase', display: 'block' }}>{text}</Box>
  );

  // Count active permissions for a user
  const countPerms = (u: User) => {
    const perms = u.customPermissions || ROLE_PERMS[u.role] || ROLE_PERMS.technician;
    return Object.values(perms).filter(Boolean).length;
  };

  return (
    <Box className="zk-fade-up" sx={{ animation: 'fadeIn 0.2s ease' }}>
      <PageTabs tabs={[{ label: 'טכנאים', href: '/technicians', icon: '👷' }, { label: 'משתמשים', href: '/users', icon: '🔐' }]} />
      <SectionHeader title={L('User Management','ניהול משתמשים')} subtitle={users.length + L(' users',' משתמשים')} actions={
        <Button variant="contained" size="small" onClick={openNew}>{L('+ משתמש חדש','+ משתמש חדש')}</Button>
      } />

      {/* Filters */}
      <Box sx={{ display: 'flex', gap: '10px', mb: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField placeholder={L("חיפוש משתמשים...","חפש משתמשים...")} value={search} onChange={(e) => setSearch(e.target.value)} size="small" sx={{ minWidth: 220 }}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 16, color: '#78716C' }} /></InputAdornment> }} />
        {['all', 'owner', 'manager', 'dispatcher', 'technician', 'custom'].map((r) => (
          <Button key={r} size="small" onClick={() => setRoleFilter(r)} sx={{
            px: '10px', py: '4px', fontSize: 10, fontWeight: 700, borderRadius: '8px', minWidth: 'auto', textTransform: 'capitalize',
            bgcolor: roleFilter === r ? 'rgba(79,70,229,0.08)' : 'rgba(0,0,0,0.03)',
            color: roleFilter === r ? '#4F46E5' : '#78716C',
            border: '1px solid ' + (roleFilter === r ? 'rgba(79,70,229,0.25)' : 'rgba(0,0,0,0.08)'),
          }}>
            {r === 'all' ? `${L('All','הכל')} (${(db.users || []).length})` : `${ROLE_CONFIG[r]?.icon || ''} ${lang === 'he' ? (ROLE_CONFIG[r]?.he || r) : (ROLE_CONFIG[r]?.label || r)} (${roleCounts[r] || 0})`}
          </Button>
        ))}
      </Box>

      {/* Users Table */}
      {users.length === 0 ? (
        <EmptyState icon="👤" title={L("No Users","אין משתמשים")} subtitle={L("Add team members to your business.","הוסף חברי צוות לעסק שלך.")} actionLabel={L("+ משתמש חדש","+ משתמש חדש")} onAction={openNew} />
      ) : (
        <Box sx={{ bgcolor: '#FAF7F4', border: '1px solid rgba(0,0,0,0.06)', borderRadius: '14px', overflow: 'hidden' }}>
          <DataTable<User>
            keyExtractor={(u) => u.id}
            columns={[
              { key: 'name', label: 'שם', render: (u) => (
                <Box>
                  <Typography sx={{ fontWeight: 700, fontSize: 12 }}>{u.name}</Typography>
                  <Typography sx={{ fontSize: 10, color: '#78716C' }}>{u.email}</Typography>
                </Box>
              )},
              { key: 'phone', label: 'טלפון', render: (u) => u.phone || '—' },
              { key: 'role', label: L('Role','תפקיד'), render: (u) => {
                const label = getRoleLabel(u);
                const r = ROLE_CONFIG[u.role] || ROLE_CONFIG.custom;
                return <Badge label={`${r.icon} ${label}`} variant={r.color} />;
              }},
              { key: 'permissions', label: L('Permissions','הרשאות'), render: (u) => {
                const count = countPerms(u);
                const isCustom = !!u.customPermissions;
                return (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Typography sx={{ fontSize: 11, fontWeight: 600, color: count > 7 ? '#22c55e' : count > 3 ? '#f59e0b' : '#78716C' }}>
                      {count}/10
                    </Typography>
                    {isCustom && <Badge label="Custom" variant="teal" />}
                  </Box>
                );
              }},
              { key: 'commission', label: 'עמלה', render: (u) => (u.role === 'tech' || u.role === 'technician') ? (u.commission || 0) + '%' : '—' },
              { key: 'actions', label: '', width: 80, render: (u) => (
                <Button size="small" onClick={(e) => handleOpenMenu(e, u)}
                  sx={{ fontSize: 11, minWidth: 'auto', p: '3px 10px', bgcolor: 'rgba(0,0,0,0.03)', color: '#A8A29E', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '6px' }}>
                  ⋮
                </Button>
              )},
            ]}
            data={users}
            onRowClick={openEdit}
          />
        </Box>
      )}

      {/* Actions Menu */}
      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={handleCloseMenu}
        PaperProps={{ sx: { bgcolor: '#FAF7F4', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '10px', minWidth: 200 } }}>
        <MenuItem onClick={() => { if (menuUser) openEdit(menuUser); handleCloseMenu(); }}
          sx={{ fontSize: 12, gap: '8px', color: '#A8A29E', '&:hover': { bgcolor: 'rgba(0,0,0,0.03)' } }}>
          ✏️ עריכת משתמש & Permissions
        </MenuItem>
        <MenuItem onClick={() => { if (menuUser) handleResetPassword(menuUser); }}
          sx={{ fontSize: 12, gap: '8px', color: '#a78bfa', '&:hover': { bgcolor: 'rgba(167,139,250,0.08)' } }}>
          {L('{1F511} Reset Password','{1F511} איפוס סיסמה')}
        </MenuItem>
        <MenuItem onClick={() => { if (menuUser) handleDelete(menuUser); }}
          sx={{ fontSize: 12, gap: '8px', color: '#ff4d6d', '&:hover': { bgcolor: 'rgba(255,77,109,0.1)' } }}>
          🗑️ Delete User
        </MenuItem>
      </Menu>

      {/* ══ Create/Edit Modal with Permissions ══ */}
      <ModalBase open={showModal} onClose={() => setShowModal(false)} title={editUser.id ? L('עריכת משתמש','ערוך משתמש') : L('משתמש חדש','משתמש חדש')}
        footer={<>
          <Button variant="outlined" size="small" onClick={() => setShowModal(false)}>{L('Cancel','ביטול')}</Button>
          <Button variant="contained" size="small" onClick={handleSave}>{editUser.id ? L('עדכן','עדכן') : L('Create User','צור משתמש')}</Button>
        </>}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Basic Info */}
          <Box><Label text="Full Name *" /><TextField fullWidth size="small" value={editUser.name || ''} onChange={(e) => setEditUser({ ...editUser, name: e.target.value })} placeholder={L('John Smith','שם הלקוח')} /></Box>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <Box><Label text={L("Email *","מייל *")} /><TextField fullWidth size="small" type="email" value={editUser.email || ''} onChange={(e) => setEditUser({ ...editUser, email: e.target.value })} placeholder={L("john@business.com","john@business.com")} /></Box>
            <Box><Label text={L("Phone","טלפון")} /><TextField fullWidth size="small" value={editUser.phone || ''} onChange={(e) => setEditUser({ ...editUser, phone: e.target.value })} /></Box>
          </Box>

          {/* Role Selection */}
          <Box><Label text={L("Role","תפקיד")} />
            <Box sx={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {(['owner', 'manager', 'dispatcher', 'technician', 'custom'] as UserRole[]).map((r) => (
                <Button key={r} size="small" onClick={() => handleRoleSelect(r)} sx={{
                  px: '14px', py: '6px', fontSize: 11, fontWeight: 700, borderRadius: '8px', minWidth: 'auto',
                  bgcolor: editUser.role === r ? 'rgba(79,70,229,0.08)' : 'rgba(0,0,0,0.03)',
                  color: editUser.role === r ? '#4F46E5' : '#78716C',
                  border: '1px solid ' + (editUser.role === r ? 'rgba(79,70,229,0.25)' : 'rgba(0,0,0,0.08)'),
                }}>
                  {ROLE_CONFIG[r]?.icon} {lang === 'he' ? ROLE_CONFIG[r]?.he : ROLE_CONFIG[r]?.label}
                </Button>
              ))}
            </Box>
          </Box>

          {/* Custom Role Name */}
          {editUser.role === 'custom' && (
            <Box><Label text={L("Custom Role Name *","שם תפקיד מותאם *")} />
              <TextField fullWidth size="small" value={editUser.customRoleName || ''} onChange={(e) => setEditUser({ ...editUser, customRoleName: e.target.value })}
                placeholder={L("e.g. Office Manager...","למשל: מנהל משרד, טכנאי בכיר...")} />
            </Box>
          )}

          {/* Commission for tech roles */}
          {(editUser.role === 'technician' || editUser.role === 'tech' || editUser.role === 'custom') && (
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <Box><Label text={L("Commission %","עמלה %")} /><TextField fullWidth size="small" type="number" value={editUser.commission || 0} onChange={(e) => setEditUser({ ...editUser, commission: parseFloat(e.target.value) || 0 })} /></Box>
              <Box><Label text={L("ZIP Code","מיקוד")} /><TextField fullWidth size="small" value={editUser.zip || ''} onChange={(e) => setEditUser({ ...editUser, zip: e.target.value })} /></Box>
            </Box>
          )}

          {/* ── Permissions Section ── */}
          <Box sx={{ bgcolor: '#FAF7F4', border: '1px solid rgba(0,0,0,0.06)', borderRadius: '12px', overflow: 'hidden' }}>
            {/* Header */}
            <Box sx={{ p: '12px 16px', borderBottom: '1px solid rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography sx={{ fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                🔐 Permissions
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Typography sx={{ fontSize: 10, color: useCustomPerms ? '#4F46E5' : '#78716C' }}>
                  {useCustomPerms ? 'Custom' : 'Role Default'}
                </Typography>
                <Switch size="small" checked={useCustomPerms} onChange={() => {
                  if (!useCustomPerms) {
                    // Switching to custom — start with current role defaults
                    setEditPerms({ ...(ROLE_PERMS[editUser.role || 'technician'] || ROLE_PERMS.technician) });
                  }
                  setUseCustomPerms(!useCustomPerms);
                }} sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: '#4F46E5' }, '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: 'rgba(79,70,229,0.25)' } }} />
              </Box>
            </Box>

            {/* Permission Toggles */}
            <Box sx={{ p: '8px' }}>
              {PERM_CONFIG.map((perm) => {
                const isOn = useCustomPerms ? editPerms[perm.key] : (ROLE_PERMS[editUser.role || 'technician']?.[perm.key] ?? false);
                return (
                  <Box key={perm.key} onClick={() => { if (useCustomPerms) togglePerm(perm.key); }} sx={{
                    display: 'flex', alignItems: 'center', gap: '12px', p: '8px 12px', borderRadius: '8px',
                    cursor: useCustomPerms ? 'pointer' : 'default', opacity: useCustomPerms ? 1 : 0.6,
                    '&:hover': useCustomPerms ? { bgcolor: 'rgba(0,0,0,0.02)' } : {},
                    transition: 'all 0.15s',
                  }}>
                    <Box sx={{
                      width: 32, height: 18, borderRadius: '9px', position: 'relative',
                      bgcolor: isOn ? 'rgba(0,229,176,0.2)' : 'rgba(0,0,0,0.06)',
                      border: '1px solid ' + (isOn ? 'rgba(0,229,176,0.4)' : 'rgba(0,0,0,0.08)'),
                      transition: 'all 0.2s', flexShrink: 0,
                    }}>
                      <Box sx={{
                        width: 12, height: 12, borderRadius: '50%', position: 'absolute', top: 2,
                        left: isOn ? 16 : 2,
                        bgcolor: isOn ? '#4F46E5' : '#78716C',
                        transition: 'all 0.2s',
                      }} />
                    </Box>
                    <Typography sx={{ fontSize: 16, lineHeight: 1 }}>{perm.icon}</Typography>
                    <Box sx={{ flex: 1 }}>
                      <Typography sx={{ fontSize: 12, fontWeight: 600, color: isOn ? '#e0e8ef' : '#78716C' }}>
                        {lang === 'he' ? perm.he : perm.label}
                      </Typography>
                      <Typography sx={{ fontSize: 10, color: '#3a4a55' }}>{lang === 'he' ? perm.descHe : perm.desc}</Typography>
                    </Box>
                  </Box>
                );
              })}
            </Box>

            {/* Quick actions */}
            {useCustomPerms && (
              <Box sx={{ p: '8px 16px 12px', display: 'flex', gap: '6px', borderTop: '1px solid rgba(0,0,0,0.03)' }}>
                <Button size="small" onClick={() => {
                  const all: RolePermissions = {} as RolePermissions;
                  PERM_CONFIG.forEach((p) => { (all as Record<string, boolean>)[p.key] = true; });
                  setEditPerms(all);
                }} sx={{ fontSize: 9, color: '#22c55e', minWidth: 'auto' }}>✅ All On</Button>
                <Button size="small" onClick={() => {
                  const none: RolePermissions = {} as RolePermissions;
                  PERM_CONFIG.forEach((p) => { (none as Record<string, boolean>)[p.key] = false; });
                  setEditPerms(none);
                }} sx={{ fontSize: 9, color: '#ef4444', minWidth: 'auto' }}>❌ All Off</Button>
                {['manager', 'dispatcher', 'technician'].map((r) => (
                  <Button key={r} size="small" onClick={() => setEditPerms({ ...ROLE_PERMS[r] })}
                    sx={{ fontSize: 9, color: '#4f8fff', minWidth: 'auto' }}>
                    {L('Copy','העתק')} {lang === 'he' ? ROLE_CONFIG[r]?.he : ROLE_CONFIG[r]?.label}
                  </Button>
                ))}
              </Box>
            )}
          </Box>

          {/* First login note */}
          {!editUser.id && (
            <Box sx={{ bgcolor: 'rgba(0,229,176,0.04)', border: '1px solid rgba(79,70,229,0.12)', borderRadius: '10px', p: '11px 14px', fontSize: 12, color: '#A8A29E', lineHeight: 1.7 }}>
              💡 L('Login with email. Default password:','כניסה עם מייל. סיסמה ראשונית:') + ' <strong>Tech1234!</strong><br />
              🔐 {L('Must change password on first login.','חייב לשנות סיסמה בכניסה ראשונה.')}
            </Box>
          )}
        </Box>
      </ModalBase>
    </Box>
  );
}
