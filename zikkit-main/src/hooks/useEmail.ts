'use client';

import { useCallback } from 'react';
import { useData } from '@/hooks/useFirestore';
import { useToast } from '@/hooks/useToast';
import type { Quote, Job } from '@/types';

export function useEmail() {
  const { cfg } = useData();
  const { toast } = useToast();

  const sendQuoteEmail = useCallback(async (quote: Quote, toEmail: string) => {
    if (!toEmail) {
      toast('No email address for this client', '#ff4d6d');
      return false;
    }

    try {
      toast('📧 Sending quote...');
      const res = await fetch('/api/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'quote',
          to: toEmail,
          quote,
          bizName: cfg.biz_name || 'Business',
          bizPhone: cfg.biz_phone || '',
          bizEmail: cfg.biz_email || '',
          currency: cfg.currency || 'USD',
          footer: cfg.quote_footer || '',
          fromName: cfg.biz_name,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        toast('❌ ' + (data.error || 'Failed to send'), '#ff4d6d');
        return false;
      }

      toast('✅ Quote sent to ' + toEmail);
      return true;
    } catch {
      toast('❌ Network error — try again', '#ff4d6d');
      return false;
    }
  }, [cfg, toast]);

  const sendReceiptEmail = useCallback(async (job: Job, toEmail: string) => {
    if (!toEmail) {
      toast('No email address for this client', '#ff4d6d');
      return false;
    }

    try {
      toast('📧 Sending receipt...');
      const res = await fetch('/api/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'receipt',
          to: toEmail,
          job,
          bizName: cfg.biz_name || 'Business',
          bizPhone: cfg.biz_phone || '',
          bizEmail: cfg.biz_email || '',
          currency: cfg.currency || 'USD',
          taxRate: cfg.tax_rate || 0,
          footer: cfg.receipt_footer || '',
          fromName: cfg.biz_name,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        toast('❌ ' + (data.error || 'Failed to send'), '#ff4d6d');
        return false;
      }

      toast('✅ Receipt sent to ' + toEmail);
      return true;
    } catch {
      toast('❌ Network error — try again', '#ff4d6d');
      return false;
    }
  }, [cfg, toast]);

  return { sendQuoteEmail, sendReceiptEmail };
}
