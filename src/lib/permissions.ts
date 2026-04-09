import { ROLE_PERMS, type User, type UserRole, type RolePermissions } from '@/types/user';

export function getPermissions(role: UserRole, customPerms?: RolePermissions): RolePermissions {
  if (customPerms) return customPerms;
  return ROLE_PERMS[role] ?? ROLE_PERMS.technician;
}

export function getUserPermissions(user: User): RolePermissions {
  if (user.customPermissions) return user.customPermissions;
  return ROLE_PERMS[user.role] ?? ROLE_PERMS.technician;
}

export function canDo(role: UserRole, action: keyof RolePermissions, customPerms?: RolePermissions): boolean {
  const perms = getPermissions(role, customPerms);
  return perms[action] ?? false;
}

export function isOwner(role: UserRole): boolean {
  return role === 'owner' || role === 'super_admin';
}

export function isTechnician(role: UserRole): boolean {
  return role === 'technician' || role === 'tech';
}

export function isSuperAdmin(role: UserRole): boolean {
  return role === 'super_admin';
}

export function getDefaultRoute(role: UserRole): string {
  if (isSuperAdmin(role)) return '/dashboard';
  if (isTechnician(role)) return '/tech/dashboard';
  return '/dashboard';
}

export function getRoleLabel(user: User): string {
  if (user.customRoleName) return user.customRoleName;
  const labels: Record<string, string> = {
    owner: 'Owner', manager: 'Manager', dispatcher: 'Dispatcher',
    technician: 'Technician', tech: 'Technician', super_admin: 'Super Admin', custom: 'Custom',
  };
  return labels[user.role] || user.role;
}
