import SongDetailPage from '@/components/songs/SongDetailPage';

export default async function SongSlugPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <SongDetailPage slug={decodeURIComponent(slug)} />;
}
