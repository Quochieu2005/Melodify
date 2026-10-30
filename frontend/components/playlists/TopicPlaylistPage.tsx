'use client';

import { useSearchParams } from 'next/navigation';

import PlaylistGalleryPage from './PlaylistGalleryPage';

export default function TopicPlaylistPage({ slug }: { slug: string }) {
  const searchParams = useSearchParams();
  const topicKind = searchParams.get('kind') === 'genre' ? 'genre' : 'topic';

  return <PlaylistGalleryPage key={`${topicKind}:${slug}`} topicSlug={slug} topicKind={topicKind} />;
}
