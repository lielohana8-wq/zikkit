// Smart Alerts — AI-powered notifications
import type { Job } from '@/types/job';

export interface SmartAlert {
  id: string;
  type: 'warranty' | 'maintenance' | 'sla' | 'upsell' | 'churn_risk' | 'overdue' | 'unassigned';
  severity: 'high' | 'medium' | 'low';
  title: string;
  message: string;
  actionLabel?: string;
  actionHref?: string;
  icon: string;
  color: string;
}

export function generateSmartAlerts(jobs: Job[], leads: any[], cfg: any): SmartAlert[] {
  const alerts: SmartAlert[] = [];
  const now = Date.now();
  const dayMs = 86400000;

  // 1. Unassigned jobs
  const unassigned = jobs.filter(j => !j.tech && !['completed', 'cancelled'].includes(j.status));
  if (unassigned.length > 0) {
    alerts.push({ id: 'unassigned', type: 'unassigned', severity: 'high', title: `${unassigned.length} עבודות ללא טכנאי`, message: 'יש עבודות שלא שובצו לאף טכנאי', actionLabel: 'לוח זמנים', actionHref: '/schedule', icon: '⚠️', color: '#EF4444' });
  }

  // 2. Overdue jobs (open > 48h)
  const overdue = jobs.filter(j => !['completed', 'cancelled'].includes(j.status) && (now - new Date(j.created || 0).getTime()) > 2 * dayMs);
  if (overdue.length > 0) {
    alerts.push({ id: 'overdue', type: 'overdue', severity: 'high', title: `${overdue.length} עבודות באיחור`, message: 'עבודות פתוחות יותר מ-48 שעות', actionLabel: 'עבודות', actionHref: '/jobs', icon: '🔴', color: '#EF4444' });
  }

  // 3. SLA breach risk — jobs scheduled for today not started
  const today = new Date().toISOString().slice(0, 10);
  const todayNotStarted = jobs.filter(j => {
    const d = j.scheduledDate || j.date || '';
    return d.startsWith(today) && j.status === 'assigned';
  });
  if (todayNotStarted.length > 0) {
    alerts.push({ id: 'sla', type: 'sla', severity: 'medium', title: `${todayNotStarted.length} עבודות להיום טרם התחילו`, message: 'עבודות מתוכננות להיום שעדיין בסטטוס "שויך"', actionLabel: 'לוח זמנים', actionHref: '/schedule', icon: '⏰', color: '#F59E0B' });
  }

  // 4. Warranty expiring — jobs completed ~11 months ago (assuming 12 month warranty)
  const warrantyJobs = jobs.filter(j => {
    if (j.status !== 'completed') return false;
    const completedAt = new Date(j.created || 0).getTime();
    const monthsAgo = (now - completedAt) / (dayMs * 30);
    return monthsAgo >= 11 && monthsAgo <= 12;
  });
  if (warrantyJobs.length > 0) {
    alerts.push({ id: 'warranty', type: 'warranty', severity: 'low', title: `${warrantyJobs.length} אחריות עומדת לפוג`, message: 'עבודות שהאחריות שלהן מסתיימת בקרוב — הזדמנות לחידוש', actionLabel: 'לקוחות', actionHref: '/customers', icon: '🛡️', color: '#8B5CF6' });
  }

  // 5. Maintenance reminders — annual service for completed jobs > 11 months ago
  const maintenanceJobs = jobs.filter(j => {
    if (j.status !== 'completed') return false;
    const completedAt = new Date(j.created || 0).getTime();
    const monthsAgo = (now - completedAt) / (dayMs * 30);
    return monthsAgo >= 11 && monthsAgo <= 13;
  });
  if (maintenanceJobs.length > 0) {
    alerts.push({ id: 'maintenance', type: 'maintenance', severity: 'low', title: `${maintenanceJobs.length} לקוחות לתחזוקה שנתית`, message: 'לקוחות שעברה שנה מהעבודה האחרונה — שלח תזכורת תחזוקה', actionLabel: 'לקוחות', actionHref: '/customers', icon: '🔧', color: '#06B6D4' });
  }

  // 6. Churn risk — customers with no job in 6+ months who had multiple jobs before
  const customerMap: Record<string, { count: number; lastDate: number }> = {};
  jobs.forEach(j => {
    const key = j.phone || j.client || '';
    if (!key) return;
    if (!customerMap[key]) customerMap[key] = { count: 0, lastDate: 0 };
    customerMap[key].count++;
    const d = new Date(j.created || 0).getTime();
    if (d > customerMap[key].lastDate) customerMap[key].lastDate = d;
  });
  const churnRisk = Object.values(customerMap).filter(c => c.count >= 2 && (now - c.lastDate) > 180 * dayMs).length;
  if (churnRisk > 0) {
    alerts.push({ id: 'churn', type: 'churn_risk', severity: 'medium', title: `${churnRisk} לקוחות בסיכון עזיבה`, message: 'לקוחות חוזרים שלא הזמינו 6+ חודשים', actionLabel: 'לקוחות', actionHref: '/customers', icon: '📉', color: '#F59E0B' });
  }

  // 7. New leads waiting
  const newLeads = leads.filter((l: any) => l.status === 'new');
  if (newLeads.length > 0) {
    alerts.push({ id: 'new-leads', type: 'upsell', severity: 'medium', title: `${newLeads.length} לידים חדשים ממתינים`, message: 'יש לידים שטרם טופלו', actionLabel: 'לידים', actionHref: '/leads', icon: '🆕', color: '#3B82F6' });
  }

  return alerts.sort((a, b) => {
    const sev = { high: 0, medium: 1, low: 2 };
    return sev[a.severity] - sev[b.severity];
  });
}
