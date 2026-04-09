import { Box, Typography } from '@mui/material';

const S = ({ children }: { children: React.ReactNode }) => <Typography sx={{ fontSize: 14, color: '#a8bcc8', lineHeight: 1.9, mb: 2 }}>{children}</Typography>;
const H3 = ({ children }: { children: React.ReactNode }) => <Typography sx={{ fontSize: 17, fontWeight: 700, color: '#e8f0f4', mt: 4, mb: 1.5 }}>{children}</Typography>;

export default function TermsPage() {
  return (
    <Box sx={{ bgcolor: '#07090B', minHeight: '100vh', color: '#e8f0f4', py: 8, px: { xs: 3, md: 6 }, maxWidth: 800, mx: 'auto' }}>
      <Typography sx={{ fontSize: 28, fontWeight: 900, fontFamily: 'Syne, sans-serif', mb: 1 }}>Terms of Service</Typography>
      <Typography sx={{ fontSize: 13, color: '#5a7080', mb: 4 }}>Last updated: March 8, 2026</Typography>
      <S>Welcome to Zikkit. These Terms of Service govern your use of the Zikkit platform, including our website, applications, AI voice bot, and all related services. By creating an account or using any part of Zikkit, you agree to these terms.</S>
      <H3>1. Definitions</H3>
      <S>Zikkit refers to the software platform operated by Zikkit Ltd. Service means all features provided through the platform including job management, CRM, AI voice bot, SMS automation, quotes, invoicing, payroll, GPS tracking, client portal, and reports. Subscriber means the business or individual who creates an account. End User means any technician, manager, or staff member using the platform under a Subscriber account.</S>
      <H3>2. Account Registration</H3>
      <S>You must provide accurate and complete information during registration. You are responsible for maintaining the confidentiality of your account credentials. You must be at least 18 years old. One business per account. You are responsible for all activity under your account.</S>
      <H3>3. Subscription and Payment</H3>
      <S>Zikkit offers paid subscription plans with a 30-day free trial. After the trial period, your selected payment method will be charged automatically. Prices are listed on our pricing page and may change with 30 days notice. All fees are non-refundable unless required by law. If payment fails, access may be restricted until resolved. Usage-based charges (AI calls, SMS, phone numbers) are billed monthly in addition to your subscription.</S>
      <H3>4. AI Voice Bot</H3>
      <S>The AI voice bot is an automated system that answers phone calls on behalf of your business. While we strive for accuracy, the bot may occasionally misunderstand callers or provide imperfect responses. You acknowledge that the AI bot is a tool and not a replacement for professional judgment. Zikkit is not liable for any business decisions made based on information gathered by the bot. You are responsible for reviewing leads and information captured by the bot.</S>
      <H3>5. Data Ownership and Privacy</H3>
      <S>You retain ownership of all business data you enter into Zikkit. Zikkit does not sell your data to third parties. We process your data solely to provide the service. Call recordings and transcripts are stored securely and accessible only to you. For full details, see our Privacy Policy.</S>
      <H3>6. Acceptable Use</H3>
      <S>You agree not to use Zikkit for any unlawful purpose, to transmit spam or unsolicited messages, to interfere with platform security, to reverse engineer or copy the software, to share credentials with unauthorized parties, or to use the platform in any way that could harm other users.</S>
      <H3>7. Service Availability</H3>
      <S>We aim for 99.9 percent uptime but do not guarantee uninterrupted service. Scheduled maintenance will be announced in advance. We are not liable for downtime caused by third-party services or force majeure events.</S>
      <H3>8. Limitation of Liability</H3>
      <S>To the maximum extent permitted by law, Zikkit total liability is limited to the amount you paid in the 12 months preceding any claim. Zikkit is not liable for indirect, incidental, special, or consequential damages including lost profits, lost revenue, or lost data.</S>
      <H3>9. Cancellation</H3>
      <S>You may cancel your subscription at any time. Access continues until the end of the current billing period. Your data is retained for 30 days after cancellation, then permanently deleted. You can export your data before deletion through Settings.</S>
      <H3>10. Changes to Terms</H3>
      <S>We may update these terms. Significant changes will be communicated via email or in-app notification at least 30 days before taking effect. Continued use after changes constitutes acceptance.</S>
      <H3>11. Governing Law</H3>
      <S>These terms are governed by the laws of the State of Delaware, United States. For subscribers in Israel, Israeli law may apply where required. Disputes will be resolved through binding arbitration.</S>
      <H3>12. Contact</H3>
      <S>For questions about these terms, contact us at legal@zikkit.com</S>
    </Box>
  );
}
