export type LeadStatus = 'new' | 'hot' | 'warm' | 'cold' | 'contacted' | 'converted' | 'lost';
export type LeadSource = 'ai_bot' | 'phone' | 'web' | 'referral' | 'walk_in' | 'manual';

export interface Lead {
  id: number;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  zip?: string;
  desc?: string;
  status: LeadStatus;
  source?: LeadSource;
  created?: string;
  notes?: string;
  tags?: string[];
  assignedTo?: string;
  followUpDate?: string;
  value?: number;
}
