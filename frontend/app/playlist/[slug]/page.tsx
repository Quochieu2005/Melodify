import { PlaylistDetailPage } from '@/components/playlists';

export default async function PlaylistSlugPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <PlaylistDetailPage key={slug} slug={decodeURIComponent(slug)} />;
}
