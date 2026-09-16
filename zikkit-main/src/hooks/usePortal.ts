'use client';

import { useCallback } from 'react';
import { useData } from '@/hooks/useFirestore';
import { useAuth } from '@/features/auth/AuthProvider';
import { useToast } from '@/hooks/useToast';
import { getFirestoreDb, doc, setDoc } from '@/lib/firebase';
import { generatePortalToken, getPortalUrl } from '@/lib/portal';
import type { Job, Quote } from '@/types';

export function usePortal() {
  const { db, cfg, saveData } = useData();
  const { bizId } = useAuth();
  const { toast } = useToast();

  /** Save portal snapshot to Firestore public_portals collection */
  const savePortalData = useCallback(async (
    token: string,
    type: 'job' | 'quote',
    record: Job | Quote,
  ) => {
    try {
      const firestore = getFirestoreDb();
      await setDoc(doc(firestore, 'public_portals', token), {
        type,
        bizName: cfg.biz_name || 'Business',
        bizPhone: cfg.biz_phone || '',
        bizEmail: cfg.biz_email || '',
        bizAddress: cfg.biz_address || '',
        bizColor: cfg.biz_color || '#00e5b0',
        currency: cfg.currency || 'USD',
        taxRate: cfg.tax_rate || 0,
        quoteFooter: cfg.quote_footer || '',
        receiptFooter: cfg.receipt_footer || '',
        ...(type === 'job' ? {
          job: record,
          client: (record as any).client, phone: (record as any).phone, email: (record as any).email,
          address: (record as any).address, desc: (record as any).desc, status: (record as any).status,
          scheduledDate: (record as any).scheduledDate, scheduledTime: (record as any).scheduledTime,
          techName: (record as any).tech, revenue: (record as any).revenue, materials: (record as any).materials,
          paymentMethod: (record as any).paymentMethod, photos: (record as any).photos || [],
          items: (record as any).lineItems || [], signature: (record as any).signature,
          num: (record as any).num,
        } : { quote: record }),
        created: new Date().toISOString(),
        bizId: bizId || '',
      });
      return true;
    } catch (e) {
      console.error('[Portal] Failed to save portal data:', e);
      return false;
    }
  }, [cfg, bizId]);

  /** Generate portal link for a job, save token, save portal data */
  const createJobPortal = useCallback(async (job: Job): Promise<string | null> => {
    // Reuse existing token or generate new one
    let token = job.portalToken;
    if (!token) {
      token = generatePortalToken('job', job.id);
      // Save token to job record
      const jobsList = [...(db.jobs || [])];
      const idx = jobsList.findIndex((j) => j.id === job.id);
      if (idx >= 0) {
        jobsList[idx] = { ...jobsList[idx], portalToken: token };
        await saveData({ ...db, jobs: jobsList });
        job = jobsList[idx]; // Use updated job
      }
    }

    // Save snapshot to public_portals
    const saved = await savePortalData(token, 'job', job);
    if (!saved) {
      toast('שגיאה ביצירת קישור', '#ff4d6d');
      return null;
    }

    return getPortalUrl(token);
  }, [db, saveData, savePortalData, toast]);

  /** Generate portal link for a quote, save token, save portal data */
  const createQuotePortal = useCallback(async (quote: Quote): Promise<string | null> => {
    let token = quote.portalToken;
    if (!token) {
      token = generatePortalToken('quote', quote.id);
      const quotesList = [...(db.quotes || [])];
      const idx = quotesList.findIndex((q) => q.id === quote.id);
      if (idx >= 0) {
        quotesList[idx] = { ...quotesList[idx], portalToken: token };
        await saveData({ ...db, quotes: quotesList });
        quote = quotesList[idx];
      }
    }

    const saved = await savePortalData(token, 'quote', quote);
    if (!saved) {
      toast('שגיאה ביצירת קישור', '#ff4d6d');
      return null;
    }

    return getPortalUrl(token);
  }, [db, saveData, savePortalData, toast]);

  /** Send portal link via email */
  const sendPortalEmail = useCallback(async (
    type: 'job' | 'quote',
    toEmail: string,
    clientName: string,
    portalUrl: string,
    docLabel: string,
  ) => {
    try {
      toast('📧 Sending portal link...');
      const res = await fetch('/api/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'portal',
          to: toEmail,
          portalUrl,
          clientName,
          docType: type,
          docLabel,
          bizName: cfg.biz_name || 'Business',
          bizPhone: cfg.biz_phone || '',
          bizEmail: cfg.biz_email || '',
          currency: cfg.currency || 'USD',
          fromName: cfg.biz_name,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        toast('❌ ' + (data.error || 'Failed to send'), '#ff4d6d');
        return false;
      }

      toast('✅ Portal link sent to ' + toEmail);
      return true;
    } catch {
      toast('❌ Network error', '#ff4d6d');
      return false;
    }
  }, [cfg, toast]);

  /** Full flow: Create portal + send email for a Job */
  const sendJobPortal = useCallback(async (job: Job, toEmail: string) => {
    if (!toEmail) { toast('No email address', '#ff4d6d'); return false; }
    const url = await createJobPortal(job);
    if (!url) return false;
    return sendPortalEmail('job', toEmail, job.client, url, job.num || `#${job.id}`);
  }, [createJobPortal, sendPortalEmail, toast]);

  /** Full flow: Create portal + send email for a Quote */
  const sendQuotePortal = useCallback(async (quote: Quote, toEmail: string) => {
    if (!toEmail) { toast('No email address', '#ff4d6d'); return false; }
    const url = await createQuotePortal(quote);
    if (!url) return false;
    return sendPortalEmail('quote', toEmail, quote.client, url, `Q-${quote.id}`);
  }, [createQuotePortal, sendPortalEmail, toast]);

  /** Resend existing portal link */
  const resendPortalLink = useCallback(async (
    type: 'job' | 'quote',
    record: Job | Quote,
    toEmail: string,
  ) => {
    if (!record.portalToken) {
      toast('No portal link exists. Send a new one first.', '#ff4d6d');
      return false;
    }
    if (!toEmail) { toast('No email address', '#ff4d6d'); return false; }
    const url = getPortalUrl(record.portalToken);
    const label = type === 'job' ? ((record as Job).num || `#${record.id}`) : `Q-${record.id}`;
    return sendPortalEmail(type, toEmail, (record as Job).client || (record as Quote).client, url, label);
  }, [sendPortalEmail, toast]);

  /** Send portal link via SMS */
  const sendPortalSms = useCallback(async (
    type: 'job' | 'quote',
    toPhone: string,
    clientName: string,
    portalUrl: string,
    bizName: string,
  ) => {
    try {
      toast('📱 Sending SMS...');
      const message = type === 'quote'
        ? `Hi ${clientName}, here's your quote from ${bizName}: ${portalUrl}`
        : `Hi ${clientName}, here are your job details from ${bizName}: ${portalUrl}`;

      // Need the business Twilio phone number as "from"
      const fromNum = (cfg as Record<string, unknown>).twilio
        ? ((cfg as Record<string, unknown>).twilio as Record<string, unknown>).phoneNumber as string
        : '';

      const res = await fetch('/api/sms/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: toPhone, message, from: fromNum }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        toast('❌ ' + (data.error || 'Failed to send SMS'), '#ff4d6d');
        return false;
      }

      toast('✅ SMS sent to ' + toPhone);
      return true;
    } catch {
      toast('❌ Network error', '#ff4d6d');
      return false;
    }
  }, [cfg, toast]);

  /** Full flow: Create portal + send SMS for a Quote */
  const sendQuotePortalSms = useCallback(async (quote: Quote, toPhone: string) => {
    if (!toPhone) { toast('No phone number', '#ff4d6d'); return false; }
    const url = await createQuotePortal(quote);
    if (!url) return false;
    return sendPortalSms('quote', toPhone, quote.client, url, cfg.biz_name || 'Business');
  }, [createQuotePortal, sendPortalSms, toast, cfg]);

  /** Full flow: Create portal + send SMS for a Job */
  const sendJobPortalSms = useCallback(async (job: Job, toPhone: string) => {
    if (!toPhone) { toast('No phone number', '#ff4d6d'); return false; }
    const url = await createJobPortal(job);
    if (!url) return false;
    return sendPortalSms('job', toPhone, job.client, url, cfg.biz_name || 'Business');
  }, [createJobPortal, sendPortalSms, toast, cfg]);

  return { sendJobPortal, sendQuotePortal, resendPortalLink, createJobPortal, createQuotePortal, sendQuotePortalSms, sendJobPortalSms };
}
