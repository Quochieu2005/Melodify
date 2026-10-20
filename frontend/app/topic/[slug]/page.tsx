import { TopicPlaylistPage } from '@/components/playlists';

export default async function TopicSlugPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <TopicPlaylistPage key={slug} slug={decodeURIComponent(slug)} />;
}
