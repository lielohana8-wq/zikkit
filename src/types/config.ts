export type BusinessRegion = 'US' | 'IL';

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
  biz_color?: string;
  setup_done?: boolean;
  lang?: 'en' | 'es' | 'he';
  currency?: string;
  tax_rate?: number;
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
}

export interface BotLogEntry {
  time: string;
  msg: string;
  type?: 'call_in' | 'call_out' | 'sms_in' | 'sms_out' | 'missed' | 'lead_created' | 'info';
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
