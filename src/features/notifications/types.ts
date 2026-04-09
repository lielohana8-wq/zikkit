export interface Notification {
  id: string;
  type: 'new_lead' | 'new_job' | 'bot_call' | 'payment' | 'system';
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  link?: string;
}
