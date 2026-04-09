import { Box, Typography } from '@mui/material';

const S = ({ children }: { children: React.ReactNode }) => <Typography sx={{ fontSize: 14, color: '#a8bcc8', lineHeight: 1.9, mb: 2 }}>{children}</Typography>;
const H3 = ({ children }: { children: React.ReactNode }) => <Typography sx={{ fontSize: 17, fontWeight: 700, color: '#e8f0f4', mt: 4, mb: 1.5 }}>{children}</Typography>;

export default function PrivacyPage() {
  return (
    <Box sx={{ bgcolor: '#07090B', minHeight: '100vh', color: '#e8f0f4', py: 8, px: { xs: 3, md: 6 }, maxWidth: 800, mx: 'auto' }}>
      <Typography sx={{ fontSize: 28, fontWeight: 900, fontFamily: 'Syne, sans-serif', mb: 1 }}>Privacy Policy</Typography>
      <Typography sx={{ fontSize: 13, color: '#5a7080', mb: 4 }}>Last updated: March 8, 2026</Typography>
      <S>Zikkit Ltd. is committed to protecting your privacy. This policy explains what data we collect, how we use it, and your rights.</S>
      <H3>1. Information We Collect</H3>
      <S>Account information: name, email, phone number, business name, business type, and address. Business data: jobs, leads, quotes, invoices, technician details, products, and payroll information you enter. Call data: phone numbers, call recordings, transcripts, and call metadata when using the AI voice bot. Usage data: pages visited, features used, device type, browser, and IP address. Payment data: processed securely through Paddle. We do not store credit card numbers on our servers.</S>
      <H3>2. How We Use Your Data</H3>
      <S>To provide and improve the Zikkit platform. To operate the AI voice bot on your behalf. To send transactional emails (receipts, quotes, notifications). To process payments. To provide customer support. To analyze usage patterns and improve the product. We do NOT sell your data. We do NOT share your data with advertisers. We do NOT use your business data to train AI models.</S>
      <H3>3. Data Storage and Security</H3>
      <S>Data is stored on Google Cloud (Firebase) servers with encryption at rest and in transit. Authentication is managed through Firebase Auth with bcrypt password hashing. Sessions auto-expire after 30 minutes of inactivity. Login is locked after 5 failed attempts for 15 minutes. All API communications use HTTPS/TLS encryption.</S>
      <H3>4. Third-Party Services</H3>
      <S>We use the following third-party services to operate Zikkit: Firebase by Google for authentication and database. Twilio for phone calls and SMS. Anthropic Claude for AI voice bot intelligence. Resend for transactional emails. Paddle for payment processing. Each provider has their own privacy policy and processes data in accordance with their terms.</S>
      <H3>5. Call Recordings</H3>
      <S>When the AI voice bot answers a call, the conversation may be recorded and transcribed. Recordings are stored securely and accessible only to the business account owner. Recordings are automatically deleted after 90 days unless you choose to retain them. You are responsible for complying with local call recording laws in your jurisdiction. We recommend informing callers that calls may be recorded.</S>
      <H3>6. Your Rights</H3>
      <S>You can access, export, or delete your data at any time through Settings. You can request a full copy of all data we hold about you by emailing privacy@zikkit.com. You can request deletion of your account and all associated data. For EU/EEA residents: you have rights under GDPR including the right to data portability, right to erasure, and right to restrict processing. For California residents: you have rights under CCPA including the right to know what data is collected and the right to opt out of data sales (though we do not sell data).</S>
      <H3>7. Cookies</H3>
      <S>We use essential cookies for authentication and session management. We do not use tracking cookies or advertising cookies. No third-party analytics cookies are used.</S>
      <H3>8. Data Retention</H3>
      <S>Active account data is retained as long as your account is active. After cancellation, data is retained for 30 days then permanently deleted. Call recordings are retained for 90 days. Payment records are retained as required by law (typically 7 years).</S>
      <H3>9. Children</H3>
      <S>Zikkit is not intended for use by anyone under 18 years of age. We do not knowingly collect data from minors.</S>
      <H3>10. Changes</H3>
      <S>We may update this policy. Changes will be communicated via email or in-app notification. Continued use after changes constitutes acceptance.</S>
      <H3>11. Contact</H3>
      <S>For privacy questions: privacy@zikkit.com</S>
    </Box>
  );
}
