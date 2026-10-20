import PublicProfilePage from '@/components/me/PublicProfilePage';

export default async function Page({ params }: { params: Promise<{ identifier: string }> }) {
  const { identifier } = await params;
  return <PublicProfilePage key={identifier} identifier={identifier} />;
}
