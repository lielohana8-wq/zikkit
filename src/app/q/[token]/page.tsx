import { PublicDoc } from '@/features/solo/components/PublicDoc';

export const metadata = { title: 'Your quote', robots: { index: false, follow: false } };

export default function QuotePublicPage({ params }: { params: { token: string } }) {
  return <PublicDoc token={params.token} kind="quote" />;
}
