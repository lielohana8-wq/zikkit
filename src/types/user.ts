export type UserRole = 'owner' | 'manager' | 'dispatcher' | 'technician' | 'tech' | 'super_admin' | 'custom';

export interface User {
  id: number | string;
  name: string;
  username?: string;
  email: string;
  role: UserRole;
  customRoleName?: string;         // e.g. "Office Manager", "Senior Tech"
  customPermissions?: RolePermissions; // override role defaults
  phone?: string;
  zip?: string;
  commission?: number;
  payType?: "percentage" | "hourly" | "daily" | "fixed";
  hourlyRate?: number;
  dailyRate?: number;
  fixedSalary?: number;
  firebaseUid?: string;
  bizId?: string;
  password?: string;
  mustChangePassword?: boolean;
  passwordChangedAt?: string;
}

export interface RolePermissions {
  canEditJobs: boolean;
  canEditPrices: boolean;
  canViewReports: boolean;
  canManageUsers: boolean;
  canEditSettings: boolean;
  canEditLeads: boolean;
  canEditQuotes: boolean;
  canViewPayroll: boolean;
  canUseGPS: boolean;
  canUseBot: boolean;
}

export const ROLE_PERMS: Record<string, RolePermissions> = {
  super_admin: {
    canEditJobs: true, canEditPrices: true, canViewReports: true,
    canManageUsers: true, canEditSettings: true, canEditLeads: true,
    canEditQuotes: true, canViewPayroll: true, canUseGPS: true, canUseBot: true,
  },
  owner: {
    canEditJobs: true, canEditPrices: true, canViewReports: true,
    canManageUsers: true, canEditSettings: true, canEditLeads: true,
    canEditQuotes: true, canViewPayroll: true, canUseGPS: true, canUseBot: true,
  },
  manager: {
    canEditJobs: true, canEditPrices: true, canViewReports: true,
    canManageUsers: false, canEditSettings: false, canEditLeads: true,
    canEditQuotes: true, canViewPayroll: true, canUseGPS: true, canUseBot: false,
  },
  dispatcher: {
    canEditJobs: true, canEditPrices: false, canViewReports: false,
    canManageUsers: false, canEditSettings: false, canEditLeads: true,
    canEditQuotes: false, canViewPayroll: false, canUseGPS: true, canUseBot: false,
  },
  technician: {
    canEditJobs: false, canEditPrices: false, canViewReports: false,
    canManageUsers: false, canEditSettings: false, canEditLeads: false,
    canEditQuotes: false, canViewPayroll: false, canUseGPS: true, canUseBot: false,
  },
  custom: {
    canEditJobs: false, canEditPrices: false, canViewReports: false,
    canManageUsers: false, canEditSettings: false, canEditLeads: false,
    canEditQuotes: false, canViewPayroll: false, canUseGPS: false, canUseBot: false,
  },
};
