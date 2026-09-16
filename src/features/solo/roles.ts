import type { User, SoloRole } from '@/types';

/** Map any user role onto the four Solo roles. */
export function soloRoleOf(user: User | null | undefined): SoloRole | null {
  if (!user) return null;
  const r = String(user.role);
  if (r === 'owner' || r === 'super_admin') return 'owner';
  if (r === 'partner' || r === 'manager') return 'partner';
  if (r === 'dispatcher') return 'dispatcher';
  if (r === 'technician' || r === 'tech') return 'technician';
  return null; // pending / custom → no access
}

export const ROLE_LABELS: Record<SoloRole, string> = { owner: 'Owner', partner: 'Partner', dispatcher: 'Dispatcher', technician: 'Technician' };
export const ROLE_DESCRIPTIONS: Record<SoloRole, string> = {
  owner: 'Everything, including team and settings',
  partner: 'Everything except team and settings',
  dispatcher: 'Customers, quotes, receipts, jobs and closings — no money totals on the dashboard',
  technician: 'Only their own jobs and their own closings',
};

export const isStaff = (r: SoloRole | null) => r === 'owner' || r === 'partner' || r === 'dispatcher';
export const seesMoney = (r: SoloRole | null) => r === 'owner' || r === 'partner';

/** Routes each role may open; anything else redirects to the role home. */
export const ROLE_ROUTES: Record<SoloRole, string[]> = {
  owner: ['/dashboard', '/schedule', '/jobs', '/customers', '/quotes', '/receipts', '/closings', '/team', '/settings'],
  partner: ['/dashboard', '/schedule', '/jobs', '/customers', '/quotes', '/receipts', '/closings'],
  dispatcher: ['/dashboard', '/schedule', '/jobs', '/customers', '/quotes', '/receipts', '/closings'],
  technician: ['/dashboard', '/schedule', '/jobs', '/closings'],
};

export interface NavEntry { key: string; icon: string; label: string; href: string }
export const ROLE_NAV: Record<SoloRole, NavEntry[]> = {
  owner: [
    { key: 'dashboard', icon: '📊', label: 'Dashboard', href: '/dashboard' },
    { key: 'schedule', icon: '📅', label: 'Schedule', href: '/schedule' },
    { key: 'jobs', icon: '🔧', label: 'Jobs', href: '/jobs' },
    { key: 'customers', icon: '🧑', label: 'Customers', href: '/customers' },
    { key: 'quotes', icon: '📄', label: 'Quotes', href: '/quotes' },
    { key: 'receipts', icon: '🧾', label: 'Receipts', href: '/receipts' },
    { key: 'closings', icon: '✅', label: 'Closings', href: '/closings' },
    { key: 'team', icon: '👷', label: 'Team', href: '/team' },
    { key: 'settings', icon: '⚙️', label: 'Settings', href: '/settings' },
  ],
  partner: [
    { key: 'dashboard', icon: '📊', label: 'Dashboard', href: '/dashboard' },
    { key: 'schedule', icon: '📅', label: 'Schedule', href: '/schedule' },
    { key: 'jobs', icon: '🔧', label: 'Jobs', href: '/jobs' },
    { key: 'customers', icon: '🧑', label: 'Customers', href: '/customers' },
    { key: 'quotes', icon: '📄', label: 'Quotes', href: '/quotes' },
    { key: 'receipts', icon: '🧾', label: 'Receipts', href: '/receipts' },
    { key: 'closings', icon: '✅', label: 'Closings', href: '/closings' },
  ],
  dispatcher: [
    { key: 'dashboard', icon: '📊', label: 'Dashboard', href: '/dashboard' },
    { key: 'schedule', icon: '📅', label: 'Schedule', href: '/schedule' },
    { key: 'jobs', icon: '🔧', label: 'Jobs', href: '/jobs' },
    { key: 'customers', icon: '🧑', label: 'Customers', href: '/customers' },
    { key: 'quotes', icon: '📄', label: 'Quotes', href: '/quotes' },
    { key: 'receipts', icon: '🧾', label: 'Receipts', href: '/receipts' },
    { key: 'closings', icon: '✅', label: 'Closings', href: '/closings' },
  ],
  technician: [
    { key: 'dashboard', icon: '🏠', label: 'Today', href: '/dashboard' },
    { key: 'schedule', icon: '📅', label: 'Schedule', href: '/schedule' },
    { key: 'jobs', icon: '🔧', label: 'My jobs', href: '/jobs' },
    { key: 'closings', icon: '✅', label: 'My closings', href: '/closings' },
  ],
};

export function emailKey(email: string): string {
  return email.trim().toLowerCase().replace(/[@.]/g, '_');
}

/** Calendar colours — one per team member, deterministic from the uid so every device agrees; owners can override via Team → colour. */
export const MEMBER_PALETTE = ['#4F46E5', '#0EA5E9', '#059669', '#D97706', '#DB2777', '#7C3AED', '#DC2626', '#0891B2', '#65A30D', '#9333EA'];
export function colorForUid(uid?: string | null, override?: string): string {
  if (override) return override;
  if (!uid) return '#6B7280';
  let h = 0; for (let i = 0; i < uid.length; i++) h = (h * 31 + uid.charCodeAt(i)) >>> 0;
  return MEMBER_PALETTE[h % MEMBER_PALETTE.length];
}
