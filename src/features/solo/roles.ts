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
  owner: ['/dashboard', '/jobs', '/customers', '/quotes', '/receipts', '/closings', '/team', '/settings'],
  partner: ['/dashboard', '/jobs', '/customers', '/quotes', '/receipts', '/closings'],
  dispatcher: ['/dashboard', '/jobs', '/customers', '/quotes', '/receipts', '/closings'],
  technician: ['/dashboard', '/jobs', '/closings'],
};

export interface NavEntry { key: string; icon: string; label: string; href: string }
export const ROLE_NAV: Record<SoloRole, NavEntry[]> = {
  owner: [
    { key: 'dashboard', icon: '📊', label: 'Dashboard', href: '/dashboard' },
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
    { key: 'jobs', icon: '🔧', label: 'Jobs', href: '/jobs' },
    { key: 'customers', icon: '🧑', label: 'Customers', href: '/customers' },
    { key: 'quotes', icon: '📄', label: 'Quotes', href: '/quotes' },
    { key: 'receipts', icon: '🧾', label: 'Receipts', href: '/receipts' },
    { key: 'closings', icon: '✅', label: 'Closings', href: '/closings' },
  ],
  dispatcher: [
    { key: 'dashboard', icon: '📊', label: 'Dashboard', href: '/dashboard' },
    { key: 'jobs', icon: '🔧', label: 'Jobs', href: '/jobs' },
    { key: 'customers', icon: '🧑', label: 'Customers', href: '/customers' },
    { key: 'quotes', icon: '📄', label: 'Quotes', href: '/quotes' },
    { key: 'receipts', icon: '🧾', label: 'Receipts', href: '/receipts' },
    { key: 'closings', icon: '✅', label: 'Closings', href: '/closings' },
  ],
  technician: [
    { key: 'dashboard', icon: '🏠', label: 'Today', href: '/dashboard' },
    { key: 'jobs', icon: '🔧', label: 'My jobs', href: '/jobs' },
    { key: 'closings', icon: '✅', label: 'My closings', href: '/closings' },
  ],
};

export function emailKey(email: string): string {
  return email.trim().toLowerCase().replace(/[@.]/g, '_');
}
