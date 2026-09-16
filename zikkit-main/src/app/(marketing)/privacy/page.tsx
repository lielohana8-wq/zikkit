'use client';
import { Box, Typography } from '@mui/material';
import { zikkitColors as c } from '@/styles/theme';

const S = ({ t, children }: { t: string; children: React.ReactNode }) => (
  <Box sx={{ mb: 4 }}>
    <Typography sx={{ fontSize: 16, fontWeight: 700, color: c.text, mb: 1 }}>{t}</Typography>
    <Typography sx={{ fontSize: 13, color: c.text2, lineHeight: 1.9 }}>{children}</Typography>
  </Box>
);

export default function PrivacyPage() {
  return (
    <Box sx={{ bgcolor: c.bg, minHeight: '100vh', color: c.text, py: 6, px: { xs: 2, md: 4 }, maxWidth: 800, mx: 'auto' }}>
      <Typography sx={{ fontSize: 28, fontWeight: 900, fontFamily: 'Syne, sans-serif', mb: 1 }}>Privacy Policy</Typography>
      <Typography sx={{ fontSize: 13, color: c.text3, mb: 4 }}>Last updated: March 2026</Typography>

      <S t="1. Information We Collect">
        We collect information you provide directly: business name, owner name, email, phone number, business address, and business type. We collect data you enter into the platform: customer records, job details, quotes, invoices, technician information, and communication logs. We automatically collect: IP address, browser type, device information, usage patterns, and access times. The AI voice bot collects: caller phone number, call duration, call recordings (when enabled), and transcribed conversation content.
      </S>
      <S t="2. How We Use Your Information">
        To provide and maintain the Zikkit platform and all its features. To process your transactions and manage your subscription. To operate the AI voice bot and generate leads from incoming calls. To send transactional emails (receipts, quote notifications, job updates). To improve our services and develop new features. To provide customer support. To detect and prevent fraud or abuse.
      </S>
      <S t="3. Data Storage and Security">
        Your data is stored on Google Cloud Platform (Firebase) servers located in the United States. All data is encrypted in transit using TLS 1.2+ and at rest using AES-256. We implement role-based access controls, automatic session timeouts, and login attempt limiting. Regular security audits are conducted. We retain your data for as long as your account is active, plus 30 days after termination for data export purposes.
      </S>
      <S t="4. Third-Party Services">
        We use the following third-party services that may process your data: Firebase (Google) for authentication and database. Twilio for phone numbers, voice calls, and SMS. Anthropic for AI processing of voice conversations. Resend for transactional emails. Paddle for payment processing. Each third-party service has its own privacy policy and data handling practices.
      </S>
      <S t="5. Call Recording and AI Processing">
        When the AI voice bot answers a call, the conversation may be recorded and transcribed for the purpose of generating leads and providing service information. Call recordings are stored securely and are only accessible to the business owner. Recordings are automatically deleted after 90 days unless the business owner chooses to retain them. You are responsible for complying with local call recording consent laws in your jurisdiction.
      </S>
      <S t="6. Data Sharing">
        We do not sell your personal or business data to any third party. We do not share your data with advertisers. We may share data with third-party service providers strictly for the purpose of operating the platform (as listed above). We may disclose data if required by law, court order, or government regulation.
      </S>
      <S t="7. Your Rights">
        You have the right to access, correct, or delete your personal data at any time. You may export all your business data from the Settings page. You may request complete account deletion by contacting support@zikkit.com. California residents have additional rights under the CCPA. EU residents have additional rights under the GDPR. Israeli residents have rights under the Privacy Protection Law.
      </S>
      <S t="8. Cookies">
        We use essential cookies only for authentication and session management. We do not use advertising or tracking cookies. We do not use third-party analytics cookies.
      </S>
      <S t="9. Children">
        Zikkit is not intended for use by anyone under the age of 18. We do not knowingly collect data from minors.
      </S>
      <S t="10. Changes to This Policy">
        We may update this policy from time to time. Material changes will be communicated via email at least 30 days before they take effect.
      </S>
      <S t="11. Contact">
        For privacy-related questions or data requests, contact us at privacy@zikkit.com.
      </S>
    </Box>
  );
}
