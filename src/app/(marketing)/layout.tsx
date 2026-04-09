import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Zikkit' };

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
