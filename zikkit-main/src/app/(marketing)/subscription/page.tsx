'use client';
import { Box, Typography } from '@mui/material';
import { zikkitColors as c } from '@/styles/theme';

const S = ({ t, children }: { t: string; children: React.ReactNode }) => (
  <Box sx={{ mb: 4 }}>
    <Typography sx={{ fontSize: 16, fontWeight: 700, color: c.text, mb: 1 }}>{t}</Typography>
    <Typography sx={{ fontSize: 13, color: c.text2, lineHeight: 1.9 }}>{children}</Typography>
  </Box>
);

export default function SubscriptionPage() {
  return (
    <Box sx={{ bgcolor: c.bg, minHeight: '100vh', color: c.text, py: 6, px: { xs: 2, md: 4 }, maxWidth: 800, mx: 'auto' }}>
      <Typography sx={{ fontSize: 28, fontWeight: 900, fontFamily: 'Syne, sans-serif', mb: 1 }}>Subscription Agreement</Typography>
      <Typography sx={{ fontSize: 13, color: c.text3, mb: 4 }}>Last updated: March 2026</Typography>

      <S t="1. Plans and Pricing">
        Zikkit offers the following subscription plans. Starter Plan (US: $699/month, IL: 499 NIS/month) includes up to 3 technicians and 500 AI bot calls per month. Unlimited Plan (US: $1,099/month, IL: 749 NIS/month) includes unlimited technicians and unlimited AI bot calls. Annual plans are available at a 25% discount (equivalent to 3 months free). Additional usage charges apply for AI calls beyond plan limits at $0.05 per minute, SMS at $0.02 per message, and additional phone numbers at $3.00 per month.
      </S>
      <S t="2. Free Trial">
        New accounts receive a 30-day free trial with full access to all features of the selected plan. No credit card is required to start the trial. At the end of the trial, you will be prompted to enter payment information to continue. If no payment method is provided, access to the platform will be restricted to read-only mode for 7 additional days, after which the account will be suspended.
      </S>
      <S t="3. Billing">
        Subscriptions are billed in advance on a monthly or annual basis depending on the plan selected. Payment is processed through Paddle, our authorized payment processor. Accepted payment methods include credit cards, debit cards, and PayPal. All prices are exclusive of applicable taxes which will be added at checkout.
      </S>
      <S t="4. Plan Changes">
        You may upgrade your plan at any time. The new rate will be prorated for the remainder of the current billing period. You may downgrade your plan at any time. The downgrade will take effect at the start of the next billing period. Downgrading may result in loss of access to features not included in the lower plan.
      </S>
      <S t="5. Cancellation">
        You may cancel your subscription at any time from the Settings page. Cancellation takes effect at the end of the current billing period. You will retain access to all features until the end of the paid period. No refunds are provided for partial billing periods. Annual plans may be canceled but are non-refundable after the first 30 days.
      </S>
      <S t="6. Data After Cancellation">
        After cancellation, your data remains available in read-only mode for 30 days. During this period, you may export all your data. After 30 days, your data will be permanently deleted and cannot be recovered. Phone numbers associated with your account will be released.
      </S>
      <S t="7. Non-Payment">
        If a payment fails, we will attempt to charge the payment method up to 3 times over 7 days. During this grace period, full access is maintained. After the grace period, the account enters read-only mode. After an additional 14 days without payment, the account is suspended. Suspended accounts retain data for 30 days before permanent deletion.
      </S>
      <S t="8. Phone Numbers">
        Phone numbers provisioned for the AI voice bot are leased, not owned. Numbers remain active as long as the subscription is active. Upon cancellation or suspension, numbers may be released and reassigned. Porting of numbers to another provider is available upon request with 30 days notice.
      </S>
      <S t="9. Contact">
        For billing questions, contact billing@zikkit.com.
      </S>
    </Box>
  );
}
