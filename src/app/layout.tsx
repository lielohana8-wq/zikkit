import type { Metadata, Viewport } from 'next';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { theme } from '@/styles/theme';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { LanguageProvider } from '@/hooks/useLanguage';
import { ToastProvider } from '@/hooks/useToast';
import { ToastContainer } from '@/components/ui/ToastContainer';
import { DataBridge } from '@/features/auth/DataBridge';
import './globals.css';
import { PWAInstall } from '@/components/ui/PWAInstall';

export const metadata: Metadata = {
  title: 'Zikkit',
  description: 'AI-Powered Field Service Management — Replaces your receptionist and software.',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'Zikkit' },
  icons: {
    icon: [{ url: '/icon-192.svg', type: 'image/svg+xml' }],
    apple: [{ url: '/icon-192.svg' }],
  },
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  themeColor: '#00E5FF', width: 'device-width', initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Rubik:wght@300;400;500;600;700;800;900&family=Heebo:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
      </head>
      <body suppressHydrationWarning>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <ToastProvider>
            <AuthProvider>
              <DataBridge>
                <LanguageProvider>
                  {children}
                  <ToastContainer />
                  <PWAInstall />
                </LanguageProvider>
              </DataBridge>
            </AuthProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
