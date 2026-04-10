export type JobStatus =
  | 'open'
  | 'assigned'
  | 'in_progress'
  | 'waiting_parts'
  | 'parts_arrived'
  | 'scheduled'
  | 'completed'
  | 'cancelled'
  | 'no_answer'
  | 'callback'
  | 'dispute';

export interface Job {
  id: number;
  num?: string;
  client: string;
  phone?: string;
  email?: string;
  address?: string;
  zip?: string;
  desc?: string;
  status: JobStatus;
  tech?: string;
  techId?: number;
  date?: string;
  time?: string;
  created?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  revenue?: number;
  cost?: number;
  materials?: number;
  notes?: string;
  tags?: string[];
  source?: string;
  followups?: FollowUp[];
  signature?: string;
  partsEta?: string;
  scheduledDate?: string;
  scheduledTime?: string;
  duration?: number; // minutes, default 60
  gpsCheckins?: GPSCheckin[];
  portalToken?: string;
  paymentMethod?: string;
  photos?: string[];
  lineItems?: { id: number; name: string; qty: number; price: number; image?: string }[];
  timerStart?: number;
  timerElapsed?: number;
}

export interface FollowUp {
  type: string;
  date: string;
  sent: boolean;
  note?: string;
}

export interface GPSCheckin {
  lat: number;
  lng: number;
  time: string;
  jobId?: number;
  type: 'checkin' | 'checkout' | 'update';
}
