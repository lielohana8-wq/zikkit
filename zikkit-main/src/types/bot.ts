export type BotVoice = 'alloy' | 'echo' | 'nova' | 'shimmer' | 'onyx';

export interface BotConfig {
  enabled: boolean;
  voice: BotVoice;
  greeting: string;
  serviceFee?: string;
  promotions?: string;
  talkingPoints?: string;
  webhookUrl?: string;
  emailNotifications?: boolean;
  notifyEmail?: string;
  followUps: FollowUpConfig;
  flows: BotFlow[];
}

export interface FollowUpConfig {
  enabled: boolean;
  smsAfterCall: boolean;
  emailAfterCall: boolean;
  noAnswerRetry: boolean;
  noAnswerRetryHours: number;
  partsArrivedNotify: boolean;
}

export interface BotFlow {
  id: string;
  name: string;
  trigger: string;
  response: string;
  action?: string;
}

export interface BotSimulation {
  input: string;
  response: string;
  timestamp: string;
  flow?: string;
}
