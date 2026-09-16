'use client';

import { useMemo } from 'react';
import { canDo, isOwner, isTechnician, isSuperAdmin, getDefaultRoute } from '@/lib/permissions';
import type { UserRole, RolePermissions } from '@/types/user';

export function useRolePermissions(role: UserRole | undefined, customPerms?: RolePermissions) {
  return useMemo(() => {
    const r = role ?? 'technician';
    return {
      canEditJobs: canDo(r, 'canEditJobs', customPerms),
      canEditPrices: canDo(r, 'canEditPrices', customPerms),
      canViewReports: canDo(r, 'canViewReports', customPerms),
      canManageUsers: canDo(r, 'canManageUsers', customPerms),
      canEditSettings: canDo(r, 'canEditSettings', customPerms),
      canEditLeads: canDo(r, 'canEditLeads', customPerms),
      canEditQuotes: canDo(r, 'canEditQuotes', customPerms),
      canViewPayroll: canDo(r, 'canViewPayroll', customPerms),
      canUseGPS: canDo(r, 'canUseGPS', customPerms),
      canUseBot: canDo(r, 'canUseBot', customPerms),
      isOwner: isOwner(r),
      isTechnician: isTechnician(r),
      isSuperAdmin: isSuperAdmin(r),
      defaultRoute: getDefaultRoute(r),
    };
  }, [role, customPerms]);
}
