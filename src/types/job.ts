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
  | 'dispute'
  | 'on_way';

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
  quoteStatus?: "draft" | "sent" | "viewed" | "approved" | "declined";
  quoteTotal?: number;
  quoteSentAt?: string;
  quoteSignedAt?: string;
  // Solo edition fields
  techUid?: string;       // Firebase uid of the assigned technician (rules scope on this)
  /** Who is doing it: the owner, a partner, or a technician. Jobs done by the owner or a partner belong to the company. */
  assigneeRole?: 'owner' | 'partner' | 'dispatcher' | 'technician';
  // `source` above doubles as the company this job was pulled from ('' = our own)
  sharePercent?: number;        // what we keep, in percent — carried into the closing
  materialsBeforeSplit?: boolean;
  customerId?: number;
  jobType?: string;
  quoteId?: number;
  closingId?: number;
  createdBy?: string;
  completedAt?: string;
  startedAt?: string;
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
