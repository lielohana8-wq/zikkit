import JoinPage from '@/features/solo/pages/JoinPage';

export const metadata = { title: 'Join the team — Zikkit', robots: { index: false, follow: false } };

export default function Page({ params }: { params: { token: string } }) {
  return <JoinPage token={params.token} />;
}
