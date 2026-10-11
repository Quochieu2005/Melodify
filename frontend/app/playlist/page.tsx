import { PlaylistGalleryPage } from '@/components/playlists';

export default async function PlaylistPage({ searchParams }: { searchParams: Promise<{ topic?: string; genre?: string; kind?: string }> }) {
  const query = await searchParams;
  const topicSlug = query.genre || query.topic;
  const topicKind = query.kind === 'genre' || query.genre ? 'genre' : topicSlug ? 'topic' : undefined;

  return <PlaylistGalleryPage topicSlug={topicSlug} topicKind={topicKind} />;
}
