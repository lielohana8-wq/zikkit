import { Box, Typography } from '@mui/material';

const S = ({ children }: { children: React.ReactNode }) => <Typography sx={{ fontSize: 14, color: '#a8bcc8', lineHeight: 1.9, mb: 2 }}>{children}</Typography>;
const H3 = ({ children }: { children: React.ReactNode }) => <Typography sx={{ fontSize: 17, fontWeight: 700, color: '#e8f0f4', mt: 4, mb: 1.5 }}>{children}</Typography>;

export default function SubscriptionAgreementPage() {
  return (
    <Box sx={{ bgcolor: '#07090B', minHeight: '100vh', color: '#e8f0f4', py: 8, px: { xs: 3, md: 6 }, maxWidth: 800, mx: 'auto' }}>
      <Typography sx={{ fontSize: 28, fontWeight: 900, fontFamily: 'Syne, sans-serif', mb: 1 }}>Subscription Agreement</Typography>
      <Typography sx={{ fontSize: 13, color: '#5a7080', mb: 4 }}>Last updated: March 8, 2026</Typography>
      <S>This Subscription Agreement is between Zikkit Ltd. and the subscribing business entity or individual. By subscribing to any Zikkit plan, you agree to the following terms.</S>
      <H3>1. Plans and Pricing</H3>
      <S>Zikkit offers the following plans. USA: Starter at 699 dollars per month (up to 3 technicians, 500 AI calls) and Unlimited at 1,099 dollars per month (unlimited technicians and AI calls). Israel: Starter at 499 NIS per month (up to 3 technicians, 300 AI calls) and Pro at 749 NIS per month (unlimited). Annual plans receive a 25 percent discount (3 months free). Usage charges: AI calls at 0.05 dollars per minute, SMS at 0.02 dollars per message, phone numbers at 3 dollars per month each.</S>
      <H3>2. Free Trial</H3>
      <S>All new accounts receive a 30-day free trial with full access to all features. No credit card is required to start the trial. At the end of the trial, you will be prompted to select a plan and enter payment details. If no payment is provided, access to the platform will be restricted to read-only mode. Your data will be preserved for an additional 30 days.</S>
      <H3>3. Billing</H3>
      <S>Subscriptions are billed monthly or annually in advance. Payment is processed through Paddle, our authorized payment processor. Paddle handles all tax calculations, invoicing, and compliance. All prices are exclusive of applicable taxes unless stated otherwise. Failed payments will be retried 3 times over 7 days. If payment continues to fail, the account enters restricted mode.</S>
      <H3>4. Restricted Mode</H3>
      <S>When an account enters restricted mode due to non-payment or expired trial: the AI voice bot will stop answering calls, new jobs, leads, and quotes cannot be created, existing data remains accessible in read-only mode, technician access is suspended, SMS and email automation is paused. To restore full access, update your payment method and settle any outstanding balance.</S>
      <H3>5. Cancellation</H3>
      <S>You may cancel at any time from Settings or by contacting support. Cancellation takes effect at the end of the current billing period. No partial refunds for unused portions of a billing period. After cancellation, you have 30 days to export your data. After 30 days, all data is permanently and irreversibly deleted.</S>
      <H3>6. Plan Changes</H3>
      <S>You may upgrade your plan at any time. The new rate takes effect immediately and is prorated. You may downgrade your plan. The change takes effect at the next billing cycle. If downgrading reduces your technician limit below your current count, you must remove technicians before the change takes effect.</S>
      <H3>7. Data Handling</H3>
      <S>You own all business data entered into Zikkit. Zikkit acts as a data processor on your behalf. We will not access, modify, or share your data except as necessary to provide the service or as required by law. Upon termination, we will delete your data within 30 days unless legally required to retain it.</S>
      <H3>8. Service Level</H3>
      <S>Zikkit targets 99.9 percent monthly uptime for the web platform. The AI voice bot targets 99.5 percent uptime dependent on Twilio infrastructure. Planned maintenance windows will be communicated 48 hours in advance. No credit or compensation is provided for downtime.</S>
      <H3>9. Intellectual Property</H3>
      <S>Zikkit owns all rights to the platform, software, and AI models. Your subscription grants you a non-exclusive, non-transferable license to use the platform for your business operations. You may not resell, sublicense, or white-label the platform without written permission.</S>
      <H3>10. Contact</H3>
      <S>Billing questions: billing@zikkit.com. General support: support@zikkit.com</S>
    </Box>
  );
}
