export type BusinessRegion = 'US' | 'IL' | 'CA';

export interface ServiceArea {
  type: 'zip' | 'city';
  values: string[]; // ZIP codes or city names
  label?: string;   // "Manhattan, Brooklyn" or "תל אביב, רמת גן"
}

export interface TwilioConfig {
  // Master Account — SID/Token are in .env, NOT per business
  phoneNumber?: string;   // +1xxx or +972xxx — provisioned automatically
  phoneSid?: string;      // Twilio resource SID for this number (for release)
  enabled?: boolean;
  provisionedAt?: string; // ISO date when number was provisioned
  status?: 'pending' | 'active' | 'released' | 'error';
  error?: string;         // Last error message if any
}

export interface BusinessConfig {
  biz_name?: string;
  biz_type?: string;
  biz_phone?: string;
  biz_email?: string;
  biz_address?: string;
  biz_logo?: string;
  logo_url?: string;
  biz_color?: string;
  setup_done?: boolean;
  lang?: 'en' | 'es' | 'he';
  currency?: string;
  tax_rate?: number;
  tax_label?: string;        // e.g. HST / GST / VAT — printed on documents
  tax_number?: string;       // GST/HST registration number
  biz_city?: string;
  biz_province?: string;
  biz_postal?: string;
  biz_website?: string;
  quote_prefix?: string;     // default Q
  receipt_prefix?: string;   // default R
  numbering_start?: number;  // default 1000
  payment_instructions?: string; // e.g. e-Transfer email
  solo_setup_done?: boolean;

  // Revenue split defaults (jobs pulled from other companies)
  default_share_percent?: number;   // what we keep by default, e.g. 30
  materials_before_split?: boolean; // deduct materials before splitting
  job_sources?: string[];           // companies we take work from
  // Reviews
  google_review_url?: string;
  review_message?: string;
  quote_footer?: string;
  receipt_footer?: string;
  sms_templates?: Record<string, string>;
  custom_tags?: string[];
  timezone?: string;
  monthlyGoal?: number;

  // Region
  region?: BusinessRegion;

  // Service area
  serviceArea?: ServiceArea;

  // Business hours
  businessHours?: string; // "Mon-Fri 8am-6pm" or "א'-ה' 08:00-18:00"

  // Twilio (per business)
  twilio?: TwilioConfig;

  // Bot config stored in cfg
  botConfig?: import('./bot').BotConfig;
}

export interface BusinessDatabase {
  users: import('./user').User[];
  leads: import('./lead').Lead[];
  jobs: import('./job').Job[];
  quotes: import('./quote').Quote[];
  products: import('./product').Product[];
  botLog: BotLogEntry[];
  expenses: Expense[];
  payments: any[];
  reviews: any[];
  inventory: any[];
  photos: any[];
  whatsapp: any[];
  membership: any[];
  support: any[];
  customers?: import('./solo').Customer[];
  receipts?: import('./solo').Receipt[];
  closings?: import('./solo').Closing[];
  [key: string]: any;
}

export interface BotLogEntry {
  time: string;
  msg: string;
  type?: 'call_in' | 'call_out' | 'sms_in' | 'sms_out' | 'missed' | 'answered' | 'lead_created' | 'info';
  callerPhone?: string;
  duration?: number;       // seconds
  leadId?: number;         // auto-created lead
  transcript?: string;     // full conversation text
}

export interface Expense {
  id: number;
  date: string;
  category: string;
  amount: number;
  desc?: string;
  vendor?: string;
}

